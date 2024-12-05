import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AdminContextType {
  isAdmin: boolean;
  isHR: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHR, setIsHR] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkRole(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        checkRole(session.user);
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsHR(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkRole = async (user: User | null) => {
    if (!user) {
      console.log("No user found, setting admin and HR to false");
      setIsAdmin(false);
      setIsHR(false);
      return;
    }

    try {
      console.log("Checking role for user:", user.id);
      
      // Vérifier les métadonnées de l'utilisateur
      const isUserAdmin = user.app_metadata?.is_admin === true;
      const isUserHR = user.app_metadata?.is_hr === true;
      
      console.log("User metadata:", { isUserAdmin, isUserHR });
      
      setIsAdmin(isUserAdmin);
      setIsHR(isUserHR);
      
      console.log("Updated roles - Admin:", isUserAdmin, "HR:", isUserHR);
    } catch (error) {
      console.error("Error in checkRole:", error);
      setIsAdmin(false);
      setIsHR(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setIsHR(false);
  };

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isHR,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};