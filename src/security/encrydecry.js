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
    try {
      const aesKey = await window.crypto.subtle.generateKey(
        {
          name: "AES-GCM",
          length: 256
        },
        true,
        ["encrypt", "decrypt"]
      );

      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        aesKey,
        encodedData
      );

      const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
      const aesKeyBase64 = this.arrayBufferToBase64(exportedAesKey);

      const encryptedKey = await this.crypto.encryptWithPublicKey(aesKeyBase64, recipientPublicKey);

      return {
        encryptedKey,
        iv: this.arrayBufferToBase64(iv),
        data: this.arrayBufferToBase64(encryptedData),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Failed to encrypt with AES: ' + error.message);
    }
  }

  async decryptWithAES(encryptedPacket, userPrivateKey) {
    try {
      const aesKeyBase64 = await this.crypto.decryptWithPrivateKey(encryptedPacket.encryptedKey, userPrivateKey);
      const aesKeyBuffer = this.base64ToArrayBuffer(aesKeyBase64);

      const aesKey = await window.crypto.subtle.importKey(
        "raw",
        aesKeyBuffer,
        {
          name: "AES-GCM",
          length: 256
        },
        false,
        ["decrypt"]
      );
      const iv = this.base64ToArrayBuffer(encryptedPacket.iv);
      const encryptedData = this.base64ToArrayBuffer(encryptedPacket.data);

      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        aesKey,
        encryptedData
      );

      const decryptedText = new TextDecoder().decode(decryptedData);
      return JSON.parse(decryptedText);
    } catch (error) {
      throw new Error('Failed to decrypt with AES: ' + error.message);
    }
  }

  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  async generateSharedKey(user1Id, user2Id) {
    const seed = [user1Id, user2Id].sort().join('|');
    const seedBuffer = new TextEncoder().encode(seed);
    
    const keyMaterial = await window.crypto.subtle.digest('SHA-256', seedBuffer);
    
    return await window.crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
  async encryptFriendData(data, user1Id, user2Id) {
    try {
      const sharedKey = await this.generateSharedKey(user1Id, user2Id);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      
      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        sharedKey,
        encodedData
      );

      return {
        data: this.arrayBufferToBase64(encryptedData),
        iv: this.arrayBufferToBase64(iv),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error('Failed to encrypt friend data: ' + error.message);
    }
  }

  async decryptFriendData(encryptedPacket, user1Id, user2Id) {
    try {
      const sharedKey = await this.generateSharedKey(user1Id, user2Id);
      const iv = this.base64ToArrayBuffer(encryptedPacket.iv);
      const encryptedData = this.base64ToArrayBuffer(encryptedPacket.data);

      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        sharedKey,
        encryptedData
      );

      const decryptedText = new TextDecoder().decode(decryptedData);
      return JSON.parse(decryptedText);
    } catch (error) {
      throw new Error('Failed to decrypt friend data: ' + error.message);
    }
  }
}

const encryptionService = new EncryptionService();
export default encryptionService;