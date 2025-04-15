const { WalletConnectManager } = require('./WalletConnectNodeJS'); // Adjust path as needed

class WalletConnectService {
  constructor() {
    this.managers = new Map(); // Track active managers by user ID
  }

  /**
   * Main method to handle session query/creation
   * @param {number} userId - The user ID to check/create session for
   * @returns {Promise<{status: string, walletAddress?: string, qrCodeData?: string, approvalPromise?: Promise}>}
   */
  async handleUserSession(userId) {
    try {
      // Check for existing session
      const existingSession = await this.checkExistingSession(userId);
      
      if (existingSession) {
        return {
          status: 'connected',
          walletAddress: existingSession.walletAddress
        };
      }

      // No existing session - initiate new connection
      return await this.initiateNewConnection(userId);
    } catch (error) {
      console.error(`Error handling session for user ${userId}:`, error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Check for existing valid session
   * @param {number} userId 
   * @returns {Promise<{walletAddress: string}|null>}
   */
  async checkExistingSession(userId) {
    // Reuse existing manager if available
    if (this.managers.has(userId)) {
      const manager = this.managers.get(userId);
      try {
        // Verify session is still active
        if (manager.session) {
          await manager.client.ping({ topic: manager.session.topic });
          return { walletAddress: manager.walletAddress };
        }
      } catch (error) {
         console.log(`Session for user ${userId} is no longer active`);
        this.managers.delete(userId);
      }
    }

    // Check database for existing session
    const manager = new WalletConnectManager(userId);
    const sessionInfo = await manager.restoreSession();
    
    if (sessionInfo) {
      this.managers.set(userId, manager);
      return { walletAddress: sessionInfo.walletAddress };
    }

    return null
  }

  /**
   * Initiate new WalletConnect connection
   * @param {number} userId 
   * @returns {Promise<{status: string, qrCodeData: string, approvalPromise: Promise}>}
   */
  async initiateNewConnection(userId) {
    const manager = new WalletConnectManager(userId);
    const { qrCodeData, waitForApproval } = await manager.initNewSession();

    // Store the manager while connection is pending
    this.managers.set(userId, manager);

    return {
      status: 'awaiting_connection',
      qrCodeData,
      approvalPromise: waitForApproval()
        .then(sessionInfo => {
          return {
            status: 'connected',
            walletAddress: sessionInfo.walletAddress
          };
        })
        .catch(error => {
          this.managers.delete(userId); // Clean up on failure
          throw error;
        })
    };
  }

  /**
   * Disconnect session for user
   * @param {number} userId 
   */
  async disconnectUser(userId) {
    if (this.managers.has(userId)) {
      const manager = this.managers.get(userId);
      await manager.cleanupSession();
      this.managers.delete(userId);
    }
  }
}

module.exports = new WalletConnectService();