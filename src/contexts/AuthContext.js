import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => { (async()=>{try{const t=await AsyncStorage.getItem('token');const u=await AsyncStorage.getItem('user');if(t&&u){setUser(JSON.parse(u)); const pc=await AsyncStorage.getItem(`pw_changed_${JSON.parse(u)._id||JSON.parse(u).id}`);setPasswordChanged(pc==='true');}}catch(e){}finally{setLoading(false);}})(); }, []);

  const login = async (email, password) => {
    const {data} = await authAPI.login({email,password});
    if(!['parent','admin'].includes(data.user.role)) throw new Error('This app is for parents only.');
    await AsyncStorage.setItem('token',data.token);
    await AsyncStorage.setItem('user',JSON.stringify(data.user));
    const pc = await AsyncStorage.getItem(`pw_changed_${data.user._id||data.user.id}`);
    setPasswordChanged(pc === 'true');
    setUser(data.user);
    return data;
  };

  const logout = async () => { await AsyncStorage.removeItem('token'); await AsyncStorage.removeItem('user'); setUser(null); setPasswordChanged(false); };
  const updateUser = async (updatedUser) => { setUser(updatedUser); await AsyncStorage.setItem('user', JSON.stringify(updatedUser)); };

  // A pending parent completes registration by setting their own password, then is logged in
  const completeRegistration = async (phone, newPassword) => {
    const { data } = await authAPI.completeRegistration({ phone, newPassword });
    if (!['parent', 'admin'].includes(data.user.role)) throw new Error('This app is for parents only.');
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));
    const userId = data.user._id || data.user.id;
    await AsyncStorage.setItem(`pw_changed_${userId}`, 'true');
    setPasswordChanged(true);
    setUser(data.user);
    return data;
  };

  const markPasswordChanged = async () => {
    const userId = user._id || user.id;
    await AsyncStorage.setItem(`pw_changed_${userId}`, 'true');
    setPasswordChanged(true);
  };

  const requiresPasswordChange = !!user && !passwordChanged;

  return <AuthContext.Provider value={{user,login,logout,updateUser,completeRegistration,markPasswordChanged,loading,isAuthenticated:!!user,requiresPasswordChange}}>{children}</AuthContext.Provider>;
};
export const useAuth = () => { const c = useContext(AuthContext); if(!c) throw new Error('useAuth must be within AuthProvider'); return c; };
