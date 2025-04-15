const walletConnect = require('../helper/wallet/connect/WalletConnectNodeJS');

exports.walletConnect = async (req, res) => {
	if (!req.isAuthenticated()) return res.redirect('/login');

	try {
		const sessionResult = await walletConnect.ensureSession(req.user.id);
		if (sessionResult.walletAddress) {
			return res.json({
				status: 'connected',
				walletAddress: sessionResult.walletAddress
			});
		}
		const {
			proposalId,
			uri,
			approvalPromise,
			onExpired,
			id
		} = sessionResult;


		// Generate QR code
		//const qrCodeData = await qrcode.toDataURL(uri);

		// Handle expiration
		onExpired((error) => {
			console.log('⌛ Proposal expired:', error);
			global.websocketServer.sendMsgToClient(req.user.id,{
				data_type: 'wallet_connect',
				status: 'expired',
				connectionId: error,
				error: error + "(On expired handle)",
				timestamp: Date.now()
			});
		});

		// Handle approval
		approvalPromise
			.then(walletAddress => {
				global.websocketServer.sendMsgToClient(req.user.id,{
					data_type: 'wallet_connect',
					status: 'connected',
					walletAddress,
					timestamp: Date.now()
				});
				console.log(`${walletAddress} Connected to the system`);
			})
			.catch(err => {
				const status = (
						err.code === 'WC_PROPOSAL_EXPIRED' ||
						err.code === 'PROPOSAL_EXPIRED' ||
						err.code === 'expired'
					) ? 'expired' :
					(err.code === 'rejected' || err.message?.toLowerCase().includes('rejected')) ?
					'rejected' :
					'failed';
				global.websocketServer.broadcastMessage({
					data_type: 'wallet_connect',
					status: 'expired',
					err: err.message + "(On error handle)",
					timestamp: Date.now()
				});
			});
		return res.json({
			status: 'awaiting_connection',
			qrCodeData: uri,
			connectionId: proposalId,
			timeout: 180 // 3 minutes
		});
	} catch (error) {
		console.error('Connection error:', error);

		let status = 'error';
		if (error.code === 'PROPOSAL_EXPIRED') status = 'expired';
		if (error.message.includes('rejected')) status = 'rejected';

		return res.status(500).json({
			status,
			error: error.message
		});
	}
};

exports.walletCancelParing = async (req, res) => {
	if (!req.isAuthenticated()) return res.redirect('/login');
	const {
		cid
	} = req.body;

	try {
		const result = await walletConnect.cancelProposalById(cid);
		return res.json({
			status: 'success',
			message: 'Connection cancelled',
			result
		});
	} catch (error) {
		console.error('Cancel pairing error:', error);
		return res.status(500).json({
			status: 'error',
			message: error.message
		});
	}
};

exports.disconectWallet = async (req, res) => {
	if (!req.isAuthenticated()) return res.redirect('/login');

	try {
		await walletConnect.disconnect();
		return res.json({
			status: 'success',
			message: 'Wallet disconnected'
		});
	} catch (error) {
		console.error('Disconnect error:', error);
		return res.status(500).json({
			status: 'error',
			message: error.message
		});
	}
};

exports.walletConnectionStatus = async (req, res) => {
	if (!req.isAuthenticated()) return res.redirect('/login');

	try {
		const session = await walletConnect.checkSessionOnly(req.user.id);
		return res.json({
			status: session ? 'connected' : 'disconnected',
			session
		});
	} catch (error) {
		console.error('Connection status error:', error);
		return res.status(500).json({
			status: 'error',
			message: error.message
		});
	}
};

exports.walletConnectionEventListener = async (req, res) => {
	if (!req.isAuthenticated()) return res.redirect('/login');

	try {
		await walletConnect.setupEventListeners();
		return res.json({
			status: 'success',
			message: 'Event listeners initialized'
		});
	} catch (error) {
		console.error('Event listener setup error:', error);
		return res.status(500).json({
			status: 'error',
			message: error.message
		});
	}
};