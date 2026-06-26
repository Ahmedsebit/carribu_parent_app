import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const inputStyle = { width: '100%', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb', color: '#111827' };

const SetupAccountScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // 1 = enter phone, 2 = set password
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { completeRegistration } = useAuth();

  const findAccount = async () => {
    if (!phone.trim()) return Alert.alert('Error', 'Enter your phone number.');
    setLoading(true);
    try {
      const { data } = await authAPI.registrationStatus({ phone });
      if (!data.found) {
        return Alert.alert('Not found', 'No pending account was found for this phone number. Please contact your school.');
      }
      setFirstName(data.firstName || '');
      setStep(2);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    if (!password || !confirm) return Alert.alert('Error', 'Enter and confirm your new password.');
    if (password.length < 6) return Alert.alert('Error', 'Password must be at least 6 characters.');
    if (password !== confirm) return Alert.alert('Error', 'Passwords do not match.');
    setLoading(true);
    try {
      await completeRegistration(phone, password);
      // On success the auth state changes and navigation switches automatically
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#15803d', justifyContent: 'center', padding: 24 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center' }}>
        <Text style={{ fontSize: 48 }}>🔐</Text>
        <Text style={{ fontSize: 22, fontWeight: '700' }}>Set Up Your Account</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, textAlign: 'center' }}>
          {step === 1
            ? 'Enter the phone number your school registered to finish setting up your account.'
            : `Hi ${firstName || 'there'}! Create a password to finish.`}
        </Text>

        {step === 1 ? (
          <>
            <TextInput style={inputStyle} placeholder="Phone number" placeholderTextColor="#9ca3af" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" />
            <TouchableOpacity style={{ width: '100%', backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 }} onPress={findAccount} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Continue</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput style={inputStyle} placeholder="New password" placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword} secureTextEntry />
            <TextInput style={inputStyle} placeholder="Confirm password" placeholderTextColor="#9ca3af" value={confirm} onChangeText={setConfirm} secureTextEntry />
            <TouchableOpacity style={{ width: '100%', backgroundColor: '#16a34a', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 }} onPress={finish} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Finish & Sign In</Text>}
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#16a34a', fontSize: 14, fontWeight: '600' }}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default SetupAccountScreen;
