import EncryptionService from './encrydecry';
import keyManager from './keymanage'; 

class SessionManager {
  constructor() {
    this.sessionKey = null;
    this.userKeys = null;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.sessionTimer = null;
  }

  // Start secure session after successful authentication
  async startSession(userId, password) {
    try {
      // Load and decrypt user's private key using their password
      const userKeys = await keyManager.loadUserKeys(userId, password);
      
      // Generate session key for this session
      const sessionKey = await this.generateSessionKey();
      
      // Store in memory (never in localStorage/sessionStorage for security)
      this.userKeys = userKeys;
      this.sessionKey = sessionKey;
      
      // Start session timeout
      this.startSessionTimer();
      
      return {
        success: true,
        publicKey: userKeys.publicKey
      };
    } catch (error) {
      throw new Error('Failed to start secure session: ' + error.message);
    }
  }

  // Generate secure session key
  async generateSessionKey() {
    const key = await window.crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"]
    );
    return key;
  }

  // Get user's private key for decryption operations
  getPrivateKey() {
    if (!this.userKeys) {
      throw new Error('No active session. Please log in.');
    }
    this.resetSessionTimer(); // Reset timer on activity
    return this.userKeys.privateKey;
  }

  // Get user's public key for encryption operations
  getPublicKey() {
    if (!this.userKeys) {
      throw new Error('No active session. Please log in.');
    }
    this.resetSessionTimer(); // Reset timer on activity
    return this.userKeys.publicKey;
  }

  // Start session timeout timer
  startSessionTimer() {
    this.clearSessionTimer();
    this.sessionTimer = setTimeout(() => {
      this.endSession();
    }, this.sessionTimeout);
  }

  // Reset session timer on activity
  resetSessionTimer() {
    if (this.sessionTimer) {
      this.startSessionTimer();
    }
  }

  // Clear session timer
  clearSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  // End session and clear all sensitive data
  endSession() {
    this.userKeys = null;
    this.sessionKey = null;
    this.clearSessionTimer();
  }

  // Check if session is active
  isSessionActive() {
    return this.userKeys !== null && this.sessionKey !== null;
  }

  // Re-authenticate for sensitive operations
  async reauthenticate(userId, password) {
    try {
      const userKeys = await keyManager.loadUserKeys(userId, password);
      this.userKeys = userKeys;
      this.resetSessionTimer();
      return true;
    } catch (error) {
      throw new Error('Re-authentication failed: ' + error.message);
    }
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager;