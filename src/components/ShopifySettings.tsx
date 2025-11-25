import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import {
  saveShopifySettings,
  getShopifySettings,
  testShopifyConnection,
  fetchShopifyOrders
} from '../utils/api';
import { CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function ShopifySettings() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState({
    storeUrl: '',
    apiKey: '',
    apiSecret: '',
    accessToken: ''
  });
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!accessToken) return;
    try {
      const data = await getShopifySettings(accessToken);
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error loading Shopify settings:', error);
    }
  };

  const handleSave = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      await saveShopifySettings(accessToken, settings);
      toast.success('Shopify settings saved successfully');
    } catch (error: any) {
      console.error('Error saving Shopify settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!accessToken) return;
    setTestStatus('testing');
    try {
      const result = await testShopifyConnection(accessToken);
      if (result.success) {
        setTestStatus('success');
        toast.success('Successfully connected to Shopify!');
      } else {
        setTestStatus('error');
        toast.error('Failed to connect to Shopify');
      }
    } catch (error: any) {
      console.error('Error testing Shopify connection:', error);
      setTestStatus('error');
      toast.error(error.message || 'Failed to test connection');
    }
  };

  const handleFetchOrders = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const result = await fetchShopifyOrders(accessToken);
      toast.success(result.message || 'Shopify orders fetched successfully');
    } catch (error: any) {
      console.error('Error fetching Shopify orders:', error);
      toast.error(error.message || 'Failed to fetch Shopify orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2>Shopify API Settings</h2>
        <p className="text-gray-600 mt-1">Configure your Shopify integration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection Settings</CardTitle>
          <CardDescription>
            Enter your Shopify store credentials to fetch orders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="store-url">Store URL</Label>
            <Input
              id="store-url"
              value={settings.storeUrl}
              onChange={(e) => setSettings({ ...settings, storeUrl: e.target.value })}
              placeholder="your-store.myshopify.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="Enter your API key"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-secret">API Secret</Label>
            <Input
              id="api-secret"
              type="password"
              value={settings.apiSecret}
              onChange={(e) => setSettings({ ...settings, apiSecret: e.target.value })}
              placeholder="Enter your API secret"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="access-token">Admin Access Token</Label>
            <Input
              id="access-token"
              type="password"
              value={settings.accessToken}
              onChange={(e) => setSettings({ ...settings, accessToken: e.target.value })}
              placeholder="Enter your admin access token"
            />
          </div>

          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
            >
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fetch Orders</CardTitle>
          <CardDescription>
            Import orders from Shopify. Orders will be stored in Supabase only (NOT synced to Google
            Sheets).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleFetchOrders} disabled={loading}>
            <ShoppingCart className="size-4 mr-2" />
            {loading ? 'Fetching...' : 'Fetch Shopify Orders'}
          </Button>
        </CardContent>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Important Notes:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Shopify orders are stored only in Supabase</li>
          <li>They will NOT be synced to Google Sheets</li>
          <li>Orders appear in Order Management for assignment</li>
        </ul>
      </div>
    </div>
  );
}
