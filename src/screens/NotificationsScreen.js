import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { messageAPI } from '../services/api';
import { connectSocket, getSocket } from '../services/socket';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();

  const fetch = useCallback(async () => {
    try {
      const { data } = await messageAPI.getNotifications();
      setNotifications(data.notifications);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Refresh whenever the screen regains focus so the list is never stale.
  useEffect(() => { if (isFocused) fetch(); }, [isFocused, fetch]);

  // Live-update: re-fetch the notifications list whenever a real-time
  // notification arrives over the socket.
  useEffect(() => {
    let active = true;
    const events = ['trip-started', 'driver-approaching', 'driver-arrived', 'student-picked-up', 'school-notification', 'new-message'];
    const handler = () => { if (active) fetch(); };
    const setup = async () => {
      await connectSocket();
      const sock = getSocket();
      if (!sock || !active) return;
      events.forEach(e => sock.on(e, handler));
    };
    setup();
    return () => {
      active = false;
      const sock = getSocket();
      if (sock) events.forEach(e => sock.off(e, handler));
    };
  }, [fetch]);

  const getIcon = (type) => {
    switch (type) {
      case 'alert': return '🚌';
      case 'arrival': return '📍';
      case 'system': return '✅';
      default: return '🔔';
    }
  };

  const getTimeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const deleteNotification = item => Alert.alert('Delete notification?', 'This removes it from your account.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      try {
        await messageAPI.deleteNotification(item.id);
        setNotifications(current => current.filter(notification => notification.id !== item.id));
      } catch (e) {
        Alert.alert('Error', e.response?.data?.error || 'Failed to delete notification.');
      }
    } },
  ]);

  const clearNotifications = () => Alert.alert('Clear all notifications?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Clear all', style: 'destructive', onPress: async () => {
      try {
        await messageAPI.clearNotifications();
        setNotifications([]);
      } catch (e) {
        Alert.alert('Error', e.response?.data?.error || 'Failed to clear notifications.');
      }
    } },
  ]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#16a34a" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor="#16a34a" />}
        ListHeaderComponent={
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '700' }}>🔔 Notifications</Text>
            {notifications.length > 0 && <TouchableOpacity onPress={clearNotifications}><Text style={{ color: '#dc2626', fontWeight: '600' }}>Clear all</Text></TouchableOpacity>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
            borderLeftWidth: 4, borderLeftColor: item.messageType === 'alert' ? '#f59e0b' : item.messageType === 'arrival' ? '#2563eb' : '#16a34a',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <Text style={{ fontSize: 24 }}>{getIcon(item.messageType)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: '#111827', lineHeight: 20 }}>{item.content}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <Text style={{ fontSize: 12, color: '#9ca3af' }}>{getTimeAgo(item.createdAt)}</Text>
                  <TouchableOpacity onPress={() => deleteNotification(item)}><Text style={{ fontSize: 16 }}>🗑️</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80 }}>
            <Text style={{ fontSize: 56 }}>🔔</Text>
            <Text style={{ color: '#9ca3af', marginTop: 12, fontSize: 16 }}>No notifications yet</Text>
            <Text style={{ color: '#9ca3af', marginTop: 4, fontSize: 13 }}>You'll be notified when the bus starts, approaches, and arrives.</Text>
          </View>
        }
      />
    </View>
  );
};

export default NotificationsScreen;
