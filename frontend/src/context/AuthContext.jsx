import { createContext, useState, useEffect } from 'react';
import apiService from '../services/apiService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const data = await apiService.login(username, password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Login failed';
      return { success: false, message: errorMessage };
    }
  };

  const register = async (username, password, role) => {
    try {
      await apiService.register(username, password, role);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Registration failed' };
    }
  };

  const updateProfile = async (oldUsername, newUsername, newPassword) => {
    try {
      const data = await apiService.updateProfile(oldUsername, newUsername, newPassword);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Profile update failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
