// File: utils/getTrc20Balance.js
const TronWeb = require("tronweb");

const tronWeb = new TronWeb({
  fullHost: "https://api.trongrid.io"
});

const USDT_CONTRACT = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj";

async function getTRC20USDTBalance(address) {
  const contract = await tronWeb.contract().at(USDT_CONTRACT);
  const result = await contract.balanceOf(address).call();
  const balance = tronWeb.toBigNumber(result).dividedBy(1e6).toNumber(); // USDT has 6 decimals
  return balance;
}

module.exports = { getTRC20USDTBalance };
