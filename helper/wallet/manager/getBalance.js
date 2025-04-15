const { getERC20USDTBalance } = require("./getErc20Balance");
const { getTRC20USDTBalance } = require("./getTrc20Balance");

async function getWalletBalance(ethAddress, network) {
  let WalletBalance = null;
  if(network=="ERC20") {
      WalletBalance = await getERC20USDTBalance(ethAddress);
  } else if(network=="TRC20") {
      WalletBalance = await getTRC20USDTBalance(tronAddress);
  }
  return WalletBalance;
};

module.exports = { getBalance };
