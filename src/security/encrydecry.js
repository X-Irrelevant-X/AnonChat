import cryptoManager from './crypto';

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

  async encryptWithAES(data, recipientPublicKey) {
    // 1. Generate AES key + IV
    const aesKey = crypto.randomBytes(32); // AES-256
    const iv = crypto.randomBytes(16);

    // 2. Encrypt the data with AES
    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    let encryptedData = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encryptedData += cipher.final('base64');

    // 3. Encrypt AES key with RSA
    const encryptedKey = await this.crypto.encryptWithPublicKey(aesKey.toString('base64'), recipientPublicKey);

    return {
      encryptedKey, // RSA-protected AES key
      iv: iv.toString('base64'),
      data: encryptedData,
      timestamp: new Date().toISOString()
    };
  }

  async decryptWithAES(encryptedPacket, userPrivateKey) {
    // 1. Decrypt AES key with RSA
    const aesKeyBase64 = await this.crypto.decryptWithPrivateKey(encryptedPacket.encryptedKey, userPrivateKey);
    const aesKey = Buffer.from(aesKeyBase64, 'base64');

    // 2. Decrypt data with AES
    const iv = Buffer.from(encryptedPacket.iv, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    let decrypted = decipher.update(encryptedPacket.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}

// Create singleton instance
const encryptionService = new EncryptionService();

export default encryptionService;