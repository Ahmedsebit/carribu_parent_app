import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, Dimensions, Linking } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { studentAPI, authAPI, appVersionAPI } from '../services/api';

const APP_VERSION = '2.0.0';
const { width } = Dimensions.get('window');

const ProfileScreen = () => {
  const {user,logout,updateUser}=useAuth(); const [children,setChildren]=useState([]); const [loading,setLoading]=useState(true);
  const [showPwForm,setShowPwForm]=useState(false); const [currentPw,setCurrentPw]=useState(''); const [newPw,setNewPw]=useState(''); const [confirmPw,setConfirmPw]=useState(''); const [pwLoading,setPwLoading]=useState(false);
  const [showLocationForm,setShowLocationForm]=useState(false); const [pickupAddress,setPickupAddress]=useState(user?.pickupAddress||'');
  const [markerCoord,setMarkerCoord]=useState(user?.pickupLat ? {latitude:parseFloat(user.pickupLat),longitude:parseFloat(user.pickupLng)} : null);
  const [locLoading,setLocLoading]=useState(false); const [mapReady,setMapReady]=useState(false);
  const [scrollEnabled,setScrollEnabled]=useState(true);
  const [latestVersion,setLatestVersion]=useState(null);
  const mapRef = useRef(null);

  useEffect(()=>{(async()=>{try{const{data}=await studentAPI.getAll();setChildren(data.students.filter(s=>s.parentId===user.id));}catch(e){}finally{setLoading(false);}})();},[user]);

  useEffect(()=>{(async()=>{try{const{data}=await appVersionAPI.getLatest('parent');setLatestVersion(data);}catch(e){}})();},[]);

  const openLocationForm = async () => {
    setShowLocationForm(true);
    // Get current location if no pin set
    if (!markerCoord) {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission Denied','Location permission is needed to set pickup.'); return; }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const coord = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
        setMarkerCoord(coord);
      } catch (e) {
        // Default to Nairobi if location fails
        setMarkerCoord({ latitude: -1.2921, longitude: 36.8219 });
      }
    }
  };

  const changePassword = async () => {
    if (!currentPw || !newPw) return Alert.alert('Error','Please fill in all fields.');
    if (newPw.length < 6) return Alert.alert('Error','New password must be at least 6 characters.');
    if (newPw !== confirmPw) return Alert.alert('Error','New passwords do not match.');
    setPwLoading(true);
    try {
      await authAPI.changePassword({ currentPassword: currentPw, newPassword: newPw });
      Alert.alert('Success','Password changed successfully!');
      setShowPwForm(false); setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (e) { Alert.alert('Error', e.response?.data?.error || 'Failed to change password.'); }
    finally { setPwLoading(false); }
  };

  const saveLocation = async () => {
    if (!pickupAddress.trim()) return Alert.alert('Error','Please enter a pickup address.');
    if (!markerCoord) return Alert.alert('Error','Please set your pickup pin on the map.');
    setLocLoading(true);
    try {
      const payload = { pickupAddress: pickupAddress.trim(), pickupLat: markerCoord.latitude, pickupLng: markerCoord.longitude };
      const { data } = await authAPI.updateProfile(payload);
      if (updateUser) updateUser(data.user);
      Alert.alert('Success','Pickup location updated!');
      setShowLocationForm(false);
    } catch (e) { Alert.alert('Error', e.response?.data?.error || 'Failed to update location.'); }
    finally { setLocLoading(false); }
  };

  return <ScrollView style={{flex:1,backgroundColor:'#f0fdf4'}} contentContainerStyle={{padding:16}} scrollEnabled={scrollEnabled}>
    <View style={{backgroundColor:'#15803d',borderRadius:20,padding:28,alignItems:'center',marginBottom:16}}>
      <View style={{width:72,height:72,borderRadius:36,backgroundColor:'#16a34a',justifyContent:'center',alignItems:'center',marginBottom:12}}><Text style={{color:'#fff',fontSize:26,fontWeight:'700'}}>{user?.firstName?.[0]}{user?.lastName?.[0]}</Text></View>
      <Text style={{color:'#fff',fontSize:20,fontWeight:'700'}}>{user?.firstName} {user?.lastName}</Text>
      <Text style={{color:'#bbf7d0',fontSize:13,fontWeight:'600',marginTop:4}}>PARENT</Text>
      <Text style={{color:'#dcfce7',fontSize:13,marginTop:2}}>{user?.school?.name||'School'}</Text>
    </View>
    <View style={{backgroundColor:'#fff',borderRadius:14,marginBottom:16}}>
      {[['📧 Email',user?.email],['📞 Phone',user?.phone||'Not set'],['📍 Pickup',user?.pickupAddress||'Not set']].map(([l,v])=><View key={l} style={{flexDirection:'row',justifyContent:'space-between',padding:16,borderBottomWidth:1,borderBottomColor:'#f3f4f6'}}><Text style={{color:'#6b7280'}}>{l}</Text><Text style={{fontWeight:'500',flex:1,textAlign:'right'}} numberOfLines={1}>{v}</Text></View>)}
    </View>

    {/* Pickup Location with Map */}
    <View style={{backgroundColor:'#fff',borderRadius:14,padding:16,marginBottom:16}}>
      <TouchableOpacity onPress={()=> showLocationForm ? setShowLocationForm(false) : openLocationForm()} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
        <Text style={{fontSize:16,fontWeight:'700'}}>📍 Pickup Location</Text>
        <Text style={{color:'#16a34a',fontSize:14}}>{showLocationForm?'Cancel':'Edit'}</Text>
      </TouchableOpacity>
      {!showLocationForm && user?.pickupAddress ? <Text style={{color:'#6b7280',marginTop:8}}>{user.pickupAddress}</Text> : null}
      {showLocationForm && <View style={{marginTop:16}}>
        <Text style={{fontSize:13,color:'#6b7280',marginBottom:10}}>Drag the pin to your pickup location. Your current location is shown initially.</Text>
        {markerCoord ? (
          <View style={{borderRadius:12,overflow:'hidden',marginBottom:12}}>
            <View 
              onTouchStart={()=>setScrollEnabled(false)} 
              onTouchEnd={()=>setScrollEnabled(true)}
              onTouchCancel={()=>setScrollEnabled(true)}
            >
              <MapView
                ref={mapRef}
                style={{width:'100%',height:250}}
                initialRegion={{...markerCoord,latitudeDelta:0.005,longitudeDelta:0.005}}
                onMapReady={()=>setMapReady(true)}
                onPress={(e)=>setMarkerCoord(e.nativeEvent.coordinate)}
                mapType="standard"
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                <Marker
                  coordinate={markerCoord}
                  draggable
                  onDragEnd={(e)=>setMarkerCoord(e.nativeEvent.coordinate)}
                  title="Pickup Location"
                  pinColor="#16a34a"
                />
              </MapView>
            </View>
            <View style={{backgroundColor:'#f0fdf4',padding:8,flexDirection:'row',justifyContent:'center'}}>
              <Text style={{fontSize:12,color:'#6b7280'}}>📌 {markerCoord.latitude.toFixed(6)}, {markerCoord.longitude.toFixed(6)}</Text>
            </View>
          </View>
        ) : <ActivityIndicator color="#16a34a" style={{marginVertical:20}}/>}
        <TextInput placeholder="Pickup Address (e.g. Westlands, Nairobi)" value={pickupAddress} onChangeText={setPickupAddress} style={{borderWidth:1,borderColor:'#e5e7eb',borderRadius:10,padding:12,marginBottom:14,fontSize:15}}/>
        <TouchableOpacity onPress={saveLocation} disabled={locLoading} style={{backgroundColor:'#16a34a',borderRadius:10,padding:14,alignItems:'center'}}>
          {locLoading?<ActivityIndicator color="#fff"/>:<Text style={{color:'#fff',fontWeight:'600',fontSize:15}}>Save Pickup Location</Text>}
        </TouchableOpacity>
      </View>}
    </View>

    {/* Children */}
    <View style={{backgroundColor:'#fff',borderRadius:14,padding:16,marginBottom:16}}>
      <Text style={{fontSize:16,fontWeight:'700',marginBottom:12}}>🎒 My Children</Text>
      {loading?<ActivityIndicator color="#16a34a"/>:children.length===0?<Text style={{color:'#9ca3af'}}>No children linked.</Text>:children.map(c=>
        <View key={c.id} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:10,borderBottomWidth:1,borderBottomColor:'#f3f4f6'}}>
          <View style={{width:40,height:40,borderRadius:20,backgroundColor:'#dcfce7',justifyContent:'center',alignItems:'center'}}><Text style={{color:'#16a34a',fontWeight:'700',fontSize:16}}>{c.firstName[0]}</Text></View>
          <View><Text style={{fontSize:15,fontWeight:'600'}}>{c.firstName} {c.lastName}</Text><Text style={{fontSize:12,color:'#6b7280'}}>{c.grade||'N/A'}</Text><Text style={{fontSize:12,color:'#16a34a',marginTop:2}}>Routes: {c.routes?.length>0?c.routes.map(r=>r.name).join(', '):'Unassigned'}</Text></View>
        </View>)}
    </View>

    {/* Change Password */}
    <View style={{backgroundColor:'#fff',borderRadius:14,padding:16,marginBottom:16}}>
      <TouchableOpacity onPress={()=>setShowPwForm(!showPwForm)} style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}>
        <Text style={{fontSize:16,fontWeight:'700'}}>🔒 Change Password</Text>
        <Text style={{color:'#16a34a',fontSize:14}}>{showPwForm?'Cancel':'Change'}</Text>
      </TouchableOpacity>
      {showPwForm && <View style={{marginTop:16}}>
        <TextInput placeholder="Current Password" secureTextEntry value={currentPw} onChangeText={setCurrentPw} style={{borderWidth:1,borderColor:'#e5e7eb',borderRadius:10,padding:12,marginBottom:10,fontSize:15}}/>
        <TextInput placeholder="New Password" secureTextEntry value={newPw} onChangeText={setNewPw} style={{borderWidth:1,borderColor:'#e5e7eb',borderRadius:10,padding:12,marginBottom:10,fontSize:15}}/>
        <TextInput placeholder="Confirm New Password" secureTextEntry value={confirmPw} onChangeText={setConfirmPw} style={{borderWidth:1,borderColor:'#e5e7eb',borderRadius:10,padding:12,marginBottom:14,fontSize:15}}/>
        <TouchableOpacity onPress={changePassword} disabled={pwLoading} style={{backgroundColor:'#16a34a',borderRadius:10,padding:14,alignItems:'center'}}>
          {pwLoading?<ActivityIndicator color="#fff"/>:<Text style={{color:'#fff',fontWeight:'600',fontSize:15}}>Update Password</Text>}
        </TouchableOpacity>
      </View>}
    </View>

    <TouchableOpacity style={{backgroundColor:'#dc2626',borderRadius:14,padding:16,alignItems:'center'}} onPress={()=>Alert.alert('Logout','Sure?',[{text:'Cancel',style:'cancel'},{text:'Logout',style:'destructive',onPress:logout}])}><Text style={{color:'#fff',fontSize:16,fontWeight:'600'}}>🚪 Logout</Text></TouchableOpacity>

    {/* App Version & Update */}
    <View style={{marginTop:16,alignItems:'center'}}>
      <Text style={{color:'#9ca3af',fontSize:12}}>SchoolTransport Parent v{APP_VERSION}</Text>
      {latestVersion && latestVersion.version !== APP_VERSION && (
        <TouchableOpacity onPress={()=>Linking.openURL(latestVersion.downloadUrl)} style={{marginTop:8,backgroundColor:'#16a34a',borderRadius:10,paddingHorizontal:16,paddingVertical:10}}>
          <Text style={{color:'#fff',fontWeight:'600',fontSize:13}}>⬆️ Update Available: v{latestVersion.version}</Text>
        </TouchableOpacity>
      )}
    </View>
  </ScrollView>;
};
export default ProfileScreen;
