import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link, useNavigate } from 'react-router-dom';
import EncryptionService from '../security/encrydecry';
import keyManager from '../security/keymanage';
import '../Styles/user.css';

function UserHome() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [decryptedProfile, setDecryptedProfile] = useState(null);

  // Load and decrypt user's profile data
  useEffect(() => {
    if (!user) return;

    const loadAndDecryptUserProfile = async () => {
      try {
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          const encryptedData = userDoc.data();
          
          // Prompt user for password to decrypt their data
          const password = prompt("Enter your password to view profile:");
          if (!password) {
            throw new Error("Password required to decrypt profile");
          }
          
          // Load user's keys using their password
          const userKeys = await keyManager.loadUserKeys(user.uid, password);
          
          // Decrypt profile data if it exists
          if (encryptedData.encryptedProfile) {
            const decryptedData = await EncryptionService.decryptUserProfileData(
              encryptedData.encryptedProfile,
              userKeys.privateKey
            );
            
            setDecryptedProfile(decryptedData);
            setUserProfile({
              ...encryptedData,
              ...decryptedData
            });
          } else {
            setUserProfile(encryptedData);
          }
        }
      } catch (err) {
        console.error('Failed to load/decrypt user profile:', err);
        alert('Failed to load profile: ' + err.message);
      }
    };

    loadAndDecryptUserProfile();
  }, [user]);

  const handleAddFriend = () => {
    alert("Add Friend feature coming soon!");
  };

  const handleSearch = () => {
    alert("Search Users feature coming soon!");
  };

  const handleSignOut = () => {
    auth.signOut();
    navigate('/');
  };

  return (
    <div className="user-home-container">
      {/* Header */}
      <header className="user-header">
        <div className="user-profile">
          <Link to="/profile" className="user-name">
            {decryptedProfile?.username || userProfile?.username || user?.email?.split('@')[0] || 'Anonymous'}
          </Link>
        </div>
        <div className="app-title">
          <h1>🔥 AnonChat 🔥</h1>
        </div>
        <div className="header-buttons">
          <button onClick={handleAddFriend} className="header-button">Add Friends</button>
          <button onClick={handleSearch} className="header-button">Search Users</button>
          <button onClick={handleSignOut} className="header-button">Sign Out</button>
        </div>
      </header>

      <div className="user-content">
        {/* Main Content Area - Empty for now */}
        <main className="main-panel">
          <div className="welcome-container">
            <h2>Welcome to AnonChat</h2>
            <p>Select an option from the header to get started:</p>
            <ul>
              <li><strong>Add Friends</strong> - Connect with other users</li>
              <li><strong>Search Users</strong> - Find people to chat with</li>
              <li><strong>Profile</strong> - View and edit your information</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}

export default UserHome;