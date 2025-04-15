const WebSocket = require('ws');
const EventEmitter = require('events');

class CoinexMultiPairData extends EventEmitter {
  constructor(symbols = ['BTCUSDT'], marketType = 'spot') {
    super();
    this.localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.symbols = this.validateAndNormalizeSymbols(symbols);
    this.marketType = marketType;
    this.initializeConnectionProperties();
  }

  validateAndNormalizeSymbols(symbols) {
    if (!Array.isArray(symbols)) {
      throw new Error('Symbols must be an array');
    }
    if (symbols.some(symbol => typeof symbol !== 'string')) {
      throw new Error('All symbols must be strings');
    }
    return symbols.map(s => s.toUpperCase());
  }

  initializeConnectionProperties() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.MAX_RECONNECT_ATTEMPTS = 10;
    this.RECONNECT_INTERVAL = 5000;
    this.subscriptionQueue = [];
    this.isProcessingQueue = false;
    this.pingInterval = null;
    this.healthCheckInterval = null;
    this.reconnectTimer = null;
    this.connectionTimer = null;
    this.activeSubscriptions = new Set();
    this.lastMessageTime = null;
    this.isExplicitDisconnect = false;
  }

  getWebSocketUrl() {
    const endpoints = {
      spot: 'wss://socket.coinex.com/',
      futures: 'wss://perpetual.coinex.com/',
      margin: 'wss://margin.coinex.com/'
    };
    return endpoints[this.marketType] || endpoints.spot;
  }

  getSubscriptionMethods(symbol) {
    const intervals = [60, 300, 900, 3600, 14400, 86400]; // 1m,5m,15m,1h,4h,1d
    return [
      { method: 'state.subscribe', params: [symbol], id: this.generateId('state') },
      { method: 'ticker.subscribe', params: [symbol], id: this.generateId('ticker') },
      { method: 'depth.subscribe', params: [symbol, 50, '0'], id: this.generateId('depth') },
      ...intervals.map(interval => ({
        method: 'kline.subscribe',
        params: [symbol, interval],
        id: this.generateId(`kline_${interval}`)
      }))
    ];
  }

  generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  connect() {
    this.isExplicitDisconnect = false;
    this.cleanupExistingConnection();
    
    console.log(`Connecting to Coinex ${this.marketType} WebSocket...`);
    this.ws = new WebSocket(this.getWebSocketUrl());
    this.setupEventHandlers();
    this.setupConnectionTimeout();
  }

  cleanupExistingConnection() {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.close();
    }
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  setupEventHandlers() {
    this.ws.on('open', () => {
      console.log('🟢 WebSocket connected');
      clearTimeout(this.connectionTimer);
      this.handleOpen();
    });

    this.ws.on('message', (data) => {
      this.lastMessageTime = Date.now();
      try {
        const parsed = JSON.parse(data.toString());
        this.handleMessage(parsed);
      } catch (err) {
        console.error('Message parse error:', err);
        this.emit('error', err);
      }
    });

    this.ws.on('error', (err) => {
      console.error('🔴 WebSocket error:', err.message);
      this.handleError(err);
    });

    this.ws.on('close', (code, reason) => {
      const reasonStr = reason.toString() || 'no reason provided';
      console.warn(`🔧 WebSocket closed (code ${code}, reason: ${reasonStr})`);
      this.handleClose(code, reason);
    });
  }

  setupConnectionTimeout() {
    this.connectionTimer = setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        console.warn('Connection timeout - forcing reconnect');
        this.ws.close();
        this.scheduleReconnect();
      }
    }, 10000);
  }

  handleOpen() {
    this.reconnectAttempts = 0;
    this.lastMessageTime = Date.now();
    this.initializeSubscriptions();
    this.startKeepAlive();
    this.startHealthChecks();
    this.emit('connected');
  }

  initializeSubscriptions() {
    this.subscriptionQueue = this.symbols.flatMap(symbol => 
      this.getSubscriptionMethods(symbol)
    );
    this.processSubscriptionQueue();
  }

  startKeepAlive() {
    this.pingInterval = setInterval(() => {
      if (this.isConnectionAlive()) {
        this.sendPing();
      } else {
        console.warn('Connection appears stale, reconnecting...');
        this.scheduleReconnect();
      }
    }, 30000);
  }

  startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      if (this.lastMessageTime && Date.now() - this.lastMessageTime > 60000) {
        console.warn('No messages received for 60 seconds - reconnecting');
        this.scheduleReconnect();
      }
    }, 30000);
  }

  isConnectionAlive() {
    return this.ws && this.ws.readyState === WebSocket.OPEN && 
           (Date.now() - this.lastMessageTime < 45000);
  }

  sendPing() {
    try {
      if (this.isConnectionReady()) {
        this.ws.send(JSON.stringify({ 
          method: 'server.ping', 
          params: [], 
          id: this.generateId('ping') 
        }));
      }
    } catch (err) {
      console.error('Ping failed:', err);
      this.scheduleReconnect();
    }
  }

  handleMessage(parsed) {
    if (parsed.error) {
      this.handleErrorResponse(parsed);
    } else if (parsed.id && parsed.result) {
      this.handleSubscriptionResponse(parsed);
    } else if (parsed.method) {
      this.handleDataMessage(parsed);
    }
  }

  handleErrorResponse(response) {
    console.error('API Error:', response.error);
    this.emit('api_error', response.error);
  }

  handleSubscriptionResponse(response) {
    const subscriptionId = response.id.split('_')[0];
    this.activeSubscriptions.add(subscriptionId);
    console.log(`✅ Subscription active: ${subscriptionId}`);
  }

  handleDataMessage(parsed) {
    const handlers = {
      'ticker.update': this.processTickerData.bind(this),
      'depth.update': this.processDepthData.bind(this),
      'kline.update': this.processKlineData.bind(this),
      'state.update': this.processStateData.bind(this)
    };

    const handler = handlers[parsed.method];
    if (handler) {
      handler(parsed);
    }
  }

  processTickerData(parsed) {
    const [symbol, tickerData] = parsed.params;
    this.emit('market', {
      exchange: 'Coinex',
      type: 'MARKET',
      symbol: symbol.toUpperCase(),
      lastPrice: parseFloat(tickerData.last) || 0,
      priceChange24h: parseFloat(tickerData.percent) || 0,
      high24h: parseFloat(tickerData.high) || 0,
      low24h: parseFloat(tickerData.low) || 0,
      volume24h: parseFloat(tickerData.vol) || 0,
      timestamp: this.formatTimestamp(tickerData.time)
    });
  }

  processDepthData(parsed) {
    const [symbol, depthData] = parsed.params;
    this.emit('orderbook', {
      exchange: 'Coinex',
      type: 'ORDERBOOK',
      symbol: symbol.toUpperCase(),
      bids: this.normalizeDepthData(depthData.bids),
      asks: this.normalizeDepthData(depthData.asks),
      timestamp: this.formatTimestamp(depthData.time)
    });
  }

  normalizeDepthData(data) {
    return data.map(item => ({
      price: parseFloat(item[0]).toFixed(8),
      quantity: parseFloat(item[1]).toFixed(8)
    }));
  }

  processKlineData(parsed) {
    const [symbol, klineData, interval] = parsed.params;
    this.emit('candle', {
      exchange: 'Coinex',
      type: 'CANDLE',
      symbol: symbol.toUpperCase(),
      interval: this.mapInterval(interval),
      timestamp: this.formatTimestamp(klineData[0]),
      open: parseFloat(klineData[1]) || 0,
      high: parseFloat(klineData[2]) || 0,
      low: parseFloat(klineData[3]) || 0,
      close: parseFloat(klineData[4]) || 0,
      volume: parseFloat(klineData[5]) || 0
    });
  }

  processStateData(parsed) {
    const [symbol, stateData] = parsed.params;
    this.emit('state', {
      exchange: 'Coinex',
      type: 'STATE',
      symbol: symbol.toUpperCase(),
      lastPrice: parseFloat(stateData.last) || 0,
      volume24h: parseFloat(stateData.volume) || 0,
      timestamp: this.formatTimestamp(stateData.time)
    });
  }

  formatTimestamp(seconds) {
    if (!seconds) seconds = Math.floor(Date.now() / 1000);
    const date = new Date(seconds * 1000);
    return {
      timestamp: seconds * 1000,
      isoString: date.toISOString(),
      localString: date.toLocaleString('en-US', { timeZone: this.localTimezone }),
      timezone: this.localTimezone
    };
  }

  mapInterval(intervalSeconds) {
    const intervalMap = {
      60: '1m', 300: '5m', 900: '15m', 1800: '30m',
      3600: '1h', 14400: '4h', 86400: '1d', 604800: '1w'
    };
    return intervalMap[intervalSeconds] || `${intervalSeconds}s`;
  }

  async processSubscriptionQueue() {
    if (this.isProcessingQueue || !this.isConnectionReady()) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.subscriptionQueue.length > 0 && this.isConnectionReady()) {
      const subscription = this.subscriptionQueue.shift();
      
      try {
        await this.sendSubscriptionWithRetry(subscription, 3);
      } catch (err) {
        console.error('Failed to send subscription after retries:', subscription.method);
        this.subscriptionQueue.unshift(subscription);
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessingQueue = false;
    if (this.subscriptionQueue.length === 0) {
      console.log('✅ All subscriptions processed');
    }
  }

  async sendSubscriptionWithRetry(subscription, maxRetries) {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        await this.sendSubscription(subscription);
        return;
      } catch (err) {
        attempts++;
        if (attempts < maxRetries) {
          const delay = Math.pow(2, attempts) * 100;
          console.warn(`Retrying ${subscription.method} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw err;
        }
      }
    }
  }

  async sendSubscription(subscription) {
    return new Promise((resolve, reject) => {
      if (!this.isConnectionReady()) {
        return reject(new Error('Connection not ready'));
      }

      this.ws.send(JSON.stringify(subscription), (err) => {
        if (err) {
          console.error(`Failed to send ${subscription.method}:`, err.message);
          this.handleSendError(err, subscription);
          reject(err);
        } else {
          console.log(`✅ Sent ${subscription.method} for ${subscription.params[0]}`);
          resolve();
        }
      });
    });
  }

  isConnectionReady() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  handleSendError(err, subscription) {
    if (err.code === 'EHOSTUNREACH' || err.code === 'ETIMEDOUT') {
      this.subscriptionQueue.unshift(subscription);
      console.log('Requeued failed subscription');
    }
    
    if (this.ws.readyState === WebSocket.CLOSING || 
        this.ws.readyState === WebSocket.CLOSED) {
      this.ws.close();
    }
  }

  handleError(err) {
    console.error('WebSocket error:', err.message);
    this.emit('error', err);
    
    if (!this.isFatalError(err)) {
      this.scheduleReconnect();
    }
  }

  isFatalError(err) {
    return false;
  }

  handleClose(code, reason) {
    if (code === 1006) {
      console.warn('Detected abnormal closure (1006), may be network issue');
    }

    this.cleanupConnection();
    
    if (code !== 1006 && this.subscriptionQueue.length > 0) {
      console.log('Clearing pending subscriptions due to disconnect');
      this.subscriptionQueue = [];
    }
    
    if (!this.isExplicitDisconnect) {
      this.scheduleReconnect();
    }
  }

  cleanupConnection() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    this.activeSubscriptions.clear();
  }

  scheduleReconnect() {
    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached');
      this.emit('fatal_error', new Error('Max reconnection attempts reached'));
      return;
    }

    this.reconnectAttempts++;
    
    const baseDelay = Math.min(
      this.RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );
    const jitter = Math.floor(Math.random() * 2000);
    const delay = baseDelay + jitter;

    console.warn(`Will reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      console.log('Attempting reconnect...');
      this.connect();
    }, delay);
  }

  async disconnect() {
    this.isExplicitDisconnect = true;
    this.cleanupConnection();
    
    if (this.ws) {
      return new Promise((resolve) => {
        this.ws.once('close', () => {
          this.ws = null;
          resolve();
        });
        this.ws.close();
      });
    }
    return Promise.resolve();
  }

  addSymbol(symbol) {
    const normalized = symbol.toUpperCase();
    if (!this.symbols.includes(normalized)) {
      this.symbols.push(normalized);
      if (this.isConnectionReady()) {
        this.subscriptionQueue.push(...this.getSubscriptionMethods(normalized));
        this.processSubscriptionQueue();
      }
    }
  }
}

module.exports = { CoinexMultiPairData };

// Usage example
const client = new CoinexMultiPairData(['BTCUSDT'], 'spot');
client.on('market', data => console.log('Market:', data));
// client.on('orderbook', data => console.log('Orderbook:', data));
// client.on('candle', data => console.log('Candle:', data));
// client.on('state', data => console.log('State:', data));
// client.on('error', err => console.error('Error:', err));

client.connect();