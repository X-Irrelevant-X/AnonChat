import cryptoManager from './crypto';
import keyManager from './keymanage';

class EncryptionService {
  constructor() {
    this.crypto = cryptoManager;
  }

  // Encrypt user profile data
  async encryptUserProfileData(userData, userPublicKey) {
    try {
      const encryptedData = await this.crypto.encryptWithPublicKey(
        userData,
        userPublicKey
      );
      
      return {
        data: encryptedData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Failed to encrypt user profile data: ' + error.message);
    }
  }

  // Decrypt user profile data
  async decryptUserProfileData(encryptedData, userPrivateKey) {
    try {
      const decryptedData = await this.crypto.decryptWithPrivateKey(
        encryptedData.data,
        userPrivateKey
      );
      
      return decryptedData;
    } catch (error) {
      throw new Error('Failed to decrypt user profile data: ' + error.message);
    }
  }

  // Encrypt chat message
  async encryptChatMessage(message, recipientPublicKey) {
    try {
      const messageData = {
        text: message,
        timestamp: new Date().toISOString()
      };
      
      const encryptedData = await this.crypto.encryptWithPublicKey(
        messageData,
        recipientPublicKey
      );
      
      return {
        encryptedMessage: encryptedData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Failed to encrypt chat message: ' + error.message);
    }
  }

  // Decrypt chat message
  async decryptChatMessage(encryptedMessage, userPrivateKey) {
    try {
      const decryptedData = await this.crypto.decryptWithPrivateKey(
        encryptedMessage.encryptedMessage,
        userPrivateKey
      );
      
      return decryptedData;
    } catch (error) {
      throw new Error('Failed to decrypt chat message: ' + error.message);
    }
  }

  // Encrypt any generic data
  async encryptData(data, publicKey) {
    try {
      return await this.crypto.encryptWithPublicKey(data, publicKey);
    } catch (error) {
      throw new Error('Failed to encrypt data: ' + error.message);
    }
  }

  // Decrypt any generic data
  async decryptData(encryptedData, privateKey) {
    try {
      return await this.crypto.decryptWithPrivateKey(encryptedData, privateKey);
    } catch (error) {
      throw new Error('Failed to decrypt data: ' + error.message);
    }
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

export default encryptionService;