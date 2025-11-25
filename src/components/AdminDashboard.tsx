import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { getDailySummary } from '../utils/api';
import {
  LayoutDashboard,
  Package,
  CreditCard,
  Users,
  Settings,
  FileSpreadsheet,
  ShoppingCart,
  MapPin,
  LogOut
} from 'lucide-react';
import { OrderManagement } from './OrderManagement';
import { PaymentManagement } from './PaymentManagement';
import { RidersPage } from './RidersPage';
import { ShopifySettings } from './ShopifySettings';
import { GoogleSheetsSettings } from './GoogleSheetsSettings';
import { LocationTracking } from './LocationTracking';

export function AdminDashboard() {
  const { user, accessToken, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState<any>(null);
  const [riderSummaries, setRiderSummaries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentPage === 'dashboard') {
      loadSummary();
    }
  }, [selectedDate, currentPage]);

  const loadSummary = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await getDailySummary(accessToken, selectedDate);
      setSummary(data.summary);
      setRiderSummaries(data.riderSummaries);
    } catch (error) {
      console.error('Error loading summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard Home', icon: LayoutDashboard },
    { id: 'orders', label: 'Order Management', icon: Package },
    { id: 'payments', label: 'Payment Management', icon: CreditCard },
    { id: 'riders', label: 'Riders', icon: Users },
    { id: 'shopify', label: 'Shopify API Settings', icon: ShoppingCart },
    { id: 'sheets', label: 'Google Sheets API Settings', icon: FileSpreadsheet },
    { id: 'location', label: 'Location Tracking', icon: MapPin }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="font-semibold">Delivery Management</h1>
          <p className="text-sm text-gray-600 mt-1">{user?.user_metadata?.name || 'Admin'}</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                currentPage === item.id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="size-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t">
          <Button variant="outline" onClick={signOut} className="w-full">
            <LogOut className="size-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {currentPage === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h2>Dashboard Home</h2>
                <p className="text-gray-600 mt-1">Overview of daily operations</p>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1 max-w-xs">
                  <Label htmlFor="date-selector">Select Date</Label>
                  <Input
                    id="date-selector"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="mt-2"
                  />
                </div>
                <Button onClick={loadSummary} disabled={loading}>
                  {loading ? 'Loading...' : 'Load Summary'}
                </Button>
              </div>

              {summary && (
                <>
                  {/* Daily Summary */}
                  <div>
                    <h3 className="mb-4">Daily Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Total Orders</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl">{summary.totalOrders}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Delivered</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl text-green-600">{summary.deliveredOrders}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Undelivered</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl text-orange-600">{summary.undeliveredOrders}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Unassigned</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl text-red-600">{summary.unassignedOrders}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Assigned</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl text-blue-600">{summary.assignedOrders}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Cash Payments</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl">${summary.cashPayments.toFixed(2)}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Card Payments</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl">${summary.cardPayments.toFixed(2)}</div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Total Collected</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl text-green-700">
                            ${(summary.cashPayments + summary.cardPayments).toFixed(2)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Rider Summary */}
                  <div>
                    <h3 className="mb-4">Rider Summary</h3>
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left">Rider</th>
                            <th className="px-4 py-3 text-left">Total Assigned</th>
                            <th className="px-4 py-3 text-left">Delivered</th>
                            <th className="px-4 py-3 text-left">Cash Collected</th>
                            <th className="px-4 py-3 text-left">Card Collected</th>
                            <th className="px-4 py-3 text-left">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riderSummaries.map((rider, index) => (
                            <tr key={rider.riderId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-3">{rider.riderName}</td>
                              <td className="px-4 py-3">{rider.totalAssigned}</td>
                              <td className="px-4 py-3">{rider.delivered}</td>
                              <td className="px-4 py-3">${rider.cashCollected.toFixed(2)}</td>
                              <td className="px-4 py-3">${rider.cardCollected.toFixed(2)}</td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block px-2 py-1 rounded-full text-xs ${
                                    rider.status === 'available'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}
                                >
                                  {rider.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {currentPage === 'orders' && <OrderManagement />}
          {currentPage === 'payments' && <PaymentManagement />}
          {currentPage === 'riders' && <RidersPage />}
          {currentPage === 'shopify' && <ShopifySettings />}
          {currentPage === 'sheets' && <GoogleSheetsSettings />}
          {currentPage === 'location' && <LocationTracking />}
        </div>
      </div>
    </div>
  );
}