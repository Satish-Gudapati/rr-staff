import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { UserProfile, Permission } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, companyName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadingSettled = useRef(false);

  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error || !profile) return null;

      // Fetch permissions
      const { data: empPerms } = await supabase
        .from('employee_permissions')
        .select('permission_id')
        .eq('profile_id', profile.id);

      let permissions: Permission[] = [];
      if (empPerms && empPerms.length > 0) {
        const permIds = empPerms.map(ep => ep.permission_id);
        const { data: perms } = await supabase
          .from('permissions')
          .select('*')
          .in('id', permIds);
        permissions = (perms || []) as Permission[];
      }

      // Owners have all permissions implicitly
      if (profile.role === 'owner') {
        const { data: allPerms } = await supabase.from('permissions').select('*');
        permissions = (allPerms || []) as Permission[];
      }

      return { ...profile, permissions } as UserProfile;
    } catch {
      return null;
    }
  }, []);

  const settleLoading = useCallback(() => {
    if (!loadingSettled.current) {
      loadingSettled.current = true;
      setIsLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfile(session.user.id);
      setUser(profile);
    }
  }, [fetchProfile]);

  useEffect(() => {
    loadingSettled.current = false;

    // Safety timeout: if nothing resolves in 5 seconds, stop spinning
    const timeout = setTimeout(() => {
      settleLoading();
    }, 5000);

    // Step 1: Call getSession() FIRST to immediately read from localStorage
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }
      settleLoading();
      clearTimeout(timeout);
    }).catch(() => {
      setUser(null);
      settleLoading();
      clearTimeout(timeout);
    });

    // Step 2: Set up onAuthStateChange AFTER getSession to keep user in sync
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setUser(profile);
      } else {
        setUser(null);
      }

      // Also settle loading on INITIAL_SESSION event
      if (event === 'INITIAL_SESSION') {
        settleLoading();
        clearTimeout(timeout);
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [fetchProfile, settleLoading]);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string, companyName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, company_name: companyName, role: 'owner' },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
