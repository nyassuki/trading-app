const { TechnicalAnalysis } = require('./allTechnicalIndicators.js');

class QuantumScalper {
  constructor() {
    this.ta = new TechnicalAnalysis();
    this.settings = {
      emaFast: 9,
      emaSlow: 21,
      rsiPeriod: 7,
      macd: { fast: 12, slow: 26, signal: 9 },
      bb: { period: 20, stdDev: 2 },
      atrPeriod: 14,
      fibLevels: [0.382, 0.5, 0.618]
    };
  }

  analyze(candles) {
    if (candles.length < 50) throw new Error("Minimum 50 candles required");
    
    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];
    
    const indicators = this._calculateIndicators(candles);
    const signals = this._generateSignals(candles, indicators, currentPrice);
    
    return {
      indicators,
      signals,
      action: this._determineAction(signals)
    };
  }

  _calculateIndicators(candles) {
    const closes = candles.map(c => c.close);
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const volumes = candles.map(c => c.volume);

    return {
      ema9: this.ta.calculateEMA(closes, this.settings.emaFast),
      ema21: this.ta.calculateEMA(closes, this.settings.emaSlow),
      rsi: this.ta.calculateRSI(closes, this.settings.rsiPeriod),
      macd: this.ta.calculateMACD(closes, ...Object.values(this.settings.macd)),
      bb: this.ta.calculateBollingerBands(closes, ...Object.values(this.settings.bb)),
      vwap: this.ta.getVWAP(closes, volumes),
      atr: this.ta.calculateATR(highs, lows, closes, this.settings.atrPeriod),
      obv: this.ta.calculateOBV(closes, volumes),
      fib: this.ta.calculateFibonacci(Math.max(...highs.slice(-20)), Math.min(...lows.slice(-20)))
    };
  }

  _generateSignals(candles, indicators, currentPrice) {
    const signals = {
      trend: indicators.ema9.slice(-1)[0] > indicators.ema21.slice(-1)[0] ? 'bullish' : 'bearish',
      emaCross: this._checkCross(indicators.ema9, indicators.ema21),
      rsi: this._getRsiState(indicators.rsi),
      macd: this._getMacdState(indicators.macd),
      bb: this._getBbState(currentPrice, indicators.bb.slice(-1)[0]),
      vwap: currentPrice > indicators.vwap.slice(-1)[0] ? 'above' : 'below',
      atr: indicators.atr.slice(-1)[0],
      obv: this._getObvState(indicators.obv, candles.map(c => c.close)),
      entries: [],
      exits: []
    };

    this._generateEntries(signals, currentPrice, indicators);
    this._generateExits(signals, currentPrice, indicators);

    return signals;
  }

  _checkCross(fast, slow) {
    const [currF, prevF] = fast.slice(-2);
    const [currS, prevS] = slow.slice(-2);
    if (prevF < prevS && currF > currS) return 'bullish';
    if (prevF > prevS && currF < currS) return 'bearish';
    return 'none';
  }

  _getRsiState(rsi) {
    const [curr, prev] = rsi.slice(-2);
    if (curr > 70) return 'overbought';
    if (curr < 30) return 'oversold';
    return curr > prev ? 'rising' : 'falling';
  }

  _getMacdState(macd) {
    const [curr, prev] = macd.slice(-2);
    if (curr.histogram > 0 && prev.histogram <= 0) return 'bullish';
    if (curr.histogram < 0 && prev.histogram >= 0) return 'bearish';
    return curr.histogram > prev.histogram ? 'rising' : 'falling';
  }

  _getBbState(price, bb) {
    if (price < bb.lower) return 'oversold';
    if (price > bb.upper) return 'overbought';
    return price > bb.middle ? 'upper' : 'lower';
  }

  _getObvState(obv, closes) {
    const [currO, prevO] = obv.slice(-2);
    const [currP, prevP] = closes.slice(-2);
    
    if (currO > prevO && currP < prevP) return 'bull_div';
    if (currO < prevO && currP > prevP) return 'bear_div';
    return currO > prevO ? 'rising' : 'falling';
  }

  _generateEntries(signals, price, indicators) {
    const { bb, atr, fib } = indicators;
    const lastBB = bb.slice(-1)[0];
    const lastAtr = atr.slice(-1)[0];
    const fib382 = fib.find(l => l.level === 0.382).price;

    // EMA + RSI Entry
    if (signals.emaCross === 'bullish' && signals.rsi === 'oversold') {
      signals.entries.push({
        type: 'ema_rsi',
        dir: 'long',
        entry: price,
        tp: price + (lastAtr * 1.5),
        sl: price - (lastAtr * 0.7)
      });
    }

    // BB Reversal Entry
    if (signals.bb === 'oversold' && signals.obv === 'rising') {
      signals.entries.push({
        type: 'bb_rev',
        dir: 'long',
        entry: lastBB.lower * 1.005,
        tp: lastBB.middle,
        sl: lastBB.lower * 0.995
      });
    }

    // Fib Retracement Entry
    if (Math.abs(price - fib382) < fib382 * 0.01 && signals.trend === 'bullish') {
      signals.entries.push({
        type: 'fib',
        dir: 'long',
        entry: fib382,
        tp: fib.find(l => l.level === 0).price,
        sl: fib.find(l => l.level === 0.5).price
      });
    }
  }

  _generateExits(signals, price, indicators) {
    const lastBB = indicators.bb.slice(-1)[0];
    const lastAtr = indicators.atr.slice(-1)[0];

    signals.exits.push(
      { type: 'bb_upper', price: lastBB.upper, reason: 'Upper BB reached' },
      { type: 'atr_stop', price: price - lastAtr, reason: 'ATR stop hit' }
    );

    if (signals.rsi === 'overbought') {
      signals.exits.push({
        type: 'rsi_exit',
        price: price * 0.998,
        reason: 'RSI overbought'
      });
    }
  }

  _determineAction(signals) {
    if (!signals.entries.length) return 'hold';
    return signals.entries[0].dir === 'long' ? 'buy' : 'sell';
  }

  // Simplified helper methods
  checkMBSConfirmation(candles, direction, lastClose) {
    const { supports, resistances } = this.identifyKeyLevels(candles);
    if (!supports.length || !resistances.length) return false;

    const volumes = candles.map(c => c.volume);
    const volRatio = volumes.slice(-1)[0] / (volumes.slice(-20).reduce((a,b) => a + b) / 20);

    return direction === 'buy' 
      ? lastClose > resistances.slice(-1)[0] && volRatio > 1.5
      : lastClose < supports.slice(-1)[0] && volRatio > 1.5;
  }

  detectConsolidation(candles, period = 20, threshold = 0.02) {
    const recent = candles.slice(-period);
    const range = Math.max(...recent.map(c => c.high)) - Math.min(...recent.map(c => c.low));
    return range / ((recent[0].high + recent[0].low) / 2) < threshold;
  }

  identifyKeyLevels(candles, lookback = 100) {
    const recent = candles.slice(-lookback);
    const levels = { supports: [], resistances: [] };

    for (let i = 5; i < recent.length - 5; i++) {
      const current = recent[i];
      const window = [...recent.slice(i-5, i), ...recent.slice(i+1, i+6)];
      
      if (current.low === Math.min(...window.map(c => c.low))) levels.supports.push(current.low);
      if (current.high === Math.max(...window.map(c => c.high))) levels.resistances.push(current.high);
    }

    return {
      supports: [...new Set(levels.supports)].sort((a,b) => a - b),
      resistances: [...new Set(levels.resistances)].sort((a,b) => a - b)
    };
  }
}

module.exports = {QuantumScalper}