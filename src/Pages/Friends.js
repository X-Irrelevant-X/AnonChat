import { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import sessionManager from '../security/sessionManager';
import EncryptionService from '../security/encrydecry';
import '../Styles/friends.css';


const Friends = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load friends list
  useEffect(() => {
    if (!user) return;

    const loadFriends = async () => {
      try {
        setLoading(true);
        
        // Check if session is active
        if (!sessionManager.isSessionActive()) {
          auth.signOut();
          navigate('/signin');
          return;
        }

        // Get accepted friendships where user is either user1 or user2
        const friendsQuery1 = await firestore
          .collection('friends')
          .where('user1', '==', user.uid)
          .where('status', '==', 'accepted')
          .get();
          
        const friendsQuery2 = await firestore
          .collection('friends')
          .where('user2', '==', user.uid)
          .where('status', '==', 'accepted')
          .get();

        const friendList = [];
        
        // Process friends where current user is user1
        for (const doc of friendsQuery1.docs) {
          const friendData = doc.data();
          const friendUserDoc = await firestore.collection('users').doc(friendData.user2).get();
          if (friendUserDoc.exists) {
            friendList.push({
              id: doc.id,
              friendId: friendData.user2,
              ...friendUserDoc.data(),
              friendshipId: doc.id
            });
          }
        }
        
        // Process friends where current user is user2
        for (const doc of friendsQuery2.docs) {
          const friendData = doc.data();
          const friendUserDoc = await firestore.collection('users').doc(friendData.user1).get();
          if (friendUserDoc.exists) {
            friendList.push({
              id: doc.id,
              friendId: friendData.user1,
              ...friendUserDoc.data(),
              friendshipId: doc.id
            });
          }
        }
        
        setFriends(friendList);
      } catch (error) {
        console.error('Error loading friends:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFriends();
  }, [user, navigate]);

  const handleStartChat = async (friend) => {
    try {
      // Check if chat already exists
      const existingChatQuery = await firestore
        .collection('chats')
        .where('users', 'array-contains', user.uid)
        .get();
      
      let existingChat = null;
      existingChatQuery.forEach(doc => {
        const chatData = doc.data();
        if (chatData.users.includes(friend.friendId) && chatData.users.length === 2) {
          existingChat = { id: doc.id, ...chatData };
        }
      });

      if (existingChat) {
        // Chat exists, navigate to it
        navigate('/userhome', { state: { selectedChat: existingChat } });
      } else {
        // Create new chat
        const newChat = await firestore.collection('chats').add({
          users: [user.uid, friend.friendId],
          name: `${friend.username || friend.email}`,
          createdAt: new Date(),
          createdBy: user.uid
        });
        
        const chatDoc = await firestore.collection('chats').doc(newChat.id).get();
        navigate('/userhome', { state: { selectedChat: { id: newChat.id, ...chatDoc.data() } } });
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat: ' + error.message);
    }
  };

  const handleViewProfile = async (friend) => {
    try {
      setProfileLoading(true);
      setViewingProfile(friend);
      
      // Get private key from session for decryption
      const privateKey = sessionManager.getPrivateKey();
      
      // Load friend's profile data
      const friendDoc = await firestore.collection('users').doc(friend.friendId).get();
      if (friendDoc.exists) {
        const encryptedData = friendDoc.data();
        
        // Decrypt profile data if it exists
        let decryptedProfile = {};
        if (encryptedData.encryptedProfile) {
          decryptedProfile = await EncryptionService.decryptUserProfileData(
            encryptedData.encryptedProfile,
            privateKey
          );
        }
        
        setProfileData({
          ...encryptedData,
          ...decryptedProfile
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      alert('Failed to load profile: ' + error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleCloseProfile = () => {
    setViewingProfile(null);
    setProfileData(null);
  };

  const handleUnfriend = async (friend) => {
    if (window.confirm(`Are you sure you want to unfriend ${friend.username || friend.email}?`)) {
      try {
        await firestore.collection('friends').doc(friend.friendshipId).delete();
        setFriends(friends.filter(f => f.id !== friend.id));
        if (viewingProfile && viewingProfile.id === friend.id) {
          handleCloseProfile();
        }
        alert('Friend removed successfully');
      } catch (error) {
        console.error('Error unfriending:', error);
        alert('Failed to unfriend: ' + error.message);
      }
    }
  };

  const handleBack = () => {
    navigate('/userhome');
  };

  if (loading) {
    return (
      <div className="friends-container">
        <div className="friends-header">
          <button onClick={handleBack} className="back-button">← Back</button>
          <h1>Friends</h1>
        </div>
        <div className="loading">Loading friends...</div>
      </div>
    );
  }

  return (
    <div className="friends-container">
      <div className="friends-header">
        <button onClick={handleBack} className="back-button">← Back</button>
        <h1>Friends ({friends.length})</h1>
      </div>
      
      {viewingProfile ? (
        <div className="profile-view-container">
          <div className="profile-view-header">
            <button onClick={handleCloseProfile} className="back-button">← Back</button>
            <h2>Friend Profile</h2>
          </div>
          
          {profileLoading ? (
            <div className="profile-loading">Loading profile...</div>
          ) : profileData ? (
            <div className="friend-profile-card">
              <div className="profile-header-section">
                <div className="profile-avatar">
                  <span className="avatar-initials">
                    {profileData?.firstName?.charAt(0) || profileData?.username?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="profile-basic-info">
                  <h2>{profileData?.username || 'Anonymous'}</h2>
                  <p className="profile-email">{profileData?.email}</p>
                </div>
              </div>

              <div className="profile-view-content">
                <div className="profile-field">
                  <label>Name:</label>
                  <span>{`${profileData?.firstName || ''} ${profileData?.lastName || ''}`.trim() || 'Not set'}</span>
                </div>

                <div className="profile-field">
                  <label>Gender:</label>
                  <span>{profileData?.gender || 'Not set'}</span>
                </div>

                <div className="profile-field">
                  <label>Birthday:</label>
                  <span>{profileData?.birthday ? new Date(profileData.birthday).toLocaleDateString() : 'Not set'}</span>
                </div>

                <div className="profile-field">
                  <label>Member Since:</label>
                  <span>{profileData?.createdAt ? new Date(profileData.createdAt.toDate ? profileData.createdAt.toDate() : profileData.createdAt).toLocaleDateString() : 'Unknown'}</span>
                </div>

                <div className="profile-view-actions">
                  <button onClick={() => handleStartChat(viewingProfile)} className="primary-button">
                    Start Chat
                  </button>
                  <button onClick={() => handleUnfriend(viewingProfile)} className="danger-button">
                    Unfriend
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="profile-error">Failed to load profile data</div>
          )}
        </div>
      ) : friends.length === 0 ? (
        <div className="no-friends">
          <p>You don't have any friends yet.</p>
          <button onClick={() => navigate('/userhome')} className="add-friends-button">
            Add Friends
          </button>
        </div>
      ) : (
        <div className="friends-list">
          {friends.map(friend => (
            <div key={friend.id} className="friend-item">
              <div className="friend-info" onClick={() => handleStartChat(friend)}>
                <div className="friend-avatar">
                  <span>{friend.username?.charAt(0) || friend.email?.charAt(0) || 'U'}</span>
                </div>
                <div className="friend-details">
                  <h3>{friend.username || 'Unknown User'}</h3>
                  <p>{friend.email}</p>
                </div>
              </div>
              <div className="friend-actions">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewProfile(friend);
                  }}
                  className="action-button view-profile"
                >
                  View Profile
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnfriend(friend);
                  }}
                  className="action-button unfriend"
                >
                  Unfriend
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Friends;