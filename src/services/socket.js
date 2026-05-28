import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'http://10.0.2.2:5000';
let socket = null;
let listeners = [];

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

  socket.on('connect', () => console.log('🔌 Socket connected'));
  socket.on('disconnect', () => console.log('🔌 Socket disconnected'));
  socket.on('connect_error', (err) => console.log('🔌 Socket error:', err.message));

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) { socket.disconnect(); socket = null; }
};

export const trackTrip = (tripId) => {
  if (socket) socket.emit('track-trip', tripId);
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
