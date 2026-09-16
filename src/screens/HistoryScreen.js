import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
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
  const [tab, setTab] = useState('upcoming'); // 'upcoming' | 'past'
  const [trips, setTrips] = useState([]);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [schoolId, setSchoolId] = useState('all');
  const [studentId, setStudentId] = useState('all');
  const [schools, setSchools] = useState([]);
  const [students, setStudents] = useState([]);

  const load = useCallback(async () => {
    try {
      const filters = {};
      if (schoolId !== 'all') filters.schoolId = schoolId;
      if (studentId !== 'all') filters.studentId = studentId;
      const [historyRes, upcomingRes] = await Promise.all([
        tripAPI.getHistory(30, filters),
        tripAPI.getUpcoming(7, filters),
      ]);
      setTrips(historyRes.data.trips || []);
      setUpcomingTrips(upcomingRes.data.trips || []);
      const filterOptions = historyRes.data.filters || upcomingRes.data.filters || {};
      setSchools(filterOptions.schools || []);
      setStudents(filterOptions.students || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, studentId]);

  useEffect(() => { load(); }, [load]);

  const visibleStudents = useMemo(
    () => schoolId === 'all'
      ? students
      : students.filter(student => String(student.schoolId) === schoolId),
    [schoolId, students]
  );

  const selectSchool = (value) => {
    setSchoolId(value);
    if (
      studentId !== 'all' &&
      value !== 'all' &&
      !students.some(student =>
        String(student.id) === studentId && String(student.schoolId) === value
      )
    ) {
      setStudentId('all');
    }
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );

  const TabButton = ({ id, label }) => (
    <TouchableOpacity
      onPress={() => setTab(id)}
      style={{
        flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center',
        backgroundColor: tab === id ? '#16a34a' : 'transparent',
      }}
    >
      <Text style={{ fontWeight: '700', color: tab === id ? '#fff' : '#374151' }}>{label}</Text>
    </TouchableOpacity>
  );

  const FilterChip = ({ selected, label, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 18,
        marginRight: 8,
        backgroundColor: selected ? '#15803d' : '#fff',
        borderWidth: 1,
        borderColor: selected ? '#15803d' : '#d1d5db',
      }}
    >
      <Text style={{ color: selected ? '#fff' : '#374151', fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );

  const Filters = () => (
    <View style={{ marginTop: 14 }}>
      <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '700', marginBottom: 6 }}>School</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <FilterChip selected={schoolId === 'all'} label="All schools" onPress={() => selectSchool('all')} />
        {schools.map(school => (
          <FilterChip
            key={school.id}
            selected={schoolId === String(school.id)}
            label={school.name}
            onPress={() => selectSchool(String(school.id))}
          />
        ))}
      </ScrollView>
      <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '700', marginTop: 12, marginBottom: 6 }}>Student</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <FilterChip selected={studentId === 'all'} label="All children" onPress={() => setStudentId('all')} />
        {visibleStudents.map(student => (
          <FilterChip
            key={student.id}
            selected={studentId === String(student.id)}
            label={`${student.firstName} ${student.lastName}`}
            onPress={() => setStudentId(String(student.id))}
          />
        ))}
      </ScrollView>
    </View>
  );

  const tripStatusMeta = {
    scheduled: { label: 'Scheduled', color: '#2563eb', icon: '📅' },
    delayed: { label: 'Delayed', color: '#d97706', icon: '⚠️' },
  };

  if (tab === 'upcoming') {
    return (
      <View style={{ flex: 1, backgroundColor: '#f3f4f6' }}>
        <FlatList
          data={upcomingTrips}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 22, fontWeight: '700' }}>🚌 Upcoming Trips</Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>Scheduled trips • next 7 days</Text>
              <View style={{ flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 12, padding: 4, marginTop: 12 }}>
                <TabButton id="upcoming" label="Upcoming" />
                <TabButton id="past" label="History" />
              </View>
              <Filters />
            </View>
          }
          renderItem={({ item }) => {
            const m = tripStatusMeta[item.status] || tripStatusMeta.scheduled;
            return (
              <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700' }}>{item.route?.name || 'Route'}</Text>
                  <Text style={{ fontSize: 12, color: m.color, fontWeight: '700' }}>{m.icon} {m.label}</Text>
                </View>
                {item.school?.name ? <Text style={{ fontSize: 12, color: '#15803d', fontWeight: '600', marginTop: 3 }}>🏫 {item.school.name}</Text> : null}
                <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
                  {item.type === 'morning_pickup' ? '🌅 Morning' : '🌇 Afternoon'} • 📅 {fmtDate(item.scheduledDate)}{item.scheduledTime ? ` • 🕐 ${item.scheduledTime.slice(0, 5)}` : ''}
                </Text>
                <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
                  👤 {item.driver?.name || 'Driver TBD'} • 🚐 {item.vehicle?.plateNumber || '—'}
                </Text>
                {(item.children || []).length > 0 && (
                  <Text style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>
                    👦 {(item.children || []).map((c) => c.studentName).join(', ')}
                  </Text>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48 }}>🚌</Text>
              <Text style={{ color: '#9ca3af', marginTop: 12 }}>No upcoming trips scheduled.</Text>
            </View>
          }
        />
      </View>
    );
  }

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
            <View style={{ flexDirection: 'row', backgroundColor: '#e5e7eb', borderRadius: 12, padding: 4, marginTop: 12 }}>
              <TabButton id="upcoming" label="Upcoming" />
              <TabButton id="past" label="History" />
            </View>
            <Filters />
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
              {item.school?.name ? <Text style={{ fontSize: 12, color: '#15803d', fontWeight: '600', marginTop: 3 }}>🏫 {item.school.name}</Text> : null}
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
