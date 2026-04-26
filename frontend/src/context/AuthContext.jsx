import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('cp_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('cp_token');
    if (!token) { setLoading(false); return; }

    api.get('/auth/me')
      .then(({ data }) => {
        const userData = data.data;
        setUser(userData);
        localStorage.setItem('cp_user', JSON.stringify(userData));
      })
      .catch(() => {
        localStorage.removeItem('cp_token');
        localStorage.removeItem('cp_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    const { token } = data.data;
    // Store token first so the /auth/me request is authenticated
    localStorage.setItem('cp_token', token);
    // Fetch the full enriched profile (includes student_id, faculty_id, gr_number, dept etc.)
    // so the Dashboard and other pages get the right data on first render — no refresh needed
    const { data: meData } = await api.get('/auth/me');
    const fullUser = meData.data;
    localStorage.setItem('cp_user', JSON.stringify(fullUser));
    setUser(fullUser);
    return fullUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
