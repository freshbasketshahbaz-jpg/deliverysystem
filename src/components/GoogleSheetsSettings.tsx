import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { saveGoogleSheetsSettings, getGoogleSheetsSettings, testGoogleSheetsConnection, syncGoogleSheetsOrders } from '../utils/api';
import { CheckCircle, AlertCircle, ExternalLink, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function GoogleSheetsSettings() {
  const { accessToken } = useAuth();
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!accessToken) return;
    try {
      const data = await getGoogleSheetsSettings(accessToken);
      if (data.settings) {
        setSpreadsheetId(data.settings.spreadsheetId || '');
        setApiKey(data.settings.apiKey || '');
        setAutoSyncEnabled(data.settings.autoSyncEnabled || true);
        setLastSyncTime(data.settings.lastSyncTime ? new Date(data.settings.lastSyncTime) : null);
      }
    } catch (error) {
      console.error('Error loading Google Sheets settings:', error);
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;
    if (!spreadsheetId) {
      toast.error('Please enter a Spreadsheet ID');
      return;
    }
    if (!apiKey) {
      toast.error('Please enter an API Key');
      return;
    }
    
    setLoading(true);
    try {
      await saveGoogleSheetsSettings(accessToken, {
        spreadsheetId,
        apiKey,
        autoSyncEnabled
      });
      toast.success('Google Sheets settings saved successfully');
    } catch (error: any) {
      console.error('Error saving Google Sheets settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!accessToken) return;
    if (!spreadsheetId || !apiKey) {
      toast.error('Please save your settings first');
      return;
    }
    
    setTestStatus('testing');
    try {
      const result = await testGoogleSheetsConnection(accessToken);
      if (result.success) {
        setTestStatus('success');
        toast.success('Successfully connected to Google Sheets!');
      } else {
        setTestStatus('error');
        toast.error(result.error || 'Failed to connect to Google Sheets');
      }
    } catch (error: any) {
      console.error('Error testing Google Sheets connection:', error);
      setTestStatus('error');
      toast.error(error.message || 'Failed to test connection');
    }
  };

  const handleSyncOrders = async () => {
    if (!accessToken) return;
    if (!spreadsheetId || !apiKey) {
      toast.error('Please save your settings first');
      return;
    }
    
    setSyncStatus('syncing');
    try {
      const result = await syncGoogleSheetsOrders(accessToken, selectedDate);
      if (result.success) {
        setSyncStatus('success');
        const message = result.newOrdersCount > 0 
          ? `Synced ${result.newOrdersCount} new orders from Google Sheets!` 
          : 'No new orders to sync';
        toast.success(message);
        setLastSyncTime(new Date());
        
        // Reset status after 3 seconds
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('error');
        toast.error(result.error || 'Failed to sync orders');
      }
    } catch (error: any) {
      console.error('Error syncing Google Sheets orders:', error);
      setSyncStatus('error');
      toast.error(error.message || 'Failed to sync orders');
    }
  };

  // Auto-sync every 2 minutes
  useEffect(() => {
    if (!autoSyncEnabled || !accessToken || !spreadsheetId || !apiKey) {
      return;
    }

    const autoSync = async () => {
      try {
        const result = await syncGoogleSheetsOrders(accessToken, selectedDate);
        if (result.success && result.newOrdersCount > 0) {
          console.log(`Auto-synced ${result.newOrdersCount} new orders`);
          setLastSyncTime(new Date());
        }
      } catch (error) {
        console.error('Auto-sync error:', error);
      }
    };

    // Initial sync
    autoSync();

    // Set up interval for every 2 minutes (120000 ms)
    const intervalId = setInterval(autoSync, 120000);

    return () => clearInterval(intervalId);
  }, [autoSyncEnabled, accessToken, spreadsheetId, apiKey, selectedDate]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2>Google Sheets API Settings</h2>
        <p className="text-gray-600 mt-1">Configure your Google Sheets integration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection Settings</CardTitle>
          <CardDescription>
            Connect your Google Sheets using API Key authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="spreadsheet-id">Spreadsheet ID</Label>
            <Input
              id="spreadsheet-id"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="Enter your Google Sheets ID"
            />
            <p className="text-sm text-gray-600">
              Find this in your sheet URL: docs.google.com/spreadsheets/d/<strong>SPREADSHEET_ID</strong>/edit
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">Google Sheets API Key</Label>
            <div className="relative">
              <Input
                id="api-key"
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Google Sheets API Key"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Create an API key in Google Cloud Console with Google Sheets API enabled
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            
            {spreadsheetId && apiKey && (
              <Button variant="outline" onClick={handleTestConnection} disabled={testStatus === 'testing'}>
                {testStatus === 'testing' ? (
                  'Testing...'
                ) : testStatus === 'success' ? (
                  <>
                    <CheckCircle className="size-4 mr-2 text-green-600" />
                    Connected
                  </>
                ) : testStatus === 'error' ? (
                  <>
                    <AlertCircle className="size-4 mr-2 text-red-600" />
                    Failed
                  </>
                ) : (
                  'Test Connection'
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-medium mb-2">1. Enable Google Sheets API</h4>
              <ol className="list-decimal list-inside text-gray-600 space-y-1">
                <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console</a></li>
                <li>Create a new project or select an existing one</li>
                <li>Enable the <strong>Google Sheets API</strong></li>
                <li>Go to "Credentials" and click "Create Credentials"</li>
                <li>Select "API Key" and copy the generated key</li>
                <li>Restrict the API key to only Google Sheets API for security</li>
              </ol>
              <a
                href="https://developers.google.com/sheets/api/guides/authorizing#APIKey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-2"
              >
                API Key Setup Guide
                <ExternalLink className="size-3" />
              </a>
            </div>

            <div>
              <h4 className="font-medium mb-2">2. Share Your Spreadsheet</h4>
              <p className="text-gray-600">
                Make sure your Google Sheet is set to <strong>"Anyone with the link can edit"</strong> or share it with the service account email if using one.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">3. Sheet Structure</h4>
              <p className="text-gray-600">
                Create tabs in your spreadsheet named exactly as dates: <code className="bg-gray-100 px-1 py-0.5 rounded">YYYY-MM-DD</code>
              </p>
              <p className="text-gray-600 mt-1">
                Example: <code className="bg-gray-100 px-1 py-0.5 rounded">2024-11-24</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">2024-11-25</code>
              </p>
              <p className="text-gray-600 mt-2">
                <strong>Column Structure:</strong>
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-1 ml-2">
                <li><strong>Column A:</strong> Order Number</li>
                <li><strong>Column B:</strong> Receipt Number (will be skipped during sync)</li>
                <li><strong>Column C:</strong> Customer Name</li>
                <li><strong>Column D:</strong> Customer Number</li>
                <li><strong>Column E:</strong> Amount</li>
                <li><strong>Column F:</strong> Receipt Amount (will be skipped during sync)</li>
                <li><strong>Column G:</strong> Delivery Area</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium mb-2">4. Order Syncing</h4>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Manual orders added by admin are synced to Google Sheets</li>
                <li>Google Sheets orders are synced to the system automatically every 2 minutes</li>
                <li>Shopify orders are NOT synced to Google Sheets (only to Supabase)</li>
                <li>Orders are synced from the date tab matching today's date</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Important Notes:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Each date must have its own tab named exactly like: <code className="bg-blue-100 px-1 py-0.5 rounded">YYYY-MM-DD</code></li>
          <li>• The spreadsheet must be publicly accessible or shared appropriately</li>
          <li>• The system will automatically write to the tab matching the order date</li>
          <li>• Test the connection after saving to verify everything works</li>
        </ul>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Order Syncing</CardTitle>
          <CardDescription>
            Sync orders from Google Sheets to the system automatically or manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sync-date">Select Date to Sync</Label>
            <Input
              id="sync-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <p className="text-sm text-gray-600">
              Choose which date's orders to sync from Google Sheets
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="auto-sync"
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="auto-sync" className="cursor-pointer">Enable Auto-Sync (every 2 minutes)</Label>
            </div>
            <p className="text-sm text-gray-600">
              When enabled, orders from Google Sheets will be automatically synced to the system every 2 minutes for the selected date
            </p>
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSyncOrders} disabled={syncStatus === 'syncing'}>
              {syncStatus === 'syncing' ? (
                'Syncing...'
              ) : syncStatus === 'success' ? (
                <>
                  <CheckCircle className="size-4 mr-2 text-green-600" />
                  Synced
                </>
              ) : syncStatus === 'error' ? (
                <>
                  <AlertCircle className="size-4 mr-2 text-red-600" />
                  Failed
                </>
              ) : (
                <>
                  <RefreshCw className="size-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
            
            {lastSyncTime && (
              <span className="flex items-center text-sm text-gray-600">
                Last synced: {lastSyncTime.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> Orders will be synced from the Google Sheets tab named <code className="bg-yellow-100 px-1 py-0.5 rounded">{selectedDate}</code>. Make sure this tab exists in your spreadsheet.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}