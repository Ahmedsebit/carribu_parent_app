import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const ForceChangePasswordScreen = () => {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const { markPasswordChanged } = useAuth();

  const handleChange = async () => {
    if (!currentPw || !newPw || !confirmPw) return Alert.alert('Error', 'Please fill in all fields.');
    if (newPw.length < 6) return Alert.alert('Error', 'New password must be at least 6 characters.');
    if (newPw !== confirmPw) return Alert.alert('Error', 'New passwords do not match.');
    if (currentPw === newPw) return Alert.alert('Error', 'New password must be different from the current password.');

    setLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: currentPw, newPassword: newPw });
      await markPasswordChanged();
      Alert.alert('Success', 'Password changed successfully! Welcome to Carribu.');
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#15803d', justifyContent: 'center', padding: 24 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 32 }}>
        <Text style={{ fontSize: 48, textAlign: 'center' }}>🔐</Text>
        <Text style={{ fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: 8 }}>Change Your Password</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
          For security, please set a new password before continuing.
        </Text>

        <TextInput
          placeholder="Current Password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={currentPw}
          onChangeText={setCurrentPw}
          style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb', color: '#111827' }}
        />
        <TextInput
          placeholder="New Password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={newPw}
          onChangeText={setNewPw}
          style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb', color: '#111827' }}
        />
        <TextInput
          placeholder="Confirm New Password"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          value={confirmPw}
          onChangeText={setConfirmPw}
          style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb', color: '#111827' }}
        />

        <TouchableOpacity onPress={handleChange} disabled={loading} style={{ backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center' }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Set New Password</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default ForceChangePasswordScreen;
