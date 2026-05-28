import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { messageAPI, studentAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { connectSocket, sendChatMessage, onNewMessage, offNewMessage, getSocket } from '../services/socket';
const ChatScreen = () => {
  const {user}=useAuth(); const [view,setView]=useState('list'); const [convos,setConvos]=useState([]); const [partner,setPartner]=useState(null); const [msgs,setMsgs]=useState([]); const [text,setText]=useState(''); const [children,setChildren]=useState([]); const [absData,setAbsData]=useState({studentIds:[],reason:''}); const [loading,setLoading]=useState(true); const [sending,setSending]=useState(false); const ref=useRef(null);
  const [myDrivers, setMyDrivers] = useState([]);
  const fetchConvos = useCallback(async()=>{try{const[c,s,d]=await Promise.all([messageAPI.getConversations(),studentAPI.getAll(),messageAPI.getMyDrivers()]);setConvos(c.data.conversations);setChildren(s.data.students);setMyDrivers(d.data.drivers||[]);}catch(e){}finally{setLoading(false);}}, []);
  useEffect(()=>{fetchConvos();},[fetchConvos]);
  const openThread = async p => {setPartner(p);setView('thread');try{const{data}=await messageAPI.getThread(p.partnerId);setMsgs(data.messages);setTimeout(()=>ref.current?.scrollToEnd({animated:true}),300);}catch(e){}};
  const send = async () => {if(!text.trim()||!partner)return;setSending(true);try{const{data}=await messageAPI.send({receiverId:partner.partnerId,content:text.trim()});setMsgs(p=>[...p,data.message]);sendChatMessage(null, partner.partnerId, text.trim());setText('');setTimeout(()=>ref.current?.scrollToEnd({animated:true}),200);}catch(e){}finally{setSending(false);};};
  const toggleChildSelection = childId => {
    setAbsData(prev => {
      const exists = prev.studentIds.includes(childId);
      return {
        ...prev,
        studentIds: exists ? prev.studentIds.filter(id => id !== childId) : [...prev.studentIds, childId],
      };
    });
  };
  const reportAbsence = async () => {
    if (absData.studentIds.length === 0) return Alert.alert('Error','Select at least one child.');
    setSending(true);
    try {
      const { data } = await messageAPI.reportAbsence({
        studentIds: absData.studentIds,
        reason: absData.reason || 'Not specified',
        date: new Date().toISOString().split('T')[0],
      });
      Alert.alert('✅', data.message);
      setAbsData({ studentIds: [], reason: '' });
      setView('list');
      fetchConvos();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.error || 'Failed');
    } finally { setSending(false); }
  };
  useEffect(()=>{if(view==='thread'&&partner){
    // Set up socket for real-time messages
    const setupRealtime = async () => {
      await connectSocket();
      const handleMsg = (data) => {
        if (data.senderId === partner.partnerId || data.senderId === user.id) {
          setMsgs(prev => [...prev, { id: Date.now(), senderId: data.senderId, content: data.message, createdAt: new Date(data.timestamp).toISOString() }]);
          setTimeout(()=>ref.current?.scrollToEnd({animated:true}),200);
        }
      };
      onNewMessage(handleMsg);
      return handleMsg;
    };
    let handler;
    setupRealtime().then(h => { handler = h; });
    // Also poll less frequently as fallback
    const i=setInterval(async()=>{try{const{data}=await messageAPI.getThread(partner.partnerId);setMsgs(data.messages);}catch(e){}},30000);
    return()=>{clearInterval(i); if(handler) offNewMessage(handler);};
  }}, [view,partner]);
  if(loading) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><ActivityIndicator size="large" color="#16a34a"/></View>;
  if(view==='absence') return <View style={{flex:1,backgroundColor:'#f0fdf4'}}>
    <View style={{backgroundColor:'#f59e0b',padding:16,flexDirection:'row',alignItems:'center',gap:16}}><TouchableOpacity onPress={()=>setView('list')}><Text style={{color:'#fff',fontWeight:'600'}}>← Back</Text></TouchableOpacity><Text style={{color:'#fff',fontSize:18,fontWeight:'700'}}>⚠️ Report Absence</Text></View>
    <View style={{padding:20}}><Text style={{fontSize:15,fontWeight:'600',marginBottom:8}}>Select child(ren):</Text>
      {children.map(c=><TouchableOpacity key={c.id} style={{backgroundColor:absData.studentIds.includes(c.id)?'#16a34a':'#fff',borderRadius:12,padding:14,marginBottom:8,borderWidth:1,borderColor:'#e5e7eb'}} onPress={()=>toggleChildSelection(c.id)}><Text style={{fontSize:15,fontWeight:'500',color:absData.studentIds.includes(c.id)?'#fff':'#111827'}}>{c.firstName} {c.lastName} ({c.grade||'N/A'})</Text></TouchableOpacity>)}
      <Text style={{fontSize:13,color:'#6b7280',marginBottom:12}}>{absData.studentIds.length} selected</Text>
      <Text style={{fontSize:15,fontWeight:'600',marginTop:16,marginBottom:8}}>Reason (optional):</Text>
      <TextInput style={{backgroundColor:'#fff',borderRadius:12,padding:14,fontSize:14,borderWidth:1,borderColor:'#e5e7eb',minHeight:80,textAlignVertical:'top',color:'#111827'}} value={absData.reason} onChangeText={t=>setAbsData(p=>({...p,reason:t}))} placeholder="e.g., Sick" placeholderTextColor="#9ca3af" multiline/>
      <TouchableOpacity style={{backgroundColor:'#f59e0b',borderRadius:12,padding:16,alignItems:'center',marginTop:20}} onPress={reportAbsence} disabled={sending}><Text style={{color:'#fff',fontWeight:'700',fontSize:16}}>{sending?'Sending...':'⚠️ Report Absence'}</Text></TouchableOpacity>
    </View>
  </View>;
  if(view==='thread'&&partner) return <KeyboardAvoidingView style={{flex:1,backgroundColor:'#f0fdf4'}} behavior={Platform.OS==='ios'?'padding':undefined}>
    <View style={{backgroundColor:'#15803d',flexDirection:'row',alignItems:'center',padding:16,gap:12}}><TouchableOpacity onPress={()=>{setView('list');fetchConvos();}}><Text style={{color:'#bbf7d0',fontWeight:'600'}}>← Back</Text></TouchableOpacity><View><Text style={{color:'#fff',fontSize:16,fontWeight:'600'}}>{partner.partnerName}</Text><Text style={{color:'#bbf7d0',fontSize:12,textTransform:'capitalize'}}>{partner.partnerRole}</Text></View></View>
    <FlatList ref={ref} data={msgs} keyExtractor={i=>String(i.id)} contentContainerStyle={{padding:16}} onContentSizeChange={()=>ref.current?.scrollToEnd({animated:false})}
      renderItem={({item})=>{const mine=item.senderId===user.id;return <View style={{maxWidth:'80%',borderRadius:16,padding:12,marginBottom:8,backgroundColor:mine?'#16a34a':'#fff',alignSelf:mine?'flex-end':'flex-start'}}><Text style={{fontSize:14,color:mine?'#fff':'#111827'}}>{item.content}</Text><Text style={{fontSize:10,marginTop:4,color:mine?'#bbf7d0':'#9ca3af'}}>{new Date(item.createdAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</Text></View>;}}
      ListEmptyComponent={<View style={{alignItems:'center',paddingTop:60}}><Text style={{fontSize:40}}>💬</Text><Text style={{color:'#9ca3af'}}>No messages yet</Text></View>}/>
    <View style={{flexDirection:'row',alignItems:'flex-end',padding:12,backgroundColor:'#fff',borderTopWidth:1,borderTopColor:'#e5e7eb',gap:8}}>
      <TextInput style={{flex:1,backgroundColor:'#f3f4f6',borderRadius:20,paddingHorizontal:16,paddingVertical:10,fontSize:14,maxHeight:100,color:'#111827'}} value={text} onChangeText={setText} placeholder="Message..." placeholderTextColor="#9ca3af" multiline/>
      <TouchableOpacity style={{backgroundColor:'#16a34a',width:44,height:44,borderRadius:22,justifyContent:'center',alignItems:'center',opacity:text.trim()?1:0.5}} onPress={send} disabled={!text.trim()||sending}><Text style={{color:'#fff',fontSize:20}}>➤</Text></TouchableOpacity>
    </View>
  </KeyboardAvoidingView>;
  return <View style={{flex:1,backgroundColor:'#f0fdf4'}}>
    <FlatList data={convos} keyExtractor={i=>String(i.partnerId)} contentContainerStyle={{padding:16,paddingBottom:100}} refreshControl={<RefreshControl refreshing={false} onRefresh={fetchConvos} tintColor="#16a34a"/>}
      ListHeaderComponent={<View><View style={{marginBottom:12}}><Text style={{fontSize:22,fontWeight:'700'}}>💬 Messages</Text></View>
        {myDrivers.filter(d => !convos.some(c => c.partnerId === d.id)).length > 0 && (
          <View style={{marginBottom:12}}>
            <Text style={{fontSize:13,fontWeight:'600',color:'#6b7280',marginBottom:8}}>💬 Start chat with your driver:</Text>
            {myDrivers.filter(d => !convos.some(c => c.partnerId === d.id)).map(d => (
              <TouchableOpacity key={d.id} style={{backgroundColor:'#dbeafe',borderRadius:12,padding:14,marginBottom:8,flexDirection:'row',alignItems:'center',gap:12}} onPress={()=>openThread({partnerId:d.id,partnerName:`${d.firstName} ${d.lastName}`,partnerRole:'driver'})}>
                <View style={{width:40,height:40,borderRadius:20,backgroundColor:'#2563eb',justifyContent:'center',alignItems:'center'}}><Text style={{color:'#fff',fontWeight:'700'}}>{d.firstName[0]}</Text></View>
                <View style={{flex:1}}><Text style={{fontSize:15,fontWeight:'600'}}>{d.firstName} {d.lastName}</Text><Text style={{fontSize:12,color:'#6b7280'}}>Driver • {d.routeName}</Text></View>
                <Text style={{fontSize:18}}>💬</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity style={{backgroundColor:'#fef3c7',borderRadius:12,padding:14,marginBottom:16,alignItems:'center',borderWidth:1,borderColor:'#fde68a'}} onPress={()=>setView('absence')}><Text style={{color:'#92400e',fontWeight:'600',fontSize:15}}>⚠️ Report Child Absence</Text></TouchableOpacity></View>}
      renderItem={({item})=><TouchableOpacity style={{backgroundColor:'#fff',borderRadius:14,padding:14,marginBottom:8,flexDirection:'row',alignItems:'center',gap:12}} onPress={()=>openThread(item)}>
        <View style={{width:48,height:48,borderRadius:24,backgroundColor:'#dcfce7',justifyContent:'center',alignItems:'center'}}><Text style={{fontSize:20}}>🚐</Text></View>
        <View style={{flex:1}}><Text style={{fontSize:15,fontWeight:'600'}}>{item.partnerName}</Text><Text style={{fontSize:12,color:'#6b7280',textTransform:'capitalize'}}>{item.partnerRole}</Text><Text style={{fontSize:13,color:'#9ca3af',marginTop:2}} numberOfLines={1}>{item.lastMessage}</Text></View>
        {item.unreadCount>0&&<View style={{backgroundColor:'#dc2626',borderRadius:12,minWidth:24,height:24,justifyContent:'center',alignItems:'center',paddingHorizontal:6}}><Text style={{color:'#fff',fontWeight:'700',fontSize:12}}>{item.unreadCount}</Text></View>}
      </TouchableOpacity>}
      ListEmptyComponent={<View style={{alignItems:'center',paddingTop:60}}><Text style={{fontSize:48}}>💬</Text><Text style={{color:'#6b7280',marginTop:12}}>No conversations yet.</Text></View>}/>
  </View>;
};
export default ChatScreen;
