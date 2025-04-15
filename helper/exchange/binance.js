const WebSocket = require('ws');
const EventEmitter = require('events');

class BinanceMultiPairData extends EventEmitter {
  constructor(symbols = ['btcusdt'], streamType = 'spot') {
    super();
    
    // Validate inputs
    if (!Array.isArray(symbols)) {
      throw new Error('Symbols must be an array');
    }
    if (symbols.some(symbol => typeof symbol !== 'string')) {
      throw new Error('All symbols must be strings');
    }

    this.symbols = symbols.map(s => s.toLowerCase());
    this.streamType = streamType; // spot, futures, coin-futures
    this.ws = null;
    this.reconnectAttempts = 0;
    this.MAX_RECONNECT_ATTEMPTS = 10;
    this.RECONNECT_INTERVAL = 5000;
    this.connectionStatus = 'disconnected';
    this.activeStreams = new Set();
    this.localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  getStreamUrl() {
    const urls = {
      'spot': 'wss://stream.binance.com:9443/ws',
      'futures': 'wss://fstream.binance.com/ws',
      'coin-futures': 'wss://dstream.binance.com/ws'
    };
    return urls[this.streamType] || urls.spot;
  }

  getCombinedStreamUrl() {
    const urls = {
      'spot': 'wss://stream.binance.com:9443/stream?streams=',
      'futures': 'wss://fstream.binance.com/stream?streams=',
      'coin-futures': 'wss://dstream.binance.com/stream?streams='
    };
    return urls[this.streamType] || urls.spot;
  }

  getSubscriptionTopics(symbol) {
    return [
      `${symbol}@ticker`,
      `${symbol}@depth20@100ms`,
      `${symbol}@kline_1m`,
      `${symbol}@kline_5m`,
      `${symbol}@kline_15m`,
      `${symbol}@kline_1h`,
      `${symbol}@kline_4h`,
      `${symbol}@kline_1d`
    ];
  }

  connect() {
    if (this.ws) {
      this.ws.close();
    }

    this.connectionStatus = 'connecting';
    const streams = [];
    this.symbols.forEach(symbol => {
      streams.push(...this.getSubscriptionTopics(symbol));
    });

    const combinedUrl = this.getCombinedStreamUrl() + streams.join('/');
    this.ws = new WebSocket(combinedUrl);

    this.ws.on('open', () => {
      this.broadcastWS("ONLINE");
      console.log('🟢 Connected to Binance WebSocket');
      this.reconnectAttempts = 0;
      this.connectionStatus = 'connected';
      this.activeStreams = new Set(streams);
    });

    this.ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        
        if (parsed.stream) {
          this.handleDataMessage(parsed);
        } else if (parsed.e) {
          // Handle standalone messages (if not using combined stream)
          this.handleDataMessage({ 
            stream: `${parsed.s.toLowerCase()}@${parsed.e.toLowerCase()}`, 
            data: parsed 
          });
        }
      } catch (err) {
        console.error('❌ [BINANCE] Message processing error:', err);
        this.broadcastWS("OFFLINE");
      }
    });

    this.ws.on('error', (err) => {
      this.broadcastWS("OFFLINE");
      console.error('❌ WebSocket error:', `[BINANCE] ${err.message}`);
      this.connectionStatus = 'error';
    });

    this.ws.on('close', () => {
      this.broadcastWS("OFFLINE");
      this.connectionStatus = 'disconnected';
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        console.warn(`🔴 [BINANCE] Disconnected. Reconnecting (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => this.connect(), this.RECONNECT_INTERVAL);
      } else {
        console.error('❌ [BINANCE] Max reconnection attempts reached');
      }
    });
  }

  handleDataMessage(parsed) {
    try {
      const streamParts = parsed.stream.split('@');
      const symbol = streamParts[0].toUpperCase();
      const dataType = streamParts[1];
      const data = parsed.data || parsed;

      const toLocalTime = (timestamp) => {
        const date = new Date(timestamp);
        return {
          timestamp: timestamp,
          isoString: date.toISOString(),
          localString: date.toLocaleString('en-US', { timeZone: this.localTimezone }),
          timezone: this.localTimezone
        };
      };

      switch (dataType) {
        case 'ticker':
          this.emit('market', {
            exchange: 'Binance',
            type: 'MARKET',
            symbol: symbol,
            lastPrice: parseFloat(data.c) || 0,
            priceChange24h: parseFloat(data.p) || 0,
            priceChangePercent24h: parseFloat(data.P) || 0,
            high24h: parseFloat(data.h) || 0,
            low24h: parseFloat(data.l) || 0,
            volume24h: parseFloat(data.v) || 0,
            quoteVolume: parseFloat(data.q) || 0,
            timestamp: toLocalTime(data.E || Date.now())
          });
          break;

        case 'depth20':
          this.emit('orderbook', {
            exchange: 'Binance',
            type: 'ORDERBOOK',
            symbol: symbol,
            bids: data.bids.map(b => ({
              price: parseFloat(b[0]).toFixed(8),
              quantity: parseFloat(b[1]).toFixed(8)
            })),
            asks: data.asks.map(a => ({
              price: parseFloat(a[0]).toFixed(8),
              quantity: parseFloat(a[1]).toFixed(8)
            })),
            timestamp: toLocalTime(data.E || Date.now())
          });
          break;

        case 'kline_1m':
        case 'kline_5m':
        case 'kline_15m':
        case 'kline_1h':
        case 'kline_4h':
        case 'kline_1d':
          const kline = data.k || data;
          this.emit('candle', {
            exchange: "Binance",
            type: "CANDLE",
            symbol: symbol,
            interval: this.mapInterval(dataType.split('_')[1]),
            timestamp: toLocalTime(kline.t),
            current: {
              openTime: kline.t,
              open: parseFloat(kline.o) || 0,
              high: parseFloat(kline.h) || 0,
              low: parseFloat(kline.l) || 0,
              close: parseFloat(kline.c) || 0,
              volume: parseFloat(kline.v) || 0,
              closeTime: kline.T,
              quoteVolume: parseFloat(kline.q) || 0,
              trades: kline.n,
              isClosed: kline.x
            }
          });
          break;
      }
    } catch (err) {
      console.error('❌ Error processing message:', `[BINANCE] ${err}`);
      this.broadcastWS("OFFLINE");
    }
  }

  mapInterval(interval) {
    const intervalMap = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d'
    };
    return intervalMap[interval] || interval;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.broadcastWS("OFFLINE");
    this.reconnectAttempts = 0;
    this.connectionStatus = 'disconnected';
    this.activeStreams.clear();
    
  }

  broadcastWS(status) {
    try {
      if (global.websocketServer && global.websocketServer.broadcastMessage) {
        global.websocketServer.broadcastMessage({
          data_type: 'exchange_status',
          exchange: "BINANCE",
          status:status,
          timestamp: Date.now()
        });
      } else {
        console.warn('[BINANCE] ----> WebSocket server not available for broadcasting');
      }
    } catch (error) {
      console.error('❌ [BINANCE] ----> Failed to broadcast message:', `[BINANCE] ${error}`);
    }
  }

  getStatus() {
    return this.connectionStatus;
  }

  getActiveStreams() {
    return Array.from(this.activeStreams);
  }
}

module.exports = { BinanceMultiPairData };