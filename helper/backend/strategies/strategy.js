// Risk Manager Class
const RM = require('./riskManager.js');
const OKX = require('../../backend/src/services/okx.js');
const config = require('../../configs/config.js');
const indicator = require(`./indicator.js`);
const TELE = require('../src/services/telegram.js'); 
const riskManager = new RM(); // Create an instance
const createWebSocketServer = require('../src/services/wsServer.js');
const ws_server = createWebSocketServer(8080);

// Indicator functions
const calculateFibonacci = indicator.calculateFibonacci;
const calculateATR = indicator.calculateATR;
const calculateIndicators = indicator.calculateIndicators;

// Helper function to detect consolidation patterns
function detectConsolidation(candles, period = 20, threshold = 0.02) {
  if (candles.length < period) return false;
  
  const recentCandles = candles.slice(-period);
  const highs = recentCandles.map(c => c.high);
  const lows = recentCandles.map(c => c.low);
  
  const maxHigh = Math.max(...highs);
  const minLow = Math.min(...lows);
  
  // Calculate the range as percentage of price
  const rangePercentage = (maxHigh - minLow) / ((maxHigh + minLow) / 2);
  
  return rangePercentage < threshold;
}

// Helper function to identify support/resistance levels
function identifyKeyLevels(candles, lookback = 100) {
  if (candles.length < lookback) return { supports: [], resistances: [] };
  
  const recentCandles = candles.slice(-lookback);
  const supports = [];
  const resistances = [];
  
  for (let i = 5; i < recentCandles.length - 5; i++) {
    const current = recentCandles[i];
    const previousFive = recentCandles.slice(i-5, i);
    const nextFive = recentCandles.slice(i+1, i+6);
    
    // Check for support
    if (current.low < Math.min(...previousFive.map(c => c.low)) &&
        current.low < Math.min(...nextFive.map(c => c.low))) {
      supports.push(current.low);
    }
    
    // Check for resistance
    if (current.high > Math.max(...previousFive.map(c => c.high)) &&
        current.high > Math.max(...nextFive.map(c => c.high))) {
      resistances.push(current.high);
    }
  }
  
  // Cluster nearby levels and return the most significant ones
  return {
    supports: [...new Set(supports)].sort((a, b) => a - b),
    resistances: [...new Set(resistances)].sort((a, b) => a - b)
  };
}

// Enhanced MBS confirmation check
async function checkMBSConfirmation(symbol, candles, direction, lastClose) {
  // Identify key levels
  const { supports, resistances } = identifyKeyLevels(candles);
  if (supports.length === 0 || resistances.length === 0) return false;

  const nearestSupport = supports[supports.length - 1];
  const nearestResistance = resistances[resistances.length - 1];
  
  // Volume confirmation
  const volumes = candles.map(c => c.volume);
  const volumeMA = volumes.slice(-20).reduce((sum, vol) => sum + vol, 0) / 20;
  const lastVolume = candles[candles.length - 1].volume;
  const volumeRatio = lastVolume / volumeMA;

  if (direction === 'buy') {
    // For buys, we want confirmation of breakout above resistance
    return lastClose > nearestResistance && volumeRatio > 1.5;
  } else {
    // For sells, we want confirmation of breakdown below support
    return lastClose < nearestSupport && volumeRatio > 1.5;
  }
}

// Close position helper function
async function closePosition(symbol, posSide) {
  try {
    const order = await OKX.placeOrder(
      posSide === 'long' ? 'sell' : 'buy',
      symbol,
      null, // Will close the entire position
      true // Market order
    );
    console.log(`ℹ️ Closed ${posSide} position for ${symbol}:`, order);
    return order;
  } catch (error) {
    console.error(`❌ Error closing ${posSide} position for ${symbol}:`, error);
    throw error;
  }
}

// Trade Management with enhanced trailing stop
function trackTrailingStop(symbol, posSide, orderId, entryPrice, atr) {
  let highestPrice = entryPrice;
  let lowestPrice = entryPrice;
  let isActive = true;
  
  const stopDistance = atr * (config.CONFIG.STOP_LOSS_MULTIPLIER || 1.5);
  const takeProfitDistance = atr * (config.CONFIG.TAKE_PROFIT_MULTIPLIER || 3);
  
  const checkInterval = setInterval(async () => {
    if (!isActive) {
      clearInterval(checkInterval);
      return;
    }
    
    try {
      const candles = await OKX.getCachedMarketData(symbol, '1m');
      if (candles.length === 0) return;
      
      const currentPrice = candles[candles.length - 1].close;
      const currentVolume = candles[candles.length - 1].volume;
      const volumes = candles.map(c => c.volume);
      const volumeMA = volumes.slice(-20).reduce((sum, vol) => sum + vol, 0) / 20;
      const volumeRatio = currentVolume / volumeMA;

      // Update highest/lowest prices
      if (posSide === 'long') {
        highestPrice = Math.max(highestPrice, currentPrice);
        let trailingStop = highestPrice - stopDistance;
        
        // Dynamic stop adjustment based on volatility
        if (volumeRatio > 2) {
          trailingStop = highestPrice - (stopDistance * 0.8); // Tighten stop on high volume
        }
        
        const takeProfit = entryPrice + takeProfitDistance;
        
        if (currentPrice <= trailingStop || currentPrice >= takeProfit) {
          const order = await closePosition(symbol, posSide);
          isActive = false;
          
          const pnl = (currentPrice - entryPrice) / entryPrice * config.CONFIG.LEVERAGE;
          riskManager.updateTradeResult(pnl);
          
          await TELE.sendTelegramMessage(
            `📊 Closed ${posSide} position for ${symbol}\n` +
            `   - Entry: ${entryPrice}, Exit: ${currentPrice}\n` +
            `   - PnL: ${(pnl * 100).toFixed(2)}%\n` +
            `   - Duration: ${((Date.now() - order.timestamp) / 1000 / 60).toFixed(1)} minutes`
          );
        }
      } else {
        lowestPrice = Math.min(lowestPrice, currentPrice);
        let trailingStop = lowestPrice + stopDistance;
        
        // Dynamic stop adjustment based on volatility
        if (volumeRatio > 2) {
          trailingStop = lowestPrice + (stopDistance * 0.8); // Tighten stop on high volume
        }
        
        const takeProfit = entryPrice - takeProfitDistance;
        
        if (currentPrice >= trailingStop || currentPrice <= takeProfit) {
          const order = await closePosition(symbol, posSide);
          isActive = false;
          
          const pnl = (entryPrice - currentPrice) / entryPrice * config.CONFIG.LEVERAGE;
          riskManager.updateTradeResult(pnl);
          
          await TELE.sendTelegramMessage(
            `📊 Closed ${posSide} position for ${symbol}\n` +
            `   - Entry: ${entryPrice}, Exit: ${currentPrice}\n` +
            `   - PnL: ${(pnl * 100).toFixed(2)}%\n` +
            `   - Duration: ${((Date.now() - order.timestamp) / 1000 / 60).toFixed(1)} minutes`
          );
        }
      }
    } catch (error) {
      console.error(`❌ Error tracking ${symbol} position:`, error);
      isActive = false;
    }
  }, 10000); // Check every 10 seconds
}

// Trading Strategy with MBS as final confirmation
async function analyzeSymbol(symbol) {
  try {
    riskManager.resetDailyStats();
    
    if (!(await riskManager.canTrade())) {
      return;
    }
    
    const candles = await OKX.getCachedMarketData(symbol, config.CONFIG.INTERVAL);
    if (candles.length < 50) {
      console.log(`⚠️  Not enough data for ${symbol}`);
      return;
    }
    
    const prices = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const lastCandle = candles[candles.length - 1];
    const lastClose = lastCandle.close;
    const lastHigh = lastCandle.high;
    const lastLow = lastCandle.low;
    
    // Get indicators
    const { rsi, macd, signal, upperBand, lowerBand, ema20, ema50 } = await calculateIndicators(prices);
    const lastRSI = rsi[rsi.length - 1];
    const lastMACD = macd[macd.length - 1];
    const lastSignal = signal[signal.length - 1];
    const lastUpperBand = upperBand[upperBand.length - 1];
    const lastLowerBand = lowerBand[lowerBand.length - 1];
    
    // Additional confirmations
    const atr = calculateATR(candles);
    const fibLevels = calculateFibonacci(candles);
    const ema20Last = ema20[ema20.length - 1];
    const ema50Last = ema50[ema50.length - 1];
    const emaTrend = ema20Last > ema50Last ? 'bullish' : 'bearish';
    
    // Volume analysis
    const volumeMA = volumes.slice(-20).reduce((sum, vol) => sum + vol, 0) / 20;
    const volumeRatio = lastCandle.volume / volumeMA;
    
    const analitic_data = {
      symbol: symbol,
      trend:emaTrend,
      RSI: lastRSI.toFixed(4), 
      MACD: lastMACD.toFixed(4), 
      Signal: lastSignal.toFixed(4), 
      Price: lastClose.toFixed(4), 
      ATR: atr,
      price: prices[prices.length-1],
      ema20: ema20Last.toFixed(4),
      ema50: ema50Last.toFixed(4),
      volumeRatio: volumeRatio.toFixed(4)
    };
    
    // Check for buy signals with MBS confirmation
    const buyConditions = [
      emaTrend === 'bullish',
      lastRSI < config.CONFIG.lastRSI,
      lastMACD > lastSignal,
      lastClose <= lastLowerBand,
      lastClose > ema20Last,
      volumeRatio > config.CONFIG.volumeRatio,
      lastClose >= fibLevels[config.CONFIG.fibLevels]
    ];
    
    // Check for sell signals with MBS confirmation
    const sellConditions = [
      emaTrend === 'bearish',
      lastRSI > config.CONFIG.lastRSI,
      lastMACD < lastSignal,
      lastClose >= lastUpperBand,
      lastClose < ema20Last,
      volumeRatio > config.CONFIG.volumeRatio,
      lastClose <= fibLevels[config.CONFIG.fibLevels]
    ];
    
    // Detailed logging
    console.log(`\n📊 Analysis for ${symbol} at ${new Date().toISOString()}`);
    console.log(`   - Price: ${lastClose} | High: ${lastHigh} | Low: ${lastLow}`);
    console.log(`   - RSI: ${lastRSI.toFixed(2)} | MACD: ${lastMACD.toFixed(4)} | Signal: ${lastSignal.toFixed(4)}`);
    console.log(`   - EMA20: ${ema20Last.toFixed(2)} | EMA50: ${ema50Last.toFixed(2)} | Trend: ${emaTrend}`);
    console.log(`   - ATR: ${atr.toFixed(2)} | Volume Ratio: ${volumeRatio.toFixed(2)}x`);
    console.log(`   - Fib Levels: 0.236: ${fibLevels[0.236].toFixed(2)} | 0.382: ${fibLevels[0.382].toFixed(2)} | 0.5: ${fibLevels[0.5].toFixed(2)} | 0.618: ${fibLevels[0.618].toFixed(2)}`);
    console.log(`   - Trend: ${emaTrend}`);

    // Check for buy with MBS confirmation
    if (buyConditions.every(condition => condition)) {
      console.log("🔵 Potential BUY signal detected. Checking MBS confirmation...");
      const mbsConfirmed = await checkMBSConfirmation(symbol, candles, 'buy', lastClose);
      
      if (mbsConfirmed) {
        const size = await riskManager.calculatePositionSize(atr, lastClose, symbol);
        console.log(`✅ Confirmed BUY signal. Size: ${size}`);
        
        const order = await OKX.placeOrder('buy', symbol, size);
        console.log(order);
        ws_server.broadcastMessage(JSON.stringify(order));
        
        if (order) {
          trackTrailingStop(symbol, 'long', order.ordId, lastClose, atr);
          await TELE.sendTelegramMessage(
            `✅ CONFIRMED BUY ${symbol} at ${lastClose}\n` +
            `   - Strategy: Mean Reversion + MBS Breakout Confirmation\n` +
            `   - Size: ${size}, Leverage: ${config.CONFIG.LEVERAGE}x\n` +
            `   - RSI: ${lastRSI.toFixed(2)}, MACD Hist: ${(lastMACD - lastSignal).toFixed(4)}\n` +
            `   - ATR: ${atr.toFixed(2)}, Stop: ${(atr * config.CONFIG.STOP_LOSS_MULTIPLIER).toFixed(2)}\n` +
            `   - Take Profit: ${(atr * config.CONFIG.TAKE_PROFIT_MULTIPLIER).toFixed(2)}`
          );
        }
      } else {
        console.log("🔴 BUY signal not confirmed by MBS");
      }
    } 
    // Check for sell with MBS confirmation
    else if (sellConditions.every(condition => condition)) {
      console.log("🔵 Potential SELL signal detected. Checking MBS confirmation...");
      const mbsConfirmed = await checkMBSConfirmation(symbol, candles, 'sell', lastClose);
      
      if (mbsConfirmed) {
        const size = await riskManager.calculatePositionSize(atr, lastClose, symbol);
        console.log(`✅ Confirmed SELL signal. Size: ${size}`);
        
        const order = await OKX.placeOrder('sell', symbol, size);
        console.log(order);
        ws_server.broadcastMessage(JSON.stringify(order));
        
        if (order) {
          trackTrailingStop(symbol, 'short', order.ordId, lastClose, atr);
          await TELE.sendTelegramMessage(
            `✅ CONFIRMED SELL ${symbol} at ${lastClose}\n` +
            `   - Strategy: Mean Reversion + MBS Breakdown Confirmation\n` +
            `   - Size: ${size}, Leverage: ${config.CONFIG.LEVERAGE}x\n` +
            `   - RSI: ${lastRSI.toFixed(2)}, MACD Hist: ${(lastMACD - lastSignal).toFixed(4)}\n` +
            `   - ATR: ${atr.toFixed(2)}, Stop: ${(atr * config.CONFIG.STOP_LOSS_MULTIPLIER).toFixed(2)}\n` +
            `   - Take Profit: ${(atr * config.CONFIG.TAKE_PROFIT_MULTIPLIER).toFixed(2)}`
          );
        }
      } else {
        console.log("🔴 SELL signal not confirmed by MBS");
      }
    } 
    else {
      ws_server.broadcastMessage(JSON.stringify(analitic_data));
      console.log("🔴 No trading conditions met for", symbol);
    }
  } catch (error) {
    console.error(`❌ Error analyzing ${symbol}:`, error);
    await TELE.sendTelegramMessage(`❌ Error analyzing ${symbol}: ${error.response?.statusText || error.message}`);
  }
}

module.exports = {
  calculateFibonacci,
  calculateATR,
  calculateIndicators,
  analyzeSymbol,
  trackTrailingStop,
  detectConsolidation,
  identifyKeyLevels,
  checkMBSConfirmation
};