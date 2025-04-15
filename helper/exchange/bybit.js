const WebSocket = require('ws');
const EventEmitter = require('events');

class BybitMultiPairData extends EventEmitter {
  constructor(symbols = ['BTCUSDT'], category = 'spot') {
    super();
    
    if (!Array.isArray(symbols)) {
      throw new Error('Symbols must be an array');
    }
    if (symbols.some(symbol => typeof symbol !== 'string')) {
      throw new Error('All symbols must be strings');
    }

    this.symbols = symbols;
    this.category = category; // spot, linear, inverse
    this.ws = null;
    this.reconnectAttempts = 0;
    this.MAX_RECONNECT_ATTEMPTS = 10;
    this.RECONNECT_INTERVAL = 5000;
    this.subscriptionQueue = [];
    this.isProcessingQueue = false;
    this.connectionStatus = 'disconnected';
  }

  getSubscriptionTopics(symbol) {
    return [
      `orderbook.50.${symbol}`,
      `tickers.${symbol}`,
      `kline.1.${symbol}`,
      `kline.5.${symbol}`,
      `kline.15.${symbol}`,
      `kline.60.${symbol}`,
      `kline.240.${symbol}`,
      `kline.D.${symbol}`
    ];
  }

  connect() {
    if (this.ws) {
      this.ws.close();
    }

    this.connectionStatus = 'connecting';
    this.ws = new WebSocket(`wss://stream.bybit.com/v5/public/${this.category}`);

    this.ws.on('open', () => {
      console.log('🟢 [BYBIT] Connected to Bybit WebSocket');
      this.reconnectAttempts = 0;
      this.connectionStatus = 'connected';
      this.broadcastWS("ONLINE");
      // Build subscription queue
      this.subscriptionQueue = [];
      this.symbols.forEach(symbol => {
        this.subscriptionQueue.push(...this.getSubscriptionTopics(symbol));
      });

      this.processSubscriptionQueue();
    });

    this.ws.on('message', (data) => {
      try {
        const parsed = JSON.parse(data.toString());
        
        // Handle subscription responses
        if (parsed.success !== undefined) {
          if (!parsed.success) {
            console.error('❌  [BYBIT] Subscription failed:', parsed.ret_msg);
          }
          return;
        }

        // Handle market data
        if (parsed.topic) {
          this.handleDataMessage(parsed);
        }
      } catch (err) {
        console.error('❌  [BYBIT] Message processing error:', err);
         this.broadcastWS("OFFLINE");
      }
    });

    this.ws.on('error', (err) => {
      console.error('❌  [BYBIT] WebSocket error:', err.message);
      this.connectionStatus = 'error';
      this.broadcastWS("OFFLINE");
    });

    this.ws.on('close', () => {
      this.connectionStatus = 'disconnected';
      this.broadcastWS("OFFLINE");
      if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.reconnectAttempts++;
        console.warn(`🔴  [BYBIT] Disconnected. Reconnecting (${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => this.connect(), this.RECONNECT_INTERVAL);
      } else {
        console.error('❌  [BYBIT] Max reconnection attempts reached');
        //this.emit('error', new Error('Max reconnection attempts reached'));
      }
    });
  }

  processSubscriptionQueue() {
    if (this.isProcessingQueue || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    this.isProcessingQueue = true;

    const processNextBatch = () => {
      if (this.subscriptionQueue.length === 0) {
        this.isProcessingQueue = false;
        console.log('✅  [BYBIT] All subscriptions processed');
        return;
      }

      const batch = this.subscriptionQueue.splice(0, 10); // Max 10 subscriptions per request
      const subscribeMsg = {
        op: 'subscribe',
        args: batch
      };

      this.ws.send(JSON.stringify(subscribeMsg), (err) => {
        if (err) {
          console.error('❌  [BYBIT] Failed to send subscription:', err.message);
          this.subscriptionQueue.unshift(...batch); // Requeue failed batch
        } else {
          console.log('📤  [BYBIT] Sent subscriptions:', batch.join(', '));
        }

        // Process next batch after short delay
        setTimeout(processNextBatch, 200);
      });
    };

    processNextBatch();
  }

  handleDataMessage(parsed) {
    try {
      const topicParts = parsed.topic.split('.');
      const dataType = topicParts[0];
      const symbol = topicParts[topicParts.length - 1];

      switch (dataType) {
        case 'tickers':
          const tickerData = parsed.data;
          this.emit('market', {
            exchange: 'Bybit',
            type: 'MARKET',
            symbol: symbol,
            lastPrice: parseFloat(tickerData.lastPrice) || 0,
            priceChange24h: (parseFloat(tickerData.price24hPcnt) || 0) * 100,
            priceChangePercent24h: (parseFloat(tickerData.price24hPcnt) || 0) * 100,
            high24h: parseFloat(tickerData.highPrice24h) || 0,
            low24h: parseFloat(tickerData.lowPrice24h) || 0,
            volume24h: parseFloat(tickerData.volume24h) || 0,
            timestamp: tickerData.ts || Date.now()
          });
          break;

        case 'orderbook':
          const orderbookData = parsed.data;
          this.emit('orderbook', {
            exchange: 'Bybit',
            type: 'ORDERBOOK',
            symbol: symbol,
            bids: orderbookData.b.map(b => ({
              price: parseFloat(b[0]).toFixed(2),
              quantity: parseFloat(b[1]).toFixed(4)
            })),
            asks: orderbookData.a.map(a => ({
              price: parseFloat(a[0]).toFixed(2),
              quantity: parseFloat(a[1]).toFixed(4)
            })),
            timestamp: orderbookData.ts || Date.now()
          });
          break;

        case 'kline':
          const klineData = parsed.data[0];
          const interval = topicParts[1];
          
          this.emit('candle', {
            exchange: "Bybit",
            type: "CANDLE",
            symbol: symbol,
            interval: this.mapInterval(interval),
            timestamp: parseInt(klineData.start),
            current: {
                openTime: parseInt(klineData.start),
                open: parseFloat(klineData.open) || 0,
                high: parseFloat(klineData.high) || 0,
                low: parseFloat(klineData.low) || 0,
                close: parseFloat(klineData.close) || 0,
                volume: parseFloat(klineData.volume) || 0
            }
          });
          break;
      }
    } catch (err) {
      console.error('❌  [BYBIT] Error processing message:', err);
      this.broadcastWS("OFFLINE");
    }
  }

  mapInterval(interval) {
    const intervalMap = {
      '1': '1m',
      '5': '5m',
      '15': '15m',
      '60': '1h',
      '240': '4h',
      'D': '1d'
    };
    return intervalMap[interval] || interval;
  }

  broadcastWS(status) {
    try {
      if (global.websocketServer && global.websocketServer.broadcastMessage) {
        global.websocketServer.broadcastMessage({
          data_type: 'exchange_status',
          exchange: "BYBIT",
          status:status,
          timestamp: Date.now()
        });
      } else {
        console.warn(' [BYBIT] ----> WebSocket server not available for broadcasting');
      }
    } catch (error) {
      console.error('❌  [BYBIT] ----> Failed to broadcast message:', error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.subscriptionQueue = [];
    this.isProcessingQueue = false;
    this.connectionStatus = 'disconnected';
    this.broadcastWS("OFFLINE");
  }

  getStatus() {
    return this.connectionStatus;
  }
}

module.exports = { BybitMultiPairData };