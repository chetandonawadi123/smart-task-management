import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { authService } from '../services/authService';
import type { LoginData, RegisterData } from '../services/authService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    () => sessionStorage.getItem('stm_access_token')
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const restoreUser = async () => {
      const storedToken = sessionStorage.getItem('stm_access_token');
      if (!storedToken) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        const userData = await authService.getCurrentUser();
        if (active) setUser(userData);
      } catch {
        sessionStorage.removeItem('stm_access_token');
        if (active) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const handleUnauthorized = () => {
      sessionStorage.removeItem('stm_access_token');
      setToken(null);
      setUser(null);
    };

    window.addEventListener('stm:unauthorized', handleUnauthorized);
    restoreUser();
    return () => {
      active = false;
      window.removeEventListener('stm:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (data: LoginData) => {
    const res = await authService.login(data);
    sessionStorage.setItem('stm_access_token', res.access_token);
    setToken(res.access_token);
    const userData = await authService.getCurrentUser();
    setUser(userData);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    await authService.register(data);
    await login({ username: data.email, password: data.password });
  }, [login]);

  const logout = useCallback(() => {
    sessionStorage.removeItem('stm_access_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
