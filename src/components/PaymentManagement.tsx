import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { getOrders, updatePayment } from '../utils/api';
import { CreditCard, DollarSign } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export function PaymentManagement() {
  const { accessToken } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [selectedDate]);

  const loadOrders = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const data = await getOrders(accessToken, selectedDate);
      // Filter to show only delivered orders that need payment confirmation
      const deliveredOrders = data.orders.filter(
        (order: any) => order.deliveryStatus === 'delivered'
      );
      setOrders(deliveredOrders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPayment = async (orderId: string, paymentMethod: string) => {
    if (!accessToken) return;
    try {
      await updatePayment(accessToken, orderId, selectedDate, paymentMethod);
      toast.success(`Payment marked as ${paymentMethod}`);
      loadOrders();
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast.error(error.message || 'Failed to update payment');
    }
  };

  const pendingPayments = orders.filter(o => o.paymentStatus === 'pending');
  const collectedPayments = orders.filter(o => o.paymentStatus === 'collected');

  return (
    <div className="space-y-6">
      <div>
        <h2>Payment Management</h2>
        <p className="text-gray-600 mt-1">Track and collect payments for delivered orders</p>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1 max-w-xs">
          <Label htmlFor="payment-date">Select Date</Label>
          <Input
            id="payment-date"
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

      {/* Pending Payments */}
      <div>
        <h3 className="mb-4">Pending Payments ({pendingPayments.length})</h3>
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Order ID</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Delivered At</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No pending payments
                  </td>
                </tr>
              ) : (
                pendingPayments.map((order, index) => (
                  <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm">{order.id.slice(0, 12)}...</td>
                    <td className="px-4 py-3">
                      <div>{order.customerName}</div>
                      <div className="text-sm text-gray-600">{order.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">${order.amount}</td>
                    <td className="px-4 py-3 text-sm">
                      {order.deliveredAt ? new Date(order.deliveredAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">Mark Payment</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Collect Payment</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <p className="text-gray-600">
                              Amount: <span className="font-semibold">${order.amount}</span>
                            </p>
                            <p className="text-gray-600">
                              Customer: <span className="font-semibold">{order.customerName}</span>
                            </p>
                            <div className="grid grid-cols-2 gap-3">
                              <Button
                                onClick={() => handleMarkPayment(order.id, 'cash')}
                                className="flex items-center gap-2"
                              >
                                <DollarSign className="size-4" />
                                Cash
                              </Button>
                              <Button
                                onClick={() => handleMarkPayment(order.id, 'card')}
                                className="flex items-center gap-2"
                              >
                                <CreditCard className="size-4" />
                                Card
                              </Button>
                            </div>
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

      {/* Collected Payments */}
      <div>
        <h3 className="mb-4">Collected Payments ({collectedPayments.length})</h3>
        <div className="bg-white rounded-lg border">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Order ID</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Method</th>
                <th className="px-4 py-3 text-left">Collected At</th>
              </tr>
            </thead>
            <tbody>
              {collectedPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No collected payments yet
                  </td>
                </tr>
              ) : (
                collectedPayments.map((order, index) => (
                  <tr key={order.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-sm">{order.id.slice(0, 12)}...</td>
                    <td className="px-4 py-3">
                      <div>{order.customerName}</div>
                      <div className="text-sm text-gray-600">{order.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3 font-medium">${order.amount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs ${
                          order.paymentMethod === 'cash'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {order.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {order.paymentCollectedAt
                        ? new Date(order.paymentCollectedAt).toLocaleString()
                        : 'N/A'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-gray-600 mb-2">Total Pending</div>
          <div className="text-3xl">
            $
            {pendingPayments
              .reduce((sum, order) => sum + parseFloat(order.amount || 0), 0)
              .toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-gray-600 mb-2">Cash Collected</div>
          <div className="text-3xl text-green-600">
            $
            {collectedPayments
              .filter((o) => o.paymentMethod === 'cash')
              .reduce((sum, order) => sum + parseFloat(order.amount || 0), 0)
              .toFixed(2)}
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-gray-600 mb-2">Card Collected</div>
          <div className="text-3xl text-blue-600">
            $
            {collectedPayments
              .filter((o) => o.paymentMethod === 'card')
              .reduce((sum, order) => sum + parseFloat(order.amount || 0), 0)
              .toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}
