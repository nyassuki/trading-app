const DEFAULT_SYMBOLS = [
  'BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'DOGE-USDT', 'XRP-USDT', 'PI-USDT','ATOM-USDT', 'BCH-USDT', 'BNB-USDT'
];

const SYMBOLS = process.env.SYMBOLS 
  ? process.env.SYMBOLS.split(',').map(s => s.trim()).filter(s => s.endsWith('-USDT')) 
  : DEFAULT_SYMBOLS;

 
const CONFIG = {
  SYMBOLS: process.env.SYMBOLS 
  ? process.env.SYMBOLS.split(',').map(s => s.trim()).filter(s => s.endsWith('-USDT')) 
  : DEFAULT_SYMBOLS,
  LEVERAGE: parseInt(process.env.LEVERAGE) || 100,
  INTERVAL: process.env.INTERVAL || '1m',
  RISK_PER_TRADE: parseFloat(process.env.RISK_PER_TRADE) || 0.05,
  MAX_CONSECUTIVE_LOSSES: parseInt(process.env.MAX_CONSECUTIVE_LOSSES) || 5,
  MAX_DAILY_DRAWDOWN: parseFloat(process.env.MAX_DAILY_DRAWDOWN) || 1,
  DAILY_PROFIT_TARGET: parseFloat(process.env.DAILY_PROFIT_TARGET) || 1,
  BASE_URL: 'https://www.okx.com',
  WS_URL: 'wss://ws.okx.com:8443/ws/v5/public',
  DEMO_MODE: process.env.DEMO_ENV === '1',

  //strategy :
  stopDistance_atr : 1.2,
  takeProfitDistance_atr:4,
  lastRSI:30,
  volumeRatio:1.2,
  fibLevels:0.618

};
const 
module.exports={CONFIG,DEFAULT_SYMBOLS}