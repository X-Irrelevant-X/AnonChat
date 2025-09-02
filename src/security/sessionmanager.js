import keyManager from './keymanage'; 

class SessionManager {
  constructor() {
    this.sessionKey = null;
    this.userKeys = null;
    this.sessionTimeout = 30 * 60 * 1000;
    this.sessionTimer = null;
  }

  async startSession(userId, password) {
    try {
      const userKeys = await keyManager.loadUserKeys(userId, password);
      
      const sessionKey = await this.generateSessionKey();
      
      this.userKeys = userKeys;
      this.sessionKey = sessionKey;
      
      this.startSessionTimer();
      
      return {
        success: true,
        publicKey: userKeys.publicKey
      };
    } catch (error) {
      throw new Error('Failed to start secure session: ' + error.message);
    }
  }

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

  getPrivateKey() {
    if (!this.userKeys) {
      throw new Error('No active session. Please log in.');
    }
    this.resetSessionTimer();
    return this.userKeys.privateKey;
  }

  getPublicKey() {
    if (!this.userKeys) {
      throw new Error('No active session. Please log in.');
    }
    this.resetSessionTimer();
    return this.userKeys.publicKey;
  }

  startSessionTimer() {
    this.clearSessionTimer();
    this.sessionTimer = setTimeout(() => {
      this.endSession();
    }, this.sessionTimeout);
  }

  resetSessionTimer() {
    if (this.sessionTimer) {
      this.startSessionTimer();
    }
  }

  clearSessionTimer() {
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
  }

  endSession() {
    this.userKeys = null;
    this.sessionKey = null;
    this.clearSessionTimer();
  }

  isSessionActive() {
    return this.userKeys !== null && this.sessionKey !== null;
  }

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


const sessionManager = new SessionManager();

export default sessionManager;