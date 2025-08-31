
import React, { useState, useEffect } from 'react';
import { firebase, auth, firestore } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Link, useNavigate } from 'react-router-dom';
import '../Styles/user.css';


function UserHome() {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

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

  const handleChatClick = (chat) => {
    setSelectedChat(chat);
  };

  const handleAddFriend = () => {
    
  };

  const handleSearch = () => {
    
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
            {user?.email?.split('@')[0] || 'Anonymous'}
          </Link>
        </div>
        <div className="header-buttons">
          <button onClick={handleAddFriend} className="header-button">Add Friends</button>
          <button onClick={handleSearch} className="header-button">Search Users</button>
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
          {selectedChat ? (
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
      <div className="chat-header">
        <h2>{chat.name || 'Chat'}</h2>
        <div className="chat-notifications">
          <span>New Message from John Doe</span>
          <span>New Message from John Doe</span>
        </div>
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