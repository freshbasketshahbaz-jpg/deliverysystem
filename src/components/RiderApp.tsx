import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { getRiderOrders, updateDeliveryStatus, updatePayment } from '../utils/api';
import { LogOut, Package, MapPin, CheckCircle, CreditCard, DollarSign, Map } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { RiderMap } from './RiderMap';

export function RiderApp() {
  const { user, accessToken, signOut } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    loadOrders();
    // Refresh every 30 seconds
    const interval = setInterval(loadOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    if (!accessToken || !user?.id) return;
    setLoading(true);
    try {
      const data = await getRiderOrders(accessToken, user.id);
      setOrders(data.orders);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, status: string) => {
    if (!accessToken) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      await updateDeliveryStatus(accessToken, orderId, today, status);
      toast.success(`Order status updated to ${status}`);
      loadOrders();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handlePayment = async (orderId: string, paymentMethod: string) => {
    if (!accessToken) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      await updatePayment(accessToken, orderId, today, paymentMethod);
      toast.success(`Payment collected via ${paymentMethod}`);
      loadOrders();
    } catch (error: any) {
      console.error('Error updating payment:', error);
      toast.error(error.message || 'Failed to update payment');
    }
  };

  const activeOrders = orders.filter(
    (o) => o.deliveryStatus !== 'delivered' || o.paymentStatus !== 'collected'
  );
  const completedOrders = orders.filter(
    (o) => o.deliveryStatus === 'delivered' && o.paymentStatus === 'collected'
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="font-semibold">Rider App</h1>
            <p className="text-sm text-gray-600">{user?.user_metadata?.name || 'Rider'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="size-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Status Banner */}
        <Card>
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Your Status</div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm ${
                      user?.user_metadata?.status === 'available'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {user?.user_metadata?.status === 'available' ? 'Available' : 'Busy'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Active Deliveries</div>
                <div className="text-3xl mt-1">{activeOrders.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refresh Button */}
        <div className="flex justify-end gap-2">
          <Button
            variant={showMap ? 'default' : 'outline'}
            onClick={() => setShowMap(!showMap)}
            size="sm"
          >
            <Map className="size-4 mr-2" />
            {showMap ? 'Hide Map' : 'Show Map'}
          </Button>
          <Button onClick={loadOrders} disabled={loading} size="sm">
            {loading ? 'Loading...' : 'Refresh Orders'}
          </Button>
        </div>

        {/* Map View */}
        {showMap && <RiderMap orders={orders} />}

        {/* Active Orders */}
        <div>
          <h2 className="mb-4">Active Deliveries ({activeOrders.length})</h2>
          {activeOrders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                No active deliveries. You're all caught up!
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeOrders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="size-5" />
                      Order #{order.id.slice(0, 8)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="size-4 mt-1 text-gray-600" />
                        <div>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-sm text-gray-600">{order.customerPhone}</div>
                          <div className="text-sm text-gray-600">{order.address}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <div>
                          <div className="text-sm text-gray-600">Amount</div>
                          <div className="text-xl">${order.amount}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Status</div>
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs mt-1 ${
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
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {order.deliveryStatus === 'pending' && (
                        <Button
                          onClick={() => handleUpdateStatus(order.id, 'accepted')}
                          className="flex-1"
                        >
                          <CheckCircle className="size-4 mr-2" />
                          Accept
                        </Button>
                      )}
                      {order.deliveryStatus === 'accepted' && (
                        <Button
                          onClick={() => handleUpdateStatus(order.id, 'en route')}
                          className="flex-1"
                        >
                          <MapPin className="size-4 mr-2" />
                          Start Delivery
                        </Button>
                      )}
                      {order.deliveryStatus === 'en route' && (
                        <Button
                          onClick={() => handleUpdateStatus(order.id, 'delivered')}
                          className="flex-1"
                        >
                          <CheckCircle className="size-4 mr-2" />
                          Mark Delivered
                        </Button>
                      )}
                      {order.deliveryStatus === 'delivered' && order.paymentStatus === 'pending' && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="flex-1">Collect Payment</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Collect Payment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                              <p className="text-gray-600">
                                Amount: <span className="font-semibold">${order.amount}</span>
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                <Button
                                  onClick={() => handlePayment(order.id, 'cash')}
                                  className="flex items-center gap-2"
                                >
                                  <DollarSign className="size-4" />
                                  Cash
                                </Button>
                                <Button
                                  onClick={() => handlePayment(order.id, 'card')}
                                  className="flex items-center gap-2"
                                >
                                  <CreditCard className="size-4" />
                                  Card
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Completed Orders */}
        {completedOrders.length > 0 && (
          <div>
            <h3 className="mb-4">Completed Today ({completedOrders.length})</h3>
            <div className="space-y-2">
              {completedOrders.map((order) => (
                <Card key={order.id} className="bg-gray-50">
                  <CardContent className="py-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{order.customerName}</div>
                        <div className="text-sm text-gray-600">${order.amount}</div>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Completed ({order.paymentMethod})
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}