const binance = require('./binance.js');
const bybit = require('./bybit.js');
const okx = require('./okx.js');
require('dotenv').config();

//const createWebSocketServer = require('../backend/src/services/wsServer.js');
const db = require('../../models/db');
//const wsServer = createWebSocketServer(8080);

 async function startWSS(symbols) {
    try {
        // Remove hyphens for Binance and Bybit (they use BTCUSDT format)
        const symbolNoHyphen = symbols.map(symbol => symbol.replace('-', ''));
        // Initialize exchange data streams
        const binanceData = new binance.BinanceMultiPairData(symbolNoHyphen);
        const bybitData = new bybit.BybitMultiPairData(symbolNoHyphen);
        const okxData = new okx.OKXMultiPairData(symbols, "FUTURES"); // OKX uses BTC-USDT format
        okxData.on('market', data => {
			//console.log(data);
			sendMarketData("OKX","market",data);
		});

		okxData.on('orderbook', data => {
			const bdata = data.bids;
		 	if(bdata.length >= 10) {
		 		sendMarketData("OKX","orderbook",data);
		 	}
 		});

		okxData.on('spread', data => {
		  	//console.log('Spread update:', data);
		  	sendMarketData("OKX","spread",data); 
		});

		okxData.on('candle', data => {
		  	//console.log(data);
		  	sendMarketData("OKX","candle",data); 
		});
		okxData.connect();

		//Single event handlers for all pairs
		bybitData.on('market', data => {
		  //console.log(data);
		  sendMarketData("BYBIT","market",data); 
		});

		bybitData.on('orderbook', data => {
		  //console.log(data);
		  sendMarketData("BYBIT","orderbook",data); 
		});

		bybitData.on('spread', data => {
		  //console.log(data);
		  sendMarketData("BYBIT","spread",data); 
		});

		bybitData.on('candle', data => {
		  //console.log(data);
		  sendMarketData("BYBIT","candle",data); 
		});
		bybitData.connect();
		binanceData.on('market', data => {
		  	//console.log(data);
		  	sendMarketData("BINANCE","market",data); 
		});

		binanceData.on('orderbook', data => {
		  	//console.log( data);
		  	sendMarketData("BINANCE","orderbook",data); 
		});

		binanceData.on('spread', data => {
		  	//console.log(data);
		  	sendMarketData("BINANCE","spread",data); 
		});

		binanceData.on('candle', data => {
		  //console.log(data);
		  sendMarketData("BINANCE","candle",data); 
		});
		binanceData.connect();
    } catch (error) {
        console.error('❌ Error initializing WebSocket streams:', error);
        throw error;
    }
}
function sendMarketData(exchange,type,data) {
  try {
    global.websocketServer.broadcastMessage({
      data_type:'exchange_data',
      exchange:exchange,
      type: type,
      data: data,
      timestamp: Date.now()
    });
    
    //console.log(`Broadcasted to ${wsServer.getClientCount()} clients`);
  } catch (error) {
    console.error('❌ Failed to broadcast message:', error);
  }
}
(async () => {
    try {
    	const dbpairs= await db.query("SELECT * FROM pairs WHERE isactive='1'");
     	const symbols = dbpairs[0].map(({ pair_a, pair_b }) => `${pair_a}-${pair_b}`);
        const firstMarketData = await startWSS(symbols);
    } catch (error) {
        console.error('❌ Failed to start WebSocket streams:', error);
    }
})();