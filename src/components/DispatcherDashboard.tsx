import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { LogOut, Package, CreditCard } from 'lucide-react';
import { PaymentManagement } from './PaymentManagement';

export function DispatcherDashboard() {
  const { user, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState('orders');

  const menuItems = [
    { id: 'orders', label: 'View Orders', icon: Package },
    { id: 'payments', label: 'Payment Management', icon: CreditCard }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-6 border-b">
          <h1 className="font-semibold">Dispatch Dashboard</h1>
          <p className="text-sm text-gray-600 mt-1">{user?.user_metadata?.name || 'Dispatcher'}</p>
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
          {currentPage === 'orders' && (
            <div className="space-y-6">
              <div>
                <h2>View Orders</h2>
                <p className="text-gray-600 mt-1">View all orders and their status</p>
              </div>
              <PaymentManagement />
            </div>
          )}
          {currentPage === 'payments' && <PaymentManagement />}
        </div>
      </div>
    </div>
  );
}
