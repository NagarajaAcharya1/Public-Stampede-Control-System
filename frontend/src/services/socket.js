import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  getBackendUrl() {
    const stored = localStorage.getItem('backendUrl');
    if (stored) return stored;
    
    const { hostname, protocol } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    return `${protocol}//${hostname}:5000`;
  }

  connect() {
    if (this.socket && this.isConnected) return this.socket;

    const backendUrl = this.getBackendUrl();
    console.log(`🔌 Connecting to WebSocket: ${backendUrl}`);

    this.socket = io(backendUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.warn('🔌 WebSocket connection error:', error.message);
      this.isConnected = false;
    });

    this.socket.connect();
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }
}

// Export singleton instance
export const socketService = new SocketService();
export const socket = socketService; // For backward compatibility