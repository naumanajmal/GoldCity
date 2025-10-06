import { io, Socket } from 'socket.io-client';
import { WeatherReading } from '../types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

class SocketService {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });
    }
    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onWeatherUpdate(callback: (reading: WeatherReading) => void): void {
    if (this.socket) {
      this.socket.on('weather:update', callback);
    }
  }

  onConnect(callback: () => void): void {
    if (this.socket) {
      this.socket.on('connect', callback);
    }
  }

  onDisconnect(callback: () => void): void {
    if (this.socket) {
      this.socket.on('disconnect', callback);
    }
  }

  offWeatherUpdate(): void {
    if (this.socket) {
      this.socket.off('weather:update');
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export default new SocketService();
