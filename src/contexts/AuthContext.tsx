import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export interface Doctor {
  id: string;
  name: string;
  email: string;
  specialty: string;
}

interface AuthContextType {
  doctor: Doctor | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  signup: (name: string, email: string, specialty: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  doctor: null,
  loading: true,
  login: async () => 'Not initialized',
  signup: async () => 'Not initialized',
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);

  const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const id = setTimeout(() => reject(new Error('Operation timed out')), ms);
      promise
        .then((value) => {
          clearTimeout(id);
          resolve(value);
        })
        .catch((err) => {
          clearTimeout(id);
          reject(err);
        });
    });
  };

  const doctorFromUser = (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }): Doctor => {
    const name = typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()
      ? user.user_metadata.name
      : 'Doctor';
    const specialty = typeof user.user_metadata?.specialty === 'string' && user.user_metadata.specialty.trim()
      ? user.user_metadata.specialty
      : 'General';

    return {
      id: user.id,
      name,
      email: user.email ?? '',
      specialty,
    };
  };

  const loadDoctorProfile = async (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) => {
    const { data, error } = await supabase
      .from('doctors')
      .select('id, name, email, specialty')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw error;
    if (data) return data as Doctor;

    // Fallback avoids blocking login if profile row is temporarily missing.
    return doctorFromUser(user);
  };

  // Restore session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 7000);
        if (session?.user) {
          let profile: Doctor;
          try {
            profile = await withTimeout(loadDoctorProfile(session.user), 7000);
          } catch {
            // Fallback ensures UI is usable even if profile query is temporarily blocked.
            profile = doctorFromUser(session.user);
          }
          setDoctor(profile);
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          let profile: Doctor;
          try {
            profile = await withTimeout(loadDoctorProfile(session.user), 7000);
          } catch {
            profile = doctorFromUser(session.user);
          }
          setDoctor(profile);
        } catch (err) {
          console.error('Failed to fetch doctor profile:', err);
          setDoctor(doctorFromUser(session.user));
        }
      } else {
        setDoctor(null);
      }

      // Never allow permanent loading state.
      setLoading(false);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error.message;

      // Ensure profile exists right away so UI can route to app without waiting on a later event.
      if (data.user) {
        try {
          const profile = await loadDoctorProfile(data.user);
          setDoctor(profile);
        } catch (profileErr) {
          return profileErr instanceof Error
            ? profileErr.message
            : 'Signed in, but failed to load doctor profile. Check doctors RLS INSERT policy.';
        }
      }

      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Login failed';
    }
  };

  const signup = async (name: string, email: string, specialty: string, password: string): Promise<string | null> => {
    try {
      const { data: { user }, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            specialty,
          },
        },
      });

      if (signupError) return signupError.message;
      if (!user) return 'User creation failed';
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'Signup failed';
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ doctor, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
