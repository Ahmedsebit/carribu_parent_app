import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Linking, Platform, Dimensions, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useIsFocused } from '@react-navigation/native';
import { locationAPI } from '../services/api';
import { connectSocket, trackTrip, getSocket } from '../services/socket';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// react-native-maps requires numeric lat/lng on native; strings or NaN crash
// the app. Coerce every coordinate before it reaches the map.
const num = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v));
const isValidCoord = (lat, lng) => Number.isFinite(lat) && Number.isFinite(lng);

const TrackingScreen = () => {
  const [buses, setBuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
  const [selectedBus, setSelectedBus] = useState(null);
  const mapRef = useRef(null);
  const isFocused = useIsFocused();

  const fetchData = useCallback(async () => {
    try {
      const { data } = await locationAPI.getMyBus();
      setBuses(data.activeBuses);
      if (data.activeBuses.length > 0 && !selectedBus) {
        setSelectedBus(data.activeBuses[0]);
      } else if (selectedBus) {
        const updated = data.activeBuses.find(b => b.tripId === selectedBus.tripId);
        if (updated) setSelectedBus(updated);
      }
    } catch (e) {}
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedBus]);

  useEffect(() => { fetchData(); }, []);

  // Keep a stable ref to fetchData so socket handlers always call the latest
  // version without needing to re-register listeners.
  const fetchDataRef = useRef(fetchData);
  useEffect(() => { fetchDataRef.current = fetchData; }, [fetchData]);

  // Poll only when screen is focused (fallback for socket)
  useEffect(() => {
    if (!isFocused) return;
    const interval = setInterval(fetchData, 30000); // reduced frequency since socket handles real-time
    return () => clearInterval(interval);
  }, [isFocused, fetchData]);

  // Socket.IO real-time tracking: connect once per focus and register the
  // location + notification listeners. This effect intentionally does NOT
  // depend on `buses` so listeners are not torn down/duplicated as buses
  // change (which previously dropped notifications and live location).
  useEffect(() => {
    if (!isFocused) return;
    let active = true;

    const handleLocation = (data) => {
      const location = { lat: num(data.lat), lng: num(data.lng), speed: data.speed, heading: data.heading, updatedAt: new Date().toISOString() };
      setBuses(prev => prev.map(bus => (bus.tripId === data.tripId ? { ...bus, location } : bus)));
      setSelectedBus(prev => (prev && prev.tripId === data.tripId ? { ...prev, location } : prev));
    };
    const handleTripStarted = (d) => { Alert.alert('🚌 Trip Started!', d.message); fetchDataRef.current(); };
    const handleApproaching = (d) => Alert.alert('🚌 Driver Approaching!', d.message);
    const handleArrived = (d) => Alert.alert('📍 Driver Arrived!', d.message);
    const handlePickedUp = (d) => { Alert.alert('✅ Picked Up!', d.message); fetchDataRef.current(); };
    const handleTripStatus = (d) => {
      if (d.status === 'completed') { Alert.alert('✅ Trip Complete', 'The trip has ended.'); fetchDataRef.current(); }
    };

    const setupSocket = async () => {
      await connectSocket();
      const sock = getSocket();
      if (!sock || !active) return;
      sock.on('location-update', handleLocation);
      sock.on('trip-started', handleTripStarted);
      sock.on('driver-approaching', handleApproaching);
      sock.on('driver-arrived', handleArrived);
      sock.on('student-picked-up', handlePickedUp);
      sock.on('trip-status', handleTripStatus);
    };
    setupSocket();

    return () => {
      active = false;
      const sock = getSocket();
      if (sock) {
        sock.off('location-update', handleLocation);
        sock.off('trip-started', handleTripStarted);
        sock.off('driver-approaching', handleApproaching);
        sock.off('driver-arrived', handleArrived);
        sock.off('student-picked-up', handlePickedUp);
        sock.off('trip-status', handleTripStatus);
      }
    };
  }, [isFocused]);

  // Join (and re-join) trip rooms whenever the set of active buses changes.
  // The socket service also re-joins these rooms automatically on reconnect.
  useEffect(() => {
    if (!isFocused) return;
    buses.forEach(bus => { if (bus.tripId) trackTrip(bus.tripId); });
  }, [isFocused, buses]);

  const openMap = (lat, lng) => {
    const url = Platform.OS === 'ios'
      ? `maps:0,0?q=${lat},${lng}`
      : `geo:${lat},${lng}?q=${lat},${lng}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`)
    );
  };

  const fitMapToMarkers = useCallback((bus) => {
    if (!mapRef.current || !bus) return;
    const coords = [];
    if (bus.location) {
      const lat = num(bus.location.lat), lng = num(bus.location.lng);
      if (isValidCoord(lat, lng)) coords.push({ latitude: lat, longitude: lng });
    }
    if (bus.pendingStops) {
      bus.pendingStops.forEach(s => {
        const lat = num(s.lat), lng = num(s.lng);
        if (isValidCoord(lat, lng)) coords.push({ latitude: lat, longitude: lng });
      });
    }
    if (coords.length > 1) {
      mapRef.current.fitToCoordinates(coords, { edgePadding: { top: 80, right: 60, bottom: 260, left: 60 }, animated: true });
    } else if (coords.length === 1) {
      mapRef.current.animateToRegion({ latitude: coords[0].latitude, longitude: coords[0].longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 500);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.loadingText}>Finding your child's bus...</Text>
      </View>
    );
  }

  // Map View
  const renderMapView = () => {
    const bus = selectedBus || (buses.length > 0 ? buses[0] : null);
    const busLat = bus && bus.location ? num(bus.location.lat) : NaN;
    const busLng = bus && bus.location ? num(bus.location.lng) : NaN;
    if (!bus || !bus.location || !isValidCoord(busLat, busLng)) {
      return (
        <View style={styles.noLocationContainer}>
          <Text style={{ fontSize: 56 }}>🚌</Text>
          <Text style={styles.noLocationTitle}>
            {buses.length === 0 ? 'No Active Buses' : 'Waiting for GPS...'}
          </Text>
          <Text style={styles.noLocationSubtitle}>
            {buses.length === 0
              ? "Your child's bus is not running.\nTrips appear when the driver starts."
              : 'The bus is active but GPS data is not yet available.'}
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => { setRefreshing(true); fetchData(); }}>
            <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const busCoord = { latitude: busLat, longitude: busLng };
    const pendingStops = (bus.pendingStops || [])
      .map(s => ({ ...s, lat: num(s.lat), lng: num(s.lng) }))
      .filter(s => isValidCoord(s.lat, s.lng));
    const myStops = pendingStops.filter(s => s.isMyChild);
    const otherStops = pendingStops.filter(s => !s.isMyChild);

    // Build polyline: bus -> stops in order
    const polylineCoords = [busCoord, ...pendingStops
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .map(s => ({ latitude: s.lat, longitude: s.lng }))
    ];

    return (
      <View style={{ flex: 1 }}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={{ ...busCoord, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
          onMapReady={() => fitMapToMarkers(bus)}
          showsUserLocation={true}
          showsMyLocationButton={false}
        >
          {/* Bus marker */}
          <Marker coordinate={busCoord} title="Bus" description={`${bus.vehicle?.plateNumber || 'Bus'} • ${bus.driver?.firstName || 'Driver'}`}>
            <View style={styles.busMarker}>
              <Text style={{ fontSize: 22 }}>🚌</Text>
            </View>
          </Marker>

          {/* Other stops (anonymous) */}
          {otherStops.map((stop, i) => (
            <Marker
              key={`other-${i}`}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              title={`Stop ${stop.stopOrder}`}
              description="Scheduled stop"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.otherStopMarker}>
                <Text style={styles.otherStopText}>{stop.stopOrder}</Text>
              </View>
            </Marker>
          ))}

          {/* My child's stop (highlighted) */}
          {myStops.map((stop, i) => (
            <Marker
              key={`my-${i}`}
              coordinate={{ latitude: stop.lat, longitude: stop.lng }}
              title={`${stop.firstName}'s Stop`}
              description={`Stop #${stop.stopOrder}`}
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <View style={styles.myStopMarker}>
                <Text style={styles.myStopText}>⭐</Text>
              </View>
            </Marker>
          ))}

          {/* Route polyline */}
          {polylineCoords.length > 1 && (
            <Polyline
              coordinates={polylineCoords}
              strokeColor="#16a34a"
              strokeWidth={3}
              lineDashPattern={[10, 5]}
            />
          )}
        </MapView>

        {/* Bottom info card */}
        <View style={styles.bottomCard}>
          <View style={styles.bottomCardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.routeName}>{bus.routeName}</Text>
              <Text style={styles.tripType}>
                {bus.tripType === 'morning_pickup' ? '🌅 Morning Pickup' : '🌇 Afternoon Drop-off'}
              </Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>

          {/* ETA for children */}
          {bus.children && bus.children.filter(c => c.eta && !c.eta.alreadyPickedUp).length > 0 && (
            <View style={styles.etaContainer}>
              {bus.children.filter(c => c.eta && !c.eta.alreadyPickedUp).map(c => (
                <View key={c.id} style={styles.etaRow}>
                  <Text style={styles.etaName}>⏱️ {c.firstName}</Text>
                  <Text style={styles.etaTime}>~{c.eta.totalMinutes} min</Text>
                  <Text style={styles.etaDistance}>{c.eta.distanceKm} km</Text>
                  {c.eta.stopsBefore > 0 && (
                    <Text style={styles.etaStops}>• {c.eta.stopsBefore} stop{c.eta.stopsBefore > 1 ? 's' : ''} before</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {bus.children && bus.children.some(c => c.eta && c.eta.alreadyPickedUp) && (
            <View style={styles.pickedUpBadge}>
              <Text style={styles.pickedUpText}>✅ Already picked up</Text>
            </View>
          )}

          {/* Driver info + call */}
          <View style={styles.driverRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.driverLabel}>Driver</Text>
              <Text style={styles.driverName}>{bus.driver?.firstName} {bus.driver?.lastName}</Text>
              <Text style={styles.vehicleInfo}>{bus.vehicle?.plateNumber} • {bus.vehicle?.color} {bus.vehicle?.make}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {bus.driver?.phone && (
                <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${bus.driver.phone}`)}>
                  <Text style={styles.callBtnText}>📞</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.mapBtn} onPress={() => openMap(bus.location.lat, bus.location.lng)}>
                <Text style={styles.mapBtnText}>🗺️</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stops legend */}
          {pendingStops.length > 0 && (
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                <Text style={styles.legendText}>{otherStops.length} stop{otherStops.length !== 1 ? 's' : ''} before</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#16a34a' }]} />
                <Text style={styles.legendText}>Your child's stop</Text>
              </View>
            </View>
          )}
        </View>

        {/* Bus selector if multiple buses */}
        {buses.length > 1 && (
          <View style={styles.busSelectorContainer}>
            {buses.map(b => (
              <TouchableOpacity
                key={b.tripId}
                style={[styles.busSelectorItem, selectedBus?.tripId === b.tripId && styles.busSelectorActive]}
                onPress={() => { setSelectedBus(b); setTimeout(() => fitMapToMarkers(b), 100); }}
              >
                <Text style={styles.busSelectorText}>🚌 {b.routeName}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // List View (original)
  const renderListView = () => (
    <FlatList
      data={buses}
      keyExtractor={i => String(i.tripId)}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#16a34a" />}
      ListHeaderComponent={
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 22, fontWeight: '700' }}>📍 Live Bus Tracking</Text>
          <Text style={{ fontSize: 13, color: '#6b7280' }}>{buses.length > 0 ? `${buses.length} active bus(es)` : 'Checking...'}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#dcfce7' }}
          onPress={() => setExpanded(expanded === item.tripId ? null : item.tripId)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 28 }}>🚌</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '700' }}>{item.routeName}</Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>{item.tripType === 'morning_pickup' ? '🌅 Morning Pickup' : '🌇 Afternoon Drop-off'}</Text>
              {item.routeSchool ? <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>🏫 {item.routeSchool}</Text> : null}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' }} />
              <Text style={{ color: '#16a34a', fontWeight: '700', fontSize: 12 }}>LIVE</Text>
            </View>
          </View>
          <View style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>Vehicle</Text>
            <Text style={{ fontSize: 14, fontWeight: '500' }}>{item.vehicle?.plateNumber} ({item.vehicle?.color} {item.vehicle?.make} {item.vehicle?.model})</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <View>
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>Driver</Text>
              <Text style={{ fontSize: 14, fontWeight: '500' }}>{item.driver?.firstName} {item.driver?.lastName}</Text>
            </View>
            {item.driver?.phone && (
              <TouchableOpacity style={{ backgroundColor: '#16a34a', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }} onPress={() => Linking.openURL(`tel:${item.driver.phone}`)}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>📞 Call</Text>
              </TouchableOpacity>
            )}
          </View>
          {item.location ? (
            <View style={{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#15803d' }}>📍 Current Location</Text>
                <Text style={{ fontSize: 13, color: '#374151', marginTop: 2 }}>Lat: {isValidCoord(num(item.location.lat), num(item.location.lng)) ? `${num(item.location.lat).toFixed(5)}, Lng: ${num(item.location.lng).toFixed(5)}` : 'unavailable'}</Text>
                {Number.isFinite(num(item.location.speed)) && <Text style={{ fontSize: 12, color: '#16a34a', marginTop: 2 }}>Speed: {num(item.location.speed).toFixed(1)} km/h</Text>}
                <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Updated: {new Date(item.location.recordedAt).toLocaleTimeString()}</Text>
              </View>
              <TouchableOpacity style={{ backgroundColor: '#2563eb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 }} onPress={() => openMap(item.location.lat, item.location.lng)}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>🗺️ Map</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ backgroundColor: '#fef3c7', borderRadius: 10, padding: 12 }}>
              <Text style={{ color: '#92400e', fontSize: 13 }}>⏳ Waiting for GPS data...</Text>
            </View>
          )}
          {item.children && item.children.some(c => c.eta && !c.eta.alreadyPickedUp) && (
            <View style={{ backgroundColor: '#dbeafe', borderRadius: 12, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#bfdbfe' }}>
              {item.children.filter(c => c.eta && !c.eta.alreadyPickedUp).map(c => (
                <View key={c.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#1e40af' }}>⏱️ {c.firstName}: ~{c.eta.totalMinutes} min</Text>
                  <Text style={{ fontSize: 12, color: '#3b82f6' }}>{c.eta.distanceKm} km away</Text>
                </View>
              ))}
            </View>
          )}
          {expanded === item.tripId && item.children && (
            <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 8 }}>🎒 Your Children:</Text>
              {item.children.map(c => (
                <View key={c.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: '500' }}>{c.firstName} {c.lastName}</Text>
                    <Text style={{ color: '#6b7280' }}>{c.grade || 'N/A'}</Text>
                  </View>
                  {c.eta && !c.eta.alreadyPickedUp ? (
                    <View style={{ backgroundColor: '#eff6ff', borderRadius: 8, padding: 10, marginTop: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#1d4ed8' }}>⏱️ ~{c.eta.totalMinutes} min away</Text>
                        <Text style={{ fontSize: 12, color: '#6b7280' }}>{c.eta.distanceKm} km</Text>
                      </View>
                      {c.eta.stopsBefore > 0 && <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>🚏 {c.eta.stopsBefore} stop{c.eta.stopsBefore > 1 ? 's' : ''} before yours (+{c.eta.bufferMinutes} min)</Text>}
                    </View>
                  ) : c.eta && c.eta.alreadyPickedUp ? (
                    <View style={{ backgroundColor: '#dcfce7', borderRadius: 8, padding: 8, marginTop: 6 }}>
                      <Text style={{ color: '#16a34a', fontWeight: '600' }}>✅ Already picked up</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
          <Text style={{ fontSize: 56 }}>🚌</Text>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 16 }}>No Active Buses</Text>
          <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>Your child's bus is not running.{'\n'}Trips appear when the driver starts.</Text>
          <TouchableOpacity style={{ backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 }} onPress={() => { setRefreshing(true); fetchData(); }}>
            <Text style={{ color: '#fff', fontWeight: '600' }}>🔄 Refresh</Text>
          </TouchableOpacity>
        </View>
      }
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f0fdf4' }}>
      {/* View mode toggle */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
          onPress={() => setViewMode('map')}
        >
          <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>🗺️ Map</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
          onPress={() => setViewMode('list')}
        >
          <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>📋 List</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'map' ? renderMapView() : renderListView()}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4' },
  loadingText: { marginTop: 12, color: '#16a34a' },
  noLocationContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  noLocationTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 16 },
  noLocationSubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 8 },
  refreshBtn: { backgroundColor: '#16a34a', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 20 },
  refreshBtnText: { color: '#fff', fontWeight: '600' },
  toggleContainer: { flexDirection: 'row', padding: 8, gap: 6, backgroundColor: '#f0fdf4' },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  toggleBtnActive: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  toggleText: { fontWeight: '600', fontSize: 14, color: '#6b7280' },
  toggleTextActive: { color: '#fff' },
  map: { flex: 1 },
  busMarker: { backgroundColor: '#fff', borderRadius: 20, padding: 6, borderWidth: 2, borderColor: '#16a34a', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  otherStopMarker: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
  otherStopText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  myStopMarker: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },
  myStopText: { fontSize: 16 },
  bottomCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 10 },
  bottomCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  routeName: { fontSize: 18, fontWeight: '700', color: '#111' },
  tripType: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' },
  liveText: { color: '#16a34a', fontWeight: '700', fontSize: 12 },
  etaContainer: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 12, marginBottom: 12 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  etaName: { fontSize: 14, fontWeight: '700', color: '#1d4ed8' },
  etaTime: { fontSize: 14, fontWeight: '600', color: '#1d4ed8' },
  etaDistance: { fontSize: 12, color: '#6b7280' },
  etaStops: { fontSize: 11, color: '#6b7280' },
  pickedUpBadge: { backgroundColor: '#dcfce7', borderRadius: 10, padding: 10, marginBottom: 12 },
  pickedUpText: { color: '#16a34a', fontWeight: '700', textAlign: 'center' },
  driverRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  driverLabel: { fontSize: 11, color: '#9ca3af' },
  driverName: { fontSize: 15, fontWeight: '600', color: '#111' },
  vehicleInfo: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  callBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  callBtnText: { fontSize: 20 },
  mapBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  mapBtnText: { fontSize: 20 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#6b7280' },
  busSelectorContainer: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', gap: 6 },
  busSelectorItem: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  busSelectorActive: { backgroundColor: '#16a34a' },
  busSelectorText: { fontSize: 12, fontWeight: '600', color: '#333' },
});

export default TrackingScreen;
