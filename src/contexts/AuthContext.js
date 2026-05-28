import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  useEffect(() => { (async()=>{try{const t=await AsyncStorage.getItem('token');const u=await AsyncStorage.getItem('user');if(t&&u)setUser(JSON.parse(u));}catch(e){}finally{setLoading(false);}})(); }, []);
  const login = async (email, password) => { const {data} = await authAPI.login({email,password}); if(!['parent','admin'].includes(data.user.role)) throw new Error('This app is for parents only.'); await AsyncStorage.setItem('token',data.token); await AsyncStorage.setItem('user',JSON.stringify(data.user)); setUser(data.user); return data; };
  const logout = async () => { await AsyncStorage.removeItem('token'); await AsyncStorage.removeItem('user'); setUser(null); };
  const updateUser = async (updatedUser) => { setUser(updatedUser); await AsyncStorage.setItem('user', JSON.stringify(updatedUser)); };
  return <AuthContext.Provider value={{user,login,logout,updateUser,loading,isAuthenticated:!!user}}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const c = useContext(AuthContext); if(!c) throw new Error('useAuth must be within AuthProvider'); return c; };
