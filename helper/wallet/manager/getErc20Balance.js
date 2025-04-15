// File: utils/getErc20Balance.js
const { ethers } = require("ethers");
require("dotenv").config();

const erc20Abi = [
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

async function getERC20USDTBalance(address) {
  const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC);
  const contract = new ethers.Contract(process.env.USDT_CONTRACT, erc20Abi, provider);

  const rawBalance = await contract.balanceOf(address);
  const decimals = await contract.decimals();
  const balance = Number(ethers.formatUnits(rawBalance, decimals));

  return balance;
}

module.exports = { getERC20USDTBalance };
