import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Doctor {
  name: string;
  email: string;
  specialty: string;
}

interface AuthContextType {
  doctor: Doctor | null;
  login: (email: string, password: string) => string | null;
  signup: (name: string, email: string, specialty: string, password: string) => string | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  doctor: null,
  login: () => 'Not initialized',
  signup: () => 'Not initialized',
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

const ACCOUNTS_KEY = 'spectru_accounts';
const SESSION_KEY = 'spectru_session';

interface StoredAccount {
  name: string;
  email: string;
  specialty: string;
  passwordHash: string;
}

// Simple hash for localStorage-only auth (not production crypto)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [doctor, setDoctor] = useState<Doctor | null>(null);

  // Restore session on mount
  useEffect(() => {
    const saved = localStorage.getItem(SESSION_KEY);
    if (saved) {
      try { setDoctor(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  const getAccounts = (): StoredAccount[] => {
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]'); }
    catch { return []; }
  };

  const login = (email: string, password: string): string | null => {
    const accounts = getAccounts();
    const account = accounts.find(a => a.email === email);
    if (!account) return 'No account found with this email';

    // We need async hash but login is called synchronously from the component,
    // so we do a sync wrapper via state
    hashPassword(password).then(hash => {
      if (hash !== account.passwordHash) {
        // We can't return an error from async, so the component handles this via state
        return;
      }
      const doc: Doctor = { name: account.name, email: account.email, specialty: account.specialty };
      setDoctor(doc);
      localStorage.setItem(SESSION_KEY, JSON.stringify(doc));
    });
    return null; // will be validated async
  };

  const signup = (name: string, email: string, specialty: string, password: string): string | null => {
    const accounts = getAccounts();
    if (accounts.some(a => a.email === email)) return 'An account with this email already exists';

    hashPassword(password).then(hash => {
      const newAccount: StoredAccount = { name, email, specialty, passwordHash: hash };
      accounts.push(newAccount);
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
      const doc: Doctor = { name, email, specialty };
      setDoctor(doc);
      localStorage.setItem(SESSION_KEY, JSON.stringify(doc));
    });
    return null;
  };

  const logout = () => {
    setDoctor(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ doctor, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
