// routes/wallet.js
// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const walletControllerController = require('../controllers/walletController');


 
router.get('/wallet/connect', walletControllerController.walletConnect);
router.post('/wallet/connection-cancel', walletControllerController.walletCancelParing);
router.get('/wallet/connection-status', walletControllerController.walletConnectionStatus);
router.get('/wallet/connection-event', walletControllerController.walletConnectionEventListener);

router.get('/wallet/delete', walletControllerController.disconectWallet);

module.exports = router;
