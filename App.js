import React, { Suspense, lazy } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import SetupAccountScreen from './src/screens/SetupAccountScreen';
import ForceChangePasswordScreen from './src/screens/ForceChangePasswordScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import ChatScreen from './src/screens/ChatScreen';
import { View, Text, ActivityIndicator } from 'react-native';

const TrackingScreen = lazy(() => import('./src/screens/TrackingScreen'));
const ProfileScreen = lazy(() => import('./src/screens/ProfileScreen'));
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const icons = { Track:'📍', Alerts:'🔔', Chat:'💬', Profile:'👤' };
const LoadingFallback = () => <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large" color="#16a34a"/></View>;
const LazyTracking = (props) => <Suspense fallback={<LoadingFallback/>}><TrackingScreen {...props}/></Suspense>;
const LazyProfile = (props) => <Suspense fallback={<LoadingFallback/>}><ProfileScreen {...props}/></Suspense>;
const MainTabs = () => (
  <Tab.Navigator screenOptions={({route})=>({tabBarIcon:()=><Text style={{fontSize:22}}>{icons[route.name]}</Text>,tabBarActiveTintColor:'#16a34a',tabBarInactiveTintColor:'#9ca3af',tabBarStyle:{height:64,paddingBottom:8,paddingTop:4},tabBarLabelStyle:{fontSize:12,fontWeight:'600'},headerStyle:{backgroundColor:'#15803d'},headerTintColor:'#fff'})}>
    <Tab.Screen name="Track" component={LazyTracking} options={{headerTitle:'Bus Tracking'}}/>
    <Tab.Screen name="Alerts" component={NotificationsScreen} options={{headerTitle:'Notifications'}}/>
    <Tab.Screen name="Chat" component={ChatScreen} options={{headerTitle:'Messages'}}/>
    <Tab.Screen name="Profile" component={LazyProfile} options={{headerTitle:'My Profile'}}/>
  </Tab.Navigator>
);
const AppContent = () => {
  const {isAuthenticated,loading,requiresPasswordChange}=useAuth();
  if(loading) return <View style={{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'#15803d'}}><ActivityIndicator size="large" color="#fff"/></View>;
  return <NavigationContainer><Stack.Navigator screenOptions={{headerShown:false}}>
    {!isAuthenticated
      ? <>
          <Stack.Screen name="Login" component={LoginScreen}/>
          <Stack.Screen name="Setup" component={SetupAccountScreen}/>
        </>
      : requiresPasswordChange
        ? <Stack.Screen name="ForceChangePassword" component={ForceChangePasswordScreen}/>
        : <Stack.Screen name="Main" component={MainTabs}/>
    }
  </Stack.Navigator></NavigationContainer>;
};
export default function App() { return <AuthProvider><StatusBar style="light"/><AppContent/></AuthProvider>; }
