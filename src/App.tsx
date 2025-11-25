import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SignIn } from './components/SignIn';
import { AdminDashboard } from './components/AdminDashboard';
import { DispatcherDashboard } from './components/DispatcherDashboard';
import { RiderApp } from './components/RiderApp';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { user, accessToken } = useAuth();

  // If not logged in, show sign in
  if (!user || !accessToken) {
    return <SignIn />;
  }

  // Route based on user role
  const role = user.user_metadata?.role;

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  if (role === 'dispatcher') {
    return <DispatcherDashboard />;
  }

  if (role === 'rider') {
    return <RiderApp />;
  }

  // Fallback
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">Unknown user role</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
      <Toaster />
    </AuthProvider>
  );
}
