import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { signIn, signUp } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

export function SignIn() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('admin');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // If input doesn't contain @, assume it's a rider username
      const loginEmail = email.includes('@') ? email : `${email}@delivery.local`;
      const data = await signIn(loginEmail, password);
      setAuth(data.user, data.accessToken);
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const signUpData: any = {
        password,
        name,
        role: role.toLowerCase() // Ensure role is lowercase
      };

      if (role === 'rider') {
        if (!username) {
          setError('Username is required for riders');
          setLoading(false);
          return;
        }
        signUpData.username = username;
      } else {
        if (!email) {
          setError('Email is required');
          setLoading(false);
          return;
        }
        signUpData.email = email;
      }

      console.log('Attempting signup with data:', { ...signUpData, password: '***' });
      const data = await signUp(signUpData);
      console.log('Signup response:', data);
      
      // If auto sign-in was successful
      if (data.accessToken && data.user) {
        setAuth(data.user, data.accessToken);
      } else {
        // Account created but not auto-signed in
        setIsSignUp(false);
        setError('');
        // Reset form
        setEmail('');
        setPassword('');
        setName('');
        setUsername('');
      }
    } catch (err: any) {
      console.error('Sign up error:', err);
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  if (isSignUp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create Account</CardTitle>
            <CardDescription>Sign up for Delivery Management System</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignUp} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-900 rounded-md">
                  <AlertCircle className="size-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="dispatcher">Dispatcher</SelectItem>
                    <SelectItem value="rider">Rider</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {role === 'rider' ? (
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Enter username"
                  />
                  <p className="text-xs text-gray-500">
                    You'll sign in with this username{username ? ` (email will be ${username}@delivery.local)` : ''}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Create a password"
                  minLength={6}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setError('');
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Delivery Management System</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-900 rounded-md">
                <AlertCircle className="size-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email / Username</Label>
              <Input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email or username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setError('');
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Create an Account
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}