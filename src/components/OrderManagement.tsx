import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getOrders, addOrder, assignOrder, updateOrderAmount, getRiders, addOrderToGoogleSheets } from '../utils/api';
import { Plus, Edit, UserPlus } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function OrderManagement() {
  const { accessToken } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [orders, setOrders] = useState<any[]>([]);
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customerName: '',
    customerPhone: '',
    address: '',
    amount: '',
    items: ''
  });

  useEffect(() => {
    loadOrders();
    loadRiders();
  }, [selectedDate]);

  const loadOrders = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await getOrders(accessToken, selectedDate);
      setOrders(data.orders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const loadRiders = async () => {
    if (!accessToken) return;
    try {
      const data = await getRiders(accessToken);
      setRiders(data.riders);
    } catch (error) {
      console.error('Error loading riders:', error);
    }
  };

  const handleAddOrder = async () => {
    if (!accessToken) return;
    if (!newOrder.customerName || !newOrder.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const result = await addOrder(accessToken, selectedDate, newOrder);
      
      // Also add to Google Sheets
      try {
        await addOrderToGoogleSheets(accessToken, selectedDate, result.order);
      } catch (sheetsError) {
        console.error('Error syncing to Google Sheets:', sheetsError);
        toast.error('Order added but failed to sync to Google Sheets');
      }

      toast.success('Order added successfully');
      setShowAddDialog(false);
      setNewOrder({
        customerName: '',
        customerPhone: '',
        address: '',
        amount: '',
        items: ''
      });
      loadOrders();
    } catch (error: any) {
      console.error('Error adding order:', error);
      toast.error(error.message || 'Failed to add order');
    }
  };

  const handleAssignOrder = async (orderId: string, riderId: string) => {
    if (!accessToken) return;
    try {
      await assignOrder(accessToken, orderId, selectedDate, riderId);
      toast.success('Order assigned successfully');
      loadOrders();
    } catch (error: any) {
      console.error('Error assigning order:', error);
      toast.error(error.message || 'Failed to assign order');
    }
  };

  const handleUpdateAmount = async (orderId: string, amount: string) => {
    if (!accessToken) return;
    try {
      await updateOrderAmount(accessToken, orderId, selectedDate, amount);
      toast.success('Amount updated successfully');
      loadOrders();
    } catch (error: any) {
      console.error('Error updating amount:', error);
      toast.error(error.message || 'Failed to update amount');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2>Order Management</h2>
          <p className="text-gray-600 mt-1">Manage all orders for the selected date</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4 mr-2" />
              Add Order
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={newOrder.customerName}
                  onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Phone</Label>
                <Input
                  value={newOrder.customerPhone}
                  onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Address</Label>
                <Input
                  value={newOrder.address}
                  onChange={(e) => setNewOrder({ ...newOrder, address: e.target.value })}
                  placeholder="123 Main St, City"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  value={newOrder.amount}
                  onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
                  placeholder="99.99"
                />
              </div>
              <div className="space-y-2">
                <Label>Items</Label>
                <Input
                  value={newOrder.items}
                  onChange={(e) => setNewOrder({ ...newOrder, items: e.target.value })}
                  placeholder="Pizza, Soda, Fries"
                />
              </div>
              <Button onClick={handleAddOrder} className="w-full">
                Add Order
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1 max-w-xs">
          <Label htmlFor="order-date">Select Date</Label>
          <Input
            id="order-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="mt-2"
          />
        </div>
        <Button onClick={loadOrders} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      <div className="bg-white rounded-lg border">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Order ID</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Address</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Payment</th>
              <th className="px-4 py-3 text-left">Source</th>
              <th className="px-4 py-3 text-left">Assigned To</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  No orders for this date
                </td>
              </tr>
            ) : (
              orders.map((order, index) => (
                <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 text-sm">{order.id.slice(0, 12)}...</td>
                  <td className="px-4 py-3">
                    <div>{order.customerName}</div>
                    <div className="text-sm text-gray-600">{order.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">{order.address}</td>
                  <td className="px-4 py-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="flex items-center gap-1 hover:text-blue-600">
                          ${order.amount}
                          <Edit className="size-3" />
                        </button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Update Amount</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <Input
                            type="number"
                            defaultValue={order.amount}
                            id={`amount-${order.id}`}
                          />
                          <Button
                            onClick={() => {
                              const input = document.getElementById(`amount-${order.id}`) as HTMLInputElement;
                              handleUpdateAmount(order.id, input.value);
                            }}
                            className="w-full"
                          >
                            Update
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs ${
                        order.deliveryStatus === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : order.deliveryStatus === 'en route'
                          ? 'bg-blue-100 text-blue-800'
                          : order.deliveryStatus === 'accepted'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.deliveryStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs ${
                        order.paymentStatus === 'collected'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {order.paymentStatus}
                      {order.paymentMethod && ` (${order.paymentMethod})`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs ${
                        order.source === 'shopify'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {order.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {order.assignedTo ? (
                      riders.find((r) => r.id === order.assignedTo)?.name || 'Unknown'
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <UserPlus className="size-4 mr-1" />
                          Assign
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Order to Rider</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <Select onValueChange={(value) => handleAssignOrder(order.id, value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a rider" />
                            </SelectTrigger>
                            <SelectContent>
                              {riders.map((rider) => (
                                <SelectItem key={rider.id} value={rider.id}>
                                  {rider.name} ({rider.status})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
