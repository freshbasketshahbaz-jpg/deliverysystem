import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    role: 'admin' | 'dispatcher' | 'rider';
    name?: string;
    username?: string;
    status?: string;
  };
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    // Load from localStorage on mount
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('accessToken');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setAccessToken(storedToken);
    }
  }, []);

  const setAuth = (newUser: User, token: string) => {
    setUser(newUser);
    setAccessToken(token);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('accessToken', token);
  };

  const signOut = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, setAuth, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
