// File: sendUsdt.js
// Author: Yassuki

const ethers = require("ethers");
const TronWeb = require("tronweb");

const CONFIG = {
  mode: "ERC20", // Change to "TRC20" for Tron
  privateKey: "", // Your wallet private key
  rpc: "https://mainnet.infura.io/v3/YOUR_INFURA_ID" // Only used in ERC20 mode
};

// --- ERC20 Logic ---
async function sendERC20USDT(recipient,amount) {
  const USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Ethereum Mainnet
  const ERC20_ABI = [
    "function transfer(address to, uint amount) returns (bool)",
    "function decimals() view returns (uint8)"
  ];

  const provider = new ethers.JsonRpcProvider(CONFIG.rpc);
  const wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet);

  const decimals = await usdt.decimals();
  const amount = ethers.parseUnits(CONFIG.amount, decimals);

  const tx = await usdt.transfer(CONFIG.recipient, amount);
  console.log("📤 ERC20 TX sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ ERC20 Confirmed in block", receipt.blockNumber);
}

// --- TRC20 Logic ---
async function sendTRC20USDT(recipient,amount) {
  const USDT_CONTRACT = "TXLAQ63Xg1NAzckPwKHvzw7CSEmLMEqcdj"; // TRON Mainnet USDT
  const tronWeb = new TronWeb({
    fullHost: "https://api.trongrid.io",
    privateKey: CONFIG.privateKey
  });

  const contract = await tronWeb.contract().at(USDT_CONTRACT);
  const amount = tronWeb.toSun(CONFIG.amount); // 6 decimals

  const txID = await contract.transfer(CONFIG.recipient, amount).send();
  console.log("📤 TRC20 TX sent:", txID);
}
