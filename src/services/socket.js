import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SOCKET_BASE_URL } from '@env';

const API_BASE = SOCKET_BASE_URL || 'http://10.0.2.2:5000';
let socket = null;
let listeners = [];
// Trips the user is currently tracking. The server places the socket in the
// `trip:<id>` room on `track-trip`, but that membership is lost whenever the
// socket reconnects. We keep the set here so we can re-join on every connect.
const trackedTrips = new Set();

export const connectSocket = async () => {
  const token = await AsyncStorage.getItem('token');
  if (!token) return null;
  if (socket?.connected) return socket;

  socket = io(API_BASE, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
    // Re-join every tracked trip room after a (re)connect so location and
    // trip-room events keep flowing after network blips or app backgrounding.
    trackedTrips.forEach((tripId) => socket.emit('track-trip', tripId));
  });
  socket.on('disconnect', () => console.log('🔌 Socket disconnected'));
  socket.on('connect_error', (err) => console.log('🔌 Socket error:', err.message));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
  trackedTrips.clear();
};

export const trackTrip = (tripId) => {
  if (tripId == null) return;
  trackedTrips.add(tripId);
  if (socket?.connected) socket.emit('track-trip', tripId);
};

export const untrackTrip = (tripId) => {
  trackedTrips.delete(tripId);
};

export const onLocationUpdate = (callback) => {
  if (socket) socket.on('location-update', callback);
};

export const onNotification = (event, callback) => {
  if (socket) socket.on(event, callback);
};

export const offLocationUpdate = (callback) => {
  if (socket) socket.off('location-update', callback);
};

export const sendChatMessage = (tripId, receiverId, message) => {
  if (socket) socket.emit('chat-message', { tripId, receiverId, message });
};

export const onNewMessage = (callback) => {
  if (socket) socket.on('new-message', callback);
};

export const offNewMessage = (callback) => {
  if (socket) socket.off('new-message', callback);
};
