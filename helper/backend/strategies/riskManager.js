const config = require('../../configs/config.js');
const OKX = require('../../backend/src/services/okx.js');
const TELE = require('../src/services/telegram.js'); 

class RiskManager {
  constructor() {
    this.consecutiveLosses = 0;
    this.dailyProfit = 0;
    this.dailyLoss = 0;
    this.todayTrades = 0;
    this.lastTradeTime = null;
  }

  async calculatePositionSize(atr, currentPrice, symbol) {
    try {
      const balance = await OKX.getAccountBalance();
      const riskAmount = balance * config.CONFIG.RISK_PER_TRADE * 
                       (1 - this.consecutiveLosses * 0.1) * 
                       (1 - this.dailyLoss / (balance * config.CONFIG.MAX_DAILY_DRAWDOWN));
      
      const atrMultiplier = Math.min(3, Math.max(1, atr / (currentPrice * 0.01)));
      const size = (riskAmount/currentPrice).toFixed(3);
      
      console.log(`ℹ️  Calculated position size for ${symbol}: ${size}`);
      return size;
    } catch (error) {
      console.error('❌ Error calculating position size:', error);
      throw error;
    }
  }

  async canTrade() {
    if (this.consecutiveLosses >= config.CONFIG.MAX_CONSECUTIVE_LOSSES) {
      await TELE.sendTelegramMessage("ℹ️ Trading paused - max consecutive losses reached");
      return false;
    }
    
    if (this.dailyLoss >= (await OKX.getAccountBalance()) * config.CONFIG.MAX_DAILY_DRAWDOWN) {
      await TELE.sendTelegramMessage("ℹ️ Trading paused - daily drawdown limit reached");
      return false;
    }
    
    if (this.dailyProfit >= (await OKX.getAccountBalance()) * config.CONFIG.DAILY_PROFIT_TARGET) {
      await TELE.sendTelegramMessage("ℹ️ Trading paused - daily profit target reached");
      return false;
    }
    
    return true;
  }

  updateTradeResult(profit) {
    if (profit > 0) {
      this.consecutiveLosses = 0;
      this.dailyProfit += profit;
    } else {
      this.consecutiveLosses++;
      this.dailyLoss += Math.abs(profit);
    }
    this.todayTrades++;
    this.lastTradeTime = new Date();
  }

  resetDailyStats() {
    const now = new Date();
    if (this.lastTradeTime && now.getDate() !== this.lastTradeTime.getDate()) {
      this.dailyProfit = 0;
      this.dailyLoss = 0;
      this.todayTrades = 0;
      console.log('🖥️ Daily stats reset');
    }
  }
}
module.exports = {RiskManager};