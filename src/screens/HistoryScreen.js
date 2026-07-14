import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { tripAPI } from '../services/api';

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};
const fmtTime = (t) => (t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—');
const fmtWait = (s) => {
  if (s == null) return null;
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};
const statusMeta = {
  on_bus: { label: 'Picked up', color: '#16a34a', icon: '✅' },
  dropped_off: { label: 'Dropped off', color: '#2563eb', icon: '📤' },
  absent: { label: 'Absent', color: '#dc2626', icon: '❌' },
  arrived: { label: 'Bus arrived', color: '#d97706', icon: '📍' },
  pending: { label: 'No record', color: '#6b7280', icon: '—' },
};

const HistoryScreen = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await tripAPI.getHistory(30);
      setTrips(data.trips || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
      <FlatList
        data={trips}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListHeaderComponent={
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '700' }}>🕘 Trip History</Text>
            <Text style={{ fontSize: 13, color: '#6b7280' }}>Past trips • last 30 days</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOpen = expanded === item.id;
          const picked = (item.children || []).filter((c) => c.status === 'on_bus' || c.status === 'dropped_off').length;
          return (
            <TouchableOpacity
              activeOpacity={0.9}
              style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 }}
              onPress={() => setExpanded(isOpen ? null : item.id)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '700' }}>{item.route?.name || 'Route'}</Text>
                <Text style={{ fontSize: 13, color: '#6b7280' }}>{item.type === 'morning_pickup' ? '🌅 Morning' : '🌇 Afternoon'}</Text>
              </View>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                📅 {fmtDate(item.scheduledDate)} • 🕐 {fmtTime(item.startedAt)}–{fmtTime(item.endedAt)}
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                👤 {item.driver?.name || 'Driver'} • 🚐 {item.vehicle?.plateNumber || '—'} • ✅ {picked}/{(item.children || []).length}
              </Text>

              {isOpen && (
                <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 }}>
                  {(item.children || []).map((c) => {
                    const m = statusMeta[c.status] || statusMeta.pending;
                    const wait = fmtWait(c.waitSeconds);
                    return (
                      <View key={c.studentId} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontSize: 14, fontWeight: '700' }}>{c.studentName}</Text>
                          <Text style={{ fontSize: 12, color: m.color, fontWeight: '700' }}>{m.icon} {m.label}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', marginTop: 6, gap: 16 }}>
                          <Text style={{ fontSize: 12, color: '#374151' }}>📍 Arrived {fmtTime(c.arrivedAt)}</Text>
                          <Text style={{ fontSize: 12, color: '#374151' }}>🚌 Picked {fmtTime(c.pickedAt)}</Text>
                        </View>
                        {wait && (
                          <Text style={{ fontSize: 12, color: '#15803d', fontWeight: '600', marginTop: 4 }}>
                            ⏱️ Waited {wait} from bus arrival to pickup
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 48 }}>🕘</Text>
            <Text style={{ color: '#9ca3af', marginTop: 12 }}>No past trips in the last 30 days.</Text>
          </View>
        }
      />
    </View>
  );
};

export default HistoryScreen;
