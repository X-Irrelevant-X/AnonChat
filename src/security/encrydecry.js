import cryptoManager from './crypto';


class EncryptionService {
  constructor() {
    this.crypto = cryptoManager;
  }

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

  async encryptData(data, publicKey) {
    try {
      return await this.crypto.encryptWithPublicKey(data, publicKey);
    } catch (error) {
      throw new Error('Failed to encrypt data: ' + error.message);
    }
  }

  async decryptData(encryptedData, privateKey) {
    try {
      return await this.crypto.decryptWithPrivateKey(encryptedData, privateKey);
    } catch (error) {
      throw new Error('Failed to decrypt data: ' + error.message);
    }
  }

  async encryptWithAES(data, recipientPublicKey) {
    const aesKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv('aes-256-cbc', aesKey, iv);
    let encryptedData = cipher.update(JSON.stringify(data), 'utf8', 'base64');
    encryptedData += cipher.final('base64');

    const encryptedKey = await this.crypto.encryptWithPublicKey(aesKey.toString('base64'), recipientPublicKey);

    return {
      encryptedKey,
      iv: iv.toString('base64'),
      data: encryptedData,
      timestamp: new Date().toISOString()
    };
  }

  async decryptWithAES(encryptedPacket, userPrivateKey) {
    const aesKeyBase64 = await this.crypto.decryptWithPrivateKey(encryptedPacket.encryptedKey, userPrivateKey);
    const aesKey = Buffer.from(aesKeyBase64, 'base64');

    const iv = Buffer.from(encryptedPacket.iv, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, iv);
    let decrypted = decipher.update(encryptedPacket.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  }
}


const encryptionService = new EncryptionService();

export default encryptionService;