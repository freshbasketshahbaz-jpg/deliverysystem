# Delivery Management System - Complete Guide

## Overview
A complete delivery management system with three user roles: Admin, Dispatcher, and Rider.

## Features Implemented

### 1. Authentication & Initial Setup
- **Default Page**: Sign In
- **Initial Setup**: One-time setup page to create:
  - Admin account
  - Riders (username + password)
  - Dispatchers (email + password)
- After setup completes, never shows again (stored in Supabase)
- "Create an Account" link on Sign In opens Initial Setup

### 2. User Roles & Permissions

#### Admin (Full System Access)
- Create riders
- Change rider passwords
- Assign orders to riders
- Edit order amounts
- Configure Shopify API settings
- Configure Google Sheets API settings
- Fetch Shopify orders (stored in Supabase only, NOT synced to Google Sheets)
- View all daily summaries
- Add manual orders (synced to both Supabase and Google Sheets)

#### Dispatcher
- View all orders
- Mark payments as collected (cash or card)
- See payment totals
- Cannot create users or change passwords

#### Rider
- View only assigned orders
- Update delivery status: pending → accepted → en route → delivered
- Select payment method: cash or card
- Status automatically updates:
  - **busy** when they have active orders
  - **available** when all deliveries + payments completed
- Cannot change their own password

### 3. Admin Dashboard Structure

**Left Sidebar Menu Items:**
- Dashboard Home
- Order Management
- Payment Management
- Riders
- Shopify API Settings
- Google Sheets API Settings

**Dashboard Home:**
- Date Selector (loads orders from specific date)
- Daily Summary Cards:
  - Total orders
  - Delivered orders
  - Undelivered orders
  - Unassigned orders
  - Assigned orders
  - Cash payments total
  - Card payments total
  - Total collected
- Rider Summary Table:
  - Rider name
  - Total assigned orders (today)
  - Delivered orders (today)
  - Total cash collected (today)
  - Total card collected (today)
  - Current status (available/busy)

### 4. Order Management
- Shows all orders for selected date
- **Manually Add Order**: Creates order in Supabase AND Google Sheets
- Assign orders to riders
- Update order amount
- View delivery & payment status
- Order sources displayed: manual or shopify

**Important:**
- Shopify orders are stored in Supabase ONLY
- They are NOT written to Google Sheets
- Manual orders ARE synced to Google Sheets

### 5. Payment Management
- Used by Dispatcher and Admin
- Shows delivered orders needing payment confirmation
- Two payment methods: Cash or Card
- When payment collected:
  - Saves timestamp (date + time)
  - Updates order payment status
  - Updates rider daily payment totals
  - Updates daily summary totals

### 6. Rider App
- View only assigned orders
- Accept order
- Start delivery (en route)
- Mark delivered
- Select payment method (cash or card)
- After final payment submission:
  - If no active orders remaining, rider status = available

### 7. Shopify API Integration
**Settings Page Fields:**
- Store URL
- API Key
- API Secret
- Admin Access Token

**Buttons:**
- Test Connection
- Fetch Shopify Orders

**Rules:**
- Shopify orders go ONLY to Supabase
- They do NOT sync to Google Sheets
- They appear in Order Management for admin to assign

### 8. Google Sheets API Settings
**Fields:**
- Spreadsheet ID

**Buttons:**
- Connect Google Sheets (OAuth)
- Test Connection

**Instructions Provided:**
- Each date must have a tab named exactly: YYYY-MM-DD
- OAuth setup required (instructions provided in UI)

**Important:**
- Uses OAuth authentication (admin user authenticates)
- No service account needed
- Manual orders are synced to date-based tabs

### 9. Order Sync Rules

**Google Sheets:**
- Used for daily order sheets
- Date-based tab naming (one tab per date: YYYY-MM-DD)
- Manual orders added by admin are saved to both Supabase AND Google Sheets

**Shopify Orders:**
- Saved ONLY to Supabase
- Do NOT sync to Google Sheets

### 10. Payment Tracking
When rider or dispatcher collects payment:
- Payment method saved (cash or card)
- Timestamp saved
- Admin daily summary updates:
  - Total cash today
  - Total card today
- Rider summary shows:
  - Cash collected by rider today
  - Card collected by rider today

## Testing Guide

### Step 1: Initial Setup
1. App loads and checks if setup is complete
2. Shows Initial Setup page
3. Create:
   - Admin account (email + password)
   - At least one Rider (username + password)
   - Optionally, Dispatcher (email + password)
4. Click "Complete Setup"
5. Automatically signs in as Admin

### Step 2: Test Admin Features
1. View Dashboard Home (should show 0 orders initially)
2. Go to Order Management
3. Add a manual order (fills customer name, phone, address, amount)
4. Order appears in table
5. Assign order to a rider
6. Go to Riders page to see rider status changed to "busy"

### Step 3: Test Shopify Integration
1. Go to Shopify API Settings
2. Enter credentials (you need a Shopify store)
3. Click "Test Connection"
4. Click "Fetch Shopify Orders"
5. Orders appear in Order Management with "shopify" source tag

### Step 4: Test Google Sheets
1. Go to Google Sheets API Settings
2. Enter Spreadsheet ID
3. Note: OAuth implementation required for production
4. Manual orders should sync to date tabs

### Step 5: Test Rider App
1. Sign out from Admin
2. Sign in as Rider (use username@delivery.local as email)
3. View assigned orders
4. Accept order
5. Start delivery (en route)
6. Mark delivered
7. Collect payment (cash or card)
8. Status changes to "available" when all done

### Step 6: Test Dispatcher
1. Sign in as Dispatcher
2. View orders
3. Mark payments collected for delivered orders
4. See payment totals update

### Step 7: Test Dashboard
1. Sign in as Admin
2. Go to Dashboard Home
3. Select today's date
4. View daily summary
5. View rider summaries

## Technical Architecture

### Backend (Supabase Edge Function)
- `/supabase/functions/server/index.tsx`
- Handles all API routes
- Uses Supabase Auth for user management
- Uses KV store for data persistence

### Frontend Components
- `/App.tsx` - Main app with role-based routing
- `/components/SignIn.tsx` - Sign in page
- `/components/InitialSetup.tsx` - One-time setup
- `/components/AdminDashboard.tsx` - Admin dashboard with sidebar
- `/components/OrderManagement.tsx` - Order management page
- `/components/PaymentManagement.tsx` - Payment tracking
- `/components/RidersPage.tsx` - Rider management
- `/components/ShopifySettings.tsx` - Shopify API config
- `/components/GoogleSheetsSettings.tsx` - Google Sheets config
- `/components/DispatcherDashboard.tsx` - Dispatcher interface
- `/components/RiderApp.tsx` - Rider mobile-friendly interface

### API Layer
- `/utils/api.tsx` - All API calls to backend
- `/contexts/AuthContext.tsx` - Authentication context

## Important Notes

1. **Date Format**: Always use YYYY-MM-DD format for date tabs in Google Sheets
2. **Shopify Orders**: Never synced to Google Sheets (Supabase only)
3. **Manual Orders**: Always synced to both Supabase and Google Sheets
4. **Rider Status**: Automatically updated based on active orders
5. **Payment Tracking**: Both cash and card tracked with timestamps
6. **OAuth Setup**: Required for Google Sheets integration in production

## Production Considerations

1. **Google OAuth**: You need to set up Google OAuth credentials
2. **Shopify API**: Requires a Shopify store with API access
3. **Security**: All API routes are protected with authentication
4. **Real-time Updates**: Consider adding WebSocket support for live updates
5. **Mobile**: Rider app is mobile-friendly but could be enhanced

## Support

For issues or questions:
- Check browser console for error messages
- Verify Supabase connection is active
- Ensure all environment variables are set
- Test API endpoints individually
