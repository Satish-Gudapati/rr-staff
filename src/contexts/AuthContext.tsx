import React, { createContext, useContext, useState, useCallback } from 'react';
import { UserProfile, UserRole } from '@/types';
import { mockOwnerProfile, mockEmployeeProfile } from '@/data/mock';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const stored = sessionStorage.getItem('rr_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, _password: string, role: UserRole): Promise<boolean> => {
    // Mock login — will be replaced with Supabase auth
    await new Promise(r => setTimeout(r, 800));
    const profile = role === 'owner' ? mockOwnerProfile : mockEmployeeProfile;
    const loggedUser = { ...profile, email };
    setUser(loggedUser);
    sessionStorage.setItem('rr_user', JSON.stringify(loggedUser));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem('rr_user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
