require('dotenv').config();
const qrcode = require('qrcode-terminal');
const { SignClient } = require('@walletconnect/sign-client');
const { v4: uuidv4 } = require('uuid');
const pool = require('../../../models/db');
const ethers = require('ethers');
const ERC20_ABI = require('../abi/erc20.json');

class WalletConnectService {
  constructor() {
    this.client = null;
    this.session = null;
    this.activeProposals = new Map();
    this.proposalTimeouts = new Map();
    this.sessionExpiryListeners = new Map();
    this.initialized = false;
  }

  async initializeClient() {
    if (this.initialized) return true;
    
    try {
      this.client = await SignClient.init({
        projectId: process.env.WALLETCONNECT_PROJECT_ID,
        relayUrl: 'wss://relay.walletconnect.com',
        metadata: {
          name: process.env.WALLETCONNECT_NAME || 'My DApp',
          description: process.env.WALLETCONNECT_DESC || 'Decentralized Application',
          url: process.env.WALLETCONNECT_URL || 'https://myapp.com',
          icons: [process.env.WALLETCONNECT_ICON || 'https://myapp.com/icon.png'],
        },
        storageOptions: {
          database: './walletconnect.db',
        },
      });

      this.setupEventListeners();
      this.initialized = true;
      console.log('🟢 WalletConnect client initialized');
      return true;
    } catch (err) {
      console.error('❌ Failed to initialize WalletConnect:', err);
      this.initialized = false;
      throw new Error('WalletConnect initialization failed');
    }
  }

  setupEventListeners() {
    if (!this.client) return;

    // Session event handlers
    this.client.on('session_proposal', (proposal) => {
      console.log('🔵 New session proposal received');
    });

    this.client.on('session_delete', ({ topic }) => {
      console.log('🗑️ Session deleted:', topic);
      this.handleSessionRemoval(topic);
    });

    this.client.on('session_expire', ({ topic }) => {
      console.log('⏳ Session expired:', topic);
      this.handleSessionExpiry(topic);
    });

    // Expiry handler
    this.client.core.expirer.on('expired', async (event) => {
      try {
        const { topic } = this.parseExpirerTarget(event.target);
        if (topic) {
          console.log(`Session expired: ${topic}`);
          await this.handleSessionExpiry(topic);
        }
      } catch (err) {
        console.error('Error handling expirer event:', err);
      }
    });
  }

  parseExpirerTarget(target) {
    try {
      const parts = target.split(':');
      if (parts.length === 2 && parts[0] === 'session') {
        return { topic: parts[1] };
      }
      return {};
    } catch (err) {
      console.error('Error parsing expirer target:', err);
      return {};
    }
  }

  async createNewSession(userAccountId, timeoutMinutes = 1) {
    try {
      await this.initializeClient();

      const proposalId = uuidv4();
      let resolvePromise, rejectPromise;
      
      const approvalPromise = new Promise((resolve, reject) => {
        resolvePromise = resolve;
        rejectPromise = reject;
      });

      const { uri, approval } = await this.client.connect({
        requiredNamespaces: {
          eip155: {
            methods: ['eth_sendTransaction', 'personal_sign', 'eth_sign'],
            chains: ['eip155:1', 'eip155:56', 'eip155:137'],
            events: ['accountsChanged', 'chainChanged'],
          },
        },
      });

      // Store the proposal with metadata
      this.activeProposals.set(proposalId, {
        id: proposalId,
        uri,
        approval,
        userAccountId,
        createdAt: Date.now(),
        status: 'pending',
        timeoutMinutes,
        resolve: resolvePromise,
        reject: rejectPromise,
        onExpired: null
      });

      // Set timeout with proper error handling
      const timeout = setTimeout(() => {
        this.handleProposalExpiry(proposalId);
      }, timeoutMinutes * 60 * 1000);

      this.proposalTimeouts.set(proposalId, timeout);

      // Process approval in background
      this.processApproval(proposalId, approval, userAccountId);

      return {
        id: proposalId,
        uri,
        approvalPromise,
        cancel: () => this.cancelProposalById(proposalId),
        onExpired: (callback) => {
          const proposal = this.activeProposals.get(proposalId);
          if (proposal) {
            proposal.onExpired = () => callback(proposalId);
          }
        },

      };
    } catch (err) {
      console.error('❌ Create session failed:', err);
      throw err;
    }
  }

  async handleProposalExpiry(proposalId) {
    const proposal = this.activeProposals.get(proposalId);
    if (!proposal || proposal.status !== 'pending') return;

    console.log(`⏰ Proposal ${proposalId} expired`);
    proposal.status = 'expired';
    
    const err = new Error('WalletConnect proposal expired');
    err.name = 'ProposalExpiredError';
    err.code = 'WC_PROPOSAL_EXPIRED';
    err.isOperational = true;
    
    // Reject the promise safely
    if (proposal.reject) {
      proposal.reject(err);
    }
    
    // Notify expiration listeners
    if (typeof proposal.onExpired === 'function') {
      try {
        proposal.onExpired(err);
      } catch (callbackErr) {
        console.error('Error in expiration callback:', callbackErr);
      }
    }

    this.clearProposal(proposalId);
  }

  async processApproval(proposalId, approval, userAccountId) {
    try {
      const session = await approval();
      const walletAddress = session.namespaces.eip155.accounts[0].split(':')[2];

      const proposal = this.activeProposals.get(proposalId);
      if (!proposal) return;

      proposal.status = 'completed';
      this.clearProposal(proposalId);

      this.session = session;
      await this.saveSessionToDB(userAccountId, session, walletAddress);

      // Resolve the promise
      if (proposal.resolve) {
        proposal.resolve(walletAddress);
      }
    } catch (err) {
      console.error('❌ Approval process failed:', err);
      
      const proposal = this.activeProposals.get(proposalId);
      if (!proposal) return;

      // Enhance the error object
      if (err.message.includes('proposal expired') || err.message.includes('Proposal expired') || err.code === 'WC_PROPOSAL_EXPIRED') {
        err.name = 'ProposalExpiredError';
        err.code = 'WC_PROPOSAL_EXPIRED';
        err.isOperational = true;
      }

      // Reject the promise
      if (proposal.reject) {
        proposal.reject(err);
      }
      
      this.clearProposal(proposalId);
    }
  }

  async saveSessionToDB(userAccountId, session, walletAddress) {
    try {
      await pool.query(
        `INSERT INTO walletconnect_sessions 
         (user_account, session_topic, pairing_topic, session_data, wallet_address)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         session_data = VALUES(session_data),
         wallet_address = VALUES(wallet_address)`,
        [userAccountId, session.topic, session.pairingTopic, JSON.stringify(session), walletAddress]
      );
    } catch (err) {
      console.error('❌ Failed to save session to DB:', err);
      throw err;
    }
  }

  async restoreSessionFromDB(userAccountId) {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM walletconnect_sessions 
         WHERE user_account = ? 
         ORDER BY created_at DESC LIMIT 1`,
        [userAccountId]
      );

      if (rows.length === 0) return null;

      const sessionData = JSON.parse(rows[0].session_data);
      const session = this.client.session.get(sessionData.topic);
      
      if (!session) {
        await this.cleanupSessionRecords(sessionData.topic);
        return null;
      }

      if (this.isSessionExpired(session)) {
        await this.cleanupSessionRecords(sessionData.topic);
        return null;
      }

      this.session = session;
      return {
        walletAddress: rows[0].wallet_address,
        session
      };
    } catch (err) {
      console.error('❌ Session restoration failed:', err);
      return null;
    }
  }

  isSessionExpired(session) {
    return session.expiry && session.expiry * 1000 < Date.now();
  }

  async handleSessionExpiry(topic) {
    try {
      // Notify listeners
      if (this.sessionExpiryListeners.has(topic)) {
        const callback = this.sessionExpiryListeners.get(topic);
        try {
          callback(topic);
        } catch (err) {
          console.error('Error in expiry listener:', err);
        }
        this.sessionExpiryListeners.delete(topic);
      }

      // Clear current session if it matches
      if (this.session?.topic === topic) {
        this.session = null;
      }

      // Clean up database records
      await this.cleanupSessionRecords(topic);
    } catch (err) {
      console.error('❌ Error handling session expiry:', err);
    }
  }

  async handleSessionRemoval(topic) {
  try {
    const walletAddress = this.getWalletAddressByTopic(topic);
    
    if (this.session?.topic === topic) {
      this.session = null;
    }
    
    await this.cleanupSessionRecords(topic);
    
    // Notify listeners with wallet address instead of topic
    if (this.sessionExpiryListeners.has(topic)) {
      const callback = this.sessionExpiryListeners.get(topic);
      try {
        callback({ walletAddress, topic });
      } catch (err) {
        console.error('Error in removal listener:', err);
      }
      this.sessionExpiryListeners.delete(topic);
    }
    console.log('🗑️ Session deleted:', { walletAddress, topic });
    global.websocketServer.sendMsgToClient(global.UserID,{
          data_type: 'wallet_disconnect',
          status: 'disconnected',
          walletAddress,
          timestamp: Date.now()
    });
  } catch (err) {
    console.error('❌ Error handling session removal:', err);
  }
}
getWalletAddressByTopic(topic) {
  try {
    // First check active session
    if (this.session?.topic === topic) {
      return this.extractAddressFromSession(this.session);
    }
    
    // Then check client's session storage
    const session = this.client.session.get(topic);
    if (session) {
      return this.extractAddressFromSession(session);
    }
    
    // Finally check database as fallback
    return this.getWalletAddressFromDB(topic);
  } catch (error) {
    console.error(`Failed to get wallet address for topic ${topic}:`, error);
    return null;
  }
}

async getWalletAddressFromDB(topic) {
  try {
    const [rows] = await pool.query(
      `SELECT wallet_address FROM walletconnect_sessions 
       WHERE session_topic = ? LIMIT 1`,
      [topic]
    );
    
    return rows.length > 0 ? rows[0].wallet_address : null;
  } catch (err) {
    console.error('Database error fetching wallet address:', err);
    return null;
  }
}

extractAddressFromSession(session) {
  try {
    // Try EIP155 namespace first
    if (session.namespaces?.eip155?.accounts?.length > 0) {
      return session.namespaces.eip155.accounts[0].split(':')[2];
    }
    
    // Fallback to peer metadata
    if (session.peer?.metadata?.accounts?.length > 0) {
      return session.peer.metadata.accounts[0];
    }
    
    return null;
  } catch (err) {
    console.error('Error extracting address from session:', err);
    return null;
  }
}
async handleSessionExpiry(topic) {
  try {
    const walletAddress = this.getWalletAddressByTopic(topic);
    
    // Notify listeners with wallet address instead of topic
    if (this.sessionExpiryListeners.has(topic)) {
      const callback = this.sessionExpiryListeners.get(topic);
      try {
        callback({ walletAddress, topic });
      } catch (err) {
        console.error('Error in expiry listener:', err);
      }
      this.sessionExpiryListeners.delete(topic);
    }

    // Clear current session if it matches
    if (this.session?.topic === topic) {
      this.session = null;
    }

    // Clean up database records
    await this.cleanupSessionRecords(topic);
    
    console.log('⏳ Session expired:', { walletAddress, topic });
  } catch (err) {
    console.error('❌ Error handling session expiry:', err);
  }
}

  async cleanupSessionRecords(topic) {
    try {
      await pool.query(
        `DELETE FROM walletconnect_sessions WHERE session_topic = ?`, 
        [topic]
      );
    } catch (err) {
      console.error('❌ Failed to clean up session records:', err);
    }
  }

  async ensureSession(userAccountId) {
    try {
      await this.initializeClient();
      const restored = await this.restoreSessionFromDB(userAccountId);
      
      if (restored) {
        return {
          status: true,
          walletAddress: restored.walletAddress,
          session: restored.session
        };
      }

      const { id, uri, approvalPromise, onExpired } = await this.createNewSession(userAccountId);
      
      return {
        status: false,
        proposalId: id,
        uri,
        approvalPromise,
        onExpired
      };
    } catch (err) {
      console.error('❌ Ensure session failed:', err);
      throw err;
    }
  }

  async checkSessionOnly(userAccountId) {
    try {
      await this.initializeClient();
      return await this.restoreSessionFromDB(userAccountId);
    } catch (err) {
      console.error('❌ Check session failed:', err);
      return null;
    }
  }

  async cancelProposalById(proposalId) {
    try {
      if (!this.activeProposals.has(proposalId)) return false;
      
      const proposal = this.activeProposals.get(proposalId);
      if (proposal.reject) {
        const err = new Error('Connection cancelled by user');
        err.name = 'UserCancelledError';
        err.code = 'WC_USER_CANCELLED';
        err.isOperational = true;
        proposal.reject(err);
      }
      
      this.clearProposal(proposalId);
      return true;
    } catch (err) {
      console.error('❌ Cancel proposal failed:', err);
      return false;
    }
  }

  clearProposal(proposalId) {
    try {
      // Clear timeout if exists
      if (this.proposalTimeouts.has(proposalId)) {
        clearTimeout(this.proposalTimeouts.get(proposalId));
        this.proposalTimeouts.delete(proposalId);
      }
      
      // Remove from active proposals
      this.activeProposals.delete(proposalId);
    } catch (err) {
      console.error('❌ Clear proposal failed:', err);
    }
  }

  async disconnect() {
    if (!this.session) return;
    
    try {
      await this.client.disconnect({
        topic: this.session.topic,
        reason: { 
          code: 6000, 
          message: 'User initiated disconnect' 
        }
      });
      
      await this.cleanupSessionRecords(this.session.topic);
      this.session = null;
    } catch (err) {
      console.error('❌ Disconnect failed:', err);
      throw err;
    }
  }

  async getActiveProposalStatus(proposalId) {
    const proposal = this.activeProposals.get(proposalId);
    if (!proposal) return null;
    
    return {
      status: proposal.status,
      createdAt: proposal.createdAt,
      expiresAt: proposal.createdAt + (proposal.timeoutMinutes * 60000),
      userAccountId: proposal.userAccountId
    };
  }
}

// Singleton instance
module.exports = new WalletConnectService();