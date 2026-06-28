import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify token with backend on every app load
  const verifySession = useCallback(async () => {
    const token = localStorage.getItem('pots_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Hit /me to verify token is still valid
      const res = await api.get('/auth/me');
      const freshUser = res.data.data;
      setUser(freshUser);
      // Update stored user with fresh data
      localStorage.setItem('pots_user', JSON.stringify(freshUser));
    } catch {
      // Token invalid or expired — clear everything
      localStorage.removeItem('pots_token');
      localStorage.removeItem('pots_user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data.data;

    localStorage.setItem('pots_token', token);
    localStorage.setItem('pots_user', JSON.stringify(user));
    setUser(user);
    return user;
  };

  const logout = () => {
    localStorage.removeItem('pots_token');
    localStorage.removeItem('pots_user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      const freshUser = res.data.data;
      setUser(freshUser);
      localStorage.setItem('pots_user', JSON.stringify(freshUser));
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
