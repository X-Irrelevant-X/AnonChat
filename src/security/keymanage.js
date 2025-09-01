// src/security/keymanage.js
import { firestore } from '../firebase';
import cryptoManager from '../security/crypto';

class KeyManager {
  constructor() {
    this.crypto = cryptoManager;
  }

  // Initialize user keys during registration
  async initializeUserKeys(userId, password) {
    try {
      // Generate RSA key pair
      const keyPair = await this.crypto.generateKeyPair();
      
      // Export public key for storage (convert to string)
      const publicKeyString = await this.crypto.exportPublicKey(keyPair.publicKey);
      
      // Encrypt private key with user password
      const encryptedPrivateKey = await this.crypto.encryptPrivateKeyWithPassword(
        keyPair.privateKey, 
        password
      );

      // Store keys in Firestore using set() with merge
      await firestore.collection('users').doc(userId).set({
        publicKey: publicKeyString, // Store exported string, not CryptoKey object
        encryptedPrivateKey: encryptedPrivateKey,
        keyCreatedAt: new Date()
      }, { merge: true });

      // Return the actual key objects for immediate use
      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      };
    } catch (error) {
      throw new Error('Failed to initialize user keys: ' + error.message);
    }
  }

  // Load user keys (decrypt private key with password)
  async loadUserKeys(userId, password) {
    try {
      // Get user keys from Firestore
      const userData = await this.crypto.getUserKeys(userId);
      
      if (!userData || !userData.encryptedPrivateKey) {
        throw new Error('User keys not found');
      }

      // Decrypt private key with password
      const privateKey = await this.crypto.decryptPrivateKeyWithPassword(
        userData.encryptedPrivateKey.encryptedKey,
        userData.encryptedPrivateKey.iv,
        password
      );

      // Import public key from stored string
      const publicKey = await this.crypto.importPublicKey(userData.publicKey);

      return {
        publicKey,
        privateKey
      };
    } catch (error) {
      throw new Error('Failed to load user keys: ' + error.message);
    }
  }

  // Get public key for a user (for sharing)
  async getUserPublicKey(userId) {
    try {
      const userData = await this.crypto.getUserKeys(userId);
      if (userData && userData.publicKey) {
        return await this.crypto.importPublicKey(userData.publicKey);
      }
      throw new Error('Public key not found');
    } catch (error) {
      throw new Error('Failed to get user public key: ' + error.message);
    }
  }

  // Rotate keys (optional feature for enhanced security)
  async rotateUserKeys(userId, currentPassword) {
    try {
      // Load current keys to verify password
      await this.loadUserKeys(userId, currentPassword);
      
      // Generate new key pair
      const newKeyPair = await this.crypto.generateKeyPair();
      
      // Export new public key (convert to string)
      const newPublicKeyString = await this.crypto.exportPublicKey(newKeyPair.publicKey);
      
      // Encrypt new private key with current password
      const newEncryptedPrivateKey = await this.crypto.encryptPrivateKeyWithPassword(
        newKeyPair.privateKey,
        currentPassword
      );

      // Update keys in Firestore using set() with merge
      await firestore.collection('users').doc(userId).set({
        publicKey: newPublicKeyString, // Store exported string
        encryptedPrivateKey: newEncryptedPrivateKey,
        keyRotatedAt: new Date()
      }, { merge: true });

      return {
        publicKey: newKeyPair.publicKey,
        privateKey: newKeyPair.privateKey
      };
    } catch (error) {
      throw new Error('Failed to rotate user keys: ' + error.message);
    }
  }
}

// Create singleton instance
const keyManager = new KeyManager();

export default keyManager;