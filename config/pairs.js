const axios = require('axios');

async function getTradeableUSDTQuotePairs(instType = "SPOT") {
    try {
        const response = await axios.get(`https://www.okx.com/api/v5/public/instruments?instType=${instType}`);
        const instruments = response.data.data;

        // Filter only pairs where USDT is the quote currency
        const usdtQuotePairs = instruments.filter(inst => inst.quoteCcy === "USDT").map(inst => inst.instId);
        
        return usdtQuotePairs;
    } catch (error) {
        console.error("❌ Error fetching USDT quote pairs:", error.response ? error.response.data : error.message);
        return [];
    }
}

 
// Export the function as a module
module.exports = { getTradeableUSDTQuotePairs };
