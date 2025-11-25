import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';
import { createClient } from 'npm:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Test endpoint
app.get('/make-server-f438b3f9/health', (c) => {
  return c.json({ status: 'ok', message: 'Server is running' });
});

// Helper function to verify auth
async function verifyAuth(request: Request) {
  const accessToken = request.headers.get('Authorization')?.split(' ')[1];
  if (!accessToken) {
    return null;
  }
  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user) {
    return null;
  }
  return user;
}

// Check if initial setup is complete
app.get('/make-server-f438b3f9/setup/status', async (c) => {
  try {
    const setupComplete = await kv.get('setup_complete');
    console.log('Setup status check, value:', setupComplete);
    return c.json({ setupComplete: setupComplete === 'true' });
  } catch (error) {
    console.log('Error checking setup status:', error);
    // If there's an error or key doesn't exist, assume setup is not complete
    return c.json({ setupComplete: false });
  }
});

// Complete initial setup
app.post('/make-server-f438b3f9/setup/complete', async (c) => {
  try {
    const body = await c.req.json();
    const { admin, riders, dispatchers } = body;

    // Create admin user
    const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
      email: admin.email,
      password: admin.password,
      user_metadata: {
        name: admin.name,
        role: 'admin'
      },
      email_confirm: true
    });

    if (adminError) {
      console.log('Error creating admin:', adminError);
      return c.json({ error: `Failed to create admin: ${adminError.message}` }, 400);
    }

    // Create riders
    for (const rider of riders) {
      const { data: riderData, error: riderError } = await supabase.auth.admin.createUser({
        email: `${rider.username}@delivery.local`,
        password: rider.password,
        user_metadata: {
          username: rider.username,
          name: rider.name,
          role: 'rider',
          status: 'available'
        },
        email_confirm: true
      });

      if (riderError) {
        console.log(`Error creating rider ${rider.username}:`, riderError);
      }
    }

    // Create dispatchers
    for (const dispatcher of dispatchers) {
      const { data: dispatcherData, error: dispatcherError } = await supabase.auth.admin.createUser({
        email: dispatcher.email,
        password: dispatcher.password,
        user_metadata: {
          name: dispatcher.name,
          role: 'dispatcher'
        },
        email_confirm: true
      });

      if (dispatcherError) {
        console.log(`Error creating dispatcher ${dispatcher.email}:`, dispatcherError);
      }
    }

    // Mark setup as complete
    await kv.set('setup_complete', 'true');

    return c.json({ success: true, adminId: adminData.user.id });
  } catch (error) {
    console.log('Error completing setup:', error);
    return c.json({ error: 'Failed to complete setup' }, 500);
  }
});

// Sign in
app.post('/make-server-f438b3f9/auth/signin', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.log('Sign in error:', error);
      return c.json({ error: error.message }, 401);
    }

    return c.json({
      accessToken: data.session.access_token,
      user: data.user
    });
  } catch (error) {
    console.log('Sign in error:', error);
    return c.json({ error: 'Failed to sign in' }, 500);
  }
});

// Sign up (create new account)
app.post('/make-server-f438b3f9/auth/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, role, username } = body;

    console.log('Sign up request:', { email, name, role, username: username || 'none' });
    
    // Check if environment variables are set
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return c.json({ error: 'Server configuration error: Missing Supabase credentials' }, 500);
    }

    // Validation
    if (!password || password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    if (!role) {
      return c.json({ error: 'Role is required' }, 400);
    }

    // For riders, use username@delivery.local format
    const userEmail = role === 'rider' && username ? 
      `${username}@delivery.local` : email;

    if (!userEmail) {
      return c.json({ error: 'Email or username is required' }, 400);
    }

    console.log('Creating user with email:', userEmail);

    // Create a fresh Supabase client for this request
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: userEmail,
      password,
      user_metadata: {
        name,
        role,
        ...(username && { username }),
        ...(role === 'rider' && { status: 'available' })
      },
      email_confirm: true // Auto-confirm since email server isn't configured
    });

    if (error) {
      console.log('Supabase sign up error:', error);
      return c.json({ error: error.message }, 400);
    }

    console.log('User created successfully, attempting auto sign-in');

    // Sign in the newly created user
    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: userEmail,
      password
    });

    if (signInError) {
      console.log('Auto sign-in error after signup:', signInError);
      return c.json({ 
        success: true, 
        message: 'Account created successfully. Please sign in.',
        userId: data.user.id 
      });
    }

    console.log('Auto sign-in successful');

    return c.json({
      success: true,
      accessToken: signInData.session.access_token,
      user: signInData.user
    });
  } catch (error) {
    console.log('Sign up exception:', error);
    return c.json({ error: `Failed to create account: ${error.message || 'Unknown error'}` }, 500);
  }
});

// Get all riders (admin only)
app.get('/make-server-f438b3f9/riders', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) {
      console.log('Error fetching riders:', error);
      return c.json({ error: 'Failed to fetch riders' }, 500);
    }

    const riders = data.users
      .filter(u => u.user_metadata?.role === 'rider')
      .map(u => ({
        id: u.id,
        username: u.user_metadata?.username,
        name: u.user_metadata?.name,
        status: u.user_metadata?.status || 'available'
      }));

    return c.json({ riders });
  } catch (error) {
    console.log('Error fetching riders:', error);
    return c.json({ error: 'Failed to fetch riders' }, 500);
  }
});

// Create rider (admin only)
app.post('/make-server-f438b3f9/riders', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { username, password, name } = body;

    const { data, error } = await supabase.auth.admin.createUser({
      email: `${username}@delivery.local`,
      password,
      user_metadata: {
        username,
        name,
        role: 'rider',
        status: 'available'
      },
      email_confirm: true
    });

    if (error) {
      console.log('Error creating rider:', error);
      return c.json({ error: `Failed to create rider: ${error.message}` }, 400);
    }

    return c.json({
      rider: {
        id: data.user.id,
        username,
        name,
        status: 'available'
      }
    });
  } catch (error) {
    console.log('Error creating rider:', error);
    return c.json({ error: 'Failed to create rider' }, 500);
  }
});

// Change rider password (admin only)
app.post('/make-server-f438b3f9/riders/:riderId/password', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const riderId = c.req.param('riderId');
    const body = await c.req.json();
    const { password } = body;

    const { error } = await supabase.auth.admin.updateUserById(riderId, {
      password
    });

    if (error) {
      console.log('Error changing rider password:', error);
      return c.json({ error: `Failed to change password: ${error.message}` }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Error changing rider password:', error);
    return c.json({ error: 'Failed to change password' }, 500);
  }
});

// Update rider status
app.post('/make-server-f438b3f9/riders/:riderId/status', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const riderId = c.req.param('riderId');
    const body = await c.req.json();
    const { status } = body;

    const { error } = await supabase.auth.admin.updateUserById(riderId, {
      user_metadata: { status }
    });

    if (error) {
      console.log('Error updating rider status:', error);
      return c.json({ error: `Failed to update status: ${error.message}` }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Error updating rider status:', error);
    return c.json({ error: 'Failed to update status' }, 500);
  }
});

// Get orders for a specific date
app.get('/make-server-f438b3f9/orders/:date', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const date = c.req.param('date');
    const ordersKey = `orders_${date}`;
    const orders = await kv.get(ordersKey);

    return c.json({ orders: orders ? JSON.parse(orders) : [] });
  } catch (error) {
    console.log('Error fetching orders:', error);
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }
});

// Get orders assigned to a specific rider
app.get('/make-server-f438b3f9/riders/:riderId/orders', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const riderId = c.req.param('riderId');
    const today = new Date().toISOString().split('T')[0];
    const ordersKey = `orders_${today}`;
    const orders = await kv.get(ordersKey);
    const allOrders = orders ? JSON.parse(orders) : [];

    const riderOrders = allOrders.filter((o: any) => o.assignedTo === riderId);

    return c.json({ orders: riderOrders });
  } catch (error) {
    console.log('Error fetching rider orders:', error);
    return c.json({ error: 'Failed to fetch rider orders' }, 500);
  }
});

// Add order
app.post('/make-server-f438b3f9/orders', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || (user.user_metadata?.role !== 'admin')) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { date, order, syncToSheets } = body;

    const ordersKey = `orders_${date}`;
    const orders = await kv.get(ordersKey);
    const allOrders = orders ? JSON.parse(orders) : [];

    const newOrder = {
      ...order,
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'pending',
      paymentStatus: 'pending',
      source: 'manual'
    };

    allOrders.push(newOrder);
    await kv.set(ordersKey, JSON.stringify(allOrders));

    // If syncToSheets is true, we'll handle it on the frontend
    return c.json({ success: true, order: newOrder });
  } catch (error) {
    console.log('Error adding order:', error);
    return c.json({ error: 'Failed to add order' }, 500);
  }
});

// Assign order to rider
app.post('/make-server-f438b3f9/orders/:orderId/assign', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orderId = c.req.param('orderId');
    const body = await c.req.json();
    const { date, riderId } = body;

    const ordersKey = `orders_${date}`;
    const orders = await kv.get(ordersKey);
    const allOrders = orders ? JSON.parse(orders) : [];

    const orderIndex = allOrders.findIndex((o: any) => o.id === orderId);
    if (orderIndex === -1) {
      return c.json({ error: 'Order not found' }, 404);
    }

    allOrders[orderIndex].assignedTo = riderId;
    allOrders[orderIndex].assignedAt = new Date().toISOString();
    await kv.set(ordersKey, JSON.stringify(allOrders));

    // Update rider status to busy
    await supabase.auth.admin.updateUserById(riderId, {
      user_metadata: { status: 'busy' }
    });

    return c.json({ success: true, order: allOrders[orderIndex] });
  } catch (error) {
    console.log('Error assigning order:', error);
    return c.json({ error: 'Failed to assign order' }, 500);
  }
});

// Update order amount
app.post('/make-server-f438b3f9/orders/:orderId/amount', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orderId = c.req.param('orderId');
    const body = await c.req.json();
    const { date, amount } = body;

    const ordersKey = `orders_${date}`;
    const orders = await kv.get(ordersKey);
    const allOrders = orders ? JSON.parse(orders) : [];

    const orderIndex = allOrders.findIndex((o: any) => o.id === orderId);
    if (orderIndex === -1) {
      return c.json({ error: 'Order not found' }, 404);
    }

    allOrders[orderIndex].amount = amount;
    await kv.set(ordersKey, JSON.stringify(allOrders));

    return c.json({ success: true, order: allOrders[orderIndex] });
  } catch (error) {
    console.log('Error updating order amount:', error);
    return c.json({ error: 'Failed to update order amount' }, 500);
  }
});

// Update delivery status (rider only)
app.post('/make-server-f438b3f9/orders/:orderId/delivery-status', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orderId = c.req.param('orderId');
    const body = await c.req.json();
    const { date, status } = body;

    const ordersKey = `orders_${date}`;
    const orders = await kv.get(ordersKey);
    const allOrders = orders ? JSON.parse(orders) : [];

    const orderIndex = allOrders.findIndex((o: any) => o.id === orderId);
    if (orderIndex === -1) {
      return c.json({ error: 'Order not found' }, 404);
    }

    allOrders[orderIndex].deliveryStatus = status;
    if (status === 'delivered') {
      allOrders[orderIndex].deliveredAt = new Date().toISOString();
    }
    await kv.set(ordersKey, JSON.stringify(allOrders));

    return c.json({ success: true, order: allOrders[orderIndex] });
  } catch (error) {
    console.log('Error updating delivery status:', error);
    return c.json({ error: 'Failed to update delivery status' }, 500);
  }
});

// Update payment (rider or dispatcher)
app.post('/make-server-f438b3f9/orders/:orderId/payment', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const role = user.user_metadata?.role;
    if (role !== 'rider' && role !== 'dispatcher' && role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const orderId = c.req.param('orderId');
    const body = await c.req.json();
    const { date, paymentMethod } = body;

    const ordersKey = `orders_${date}`;
    const orders = await kv.get(ordersKey);
    const allOrders = orders ? JSON.parse(orders) : [];

    const orderIndex = allOrders.findIndex((o: any) => o.id === orderId);
    if (orderIndex === -1) {
      return c.json({ error: 'Order not found' }, 404);
    }

    allOrders[orderIndex].paymentMethod = paymentMethod;
    allOrders[orderIndex].paymentStatus = 'collected';
    allOrders[orderIndex].paymentCollectedAt = new Date().toISOString();
    allOrders[orderIndex].paymentCollectedBy = user.id;
    await kv.set(ordersKey, JSON.stringify(allOrders));

    // Check if rider has any more active orders
    if (role === 'rider') {
      const riderId = user.id;
      const activeOrders = allOrders.filter((o: any) => 
        o.assignedTo === riderId && 
        (o.deliveryStatus !== 'delivered' || o.paymentStatus !== 'collected')
      );

      if (activeOrders.length === 0) {
        await supabase.auth.admin.updateUserById(riderId, {
          user_metadata: { status: 'available' }
        });
      }
    }

    return c.json({ success: true, order: allOrders[orderIndex] });
  } catch (error) {
    console.log('Error updating payment:', error);
    return c.json({ error: 'Failed to update payment' }, 500);
  }
});

// Get daily summary
app.get('/make-server-f438b3f9/summary/:date', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const date = c.req.param('date');
    const ordersKey = `orders_${date}`;
    const orders = await kv.get(ordersKey);
    const allOrders = orders ? JSON.parse(orders) : [];

    const totalOrders = allOrders.length;
    const deliveredOrders = allOrders.filter((o: any) => o.deliveryStatus === 'delivered').length;
    const undeliveredOrders = totalOrders - deliveredOrders;
    const unassignedOrders = allOrders.filter((o: any) => !o.assignedTo).length;
    const assignedOrders = allOrders.filter((o: any) => o.assignedTo).length;

    const cashPayments = allOrders
      .filter((o: any) => o.paymentMethod === 'cash' && o.paymentStatus === 'collected')
      .reduce((sum: number, o: any) => sum + (parseFloat(o.amount) || 0), 0);

    const cardPayments = allOrders
      .filter((o: any) => o.paymentMethod === 'card' && o.paymentStatus === 'collected')
      .reduce((sum: number, o: any) => sum + (parseFloat(o.amount) || 0), 0);

    // Get rider summaries
    const { data } = await supabase.auth.admin.listUsers();
    const riders = data?.users.filter(u => u.user_metadata?.role === 'rider') || [];

    const riderSummaries = riders.map(rider => {
      const riderOrders = allOrders.filter((o: any) => o.assignedTo === rider.id);
      const riderDelivered = riderOrders.filter((o: any) => o.deliveryStatus === 'delivered').length;
      const riderCash = riderOrders
        .filter((o: any) => o.paymentMethod === 'cash' && o.paymentStatus === 'collected')
        .reduce((sum: number, o: any) => sum + (parseFloat(o.amount) || 0), 0);
      const riderCard = riderOrders
        .filter((o: any) => o.paymentMethod === 'card' && o.paymentStatus === 'collected')
        .reduce((sum: number, o: any) => sum + (parseFloat(o.amount) || 0), 0);

      return {
        riderId: rider.id,
        riderName: rider.user_metadata?.name || rider.user_metadata?.username,
        totalAssigned: riderOrders.length,
        delivered: riderDelivered,
        cashCollected: riderCash,
        cardCollected: riderCard,
        status: rider.user_metadata?.status || 'available'
      };
    });

    return c.json({
      summary: {
        totalOrders,
        deliveredOrders,
        undeliveredOrders,
        unassignedOrders,
        assignedOrders,
        cashPayments,
        cardPayments
      },
      riderSummaries
    });
  } catch (error) {
    console.log('Error fetching summary:', error);
    return c.json({ error: 'Failed to fetch summary' }, 500);
  }
});

// Save Shopify API settings
app.post('/make-server-f438b3f9/settings/shopify', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { storeUrl, apiKey, apiSecret, accessToken } = body;

    await kv.set('shopify_settings', JSON.stringify({
      storeUrl,
      apiKey,
      apiSecret,
      accessToken
    }));

    return c.json({ success: true });
  } catch (error) {
    console.log('Error saving Shopify settings:', error);
    return c.json({ error: 'Failed to save Shopify settings' }, 500);
  }
});

// Get Shopify settings
app.get('/make-server-f438b3f9/settings/shopify', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const settings = await kv.get('shopify_settings');
    return c.json({ settings: settings ? JSON.parse(settings) : null });
  } catch (error) {
    console.log('Error fetching Shopify settings:', error);
    return c.json({ error: 'Failed to fetch Shopify settings' }, 500);
  }
});

// Test Shopify connection
app.post('/make-server-f438b3f9/shopify/test', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const settings = await kv.get('shopify_settings');
    if (!settings) {
      return c.json({ error: 'Shopify settings not found' }, 404);
    }

    const { storeUrl, accessToken } = JSON.parse(settings);
    const url = `https://${storeUrl}/admin/api/2024-01/shop.json`;

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });

    if (!response.ok) {
      return c.json({ error: 'Failed to connect to Shopify', success: false }, 400);
    }

    return c.json({ success: true, message: 'Successfully connected to Shopify' });
  } catch (error) {
    console.log('Error testing Shopify connection:', error);
    return c.json({ error: 'Failed to test connection', success: false }, 500);
  }
});

// Fetch Shopify orders
app.post('/make-server-f438b3f9/shopify/fetch-orders', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const settings = await kv.get('shopify_settings');
    if (!settings) {
      return c.json({ error: 'Shopify settings not found' }, 404);
    }

    const { storeUrl, accessToken } = JSON.parse(settings);
    const url = `https://${storeUrl}/admin/api/2024-01/orders.json?status=any&limit=250`;

    const response = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });

    if (!response.ok) {
      return c.json({ error: 'Failed to fetch Shopify orders' }, 400);
    }

    const data = await response.json();
    const shopifyOrders = data.orders || [];

    // Store Shopify orders in Supabase (today's date)
    const today = new Date().toISOString().split('T')[0];
    const ordersKey = `orders_${today}`;
    const existingOrders = await kv.get(ordersKey);
    const allOrders = existingOrders ? JSON.parse(existingOrders) : [];

    const newOrders = shopifyOrders.map((order: any) => ({
      id: `shopify_${order.id}`,
      shopifyOrderId: order.id,
      customerName: order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Unknown',
      customerPhone: order.customer?.phone || '',
      address: order.shipping_address ? 
        `${order.shipping_address.address1}, ${order.shipping_address.city}, ${order.shipping_address.zip}` : '',
      amount: order.total_price,
      items: order.line_items.map((item: any) => item.title).join(', '),
      createdAt: order.created_at,
      deliveryStatus: 'pending',
      paymentStatus: 'pending',
      source: 'shopify'
    }));

    // Add only new Shopify orders (avoid duplicates)
    const existingShopifyIds = allOrders
      .filter((o: any) => o.source === 'shopify')
      .map((o: any) => o.shopifyOrderId);

    const ordersToAdd = newOrders.filter((o: any) => 
      !existingShopifyIds.includes(o.shopifyOrderId)
    );

    allOrders.push(...ordersToAdd);
    await kv.set(ordersKey, JSON.stringify(allOrders));

    return c.json({ 
      success: true, 
      message: `Fetched ${shopifyOrders.length} orders, added ${ordersToAdd.length} new orders` 
    });
  } catch (error) {
    console.log('Error fetching Shopify orders:', error);
    return c.json({ error: 'Failed to fetch Shopify orders' }, 500);
  }
});

// Save Google Sheets settings
app.post('/make-server-f438b3f9/settings/google-sheets', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { spreadsheetId, apiKey } = body;

    await kv.set('google_sheets_settings', JSON.stringify({
      spreadsheetId,
      apiKey
    }));

    return c.json({ success: true });
  } catch (error) {
    console.log('Error saving Google Sheets settings:', error);
    return c.json({ error: 'Failed to save Google Sheets settings' }, 500);
  }
});

// Get Google Sheets settings
app.get('/make-server-f438b3f9/settings/google-sheets', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const settings = await kv.get('google_sheets_settings');
    return c.json({ settings: settings ? JSON.parse(settings) : null });
  } catch (error) {
    console.log('Error fetching Google Sheets settings:', error);
    return c.json({ error: 'Failed to fetch Google Sheets settings' }, 500);
  }
});

// Test Google Sheets connection
app.post('/make-server-f438b3f9/google-sheets/test', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const settings = await kv.get('google_sheets_settings');
    if (!settings) {
      return c.json({ error: 'Google Sheets settings not found', success: false }, 404);
    }

    const { spreadsheetId, apiKey } = JSON.parse(settings);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      console.log('Google Sheets API error:', errorData);
      return c.json({ 
        error: errorData.error?.message || 'Failed to connect to Google Sheets', 
        success: false 
      }, 400);
    }

    return c.json({ success: true, message: 'Successfully connected to Google Sheets' });
  } catch (error) {
    console.log('Error testing Google Sheets connection:', error);
    return c.json({ error: 'Failed to test connection', success: false }, 500);
  }
});

// Write order to Google Sheets
app.post('/make-server-f438b3f9/google-sheets/add-order', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const settings = await kv.get('google_sheets_settings');
    if (!settings) {
      return c.json({ error: 'Google Sheets settings not found' }, 404);
    }

    const { spreadsheetId, apiKey } = JSON.parse(settings);
    const body = await c.req.json();
    const { date, order } = body;

    // Append to the sheet tab with the date name
    const range = `${date}!A:Z`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&key=${apiKey}`;

    const values = [[
      order.id,
      order.customerName || '',
      order.customerPhone || '',
      order.address || '',
      order.amount || '',
      order.items || '',
      order.deliveryStatus || 'pending',
      order.paymentStatus || 'pending',
      order.paymentMethod || '',
      order.assignedTo || '',
      order.createdAt || new Date().toISOString()
    ]];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.log('Error writing to Google Sheets:', errorData);
      return c.json({ 
        error: errorData.error?.message || 'Failed to write to Google Sheets', 
        success: false 
      }, 400);
    }

    return c.json({ success: true });
  } catch (error) {
    console.log('Error writing to Google Sheets:', error);
    return c.json({ error: 'Failed to write to Google Sheets' }, 500);
  }
});

// Sync orders from Google Sheets
app.post('/make-server-f438b3f9/google-sheets/sync-orders', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const settings = await kv.get('google_sheets_settings');
    if (!settings) {
      return c.json({ error: 'Google Sheets settings not found' }, 404);
    }

    const { spreadsheetId, apiKey } = JSON.parse(settings);
    const body = await c.req.json();
    const { date } = body;

    // Read from the sheet tab with the date name
    // Column mapping: A=order number, B=receipt number(skip), C=customer name, 
    // D=customer number, E=amount, F=receipt amount(skip), G=delivery area
    const range = `${date}!A:G`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json();
      console.log('Error reading from Google Sheets:', errorData);
      return c.json({ 
        error: errorData.error?.message || 'Failed to read from Google Sheets', 
        success: false 
      }, 400);
    }

    const data = await response.json();
    const rows = data.values || [];

    // Skip header row if present
    const dataRows = rows.length > 0 && rows[0][0]?.toLowerCase().includes('order') ? rows.slice(1) : rows;

    // Get existing orders for this date
    const ordersKey = `orders_${date}`;
    const existingOrdersData = await kv.get(ordersKey);
    const existingOrders = existingOrdersData ? JSON.parse(existingOrdersData) : [];

    // Track existing Google Sheets order numbers to avoid duplicates
    const existingSheetOrderNumbers = new Set(
      existingOrders
        .filter((o: any) => o.source === 'google_sheets')
        .map((o: any) => o.orderNumber)
    );

    let newOrdersCount = 0;
    const newOrders: any[] = [];

    // Process each row from Google Sheets
    for (const row of dataRows) {
      const orderNumber = row[0]?.trim();
      // Skip row B (receipt number) at index 1
      const customerName = row[2]?.trim();
      const customerPhone = row[3]?.trim();
      const amount = row[4]?.trim();
      // Skip row F (receipt amount) at index 5
      const deliveryArea = row[6]?.trim();

      // Skip if order number is empty or already exists
      if (!orderNumber || existingSheetOrderNumbers.has(orderNumber)) {
        continue;
      }

      // Create new order from Google Sheets data
      const newOrder = {
        id: `sheets_${orderNumber}_${Date.now()}`,
        orderNumber: orderNumber,
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        address: deliveryArea || '',
        amount: amount || '0',
        items: '',
        createdAt: new Date().toISOString(),
        deliveryStatus: 'pending',
        paymentStatus: 'pending',
        source: 'google_sheets'
      };

      newOrders.push(newOrder);
      existingSheetOrderNumbers.add(orderNumber);
      newOrdersCount++;
    }

    // Add new orders to existing orders
    if (newOrders.length > 0) {
      existingOrders.push(...newOrders);
      await kv.set(ordersKey, JSON.stringify(existingOrders));
    }

    return c.json({ 
      success: true, 
      message: `Synced ${dataRows.length} rows, added ${newOrdersCount} new orders`,
      newOrdersCount 
    });
  } catch (error) {
    console.log('Error syncing from Google Sheets:', error);
    return c.json({ error: 'Failed to sync from Google Sheets' }, 500);
  }
});

// Update rider location
app.post('/make-server-f438b3f9/riders/:riderId/location', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const riderId = c.req.param('riderId');
    const body = await c.req.json();
    const { latitude, longitude } = body;

    // Store location with timestamp
    const locationKey = `rider_location_${riderId}`;
    await kv.set(locationKey, JSON.stringify({
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    }));

    return c.json({ success: true });
  } catch (error) {
    console.log('Error updating rider location:', error);
    return c.json({ error: 'Failed to update location' }, 500);
  }
});

// Get all rider locations (admin only)
app.get('/make-server-f438b3f9/riders/locations', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user || user.user_metadata?.role !== 'admin') {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get all riders
    const { data } = await supabase.auth.admin.listUsers();
    const riders = data?.users.filter(u => u.user_metadata?.role === 'rider') || [];

    // Get location for each rider
    const riderLocations = await Promise.all(
      riders.map(async (rider) => {
        const locationKey = `rider_location_${rider.id}`;
        const locationData = await kv.get(locationKey);
        
        return {
          riderId: rider.id,
          riderName: rider.user_metadata?.name || rider.user_metadata?.username,
          status: rider.user_metadata?.status || 'available',
          location: locationData ? JSON.parse(locationData) : null
        };
      })
    );

    return c.json({ locations: riderLocations });
  } catch (error) {
    console.log('Error fetching rider locations:', error);
    return c.json({ error: 'Failed to fetch locations' }, 500);
  }
});

// Get rider location by ID
app.get('/make-server-f438b3f9/riders/:riderId/location', async (c) => {
  try {
    const user = await verifyAuth(c.req.raw);
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const riderId = c.req.param('riderId');
    const locationKey = `rider_location_${riderId}`;
    const locationData = await kv.get(locationKey);

    return c.json({ 
      location: locationData ? JSON.parse(locationData) : null 
    });
  } catch (error) {
    console.log('Error fetching rider location:', error);
    return c.json({ error: 'Failed to fetch location' }, 500);
  }
});

Deno.serve(app.fetch);