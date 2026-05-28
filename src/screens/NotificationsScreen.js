import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { messageAPI } from '../services/api';

const NotificationsScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const { data } = await messageAPI.getNotifications();
      setNotifications(data.notifications);
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

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

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#16a34a" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetch(); }} tintColor="#16a34a" />}
        ListHeaderComponent={
          <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 16 }}>🔔 Notifications</Text>
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
                <Text style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{getTimeAgo(item.createdAt)}</Text>
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
