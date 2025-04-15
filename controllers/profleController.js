const walletConnect = require('../helper/wallet/connect/WalletConnectNodeJS');

exports.getProfile = async (req, res) => {
  try {
    if (!req.isAuthenticated()) return res.redirect('/login');
    
    let wallet_address = (await walletConnect.checkSessionOnly(req.user.id))?.walletAddress || "Wallet connect";
    wallet_address = wallet_address !== "Wallet connect" ? wallet_address.substring(0, 12) + ' ...' : wallet_address;


    res.render('profile', { user: req.user,wallet_address: wallet_address});
    
  } catch (error) {
    console.error("🚨 Error generating wallet:", error);
    res.status(500).send("Internal Server Error");
  }
};