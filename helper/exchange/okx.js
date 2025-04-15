const WebSocket = require('ws');
const EventEmitter = require('events');

class OKXMultiPairData extends EventEmitter {
  constructor(pairs = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'], instType = 'FUTURES') {
    super();
    
    // Validate pairs input
    if (!Array.isArray(pairs)) {
      throw new Error('Pairs must be an array');
    }
    if (pairs.some(pair => typeof pair !== 'string')) {
      throw new Error('All pairs must be strings');
    }

    this.pairs = pairs;
    this.instType = instType;
    this.publicChannels = ['tickers', 'books'];

    this.businessChannels = [
      'candle3M', 'candle1M', 'candle1W', 'candle1D', 'candle2D', 'candle3D', 'candle5D',
      'candle12H', 'candle6H', 'candle4H', 'candle2H', 'candle1H', 'candle30m', 'candle15m',
      'candle5m', 'candle3m', 'candle1m', 'candle1s',
      'candle3Mutc', 'candle1Mutc', 'candle1Wutc', 'candle1Dutc', 'candle2Dutc',
      'candle3Dutc', 'candle5Dutc', 'candle12Hutc', 'candle6Hutc'
    ];

    this.PUBLIC_WS_URL = 'wss://ws.okx.com:8443/ws/v5/public';
    this.BUSINESS_WS_URL = 'wss://ws.okx.com:8443/ws/v5/business';

    this.publicWS = null;
    this.businessWS = null;
    this.reconnectAttempts = 0;
    this.MAX_RECONNECT_ATTEMPTS = 10;
    this.RECONNECT_INTERVAL = 5000;
    this.connectionStatus = {
      public: 'disconnected',
      business: 'disconnected'
    };
  }

  buildArgs(channels, instType = this.instType) {
    if (!Array.isArray(channels)) {
      throw new Error('Channels must be an array');
    }

    const args = [];
    channels.forEach(channel => {
      this.pairs.forEach(instId => {
        args.push({ channel, instId, instType });
      });
    });
    return args;
  }

  connect() {
    this.connectPublicWS();
    this.connectBusinessWS();
  }

  disconnect() {
    if (this.publicWS) {
      this.publicWS.close();
      this.publicWS = null;
      this.connectionStatus.public = 'disconnected';
      this.broadcastWS("OFFLINE");
    }
    if (this.businessWS) {
      this.businessWS.close();
      this.businessWS = null;
      this.connectionStatus.business = 'disconnected';
      this.broadcastWS("OFFLINE");
    }
    this.reconnectAttempts = 0;
    this.broadcastWS("OFFLINE");
  }

  mapInterval(interval) {
    const intervalMap = {
      "1H": "1h",
      "4H": "4h",
      "1D": "1d",
      "3M": "3M",
      "1M": "1M",
      "1W": "1W",
      "2D": "2D",
      "3D": "3D",
      "5D": "5D",
      "12H": "12H",
      "6H": "6H",
      "2H": "2H",
      "30m": "30m",
      "15m": "15m",
      "5m": "5m",
      "3m": "3m",
      "1m": "1m",
      "1s": "1s"
    };
    return intervalMap[interval] || interval;
  }
  
  connectPublicWS() {
    if (this.publicWS) {
      this.publicWS.close();
    }

    this.connectionStatus.public = 'connecting';
    this.publicWS = new WebSocket(this.PUBLIC_WS_URL);

    this.publicWS.on('open', () => {
      this.broadcastWS("ONLINE");
      console.log('🟢 [OKX] Connected to OKX Public WebSocket');
      this.reconnectAttempts = 0;
      this.connectionStatus.public = 'connected';
      try {
        const args = this.buildArgs(this.publicChannels);
        this.publicWS.send(JSON.stringify({ op: 'subscribe', args }));
        //console.log('📤 Subscribed to Public channels:', args.map(a => `${a.channel}:${a.instId}`).join(', '));
      } catch (err) {
        console.error('❌ [OKX Public WS] Subscription Error:', err);
      }
    });

    this.publicWS.on('message', (data) => {
      try {
        if (!data) {
          console.warn('⚠️ [OKX Public WS] Empty message received');
          return;
        }

        const parsed = JSON.parse(data);
        const { channel, instId } = parsed.arg || {};

        if (!parsed.data || !Array.isArray(parsed.data) || parsed.data.length === 0) {
          return;
        }

        if (channel === 'tickers') {
          const pair = parsed.data[0];
          if (!pair) return;
          const currentPrice = parseFloat(pair.last);
          const open24hPrice = parseFloat(pair.open24h);
          const change24hPercent = open24hPrice === 0 ? 0 : ((currentPrice - open24hPrice) / open24hPrice) * 100;

          const md = {
            exchange: "OKX",
            type: "MARKET",
            instType: pair.instType || 'UNKNOWN',
            symbol: instId ? instId.replace("-", "") : 'UNKNOWN',
            lastPrice: currentPrice,
            priceChange24h: parseFloat(pair.priceChange24h) || 0,
            priceChangePercent24h: parseFloat(change24hPercent).toFixed(2),
            high24h: parseFloat(pair.high24h) || 0,
            low24h: parseFloat(pair.low24h) || 0,
            volume24h: parseFloat(pair.volCcy24h) || 0,
            timestamp: pair.ts || Date.now()
          };
          this.emit('market', md);
        }

        if (channel === 'books') {
          const pair = parsed.data[0];
          if (!pair || !pair.bids || !pair.asks) return;

          const count = 10;
          const processEntries = (entries, sortFn) => 
            entries
              .sort(sortFn)
              .slice(0, count)
              .map(([price, quantity]) => ({
                quantity: parseFloat(quantity).toFixed(4),
                price: parseFloat(price).toFixed(2)
              }));

          const sortedBids = processEntries(pair.bids, (a, b) => parseFloat(b[0]) - parseFloat(a[0]));
          const sortedAsks = processEntries(pair.asks, (a, b) => parseFloat(a[0]) - parseFloat(b[0]));

          const ob = {
            exchange: "OKX",
            type: "ORDERBOOK",
            symbol: instId ? instId.replace("-", "") : 'UNKNOWN',
            bids: sortedBids,
            asks: sortedAsks,
            timestamp: pair.ts || Date.now()
          };

          this.emit('orderbook', ob);
        }

      } catch (err) {
        console.error('❌ [OKX Public WS] Message Processing Error:', err.message);
        this.broadcastWS("OFFLINE");
      }
    });

    this.publicWS.on('error', (err) => {
      this.broadcastWS("OFFLINE");
      console.error('❌ [OKX Public WS] Error:', err);
      this.connectionStatus.public = 'error';
    });

    this.publicWS.on('close', () => {
      this.broadcastWS("OFFLINE");
      this.connectionStatus.public = 'disconnected';
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        console.warn(`🔴 [OKX Public WS] Disconnected. Reconnecting attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}...`);
        setTimeout(() => this.connectPublicWS(), this.RECONNECT_INTERVAL);
      } else {
        console.error('❌ [OKX Public WS] Max reconnection attempts reached');
        //this.emit('error', new Error('Max reconnection attempts reached for Public WS'));
      }
    });
  }

  connectBusinessWS() {
    if (this.businessWS) {
      this.businessWS.close();
    }

    this.connectionStatus.business = 'connecting';
    this.businessWS = new WebSocket(this.BUSINESS_WS_URL);

    this.businessWS.on('open', () => {
      this.broadcastWS("ONLINE");
      console.log('🟢 [OKX] Connected to OKX Business WebSocket');
      this.reconnectAttempts = 0;
      this.connectionStatus.business = 'connected';
      try {
        const args = this.buildArgs(this.businessChannels);
        this.businessWS.send(JSON.stringify({ op: 'subscribe', args }));
        //console.log('📤 [OKX] Subscribed to Candle channels:', args.map(a => `${a.channel}:${a.instId}`).join(', '));
      } catch (err) {
        console.error('❌ [OKX Business WS] Subscription Error:', err.message);
      }
    });

    this.businessWS.on('message', (data) => {
      try {
        if (!data) {
          console.warn('⚠️ [OKX Business WS] Empty message received');
          return;
        }

        const parsed = JSON.parse(data);
        const { channel, instId } = parsed.arg || {};

        if (!parsed.data || !Array.isArray(parsed.data) || parsed.data.length === 0) {
          return;
        }

        if (channel?.startsWith('candle')) {
          const pair = parsed.data[0];
          if (!pair || pair.length < 6) return;

          const candle = {
            exchange: "OKX",
            type: "CANDLE",
            symbol: instId ? instId.replace("-", "") : 'UNKNOWN',
            interval: this.mapInterval(channel.replace("candle", "")),
            timestamp: new Date(parseInt(pair[0])),
            current: {
              openTime: parseInt(pair[0]),
              open: parseFloat(pair[1]) || 0,
              high: parseFloat(pair[2]) || 0,
              low: parseFloat(pair[3]) || 0,
              close: parseFloat(pair[4]) || 0,
              volume: parseFloat(pair[5]) || 0
            }
          };

          this.emit('candle', candle);
        }

      } catch (err) {
        console.error('❌ [OKX Business WS] Message Processing Error:', err.message);
        this.broadcastWS("OFFLINE");
      }
    });

    this.businessWS.on('error', (err) => {
      this.broadcastWS("OFFLINE");
      console.error('❌ [OKX Business WS] Error:', err.message);
      this.connectionStatus.business = 'error';
      
    });

    this.businessWS.on('close', () => {
      this.broadcastWS("OFFLINE");
      this.connectionStatus.business = 'disconnected';
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        console.warn(`🔴 [OKX Business WS] Disconnected. Reconnecting attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}...`);
        setTimeout(() => this.connectBusinessWS(), this.RECONNECT_INTERVAL);
      } else {
        console.error('❌ [OKX Business WS] Max reconnection attempts reached');
      }
    });
  }

  broadcastWS(status) {
    try {
      console.log("📤 [OKX] OKX Broadcast server status");
      global.websocketServer.broadcastMessage({
          data_type: 'exchange_status',
          exchange: "OKX",
          status:status,
          timestamp: Date.now()
        });
    } catch (error) {
      console.error('❌ [OKX] -------> Failed to broadcast message:', `[OKX] ${error}`);
    }
  }

  getStatus() {
    return {
      public: this.connectionStatus.public,
      business: this.connectionStatus.business
    };
  }
}

module.exports = { OKXMultiPairData };