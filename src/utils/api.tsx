import { projectId, publicAnonKey } from './supabase/info';

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-f438b3f9`;

export async function signIn(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/signin`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify({ email, password })
  });
  if (!response.ok) {
    const error = await response.json();
    console.error('Sign in API error:', error);
    throw new Error(error.error || 'Failed to sign in');
  }
  return response.json();
}

export async function signUp(data: { email?: string; password: string; name: string; role: string; username?: string }) {
  console.log('Sign up API call to:', `${API_BASE}/auth/signup`);
  console.log('Sign up data:', { ...data, password: '***' });
  
  try {
    const response = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`
      },
      body: JSON.stringify(data)
    });
    
    console.log('Sign up response status:', response.status);
    const responseData = await response.json();
    console.log('Sign up response data:', responseData);
    
    if (!response.ok) {
      console.error('Sign up API error:', responseData);
      throw new Error(responseData.error || 'Failed to create account');
    }
    
    return responseData;
  } catch (error) {
    console.error('Sign up fetch error:', error);
    throw error;
  }
}

export async function getRiders(accessToken: string) {
  const response = await fetch(`${API_BASE}/riders`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Failed to fetch riders');
  return response.json();
}

export async function createRider(accessToken: string, data: any) {
  const response = await fetch(`${API_BASE}/riders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create rider');
  }
  return response.json();
}

export async function changeRiderPassword(accessToken: string, riderId: string, password: string) {
  const response = await fetch(`${API_BASE}/riders/${riderId}/password`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to change password');
  }
  return response.json();
}

export async function updateRiderStatus(accessToken: string, riderId: string, status: string) {
  const response = await fetch(`${API_BASE}/riders/${riderId}/status`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  });
  if (!response.ok) throw new Error('Failed to update rider status');
  return response.json();
}

export async function getOrders(accessToken: string, date: string) {
  const response = await fetch(`${API_BASE}/orders/${date}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Failed to fetch orders');
  return response.json();
}

export async function getRiderOrders(accessToken: string, riderId: string) {
  const response = await fetch(`${API_BASE}/riders/${riderId}/orders`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Failed to fetch rider orders');
  return response.json();
}

export async function addOrder(accessToken: string, date: string, order: any, syncToSheets: boolean = false) {
  const response = await fetch(`${API_BASE}/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date, order, syncToSheets })
  });
  if (!response.ok) throw new Error('Failed to add order');
  return response.json();
}

export async function assignOrder(accessToken: string, orderId: string, date: string, riderId: string) {
  const response = await fetch(`${API_BASE}/orders/${orderId}/assign`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date, riderId })
  });
  if (!response.ok) throw new Error('Failed to assign order');
  return response.json();
}

export async function updateOrderAmount(accessToken: string, orderId: string, date: string, amount: string) {
  const response = await fetch(`${API_BASE}/orders/${orderId}/amount`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date, amount })
  });
  if (!response.ok) throw new Error('Failed to update order amount');
  return response.json();
}

export async function updateDeliveryStatus(accessToken: string, orderId: string, date: string, status: string) {
  const response = await fetch(`${API_BASE}/orders/${orderId}/delivery-status`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date, status })
  });
  if (!response.ok) throw new Error('Failed to update delivery status');
  return response.json();
}

export async function updatePayment(accessToken: string, orderId: string, date: string, paymentMethod: string) {
  const response = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date, paymentMethod })
  });
  if (!response.ok) throw new Error('Failed to update payment');
  return response.json();
}

export async function getDailySummary(accessToken: string, date: string) {
  const response = await fetch(`${API_BASE}/summary/${date}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Failed to fetch summary');
  return response.json();
}

export async function saveShopifySettings(accessToken: string, settings: any) {
  const response = await fetch(`${API_BASE}/settings/shopify`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  });
  if (!response.ok) throw new Error('Failed to save Shopify settings');
  return response.json();
}

export async function getShopifySettings(accessToken: string) {
  const response = await fetch(`${API_BASE}/settings/shopify`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Failed to fetch Shopify settings');
  return response.json();
}

export async function testShopifyConnection(accessToken: string) {
  const response = await fetch(`${API_BASE}/shopify/test`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to test Shopify connection');
  return data;
}

export async function fetchShopifyOrders(accessToken: string) {
  const response = await fetch(`${API_BASE}/shopify/fetch-orders`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch Shopify orders');
  }
  return response.json();
}

export async function saveGoogleSheetsSettings(accessToken: string, settings: any) {
  const response = await fetch(`${API_BASE}/settings/google-sheets`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  });
  if (!response.ok) throw new Error('Failed to save Google Sheets settings');
  return response.json();
}

export async function getGoogleSheetsSettings(accessToken: string) {
  const response = await fetch(`${API_BASE}/settings/google-sheets`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Failed to fetch Google Sheets settings');
  return response.json();
}

export async function testGoogleSheetsConnection(accessToken: string) {
  const response = await fetch(`${API_BASE}/google-sheets/test`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to test Google Sheets connection');
  return data;
}

export async function addOrderToGoogleSheets(accessToken: string, date: string, order: any) {
  const response = await fetch(`${API_BASE}/google-sheets/add-order`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date, order })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add order to Google Sheets');
  }
  return response.json();
}

export async function syncGoogleSheetsOrders(accessToken: string, date: string) {
  const response = await fetch(`${API_BASE}/google-sheets/sync-orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ date })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to sync orders from Google Sheets');
  }
  return response.json();
}

export async function updateRiderLocation(accessToken: string, riderId: string, latitude: number, longitude: number) {
  const response = await fetch(`${API_BASE}/riders/${riderId}/location`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ latitude, longitude })
  });
  if (!response.ok) throw new Error('Failed to update rider location');
  return response.json();
}

export async function getAllRiderLocations(accessToken: string) {
  const response = await fetch(`${API_BASE}/riders/locations`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Failed to fetch rider locations');
  return response.json();
}

export async function getRiderLocation(accessToken: string, riderId: string) {
  const response = await fetch(`${API_BASE}/riders/${riderId}/location`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error('Failed to fetch rider location');
  return response.json();
}