const WebSocket = require('ws');
require('dotenv').config();

class WebSocketClient {
  constructor(url = `ws://127.0.0.1:8080`) {
    this.url = url;
    this.client = null;
    this.reconnectInterval = 5000; // 5 seconds
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageHandlers = new Set();
    this.connectionHandlers = new Set();
    this.disconnectionHandlers = new Set();
    this.errorHandlers = new Set();
  }

  connect() {
    this.client = new WebSocket(this.url);

    this.client.on('open', () => {
      console.log('✅ Connected to WebSocket server');
      this.reconnectAttempts = 0;
      this.notifyConnectionHandlers();
    });

    this.client.on('message', (data) => {
      try {
        const message = this.parseMessage(data);
        this.notifyMessageHandlers(message);
      } catch (error) {
        console.error('❌ Error processing message:', error);
      }
    });

    this.client.on('close', () => {
      console.log('❌ Disconnected from WebSocket server');
      this.notifyDisconnectionHandlers();
      this.handleReconnection();
    });

    this.client.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      this.notifyErrorHandlers(error);
    });
  }

  parseMessage(data) {
    try {
      return JSON.parse(data);
    } catch {
      return data.toString();
    }
  }

  handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`♻️ Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => this.connect(), this.reconnectInterval);
    } else {
      console.log('⛔ Maximum reconnection attempts reached');
    }
  }

  // Message handler management
  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onConnect(handler) {
    this.connectionHandlers.add(handler);
    return () => this.connectionHandlers.delete(handler);
  }

  onDisconnect(handler) {
    this.disconnectionHandlers.add(handler);
    return () => this.disconnectionHandlers.delete(handler);
  }

  onError(handler) {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  // Notification methods
  notifyMessageHandlers(message) {
    this.messageHandlers.forEach(handler => handler(message));
  }

  notifyConnectionHandlers() {
    this.connectionHandlers.forEach(handler => handler());
  }

  notifyDisconnectionHandlers() {
    this.disconnectionHandlers.forEach(handler => handler());
  }

  notifyErrorHandlers(error) {
    this.errorHandlers.forEach(handler => handler(error));
  }

  send(data) {
    if (this.client && this.client.readyState === WebSocket.OPEN) {
      const payload = typeof data === 'object' ? JSON.stringify(data) : data;
      this.client.send(payload, (error) => {
        if (error) console.error('Send error:', error);
      });
      return true;
    }
    console.warn('❌ WebSocket not ready');
    return false;
  }

  close() {
    if (this.client) {
      this.client.close();
    }
  }
}

module.exports = WebSocketClient;