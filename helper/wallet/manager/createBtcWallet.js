// File: bitcoin_wallet.js
// Author: Yassuki
require('dotenv').config();

const bitcoin = require('bitcoinjs-lib');
const bip39 = require('bip39');
const ecc = require('tiny-secp256k1');
const { BIP32Factory } = require('bip32');
const { ECPairFactory } = require('ecpair');
const db = require('../../../models/db'); // MySQL database pool

// Initialize BIP32 and ECPair with ECC
const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

class BitcoinWallet {
  constructor() {
    const network =
      process.env.BITCOIN_NETWORK === 'mainnet'
        ? bitcoin.networks.bitcoin
        : process.env.BITCOIN_NETWORK === 'testnet'
        ? bitcoin.networks.testnet
        : (() => {
            throw new Error('Invalid BITCOIN_NETWORK. Must be "mainnet" or "testnet".');
          })();
    this.network = network;
    this.mnemonic = null;
    this.root = null;
    this.account = null;
  }

  generateMnemonic(strength = 256) {
    if (![128, 160, 192, 224, 256].includes(strength)) {
      throw new Error('Invalid strength. Must be one of: 128, 160, 192, 224, 256');
    }
    this.mnemonic = bip39.generateMnemonic(strength);
    return this.mnemonic;
  }

  fromMnemonic(mnemonic, passphrase = '') {
    if (!bip39.validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic');
    }
    this.mnemonic = mnemonic;
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
    this.root = bip32.fromSeed(seed, this.network);
    this.account = this.root.derivePath(this.getDerivationPath());
    return this;
  }

  getDerivationPath() {
    const purpose = "44'";
    const coinType = this.network === bitcoin.networks.bitcoin ? "0'" : "1'";
    return `m/${purpose}/${coinType}/0'/0/0`;
  }

  getKeyPair() {
    if (!this.account) throw new Error('Wallet not initialized');
    return ECPair.fromPrivateKey(this.account.privateKey, { network: this.network });
  }

  getAddress(type = 'p2wpkh') {
    if (!this.account) throw new Error('Wallet not initialized');
    const keyPair = this.getKeyPair();
    const pubkey = Buffer.from(keyPair.publicKey);

    switch (type.toLowerCase()) {
      case 'p2pkh':
        return bitcoin.payments.p2pkh({ pubkey, network: this.network }).address;
      case 'p2wpkh':
        return bitcoin.payments.p2wpkh({ pubkey, network: this.network }).address;
      case 'p2sh':
        const p2wpkh = bitcoin.payments.p2wpkh({ pubkey, network: this.network });
        return bitcoin.payments.p2sh({ redeem: p2wpkh, network: this.network }).address;
      default:
        throw new Error('Invalid address type. Use p2pkh, p2wpkh, or p2sh');
    }
  }

  getWalletInfo() {
    if (!this.account) throw new Error('Wallet not initialized');
    const keyPair = this.getKeyPair();
    return {
      mnemonic: this.mnemonic,
      privateKey: keyPair.privateKey.toString('hex'),
      WIF: keyPair.toWIF(),
      publicKey: keyPair.publicKey.toString('hex'),
      address: {
        p2pkh: this.getAddress('p2pkh'),
        p2wpkh: this.getAddress('p2wpkh'),
        p2sh: this.getAddress('p2sh')
      },
      derivationPath: this.getDerivationPath(),
      network: this.network === bitcoin.networks.bitcoin ? 'mainnet' : 'testnet'
    };
  }

  async saveToDatabase(user_account, token) {
    if (!this.account) throw new Error('Wallet not initialized');
    const info = this.getWalletInfo();

    const [rows] = await db.execute(
      `INSERT INTO user_wallet (user_account, token, eaddress, private_key, mnemonic, network)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_account,
        token,
        info.address, // Using p2wpkh as the default address
        info.privateKey,
        info.mnemonic,
        info.network
      ]
    );

    return rows.insertId;
  }

  createTransaction(toAddress, amount, utxos, feeRate = 10) {
    if (!this.account) throw new Error('Wallet not initialized');
    const keyPair = this.getKeyPair();
    const psbt = new bitcoin.Psbt({ network: this.network });

    let totalInput = 0;
    utxos.forEach(utxo => {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script: Buffer.from(utxo.scriptPubKey, 'hex'),
          value: utxo.value
        }
      });
      totalInput += utxo.value;
    });

    const fee = this.estimateFee(psbt, feeRate);
    const changeAmount = totalInput - amount - fee;

    if (changeAmount < 0) {
      throw new Error('Insufficient funds');
    }

    psbt.addOutput({ address: toAddress, value: amount });

    if (changeAmount > 0) {
      psbt.addOutput({ address: this.getAddress(), value: changeAmount });
    }

    return {
      psbt,
      fee,
      totalInput,
      amount,
      changeAmount,
      hex: psbt.toHex()
    };
  }

  estimateFee(psbt, feeRate) {
    const tempPsbt = bitcoin.Psbt.fromHex(psbt.toHex(), { network: this.network });
    const keyPair = this.getKeyPair();
    for (let i = 0; i < tempPsbt.inputCount; i++) {
      tempPsbt.signInput(i, keyPair);
    }
    const tx = tempPsbt.extractTransaction();
    const vsize = tx.virtualSize();
    return vsize * feeRate;
  }

  signPsbt(psbtHex) {
    if (!this.account) throw new Error('Wallet not initialized');
    const psbt = bitcoin.Psbt.fromHex(psbtHex, { network: this.network });
    const keyPair = this.getKeyPair();

    for (let i = 0; i < psbt.inputCount; i++) {
      psbt.signInput(i, keyPair);
    }

    return psbt.toHex();
  }

  async createBTCWallet(userId) {
    try {
      const [existingWallets] = await db.execute(
        `SELECT * FROM user_wallet 
         WHERE user_account = ? 
         AND network = ? 
         AND token = 'BTC'`,
        [userId, this.network === bitcoin.networks.bitcoin ? 'mainnet' : 'testnet']
      );

      if (existingWallets.length === 0) {
        const token = 'BTC';
        const mnemonic = this.generateMnemonic();
        this.fromMnemonic(mnemonic);
        const walletId = await this.saveToDatabase(userId, token);
        return {
          success: true,
          walletId,
          address: this.getAddress(),
          network: this.network === bitcoin.networks.bitcoin ? 'mainnet' : 'testnet'
        };
      } else {
        console.log(`💼 BTC Address at current network (${this.network === bitcoin.networks.bitcoin ? 'mainnet' : 'testnet'}) exists`);
        return {
          success: false,
          message: 'Wallet already exists',
          address: existingWallets[0].eaddress
        };
      }
    } catch (error) {
      console.error('❌ Error creating BTC wallet:', error.message);
      throw error;
    }
  }
}

module.exports = {BitcoinWallet};

/*
async function test() {
  try {
    const wallet = new BitcoinWallet();
    const result = await wallet.createBTCWallet(2); // Replace 123 with actual user ID
    console.log(result);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
*/
