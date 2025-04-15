// File: globalUsdtWallet.js
// Author: Yassuki
require('dotenv').config();
const db = require('../../../models/db');

const ethers = require("ethers");
const TronWeb = require("tronweb");
const bip39 = require("bip39");
const hdkey = require("hdkey");
 // --- Create and Save Global Wallet ---
async function createUnifiedWallet(user_account) {
  let exist = await db.query(`SELECT * FROM user_wallet WHERE user_account = '${user_account}' AND network = 'ERC20' AND token = 'USDT'`);
  let dataw =exist[0];
  if(dataw.length==0) {

        // Step 1: Generate mnemonic and seed
        const mnemonic = bip39.generateMnemonic();
        const seed = await bip39.mnemonicToSeed(mnemonic);

        // Step 2: ERC20 Wallet (ETH)
       
        const ethHDNode = ethers.HDNodeWallet.fromSeed(seed).derivePath("m/44'/60'/0'/0/0");
        const ethAddress = ethHDNode.address;
        const ethPrivateKey = ethHDNode.privateKey;

        // Step 3: TRC20 Wallet (TRON)
        const tronHDKey = hdkey.fromMasterSeed(seed);
        const tronChild = tronHDKey.derive("m/44'/195'/0'/0/0");
        const tronPrivateKey = tronChild.privateKey.toString("hex");
        //const tronWeb = new TronWeb();
        //console.log(tronWeb);

        const tronAddress = TronWeb.address.fromPrivateKey(tronPrivateKey);

        // Step 4: Save to MySQL

        await db.query(`INSERT INTO user_wallet (token,user_account, mnemonic, eaddress, private_key, network)
        VALUES ("USDT",'${user_account}', '${mnemonic}', '${ethAddress}', '${ethPrivateKey}', "ERC20")`);
        
        await db.query(`INSERT INTO user_wallet (token,user_account, mnemonic, eaddress, private_key, network)
        VALUES ("USDT",'${user_account}', '${mnemonic}', '${tronAddress}', '${tronPrivateKey}', "TRC20")`);
       
        // Step 5: Log output
        console.log("🧠 Mnemonic:", mnemonic);
        console.log("🪙 ERC20 Address:", ethAddress);
        console.log("🪙 TRC20 Address:", tronAddress);

        return {
          mnemonic,
          erc20: { address: ethAddress, privateKey: ethPrivateKey },
          trc20: { address: tronAddress, privateKey: tronPrivateKey }
        };
  } else {
    console.log("💼 USDT Wallet exist !")
  }
}

module.exports = { createUnifiedWallet };

// Optional: run directly from CLI
if (require.main === module) {
  createUnifiedWallet().catch(console.error);
}
