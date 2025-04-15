/**
 * File: allTechnicalIndicatorsWithCalculations.js
 * Author: Yassuki
 * Description: Comprehensive Node.js class for calculating all major technical indicators used in trading analysis.
 *              Includes trend, momentum, volatility, volume, and market sentiment indicators with detailed documentation.
 * Version: 1.0.0
 * License: MIT
 */

const {
    SMA,
    EMA,
    WMA,
    WEMA,
    MACD,
    RSI,
    BollingerBands,
    ADX,
    ATR,
    TrueRange,
    ROC,
    KST,
    PSAR,
    Stochastic,
    WilliamsR,
    ADL,
    OBV,
    TRIX,
    CCI,
    AwesomeOscillator,
    ForceIndex,
    VWAP,
    VolumeProfile,
    Renko,
    HeikinAshi,
    StochasticRSI,
    MFI,
    AverageGain,
    AverageLoss,
    Highest,
    Lowest,
    Sum,
    FixedSizeLinkedList,
    SD,
    Bullish,
    Bearish,
    AbandonedBaby,
    Doji,
    BearishEngulfingPattern,
    BullishEngulfingPattern,
    DarkCloudCover,
    DownsideTasukigap,
    DragonflyDoji,
    GravestoneDoji,
    BullishHarami,
    BearishHarami,
    BullishHaramiCross,
    BearishHaramiCross,
    EveningDojiStar,
    EveningStar,
    MorningDojiStar,
    MorningStar,
    BullishMarubozu,
    BearishMarubozu,
    PiercingLine,
    BullishSpinningTop,
    BearishSpinningTop,
    ThreeBlackCrows,
    ThreeWhiteSoldiers,
    BullishHammerStick,
    BearishHammerStick,
    BullishInvertedHammerStick,
    BearishInvertedHammerStick,
    HammerPattern,
    HammerPatternUnconfirmed,
    HangingMan,
    HangingManUnconfirmed,
    ShootingStar,
    ShootingStarUnconfirmed,
    TweezerTop,
    TweezerBottom,
    IchimokuCloud,
    KeltnerChannels,
    ChandelierExit,
    CrossUp,
    CrossDown,
    Crossover
} = require('technicalindicators');

/**
 * Comprehensive technical analysis toolkit for trading systems
 * @class TechnicalAnalysis
 * @description Provides methods for calculating various technical indicators,
 *              including trend, momentum, volatility, volume, and pattern recognition indicators.
 */
class TechnicalAnalysis {
    constructor() {
        // Initialize any required properties here
    }

    // ********************************
    // 📊 PRICE DATA METHODS
    // ********************************

    /**
     * Get OHLC (Open, High, Low, Close) price object
     * @param {number} open - Opening price
     * @param {number} high - Highest price
     * @param {number} low - Lowest price
     * @param {number} close - Closing price
     * @returns {Object} OHLC price object
     */
    getOHLC(open, high, low, close) {
        return {
            open,
            high,
            low,
            close
        };
    }

    /**
     * Get volume data
     * @param {number} volume - Trading volume
     * @returns {number} Volume value
     */
    getVolume(volume) {
        return volume;
    }

    /**
     * Calculate Volume Weighted Average Price (VWAP)
     * @param {Array<number>} close - Array of closing prices
     * @param {Array<number>} volume - Array of trading volumes
     * @returns {Array<number>} Array of VWAP values
     */
    getVWAP(close, volume) {
        return VWAP.calculate({
            close,
            volume
        });
    }

    /**
     * Calculate bid-ask spread
     * @param {number} bid - Bid price
     * @param {number} ask - Ask price
     * @returns {number} Spread between ask and bid
     */
    getBidAskSpread(bid, ask) {
        return ask - bid;
    }

    // ********************************
    // 🔥 TREND INDICATORS
    // ********************************

    /**
     * Calculate Simple Moving Average (SMA)
     * @param {Array<number>} data - Input data array
     * @param {number} period - Time period for calculation
     * @returns {Array<number>} Array of SMA values
     */
    calculateSMA(data, period) {
        return SMA.calculate({
            period,
            values: data
        });
    }

    /**
     * Calculate Exponential Moving Average (EMA)
     * @param {Array<number>} data - Input data array
     * @param {number} period - Time period for calculation
     * @returns {Array<number>} Array of EMA values
     */
    calculateEMA(data, period) {
        return EMA.calculate({
            period,
            values: data
        });
    }

    /**
     * Calculate Weighted Moving Average (WMA)
     * @param {Array<number>} data - Input data array
     * @param {number} period - Time period for calculation
     * @returns {Array<number>} Array of WMA values
     */
    calculateWMA(data, period) {
        return WMA.calculate({
            period,
            values: data
        });
    }

    /**
     * Calculate Wilder's Exponential Moving Average (WEMA)
     * @param {Array<number>} data - Input data array
     * @param {number} period - Time period for calculation
     * @returns {Array<number>} Array of WEMA values
     */
    calculateWEMA(data, period) {
        return WEMA.calculate({
            period,
            values: data
        });
    }

    /**
     * Calculate Moving Average Convergence Divergence (MACD)
     * @param {Array<number>} data - Input data array
     * @param {number} fastPeriod - Fast EMA period (default: 12)
     * @param {number} slowPeriod - Slow EMA period (default: 26)
     * @param {number} signalPeriod - Signal line period (default: 9)
     * @returns {Array<Object>} Array of MACD objects {MACD, signal, histogram}
     */
    calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        return MACD.calculate({
            values: data,
            fastPeriod,
            slowPeriod,
            signalPeriod
        });
    }

    /**
     * Calculate Average Directional Index (ADX)
     * @param {Array<number>} high - Array of high prices
     * @param {Array<number>} low - Array of low prices
     * @param {Array<number>} close - Array of closing prices
     * @param {number} period - Time period for calculation (default: 14)
     * @returns {Array<number>} Array of ADX values
     */
    calculateADX(high, low, close, period = 14) {
        return ADX.calculate({
            high,
            low,
            close,
            period
        });
    }

    // ********************************
    // 🚀 MOMENTUM INDICATORS
    // ********************************

    /**
     * Calculate Relative Strength Index (RSI)
     * @param {Array<number>} data - Input data array
     * @param {number} period - Time period for calculation (default: 14)
     * @returns {Array<number>} Array of RSI values
     */
    calculateRSI(data, period = 14) {
        return RSI.calculate({
            values: data,
            period
        });
    }

    /**
     * Calculate Stochastic Oscillator
     * @param {Array<number>} high - Array of high prices
     * @param {Array<number>} low - Array of low prices
     * @param {Array<number>} close - Array of closing prices
     * @param {number} kPeriod - %K line period (default: 14)
     * @param {number} dPeriod - %D signal line period (default: 3)
     * @returns {Array<Object>} Array of stochastic values {k, d}
     */
    calculateStochastic(high, low, close, kPeriod = 14, dPeriod = 3) {
        return Stochastic.calculate({
            high,
            low,
            close,
            period: kPeriod,
            signalPeriod: dPeriod
        });
    }

    /**
     * Calculate Commodity Channel Index (CCI)
     * @param {Array<number>} high - Array of high prices
     * @param {Array<number>} low - Array of low prices
     * @param {Array<number>} close - Array of closing prices
     * @param {number} period - Time period for calculation (default: 20)
     * @returns {Array<number>} Array of CCI values
     */
    calculateCCI(high, low, close, period = 20) {
        return CCI.calculate({
            high,
            low,
            close,
            period
        });
    }

    /**
     * Calculate Williams %R
     * @param {Array<number>} high - Array of high prices
     * @param {Array<number>} low - Array of low prices
     * @param {Array<number>} close - Array of closing prices
     * @param {number} period - Time period for calculation (default: 14)
     * @returns {Array<number>} Array of Williams %R values
     */
    calculateWilliamsR(high, low, close, period = 14) {
        return WilliamsR.calculate({
            high,
            low,
            close,
            period
        });
    }

    // ********************************
    // 🌊 VOLATILITY INDICATORS
    // ********************************

    /**
     * Calculate Bollinger Bands
     * @param {Array<number>} data - Input data array
     * @param {number} period - Time period for calculation (default: 20)
     * @param {number} stdDev - Standard deviation multiplier (default: 2)
     * @returns {Array<Object>} Array of Bollinger Band objects {upper, middle, lower}
     */
    calculateBollingerBands(data, period = 20, stdDev = 2) {
        return BollingerBands.calculate({
            period,
            values: data,
            stdDev
        });
    }

    /**
     * Calculate Average True Range (ATR)
     * @param {Array<number>} high - Array of high prices
     * @param {Array<number>} low - Array of low prices
     * @param {Array<number>} close - Array of closing prices
     * @param {number} period - Time period for calculation (default: 14)
     * @returns {Array<number>} Array of ATR values
     */
    calculateATR(high, low, close, period = 14) {
        return ATR.calculate({
            high,
            low,
            close,
            period
        });
    }

    /**
     * Calculate True Range
     * @param {Array<number>} high - Array of high prices
     * @param {Array<number>} low - Array of low prices
     * @param {Array<number>} close - Array of closing prices
     * @returns {Array<number>} Array of True Range values
     */
    calculateTrueRange(high, low, close) {
        return TrueRange.calculate({
            high,
            low,
            close
        });
    }

    /**
     * Calculate Know Sure Thing (KST) oscillator
     * @param {Array<number>} data - Input data array
     * @param {number} fastPeriod - Fast ROC period (default: 10)
     * @param {number} slowPeriod - Slow ROC period (default: 15)
     * @returns {Array<number>} Array of KST values
     */
    calculateKST(data, fastPeriod = 10, slowPeriod = 15) {
        return KST.calculate({
            values: data,
            fastPeriod,
            slowPeriod
        });
    }

    /**
     * Calculate Parabolic SAR (PSAR)
     * @param {Array<number>} high - Array of high prices
     * @param {Array<number>} low - Array of low prices
     * @param {Array<number>} close - Array of closing prices
     * @param {number} step - Acceleration factor (default: 0.02)
     * @param {number} max - Maximum acceleration factor (default: 0.2)
     * @returns {Array<number>} Array of PSAR values
     */
    calculatePSAR(high, low, close, step = 0.02, max = 0.2) {
        return PSAR.calculate({
            high,
            low,
            close,
            step,
            max
        });
    }

    // ********************************
    // 📈 VOLUME INDICATORS
    // ********************************

    /**
     * Calculate On-Balance Volume (OBV)
     * @param {Array<number>} close - Array of closing prices
     * @param {Array<number>} volume - Array of trading volumes
     * @returns {Array<number>} Array of OBV values
     */
    calculateOBV(close, volume) {
        return OBV.calculate({
            close,
            volume
        });
    }

    /**
     * Calculate Force Index
     * @param {Array<number>} close - Array of closing prices
     * @param {Array<number>} volume - Array of trading volumes
     * @param {number} period - Time period for calculation (default: 13)
     * @returns {Array<number>} Array of Force Index values
     */
    calculateForceIndex(close, volume, period = 13) {
        return ForceIndex.calculate({
            close,
            volume,
            period
        });
    }

    // ********************************
    // 📉 MARKET SENTIMENT INDICATORS
    // ********************************

    /**
     * Calculate Awesome Oscillator
     * @param {Array<number>} data - Input data array (typically mid prices)
     * @returns {Array<number>} Array of Awesome Oscillator values
     */
    calculateAwesomeOscillator(data) {
        return AwesomeOscillator.calculate({
            values: data
        });
    }

    /**
     * Calculate Money Flow Index (MFI)
     * @param {Array<number>} high - Array of high prices
     * @param {Array<number>} low - Array of low prices
     * @param {Array<number>} close - Array of closing prices
     * @param {Array<number>} volume - Array of trading volumes
     * @param {number} period - Time period for calculation (default: 14)
     * @returns {Array<number>} Array of MFI values
     */
    calculateMFI(high, low, close, volume, period = 14) {
        return MFI.calculate({
            high,
            low,
            close,
            volume,
            period
        });
    }

    // ********************************
    // 🔳 SUPPORT & RESISTANCE LEVELS
    // ********************************

    /**
     * Calculate Fibonacci retracement levels
     * @param {number} high - Highest price
     * @param {number} low - Lowest price
     * @returns {Array<Object>} Array of Fibonacci levels {level, price}
     */
    calculateFibonacci(high, low) {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        return levels.map(level => ({
            level,
            price: low + (high - low) * level
        }));
    }

    /**
     * Calculate Pivot Points
     * @param {number} high - Highest price
     * @param {number} low - Lowest price
     * @param {number} close - Closing price
     * @returns {Object} Pivot points object {pivot, resistance1, support1, resistance2, support2}
     */
    calculatePivotPoints(high, low, close) {
        const pivot = (high + low + close) / 3;
        return {
            pivot,
            resistance1: 2 * pivot - low,
            support1: 2 * pivot - high,
            resistance2: pivot + (high - low),
            support2: pivot - (high - low),
        };
    }

    // ********************************
    // 🏆 CHART PATTERNS (BASIC)
    // ********************************

    /**
     * Detect Doji candlestick pattern
     * @param {number} open - Opening price
     * @param {number} high - Highest price
     * @param {number} low - Lowest price
     * @param {number} close - Closing price
     * @returns {boolean} True if Doji pattern detected
     */
    detectDoji(open, high, low, close) {
        return Math.abs(open - close) < (high - low) * 0.05;
    }

    /**
     * Detect Engulfing candlestick pattern
     * @param {number} prevOpen - Previous candle opening price
     * @param {number} prevClose - Previous candle closing price
     * @param {number} open - Current candle opening price
     * @param {number} close - Current candle closing price
     * @returns {boolean} True if Engulfing pattern detected
     */
    detectEngulfing(prevOpen, prevClose, open, close) {
        return (open < prevClose && close > prevOpen) || (open > prevClose && close < prevOpen);
    }

    // ********************************
    // 🌍 MARKET BREADTH INDICATORS
    // ********************************

    /**
     * Calculate Advance-Decline line
     * @param {number} advancingStocks - Number of advancing stocks
     * @param {number} decliningStocks - Number of declining stocks
     * @returns {number} Advance-Decline value
     */
    calculateAdvanceDecline(advancingStocks, decliningStocks) {
        return advancingStocks - decliningStocks;
    }

    /**
     * Calculate McClellan Oscillator
     * @param {number} advancingStocks - Number of advancing stocks
     * @param {number} decliningStocks - Number of declining stocks
     * @returns {number} McClellan Oscillator value
     */
    calculateMcClellanOscillator(advancingStocks, decliningStocks) {
        return (advancingStocks - decliningStocks) / (advancingStocks + decliningStocks);
    }

    // ********************************
    // ⚡ ORDER FLOW DATA
    // ********************************

    /**
     * Calculate order flow delta
     * @param {number} bidVolume - Volume at bid price
     * @param {number} askVolume - Volume at ask price
     * @returns {number} Delta value (askVolume - bidVolume)
     */
    calculateDelta(bidVolume, askVolume) {
        return askVolume - bidVolume;
    }

    /**
     * Get Depth of Market (DOM) data
     * @param {Object} orderBook - Order book object
     * @returns {Object} Depth of Market data
     */
    getDOM(orderBook) {
        return orderBook;
    }
    /**
     * This is a simple method to identify key support/resistance levels.
     * This is just a basic implementation that finds the highest and lowest
     * points over a given period. You can expand it to include more complex
     * algorithms such as pivot points, Fibonacci retracements, etc.
     */

    identifyKeyLevels(highs, lows) {
        const highestHigh = Math.max(...highs);
        const lowestLow = Math.min(...lows);

        return {
            supportLevel: lowestLow,
            resistanceLevel: highestHigh
        };
    }
    /**
     * Calculates the Rate of Change (ROC) for a given set of closing prices.
     * The ROC measures the percentage change in price over a specified period.
     * @param {Array<number>} closes - Array of closing prices.
     * @param {number} period - The number of periods to calculate ROC over.
     * @returns {Array<number>} Array of ROC values.
     */
    calculateROC(closes, period = 14) {
        if (closes.length < period) {
            throw new Error('Insufficient data to calculate ROC');
        }

        const rocValues = [];
        for (let i = period; i < closes.length; i++) {
            const change = (closes[i] - closes[i - period]) / closes[i - period] * 100;
            rocValues.push(change);
        }
        return rocValues;
    }
    /**
     * Calculate Donchian Channels
     * @param {Array<number>} highs - Array of high prices
     * @param {Array<number>} lows - Array of low prices
     * @param {number} period - Lookback period
     * @returns {Object} {upper, middle, lower} channel values
     */
    calculateDonchianChannels(highs, lows, period = 20) {
        if (highs.length < period || lows.length < period) {
            throw new Error('Insufficient data for Donchian Channels');
        }

        const upper = [];
        const lower = [];
        const middle = [];

        for (let i = period - 1; i < highs.length; i++) {
            const highSlice = highs.slice(i - period + 1, i + 1);
            const lowSlice = lows.slice(i - period + 1, i + 1);

            const currentUpper = Math.max(...highSlice);
            const currentLower = Math.min(...lowSlice);

            upper.push(currentUpper);
            lower.push(currentLower);
            middle.push((currentUpper + currentLower) / 2);
        }

        return {
            upper,
            middle,
            lower
        };
    }

    /**
     * Calculate Volume Weighted MACD (VWMACD)
     * @param {Array<number>} closes - Closing prices
     * @param {Array<number>} volumes - Trading volumes
     * @param {number} fastPeriod - Fast EMA period
     * @param {number} slowPeriod - Slow EMA period
     * @param {number} signalPeriod - Signal line period
     * @returns {Object} {macd, signal, histogram} 
     */
    calculateVWMACD(closes, volumes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
        const vwPrices = closes.map((close, i) => close * volumes[i]);
        const fastEMA = this.calculateEMA(vwPrices, fastPeriod);
        const slowEMA = this.calculateEMA(vwPrices, slowPeriod);

        const macd = fastEMA.map((val, i) => val - slowEMA[i]);
        const signal = this.calculateEMA(macd, signalPeriod);
        const histogram = macd.map((val, i) => val - signal[i]);

        return {
            macd,
            signal,
            histogram
        };
    }

    /**
     * Detect Double Top/Bottom patterns
     * @param {Array<number>} highs - High prices
     * @param {Array<number>} lows - Low prices
     * @param {number} tolerance - Price tolerance percentage (default: 0.05)
     * @returns {Object} {doubleTop: boolean, doubleBottom: boolean}
     */
    detectDoubleTopBottom(highs, lows, tolerance = 0.05) {
        if (highs.length < 5 || lows.length < 5) return {
            doubleTop: false,
            doubleBottom: false
        };

        const lastHighs = highs.slice(-3);
        const lastLows = lows.slice(-3);

        // Check for double top (M pattern)
        const doubleTop = (
            Math.abs(lastHighs[0] - lastHighs[2]) <= lastHighs[0] * tolerance &&
            lastHighs[1] > lastHighs[0] &&
            lastLows[1] < lastLows[0] &&
            lastLows[1] < lastLows[2]
        );

        // Check for double bottom (W pattern)
        const doubleBottom = (
            Math.abs(lastLows[0] - lastLows[2]) <= lastLows[0] * tolerance &&
            lastLows[1] < lastLows[0] &&
            lastHighs[1] > lastHighs[0] &&
            lastHighs[1] > lastHighs[2]
        );

        return {
            doubleTop,
            doubleBottom
        };
    }
    /**
	 * Identifies key support and resistance levels from candle data
	 * @function identifyKeyLevels
	 * @param {Array<Object>} candles - Array of candle objects with high, low, close prices
	 * @param {number} [lookback=100] - Number of candles to analyze for levels (default: 100)
	 * @returns {Object} Object containing arrays of support and resistance levels
	 * @property {Array<number>} supports - Array of identified support levels
	 * @property {Array<number>} supports - Array of identified resistance levels
	 * 
	 * @description
	 * This function analyzes price action to identify significant support and resistance levels.
	 * A support level is identified when a low is lower than the 5 candles before and after it.
	 * A resistance level is identified when a high is higher than the 5 candles before and after it.
	 * The function clusters nearby levels and returns unique, sorted values.
	 * 
	 * @example
	 * const candles = [{high: 10, low: 8}, {high: 11, low: 9}, ...];
	 * const levels = identifyKeyLevels(candles);
	 * console.log(levels.supports); // [8.5, 9.2, ...]
	 * console.log(levels.resistances); // [10.5, 11.3, ...]
	 */
    identifyKeyLevels(candles, lookback = 100) {
        if (candles.length < lookback) return {
            supports: [],
            resistances: []
        };

        const recentCandles = candles.slice(-lookback);
        const supports = [];
        const resistances = [];

        for (let i = 5; i < recentCandles.length - 5; i++) {
            const current = recentCandles[i];
            const previousFive = recentCandles.slice(i - 5, i);
            const nextFive = recentCandles.slice(i + 1, i + 6);

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

    /**
	 * Confirms MBS (Multi-Bar Strategy) signals with volume and key level analysis
	 * @async
	 * @function checkMBSConfirmation
	 * @param {string} symbol - Trading symbol for reference (unused in current implementation)
	 * @param {Array<Object>} candles - Array of candle objects with OHLCV data
	 * @param {string} direction - Potential trade direction ('buy' or 'sell')
	 * @param {number} lastClose - Most recent closing price
	 * @returns {Promise<boolean>} True if MBS signal is confirmed, false otherwise
	 * 
	 * @description
	 * This function confirms potential MBS signals by checking:
	 * 1. Price relative to nearest support/resistance levels
	 * 2. Volume spike compared to 20-candle average
	 * For buy signals, requires:
	 * - Price above nearest resistance
	 * - Volume > 1.5x 20-candle average
	 * For sell signals, requires:
	 * - Price below nearest support
	 * - Volume > 1.5x 20-candle average
	 * 
	 * @example
	 * const candles = [...]; // Array of OHLCV candles
	 * const confirmed = await checkMBSConfirmation('BTCUSDT', candles, 'buy', 42000);
	 * if (confirmed) {
	 *   // Execute buy logic
	 * }
	 */
    checkMBSConfirmation(symbol, candles, direction, lastClose) {
        // Identify key levels
        const {
            supports,
            resistances
        } = identifyKeyLevels(candles);
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

}

module.exports = {TechnicalAnalysis};