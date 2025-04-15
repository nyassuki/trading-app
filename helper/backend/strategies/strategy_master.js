const axios = require('axios');

// Configuration
const config = {
  symbol: 'BTCUSDT',
  interval: '15m',
  fibLevels: [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1],
  riskRewardRatio: 2,
  trailingStopPercent: 1,
  candlesLimit: 100
};

// 1. Fetch Real Historical Data from Binance
async function getHistoricalData() {
  try {
    const response = await axios.get('https://api.binance.com/api/v3/klines', {
      params: {
        symbol: config.symbol,
        interval: config.interval,
        limit: config.candlesLimit
      }
    });
    
    return response.data.map(candle => ({
      timestamp: candle[0],
      open: parseFloat(candle[1]),
      high: parseFloat(candle[2]),
      low: parseFloat(candle[3]),
      close: parseFloat(candle[4]),
    }));
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return [];
  }
}

// 2. Simplified Fibonacci Calculator
function calculateFibonacciLevels(high, low) {
  const levels = {};
  const diff = high - low;
  
  config.fibLevels.forEach(level => {
    levels[`level_${level * 1000}`] = low + level * diff;
  });
  
  return levels;
}

// 3. Enhanced Market Structure Detection
function checkMarketStructure(candles) {
  const recentCandles = candles.slice(-3);
  const highs = recentCandles.map(c => c.high);
  const lows = recentCandles.map(c => c.low);

  // Check for consecutive higher highs
  if (highs[2] > highs[1] && highs[1] > highs[0]) return 'bullish';
  // Check for consecutive lower lows
  if (lows[2] < lows[1] && lows[1] < lows[0]) return 'bearish';
  return 'neutral';
}

// 4. Improved Strategy Logic
function determineTradeSignal(candles, fibLevels) {
  const lastClose = candles[candles.length - 1].close;
  const structure = checkMarketStructure(candles);
  
  // Long Entry: Bullish structure & price above 61.8% Fib level
  if (structure === 'bullish' && lastClose > fibLevels.level_618) {
    return {
      action: 'buy',
      entry: lastClose,
      stopLoss: fibLevels.level_786,
      takeProfit: lastClose + (lastClose - fibLevels.level_786) * config.riskRewardRatio
    };
  }

  // Short Entry: Bearish structure & price below 38.2% Fib level
  if (structure === 'bearish' && lastClose < fibLevels.level_382) {
    return {
      action: 'sell',
      entry: lastClose,
      stopLoss: fibLevels.level_236,
      takeProfit: lastClose - (fibLevels.level_236 - lastClose) * config.riskRewardRatio
    };
  }

  return null;
}

// 5. Enhanced Trailing Stop Logic
function updateTrailingStop(currentPrice, entryPrice, initialStop, direction) {
  const trailingDistance = currentPrice * (config.trailingStopPercent / 100);
  
  if (direction === 'long') {
    return Math.max(initialStop, currentPrice - trailingDistance);
  }
  if (direction === 'short') {
    return Math.min(initialStop, currentPrice + trailingDistance);
  }
  return initialStop;
}

// Main Execution Flow
async function executeStrategy() {
  const candles = await getHistoricalData();
  if (candles.length < 2) return;

  const fibHigh = Math.max(...candles.slice(-2).map(c => c.high));
  const fibLow = Math.min(...candles.slice(-2).map(c => c.low));
  const fibLevels = calculateFibonacciLevels(fibHigh, fibLow);
  
  const tradeSignal = determineTradeSignal(candles, fibLevels);
  
  if (tradeSignal) {
    console.log(`Trade Signal: ${tradeSignal.action.toUpperCase()}`);
    console.log(`Entry: ${tradeSignal.entry}`);
    console.log(`Stop Loss: ${tradeSignal.stopLoss}`);
    console.log(`Take Profit: ${tradeSignal.takeProfit}`);
    
    // Simulate price movement
    let currentPrice = tradeSignal.entry;
    let dynamicStop = tradeSignal.stopLoss;
    
    // Example price tracking loop
    for (let i = 0; i < 5; i++) {
      currentPrice += tradeSignal.action === 'buy' ? 50 : -50;
      dynamicStop = updateTrailingStop(
        currentPrice,
        tradeSignal.entry,
        dynamicStop,
        tradeSignal.action
      );
      console.log(`Price: ${currentPrice} | Dynamic Stop: ${dynamicStop}`);
    }
  } else {
    console.log('No trading opportunities found');
  }
}

executeStrategy();