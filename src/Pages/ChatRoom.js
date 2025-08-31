import React, { useRef, useState, useEffect } from 'react';
import { firebase, auth, firestore } from '../firebase';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { SignOut } from './auth';
import '../Styles/ChatRoom.css';

function ChatRoom() {
  const dummy = useRef();
  const messagesRef = firestore.collection('messages');
  const query = messagesRef.orderBy('createdAt').limit(25);

  const [messages] = useCollectionData(query, { idField: 'id' });
  const [formValue, setFormValue] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    await messagesRef.add({
      text: formValue,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid,
      photoURL
    });

    setFormValue('');
    dummy.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    dummy.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>⚛️🔥 AnonChat 🔥⚛️</h1>
        <SignOut />
      </header>

      <main className="chat-messages">
        {messages && messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <span ref={dummy}></span>
      </main>

      <form className="chat-form" onSubmit={sendMessage}>
        <input
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="say something nice"
        />
        <button type="submit" disabled={!formValue}>🕊️</button>
      </form>
    </div>
  );
}

function ChatMessage({ message }) {
  const { text, uid, createdAt } = message;
  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';
  
  // Format timestamp as "X minutes ago", "Yesterday", etc.
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / 60000);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hour${Math.floor(diffInMinutes / 60) !== 1 ? 's' : ''} ago`;
    if (date.toDateString() === now.toDateString()) return 'Today';
    if (date.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`message-container ${messageClass}`}>
      <div className={`message-bubble ${messageClass}`}>
        <div className="message-text">{text}</div>
      </div>
      <div className={`message-timestamp ${messageClass}`}>
        {formatTimeAgo(createdAt)}
      </div>
    </div>
  );
}

export default ChatRoom;