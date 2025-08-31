import React, { firebase, useState, useEffect } from 'react';
import { auth, firestore } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import '../Styles/profile_s.css';

const Profile = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({});
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [deletePassword, setDeletePassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user data
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          setUserData(data);
          // Don't include username in form data to prevent editing
          const { username, ...editableData } = data;
          setFormData(editableData);
        }
      } catch (err) {
        setError('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleDeletePasswordChange = (e) => {
    setDeletePassword(e.target.value);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await firestore.collection('users').doc(user.uid).update({
        ...formData,
        updatedAt: new Date()
      });
      
      // Keep the username from the original userData when updating local state
      setUserData({...userData, ...formData});
      setIsEditing(false);
      alert('Profile updated successfully!');
    } catch (err) {
      setError('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Re-authenticate user
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        passwordData.oldPassword
      );
      await user.reauthenticateWithCredential(credential);

      // Check if new passwords match
      if (passwordData.newPassword !== passwordData.confirmNewPassword) {
        throw new Error("New passwords do not match");
      }

      // Check password strength
      if (passwordData.newPassword.length < 6) {
        throw new Error("New password must be at least 6 characters long");
      }

      // Update password
      await user.updatePassword(passwordData.newPassword);
      
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

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Re-authenticate user with password
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        deletePassword
      );
      await user.reauthenticateWithCredential(credential);

      // Delete user data from Firestore
      await firestore.collection('users').doc(user.uid).delete();
      
      // Delete user account from Firebase Auth
      await user.delete();
      
      alert('Account deleted successfully');
      navigate('/');
    } catch (err) {
      setError('Failed to delete account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleuserhome = () => {
    navigate('/userhome');
  };

  const handleSignOut = () => {
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

          {!isEditing && !isChangingPassword && !showDeleteConfirm ? (
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
                <button onClick={() => setIsEditing(true)} className="primary-button">
                  Edit Profile
                </button>
                <button onClick={() => setIsChangingPassword(true)} className="secondary-button">
                  Change Password
                </button>
                <button onClick={() => setShowDeleteConfirm(true)} className="danger-button">
                  Delete Account
                </button>
              </div>
            </div>
          ) : null}

          {/* Edit Profile Form */}
          {isEditing && (
            <form onSubmit={handleSave} className="profile-edit">
              <div className="form-group">
                <label>Username:</label>
                <input
                  type="text"
                  value={userData?.username || ''}
                  className="form-input"
                  disabled
                  readOnly
                />
                <p className="form-help-text">Username cannot be changed</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name:</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName || ''}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Last Name:</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName || ''}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Gender:</label>
                  <select
                    name="gender"
                    value={formData.gender || ''}
                    onChange={handleChange}
                    className="form-input"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not-to-say">Prefer not to say</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Birthday:</label>
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday || ''}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="profile-buttons">
                <button type="submit" className="primary-button" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form data but keep the username from userData
                    const { username, ...editableData } = userData;
                    setFormData(editableData);
                  }} 
                  className="secondary-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Change Password Form */}
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