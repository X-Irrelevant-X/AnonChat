import { useState, useEffect } from 'react';
import { firebase, auth, firestore } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link, useNavigate } from 'react-router-dom';
import sessionManager from '../security/sessionManager';
import EncryptionService from '../security/encrydecry';
import '../Styles/user.css';


function UserHome() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState(null);
  const [decryptedProfile, setDecryptedProfile] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Load and decrypt user's profile data using session manager
  useEffect(() => {
    if (!user) return;

    const loadAndDecryptUserProfile = async () => {
      try {
        setLoading(true);
        
        // Check if session is active
        if (!sessionManager.isSessionActive()) {
          // No active session, redirect to login
          auth.signOut();
          navigate('/signin');
          return;
        }
        
        // Get private key from session
        const privateKey = sessionManager.getPrivateKey();
        
        // Load user document from Firestore
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
          const encryptedData = userDoc.data();
          
          // Decrypt profile data if it exists
          if (encryptedData.encryptedProfile) {
            const decryptedData = await EncryptionService.decryptUserProfileData(
              encryptedData.encryptedProfile,
              privateKey
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
        sessionManager.endSession(); // End invalid session
        auth.signOut();
        navigate('/signin');
      } finally {
        setLoading(false);
      }
    };

    loadAndDecryptUserProfile();
  }, [user, navigate]);

  // Load user's chats from Firestore
  useEffect(() => {
    if (!user) return;

    const chatsRef = firestore.collection('chats').where('users', 'array-contains', user.uid);
    const unsubscribe = chatsRef.onSnapshot(snapshot => {
      const chatList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChats(chatList);
    });

    return () => unsubscribe();
  }, [user]);

  // Load pending requests count
  useEffect(() => {
    if (!user) return;

    const requestsRef = firestore
      .collection('friends')
      .where('user2', '==', user.uid)
      .where('status', '==', 'pending');
      
    const unsubscribe = requestsRef.onSnapshot(snapshot => {
      setPendingRequests(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  const handleChatClick = (chat) => {
    setSelectedChat(chat);
    setShowAddFriend(false); // Hide add friend panel when selecting chat
  };

  // Search for users by username or email
  const handleSearchUsers = async () => {
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    try {
      // Search by username
      const usernameQuery = await firestore
        .collection('users')
        .where('encryptedProfile.username', '==', searchTerm)
        .get();
      
      // Search by email (partial match)
      const emailQuery = await firestore
        .collection('users')
        .where('email', '>=', searchTerm)
        .where('email', '<=', searchTerm + '\uf8ff')
        .get();
      
      const results = [];
      
      // Process username matches
      usernameQuery.forEach(doc => {
        if (doc.id !== user.uid) { // Don't show current user
          results.push({
            id: doc.id,
            ...doc.data()
          });
        }
      });
      
      // Process email matches
      emailQuery.forEach(doc => {
        if (doc.id !== user.uid) { // Don't show current user
          const exists = results.find(r => r.id === doc.id);
          if (!exists) {
            results.push({
              id: doc.id,
              ...doc.data()
            });
          }
        }
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed: ' + error.message);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (friendId) => {
    try {
      // Check if friend request already exists
      const existingRequest1 = await firestore
        .collection('friends')
        .where('user1', '==', user.uid)
        .where('user2', '==', friendId)
        .get();
        
      const existingRequest2 = await firestore
        .collection('friends')
        .where('user1', '==', friendId)
        .where('user2', '==', user.uid)
        .get();
        
      if (!existingRequest1.empty || !existingRequest2.empty) {
        alert('Friend request already sent or you are already friends');
        return;
      }
      
      // Get current user's public key from session
      const currentUserPublicKey = sessionManager.getPublicKey();
      const exportedCurrentUserPublicKey = await exportPublicKeyToString(currentUserPublicKey);
      
      // Get current user's profile data (decrypted with their own private key)
      const userDoc = await firestore.collection('users').doc(user.uid).get();
      const userData = userDoc.data();
      
      // Decrypt current user's profile with their own private key
      const privateKey = sessionManager.getPrivateKey();
      let currentUserProfile = {};
      if (userData.encryptedProfile) {
        currentUserProfile = await EncryptionService.decryptUserProfileData(
          userData.encryptedProfile,
          privateKey
        );
      }
      
      // Create friend request with current user's profile info
      await firestore.collection('friends').add({
        user1: user.uid, // Requester
        user2: friendId, // Request recipient
        user1PublicKey: exportedCurrentUserPublicKey, // Requester's public key
        user1Username: currentUserProfile.username || userData.email.split('@')[0], // Requester's username
        user1Email: userData.email, // Requester's email
        user1FirstName: currentUserProfile.firstName || '', // Requester's first name
        user1LastName: currentUserProfile.lastName || '', // Requester's last name
        user1Birthday: currentUserProfile.birthday || '', // Requester's birthday
        user1Gender: currentUserProfile.gender || '', // Requester's gender
        
        createdAt: new Date(),
        status: 'pending'
      });
      
      alert('Friend request sent successfully!');
      setSearchResults([]); // Clear search results
      setSearchTerm(''); // Clear search term
      setShowAddFriend(false); // Hide add friend panel
    } catch (error) {
      console.error('Add friend error:', error);
      alert('Failed to send friend request: ' + error.message);
    }
  };

  // Helper function to export public key to string
  const exportPublicKeyToString = async (key) => {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return arrayBufferToBase64(exported);
  };

  // Helper function to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const handleFriends = () => {
    navigate('/friends');
  };

  const handleRequests = () => {
    navigate('/requests');
  };

  const handleToggleAddFriend = () => {
    setShowAddFriend(!showAddFriend);
    setSelectedChat(null); // Hide chat view when showing add friend
  };

  const handleSignOut = () => {
    sessionManager.endSession(); // End session using your session manager
    auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="user-home-container">
        <div className="loading-message">
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

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
          <button onClick={handleFriends} className="header-button">Friends</button>
          <button onClick={handleRequests} className="header-button">
            Requests {pendingRequests > 0 && `(${pendingRequests})`}
          </button>
          <button onClick={handleToggleAddFriend} className="header-button">
            {showAddFriend ? 'Close' : 'Add Friends'}
          </button>
          <button onClick={handleSignOut} className="header-button">Sign Out</button>
        </div>
      </header>

      <div className="user-content">
        {/* Sidebar */}
        <aside className="sidebar">
          <h3>My Chats</h3>
          <ul className="chats-list">
            {chats.map(chat => (
              <li key={chat.id} className="chat-item" onClick={() => handleChatClick(chat)}>
                <div className="chat-header">
                  <h4>{chat.name || 'Unnamed Chat'}</h4>
                  <p>{chat.lastMessage?.text || 'No messages'}</p>
                </div>
                <div className="chat-meta">
                  <span>{chat.lastMessage?.createdAt ? new Date(chat.lastMessage.createdAt.toDate ? chat.lastMessage.createdAt.toDate() : chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Main Panel */}
        <main className="main-panel">
          {showAddFriend ? (
            <div className="add-friend-panel">
              <div className="add-friend-container">
                <h2>Add Friends</h2>
                <div className="search-container">
                  <div className="search-input-group">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Enter username or email"
                      className="search-input"
                      onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
                    />
                    <button onClick={handleSearchUsers} disabled={searching} className="search-button">
                      {searching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>
                
                <div className="search-results">
                  {searchResults.length > 0 ? (
                    <div className="results-container">
                      <h3>Search Results</h3>
                      <ul className="results-list">
                        {searchResults.map(user => (
                          <li key={user.id} className="result-item">
                            <div className="user-info">
                              <div className="user-avatar">
                                <span>{user.email?.charAt(0).toUpperCase() || 'U'}</span>
                              </div>
                              <div className="user-details">
                                <span className="user-name">{user.email}</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleAddFriend(user.id)}
                              className="add-button"
                            >
                              Add Friend
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : searchTerm && !searching ? (
                    <div className="no-results">
                      <p>No users found</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : selectedChat ? (
            <ChatView chat={selectedChat} />
          ) : (
            <div className="empty-state">
              <h2>Select a chat to start messaging</h2>
              <p>Click on a chat in the sidebar to open it.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ChatView({ chat }) {
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');

  // Load messages for selected chat
  useEffect(() => {
    const messagesRef = firestore.collection(`chats/${chat.id}/messages`);
    const unsubscribe = messagesRef.orderBy('createdAt').onSnapshot(snapshot => {
      const msgList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgList);
    });

    return () => unsubscribe();
  }, [chat]);

  const sendMessage = async (e) => {
    e.preventDefault();

    await firestore.collection(`chats/${chat.id}/messages`).add({
      text: formValue,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid: auth.currentUser.uid,
      photoURL: auth.currentUser.photoURL
    });

    setFormValue('');
  };

  return (
    <div className="chat-view">
      <div className="chat-header" textAlign="center">
        <h2>{chat.name || 'Chat'}</h2>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.uid === auth.currentUser.uid ? 'sent' : 'received'}`}>
            <p>{msg.text}</p>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="chat-form">
        <input
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="Enter a message"
        />
        <button type="submit" disabled={!formValue}>🕊️</button>
      </form>
    </div>
  );
}

export default UserHome;