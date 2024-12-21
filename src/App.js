import React, { useRef, useState } from 'react';
import './App.css';

import { firebase, auth, firestore } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollectionData } from 'react-firebase-hooks/firestore';

import { SignUp, SignIn, SignOut } from './Pages/auth';

function App() {
  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px' }}>
        <h1 style={{ margin: '0 auto', textAlign: 'center' }}>⚛️🔥AnonChat🔥⚛️</h1>
        <SignOut />
      </header>

      <section>
        {user ? (
          <ChatRoom />
        ) : (
          <>
            <SignUp />
            <SignIn />
          </>
        )}
      </section>
    </div>
  );
}

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
    dummy.current.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <main>
        {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
        <span ref={dummy}></span>
      </main>

      <form onSubmit={sendMessage}>
        <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="say something nice" />
        <button type="submit" disabled={!formValue}>🕊️</button>
      </form>
    </>
  );
}

function ChatMessage(props) {
  const { text, uid } = props.message;
  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (
    <div className={`message ${messageClass}`}>
      <p>{text}</p>
    </div>
  );
}

export default App;
