// File: websocket-server.js
// Creator: Yassuki

const WebSocket = require('ws');
const EventEmitter = require('events');

function createWebSocketServer(port, options = {}) {
  const {
    maxClients = 2000000000000,
    allowedIPs = ['127.0.0.1', '::1'],
    maxPayloadBytes = 1024 * 10, // 10 KB
    rateLimit = 10, // messages per 10 seconds
    pingInterval = 30000 // 30 seconds
  } = options;

  const eventEmitter = new EventEmitter();
  const socketClients = new Set(); // All raw socket connections
  const idMap = new Map(); // Map of clientId => ws
  const messageTracker = new WeakMap(); // Rate limiting per socket

  const wss = new WebSocket.Server({ host: '127.0.0.1', port,
    headers: {
      'User-Agent': 'Yassuki-Orderbook-Bot/1.0'
    }
   }, () => {
    console.log(`🚀 WebSocket server started at ws://127.0.0.1:${port}`);
    eventEmitter.emit('serverStarted', port);
  });

  wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress;
    let clientId = null;

    if (!allowedIPs.includes(clientIP)) {
      console.warn(`🚫 Unauthorized IP blocked: ${clientIP}`);
      ws.terminate();
      return;
    }

    if (socketClients.size >= maxClients) {
      console.warn(`⚠️ Max clients reached. Rejecting new client: ${clientIP}`);
      ws.close(1013, 'Server overloaded');
      return;
    }

    socketClients.add(ws);
    messageTracker.set(ws, []);
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (message) => {
      if (message.length > maxPayloadBytes) {
        console.warn(`📛 Payload too large from ${clientIP}`);
        ws.close(1009, 'Payload too large');
        return;
      }

      let data;
      try {
        data = JSON.parse(message);
      } catch (err) {
        console.warn(`❌ Invalid JSON from ${clientIP}`);
        ws.close(1003, 'Invalid JSON');
        return;
      }

      // Handle client ID registration
      if (data.type === 'register' && data.id) {
        clientId = data.id;
        idMap.set(clientId, ws);
        //console.log(`✅ Client registered with ID: ${clientId}`);
      }

      // Rate limiting
      const now = Date.now();
      const timestamps = messageTracker.get(ws) || [];
      const recent = timestamps.filter(ts => now - ts < 10000);
      if (recent.length >= rateLimit) {
        console.warn(`⚠️ Rate limit exceeded by ${clientIP}`);
        ws.close(1011, 'Rate limit exceeded');
        return;
      }

      messageTracker.set(ws, [...recent, now]);
      //console.log('🟢 Received:', message.toString());
      eventEmitter.emit('message', message.toString(), ws);
    });

    ws.on('close', () => {
      socketClients.delete(ws);
      messageTracker.delete(ws);
      if (clientId) {
        idMap.delete(clientId);
       //console.log(`❎ Client ${clientId} disconnected`);
      }
      eventEmitter.emit('disconnect', ws);
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
      socketClients.delete(ws);
      messageTracker.delete(ws);
      if (clientId) {
        idMap.delete(clientId);
        console.log(`❎ Client ${clientId} disconnected due to error`);
      }
      eventEmitter.emit('error', error, ws);
    });

    eventEmitter.emit('connection', ws, clientIP);
  });

  // Keep alive check
  const pingIntervalId = setInterval(() => {
    socketClients.forEach(client => {
      if (!client.isAlive) {
        console.log(`💀 Terminating unresponsive client`);
        return client.terminate();
      }
      client.isAlive = false;
      client.ping();
    });
  }, pingInterval);

  wss.on('close', () => {
    clearInterval(pingIntervalId);
  });

  // Broadcast to all clients
  function broadcastMessage(data, options = {}) {
    const message = typeof data === 'object' ? JSON.stringify(data) : data.toString();
    socketClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message, options, (error) => {
          if (error) {
            console.error('❌ Broadcast error:', error);
            socketClients.delete(client);
          }
        });
      }
    });
  }

  // Send to specific client by ID
  function sendMsgToClient(id, message) {
    const client = idMap.get(id);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    } else {
      console.log(`⚠️ Client ${id} not connected`);
    }
  }

  // Make API globally available
  global.websocketServer = {
    broadcastMessage,
    sendMsgToClient,
    getClientCount: () => socketClients.size,
    on: (...args) => eventEmitter.on(...args),
    close: () => wss.close()
  };

  return global.websocketServer;
}

module.exports = { createWebSocketServer };
