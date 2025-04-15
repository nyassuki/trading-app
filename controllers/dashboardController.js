// controllers/dashboardController.js
const ethwallet = require('../helper/wallet/manager/createUsdtWallet');
const btcwallet = require('../helper/wallet/manager/createBtcWallet');
const walletConnect = require('../helper/wallet/connect/WalletConnectNodeJS');
 
//const walletConnect = new wc.WalletConnectService();
const newBTC = new btcwallet.BitcoinWallet();
 
exports.getDashboard = async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.redirect('/login');
    await ethwallet.createUnifiedWallet(req.user.id);
    await newBTC.createBTCWallet(req.user.id);

    //walet connect
    let wallet_address = (await walletConnect.checkSessionOnly(req.user.id))?.walletAddress || "Wallet connect";
    wallet_address = wallet_address !== "Wallet connect" ? wallet_address.substring(0, 12) + ' ...' : wallet_address;


    res.render('dashboard', { user: req.user, wallet_address:wallet_address });
    
  } catch (error) {
    console.error("🚨 Error generating wallet:", error);
    res.status(500).send("Internal Server Error");
  }
};

exports.getUser = async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.redirect('/login');
    const user = req.user;
    global.UserID = user.id;
    const { password,googleId, ...safeUser } = user;

    return res.json(safeUser);
    
  } catch (error) {
    console.error("🚨 Error getting  user:", error);
    res.status(500).send("Internal Server Error");
  }
};
