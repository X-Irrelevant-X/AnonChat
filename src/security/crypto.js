import { firestore } from '../firebase';

class CryptoManager {
  constructor() {
    this.algorithm = {
      name: "RSA-OAEP",
      hash: "SHA-256"
    };
  }

  // Convert string to ArrayBuffer
  stringToArrayBuffer(str) {
    return new TextEncoder().encode(str);
  }

  // Convert ArrayBuffer to string
  arrayBufferToString(buffer) {
    return new TextDecoder().decode(buffer);
  }

  // Convert base64 to ArrayBuffer
  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Convert ArrayBuffer to base64
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Generate RSA key pair
  async generateKeyPair() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
    return keyPair;
  }

  // Export public key for storage
  async exportPublicKey(key) {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return this.arrayBufferToBase64(exported);
  }

  // Import public key from storage
  async importPublicKey(keyData) {
    const binaryDer = this.base64ToArrayBuffer(keyData);
    return await window.crypto.subtle.importKey(
      "spki",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    );
  }

  // Export private key
  async exportPrivateKey(key) {
    const exported = await window.crypto.subtle.exportKey("pkcs8", key);
    return this.arrayBufferToBase64(exported);
  }

  // Import private key
  async importPrivateKey(keyData) {
    const binaryDer = this.base64ToArrayBuffer(keyData);
    return await window.crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );
  }

  // Encrypt data with public key
  async encryptWithPublicKey(data, publicKey) {
    const encodedData = this.stringToArrayBuffer(JSON.stringify(data));
    const encrypted = await window.crypto.subtle.encrypt(
      this.algorithm,
      publicKey,
      encodedData
    );
    return this.arrayBufferToBase64(encrypted);
  }

  // Decrypt data with private key
  async decryptWithPrivateKey(encryptedData, privateKey) {
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
    const decrypted = await window.crypto.subtle.decrypt(
      this.algorithm,
      privateKey,
      encryptedBuffer
    );
    const decodedString = this.arrayBufferToString(decrypted);
    return JSON.parse(decodedString);
  }

  // Derive key from password for encrypting private key
  async deriveKeyFromPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await window.crypto.subtle.digest("SHA-256", data);
    return await window.crypto.subtle.importKey(
      "raw",
      hash,
      "AES-GCM",
      false,
      ["encrypt", "decrypt"]
    );
  }

  // Encrypt private key with password
  async encryptPrivateKeyWithPassword(privateKey, password) {
    // Export private key
    const exportedKey = await this.exportPrivateKey(privateKey);
    const keyData = this.base64ToArrayBuffer(exportedKey);
    
    // Derive encryption key from password
    const encryptionKey = await this.deriveKeyFromPassword(password);
    
    // Generate IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      encryptionKey,
      keyData
    );
    
    return {
      encryptedKey: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv)
    };
  }

  // Decrypt private key with password
  async decryptPrivateKeyWithPassword(encryptedPrivateKeyData, iv, password) {
    // Derive decryption key from password
    const decryptionKey = await this.deriveKeyFromPassword(password);
    
    // Convert data
    const encryptedData = this.base64ToArrayBuffer(encryptedPrivateKeyData);
    const ivData = this.base64ToArrayBuffer(iv);
    
    // Decrypt
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivData },
      decryptionKey,
      encryptedData
    );
    
    // Import the decrypted private key
    return await window.crypto.subtle.importKey(
      "pkcs8",
      decrypted,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["decrypt"]
    );
  }

  // Get user's keys from Firestore
  async getUserKeys(userId) {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (userDoc.exists) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      throw new Error('Failed to retrieve user keys');
    }
  }

  // Store encrypted user data
  async storeEncryptedUserData(userId, encryptedData) {
    try {
      await firestore.collection('users').doc(userId).update({
        encryptedProfile: encryptedData,
        updatedAt: new Date()
      });
    } catch (error) {
      throw new Error('Failed to store encrypted user data');
    }
  }

  // Get encrypted user data
  async getEncryptedUserData(userId) {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      if (userDoc.exists && userDoc.data().encryptedProfile) {
        return userDoc.data().encryptedProfile;
      }
      return null;
    } catch (error) {
      throw new Error('Failed to retrieve encrypted user data');
    }
  }
}

// Create singleton instance
const cryptoManager = new CryptoManager();

export default cryptoManager;