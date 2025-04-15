const { Telegraf } = require('telegraf');
require('dotenv').config();

// Initialize Telegram bot
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
bot.launch().then(() => console.log('🟢 Telegram bot started'));

// Telegram Notifications
async function sendTelegramMessage(message) {
  try {
    await bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, message, {
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('❌ Error sending Telegram message:', error.response.description);
  }
}
module.exports={sendTelegramMessage}