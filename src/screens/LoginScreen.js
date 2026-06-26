import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
const LoginScreen = ({ navigation }) => {
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [loading,setLoading]=useState(false); const {login}=useAuth();
  const go = async () => { if(!email||!password) return Alert.alert('Error','Enter email and password.'); setLoading(true); try{await login(email,password);}catch(e){Alert.alert('Failed',e.response?.data?.error||e.message);}finally{setLoading(false);} };
  return <KeyboardAvoidingView style={{flex:1,backgroundColor:'#15803d',justifyContent:'center',padding:24}} behavior={Platform.OS==='ios'?'padding':'height'}>
    <View style={{backgroundColor:'#fff',borderRadius:20,padding:32,alignItems:'center'}}>
      <Text style={{fontSize:48}}>🎒</Text><Text style={{fontSize:24,fontWeight:'700'}}>Parent App</Text><Text style={{fontSize:14,color:'#6b7280',marginBottom:24}}>Track your child's school bus</Text>
      <TextInput style={{width:'100%',backgroundColor:'#f3f4f6',borderRadius:12,padding:14,fontSize:16,marginBottom:12,borderWidth:1,borderColor:'#e5e7eb',color:'#111827'}} placeholder="Email or phone" placeholderTextColor="#9ca3af" value={email} onChangeText={setEmail} autoCapitalize="none"/>
      <TextInput style={{width:'100%',backgroundColor:'#f3f4f6',borderRadius:12,padding:14,fontSize:16,marginBottom:12,borderWidth:1,borderColor:'#e5e7eb',color:'#111827'}} placeholder="Password" placeholderTextColor="#9ca3af" value={password} onChangeText={setPassword} secureTextEntry/>
      <TouchableOpacity style={{width:'100%',backgroundColor:'#16a34a',borderRadius:12,padding:16,alignItems:'center',marginTop:8}} onPress={go} disabled={loading}>{loading?<ActivityIndicator color="#fff"/>:<Text style={{color:'#fff',fontSize:16,fontWeight:'600'}}>Sign In</Text>}</TouchableOpacity>
      <TouchableOpacity style={{marginTop:16}} onPress={()=>navigation.navigate('Setup')}><Text style={{color:'#16a34a',fontSize:14,fontWeight:'600'}}>First time here? Set up your account</Text></TouchableOpacity>
    </View>
  </KeyboardAvoidingView>;
};
export default LoginScreen;
