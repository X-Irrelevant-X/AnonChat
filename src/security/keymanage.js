import { firestore } from '../firebase';
import cryptoManager from '../security/crypto';

class KeyManager {
  constructor() {
    this.crypto = cryptoManager;
  }

  async initializeUserKeys(userId, password) {
    try {
      const keyPair = await this.crypto.generateKeyPair();
      
      const publicKeyString = await this.crypto.exportPublicKey(keyPair.publicKey);
      
      const encryptedPrivateKey = await this.crypto.encryptPrivateKeyWithPassword(
        keyPair.privateKey, 
        password
      );

      await firestore.collection('users').doc(userId).set({
        publicKey: publicKeyString, 
        encryptedPrivateKey: encryptedPrivateKey,
        keyCreatedAt: new Date()
      }, { merge: true });

      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      };
    } catch (error) {
      throw new Error('Failed to initialize user keys: ' + error.message);
    }
  }

  async loadUserKeys(userId, password) {
    try {
      const userData = await this.crypto.getUserKeys(userId);
      
      if (!userData || !userData.encryptedPrivateKey) {
        throw new Error('User keys not found');
      }

      const privateKey = await this.crypto.decryptPrivateKeyWithPassword(
        userData.encryptedPrivateKey.encryptedKey,
        userData.encryptedPrivateKey.iv,
        password
      );

      const publicKey = await this.crypto.importPublicKey(userData.publicKey);

      return {
        publicKey,
        privateKey
      };
    } catch (error) {
      throw new Error('Failed to load user keys: ' + error.message);
    }
  }

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

  async rotateUserKeys(userId, currentPassword) {
    try {
      await this.loadUserKeys(userId, currentPassword);
      
      const newKeyPair = await this.crypto.generateKeyPair();
      
      const newPublicKeyString = await this.crypto.exportPublicKey(newKeyPair.publicKey);
      
      const newEncryptedPrivateKey = await this.crypto.encryptPrivateKeyWithPassword(
        newKeyPair.privateKey,
        currentPassword
      );

      await firestore.collection('users').doc(userId).set({
        publicKey: newPublicKeyString,
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


const keyManager = new KeyManager();

export default keyManager;