import { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import sessionManager from '../security/sessionManager';
import EncryptionService from '../security/encrydecry';
import '../Styles/profile_s.css';

const Profile = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  // const [isChangingPassword, setIsChangingPassword] = useState(false); // Commented out
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  /* 
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  */ // Commented out
  const [deletePassword, setDeletePassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load and decrypt user data
  useEffect(() => {
    if (!user) return;

    const loadAndDecryptUserData = async () => {
      try {
        setLoading(true);
        
        // Check if session is active
        if (!sessionManager.isSessionActive()) {
          auth.signOut();
          navigate('/signin');
          return;
        }
        
        // Get private key from session
        const privateKey = sessionManager.getPrivateKey();
        
        // Get user document from Firestore
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        
        if (userDoc.exists) {
          const encryptedData = userDoc.data();
          
          // Decrypt profile data
          let decryptedProfile = {};
          if (encryptedData.encryptedProfile) {
            decryptedProfile = await EncryptionService.decryptUserProfileData(
              encryptedData.encryptedProfile,
              privateKey
            );
          }
          
          // Combine decrypted data with non-sensitive data
          const fullUserData = {
            ...encryptedData,
            ...decryptedProfile
          };
          
          setUserData(fullUserData);
        }
      } catch (err) {
        console.error('Failed to load/decrypt profile ', err);
        sessionManager.endSession();
        auth.signOut();
        navigate('/signin');
      } finally {
        setLoading(false);
      }
    };

    loadAndDecryptUserData();
  }, [user, navigate]);

  /*
  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };
  */ // Commented out

  const handleDeletePasswordChange = (e) => {
    setDeletePassword(e.target.value);
  };

  /*
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Re-authenticate using your session manager
      await sessionManager.reauthenticate(user.uid, passwordData.oldPassword);

      // Check if new passwords match
      if (passwordData.newPassword !== passwordData.confirmNewPassword) {
        throw new Error("New passwords do not match");
      }

      // Check password strength
      const passwordValidations = {
        length: passwordData.newPassword.length >= 8,
        uppercase: /[A-Z]/.test(passwordData.newPassword),
        lowercase: /[a-z]/.test(passwordData.newPassword),
        number: /[0-9]/.test(passwordData.newPassword),
        special: /[!@#$%^&*()_+-={};:|<>?]/.test(passwordData.newPassword)
      };
      
      const isPasswordValid = Object.values(passwordValidations).every(Boolean);
      if (!isPasswordValid) {
        throw new Error("New password must meet complexity requirements");
      }

      // Update password
      await user.updatePassword(passwordData.newPassword);
      
      // Restart session with new password
      await sessionManager.startSession(user.uid, passwordData.newPassword);
      
      setPasswordData({
        oldPassword: '',
        newPassword: '',
        confirmNewPassword: ''
      });
      setIsChangingPassword(false);
      alert('Password changed successfully!');
    } catch (err) {
      setError('Failed to change password: ' + err.message);
    } finally {
      setLoading(false);
    }
  };
  */ // Commented out

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Re-authenticate using your session manager
      await sessionManager.reauthenticate(user.uid, deletePassword);

      // Delete user data from Firestore
      await firestore.collection('users').doc(user.uid).delete();
      
      // Delete user account from Firebase Auth
      await user.delete();
      
      // End session
      sessionManager.endSession();
      
      alert('Account deleted successfully');
      navigate('/');
    } catch (err) {
      console.error('Delete account error:', err);
      if (err.code === 'auth/wrong-password') {
        setError('Incorrect password. Please try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Failed to delete account: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleuserhome = () => {
    navigate('/userhome');
  };

  const handleSignOut = () => {
    sessionManager.endSession(); // End session using your session manager
    auth.signOut();
    navigate('/');
  };

  if (loading && !userData) {
    return (
      <div className="profile-container">
        <div className="profile-content">
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="profile-content">
          <p className="error-message">{error}</p>
          <button onClick={() => setError(null)} className="secondary-button">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-content">
        <div className="profile-header">
          <h1 className='profile-title'>🔥 AnonChat 🔥</h1>
          <div className="profile-actions">
            <button onClick={handleuserhome} className="secondary-button">
              Home
            </button>
            <button onClick={handleSignOut} className="secondary-button">
              Sign Out
            </button>
          </div>
        </div>

        <div className="profile-card">
          <div className="profile-header-section">
            <div className="profile-avatar">
              <span className="avatar-initials">
                {userData?.firstName?.charAt(0) || userData?.username?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="profile-basic-info">
              <h2>{userData?.username || 'Anonymous'}</h2>
              <p className="profile-email">{userData?.email}</p>
            </div>
          </div>

          {/* 
          {!isChangingPassword && 
          */} {/* Commented out */}
          {!showDeleteConfirm ? (
            <div className="profile-view">
              <div className="profile-field">
                <label>Username:</label>
                <span>{userData?.username || 'Not set'}</span>
              </div>

              <div className="profile-field">
                <label>Name:</label>
                <span>{`${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Not set'}</span>
              </div>

              <div className="profile-field">
                <label>Gender:</label>
                <span>{userData?.gender || 'Not set'}</span>
              </div>

              <div className="profile-field">
                <label>Birthday:</label>
                <span>{userData?.birthday ? new Date(userData.birthday).toLocaleDateString() : 'Not set'}</span>
              </div>

              <div className="profile-field">
                <label>Member Since:</label>
                <span>{userData?.createdAt ? new Date(userData.createdAt.toDate ? userData.createdAt.toDate() : userData.createdAt).toLocaleDateString() : 'Unknown'}</span>
              </div>

              <div className="profile-buttons">
                {/* 
                <button onClick={() => setIsChangingPassword(true)} className="secondary-button">
                  Change Password
                </button>
                */} {/* Commented out */}
                <button onClick={() => setShowDeleteConfirm(true)} className="danger-button">
                  Delete Account
                </button>
              </div>
            </div>
          ) : null}

          {/* Change Password Form */}
          {/* 
          {isChangingPassword && (
            <form onSubmit={handleChangePassword} className="profile-edit">
              <h3>Change Password</h3>
              
              <div className="form-group">
                <label>Current Password:</label>
                <input
                  type="password"
                  name="oldPassword"
                  value={passwordData.oldPassword}
                  onChange={handlePasswordChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label>New Password:</label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="form-input"
                  required
                />
                <div className="password-hint">
                  Password must contain at least 8 characters, including uppercase, lowercase, number, and special character
                </div>
              </div>

              <div className="form-group">
                <label>Confirm New Password:</label>
                <input
                  type="password"
                  name="confirmNewPassword"
                  value={passwordData.confirmNewPassword}
                  onChange={handlePasswordChange}
                  className="form-input"
                  required
                />
              </div>

              <div className="profile-buttons">
                <button type="submit" className="primary-button" disabled={loading}>
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({
                      oldPassword: '',
                      newPassword: '',
                      confirmNewPassword: ''
                    });
                  }} 
                  className="secondary-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
          */} {/* Commented out */}

          {/* Delete Account Form */}
          {showDeleteConfirm && (
            <form onSubmit={handleDeleteAccount} className="profile-edit">
              <h3>Delete Account</h3>
              <p className="warning-text">Warning: This action cannot be undone. All your data will be permanently deleted.</p>
              
              <div className="form-group">
                <label>Enter your password to confirm:</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={handleDeletePasswordChange}
                  className="form-input"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <div className="profile-buttons">
                <button type="submit" className="danger-button" disabled={loading}>
                  {loading ? 'Deleting...' : 'Delete Account'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                  }} 
                  className="secondary-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;