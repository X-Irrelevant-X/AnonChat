import React, { useState } from 'react';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import sessionManager from '../security/sessionManager'; 
import '../Styles/auth.css';

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      
      await sessionManager.startSession(userCredential.user.uid, password);
      
      navigate('/userhome');
    } catch (err) {
      // Better error handling
      if (err.code === 'auth/user-not-found') {
        setError("No account found with this email.");
      } else if (err.code === 'auth/wrong-password') {
        setError("Incorrect password.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address.");
      } else {
        setError("Login failed: " + err.message);
      }
    }
  };

  return (
    <div className="auth-form-container">
      <header>
        <h1>🔥 AnonChat 🔥</h1>
      </header>

      <h1>Log In</h1>

      <form className="auth-form" onSubmit={handleSignIn}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className="auth-input"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
          className="auth-input"
        />
        <button type="submit" className="auth-button">Sign In</button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
}

export function SignOut() {
  return auth.currentUser && (
    <button className="sign-out-btn" onClick={() => {
      sessionManager.endSession();
      auth.signOut();
    }}>
      Sign Out
    </button>
  );
}