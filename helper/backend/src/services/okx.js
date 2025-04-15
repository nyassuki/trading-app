require('dotenv').config();
const crypto = require('crypto');
const cfg = require('../../../configs/config.js');
const cors = require('cors');
const axios = require('axios');
const tulind = require('tulind');
const NodeCache = require('node-cache');
const WebSocket = require('ws');
//const RM = require('../../strategies/riskManager.js');
//const riskManager = new RM(); // Create an instance


// Initialize caches
const marketDataCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });
const indicatorCache = new NodeCache({ stdTTL: 60 });

// OKX API Helper Functions
function signMessage(timestamp, method, endpoint, body = '') {
  const prehash = timestamp + method + endpoint + body;
  return crypto.createHmac('sha256', process.env.OKX_SECRET_KEY).update(prehash).digest('base64');
}
 
async function makeOKXRequest(method, endpoint, body = null) {
  const timestamp = new Date().toISOString();
  const headers = {
    'OK-ACCESS-KEY': process.env.OKX_API_KEY,
    'OK-ACCESS-SIGN': signMessage(timestamp, method, endpoint, body ? JSON.stringify(body) : ''),
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': process.env.OKX_PASSPHRASE,
    'x-simulated-trading': cfg.CONFIG.DEMO_MODE ? '1' : '0'
  };

  if (body) headers['Content-Type'] = 'application/json';

  try {
    const config = {
      method,
      url: `${cfg.CONFIG.BASE_URL}${endpoint}`,
      headers
    };

    if (body) config.data = body;

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('❌ OKX API error:', error.response?.data || error.message);
    throw error;
  }
}

// Market Data Functions
async function fetchMarketData(symbol, interval) {
  try {
    const response = await makeOKXRequest(
      'GET',
      `/api/v5/market/candles?instId=${symbol}&bar=${interval}`
    );
    
    return response.data.map(candle => ({
      time: parseInt(candle[0]),
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
      volume: parseFloat(candle[5])
    }));
  } catch (error) {
    console.error(`❌ Error fetching market data for ${symbol}:`, error);
    throw error;
  }
}

async function getCachedMarketData(symbol, interval) {
  const cacheKey = `${symbol}_${interval}`;
  let data = marketDataCache.get(cacheKey);
  
  if (!data) {
    data = await fetchMarketData(symbol, interval);
    marketDataCache.set(cacheKey, data);
  }
  return data;
}
// Account Functions
async function getAccountBalance(ccy = 'USDT') {
  try {
    const response = await makeOKXRequest(
      'GET',
      `/api/v5/account/balance?ccy=${ccy}`
    );
    return parseFloat(response.data[0].details.find(d => d.ccy === ccy).eq);
  } catch (error) {
    console.error('❌ Error fetching balance:', error);
    throw error;
  }
}
async function getOpenPositions(symbol = 'all') {
  try {
    const response = await makeOKXRequest('GET', '/api/v5/account/positions');

    // Filter out positions where pos is not zero
    let rsp = response.data.filter(pos => parseFloat(pos.pos) !== 0);

    // If a specific symbol is provided, filter by instId
    if (symbol !== 'all') {
      rsp = rsp.filter(position => position.instId === symbol);
    }

    // If no positions are found, return an empty array
    if (rsp.length === 0) {
      console.log(`⚠️ No open positions found${symbol !== 'all' ? ` for ${symbol}` : ''}`);
      return [];
    }

    // Map all positions into the desired format with .toFixed(4) for numerical values
    const positionsData = rsp.map(pos => ({
      instId: pos.instId,
      tradeId: pos.tradeId,
      posId: pos.posId,
      uTime: pos.uTime,
      uplLastPx: parseFloat(pos.uplLastPx).toFixed(4),
      uplRatio: parseFloat(pos.uplRatio).toFixed(4),
      uplRatioLastPx: parseFloat(pos.uplRatioLastPx).toFixed(4),
      margin: parseFloat(pos.imr).toFixed(4),
      lever: parseFloat(pos.lever).toFixed(4),
      entryPrice: parseFloat(pos.avgPx).toFixed(4),
      floatingPNL: parseFloat(pos.upl).toFixed(4),
      size_in_usdt: parseFloat(pos.pos).toFixed(4),
      entry_price: parseFloat(pos.last).toFixed(4),
      last_Price: parseFloat(pos.idxPx).toFixed(4),
      entry_size:parseFloat(pos.pos/pos.last).toFixed(4),
      last_size:parseFloat(pos.pos/pos.idxPx).toFixed(4),
      estLiquidityPrice: parseFloat(pos.liqPx).toFixed(4),
      marginRatio: parseFloat(pos.mgnRatio).toFixed(4),
    }));
    return positionsData;
  } catch (error) {
    console.error('❌ Error fetching positions:', error);
    throw error;
  }
}

// Trading Functions
async function placeOrder(side, symbol, size) {
  const lvg = await setLaverage(symbol);
  try {
    if(lvg.response==true) {
        const response = await makeOKXRequest(
          'POST',
          '/api/v5/trade/order',
          {
            instId: symbol,
            tdMode: "cross",
            side: side.toLowerCase(),
            ordType: "market",
            sz: size,
            ccy:'USDT',
            lever: cfg.CONFIG.LEVERAGE.toString()
          }
        );
        return response.data[0];
    } else {
      return {respose:false, msg:lvg.msg};
    }
  } catch (error) {
    console.error('❌ Order error:', error);
    throw error;
  }
}

// SET laverage
async function setLaverage(symbol=null) {
  try {
    const response = await makeOKXRequest(
      'POST',
      '/api/v5/account/set-leverage',
      {
        instId:symbol,
        ccy:"USDT",
        lever: cfg.CONFIG.LEVERAGE.toString(),
        mgnMode: "cross",
        posSide:null,
      }
    );
    if(response.code==0) {
      let res = response.data[0];
      res.respose = true;
      res.msg = "success";

      return res;
    } else {
      return {respose:false, msg:response.msg};
    }
    
  } catch (error) {
    console.error('❌ set laverage error:', error);
     
  }
}


async function closePosition(symbol,ccy) {
try {
    const response = await makeOKXRequest(
      'POST',
      '/api/v5/trade/close-position',
      {
        instId: symbol,
        mgnMode: "cross",
        ccy:ccy
      }
    );
    console.log(response);

    return response.data[0];
  } catch (error) {
    console.error('❌ Close position error:', error);
  }
}

// Trade Management
function trackTrailingStop(symbol, posSide, orderId, entryPrice, atr) {
  let highestPrice = entryPrice;
  let lowestPrice = entryPrice;
  let isActive = true;
  
  const stopDistance = atr * 1.5;
  const takeProfitDistance = atr * 3;
  
  const checkInterval = setInterval(async () => {
    if (!isActive) {
      clearInterval(checkInterval);
      return;
    }
    
    try {
      const candles = await getCachedMarketData(symbol, '1m');
      if (candles.length === 0) return;
      
      const currentPrice = candles[candles.length - 1].close;
      
      // Update highest/lowest prices
      if (posSide === 'long') {
        highestPrice = Math.max(highestPrice, currentPrice);
        const trailingStop = highestPrice - stopDistance;
        const takeProfit = entryPrice + takeProfitDistance;
        
        if (currentPrice <= trailingStop || currentPrice >= takeProfit) {
          await closePosition(symbol, "USDT");
          isActive = false;
          
          const pnl = posSide === 'long' ? 
            (currentPrice - entryPrice) / entryPrice * cfg.CONFIG.LEVERAGE :
            (entryPrice - currentPrice) / entryPrice * cfg.CONFIG.LEVERAGE;
          
          riskManager.updateTradeResult(pnl);
          await sendTelegramMessage(
            `❌ Closed ${posSide} position for ${symbol}\n` +
            `   - Entry: ${entryPrice}, Exit: ${currentPrice}\n` +
            `   - PnL: ${(pnl * 100).toFixed(2)}%`
          );
        }
      } else {
        lowestPrice = Math.min(lowestPrice, currentPrice);
        const trailingStop = lowestPrice + stopDistance;
        const takeProfit = entryPrice - takeProfitDistance;
        
        if (currentPrice >= trailingStop || currentPrice <= takeProfit) {
          await closePosition(symbol, "USDT");
          isActive = false;
          
          const pnl = posSide === 'long' ? 
            (currentPrice - entryPrice) / entryPrice * cfg.CONFIG.LEVERAGE :
            (entryPrice - currentPrice) / entryPrice * cfg.CONFIG.LEVERAGE;
          
          riskManager.updateTradeResult(pnl);
          await sendTelegramMessage(
            `❌ Closed ${posSide} position for ${symbol}\n` +
            `   - Entry: ${entryPrice}, Exit: ${currentPrice}\n` +
            `   - PnL: ${(pnl * 100).toFixed(2)}%`
          );
        }
      }
    } catch (error) {
      console.error(`❌ Error tracking ${symbol} position:`, error);
      isActive = false;
    }
  }, 10000); // Check every 10 seconds
}


// WebSocket Implementation
class OKXWebSocket {
  constructor() {
    this.ws = null;
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket(cfg.CONFIG.WS_URL);
    
    this.ws.on('open', () => {
      console.log('🟢 WebSocket connected');
      this.subscribeToTickers();
    });
    
    this.ws.on('message', (data) => {
      this.handleMessage(JSON.parse(data));
    });
    
    this.ws.on('close', () => {
      console.log('🔴 WebSocket disconnected, reconnecting...');
      setTimeout(() => this.connect(), 5000);
    });
    
    this.ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });
  }
  
  subscribeToTickers() {
    this.ws.send(JSON.stringify({
      op: 'subscribe',
      args: cfg.CONFIG.SYMBOLS.map(sym => ({
        channel: 'tickers',
        instId: sym
      }))
    }));
  }
  
  handleMessage(data) {
    if (data.arg?.channel === 'tickers' && data.data) {
      const ticker = data.data[0];
      const symbol = data.arg.instId;
      
      // Update cache with latest ticker data
      marketDataCache.set(`ticker_${symbol}`, ticker);
      
      // Check if we need to trigger immediate analysis
      if (ticker.lastPx && ticker.vol24h) {
        const priceChange = parseFloat(ticker.lastPx) - parseFloat(ticker.open24h);
        const changePercent = (priceChange / parseFloat(ticker.open24h)) * 100;
        
        if (Math.abs(changePercent) > 1) { // If price moved more than 1%
          analyzeSymbol(symbol).catch(console.error);
        }
      }
    }
  }
}

module.exports = {
  OKXWebSocket,
  getAccountBalance,
  fetchMarketData,
  getCachedMarketData,
  placeOrder,
  closePosition,
  trackTrailingStop,
  getOpenPositions,
  setLaverage
};