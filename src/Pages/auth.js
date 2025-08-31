import React, { useState } from 'react';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import '../Styles/auth.css';

export function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await auth.createUserWithEmailAndPassword(email, password);
      alert("Account created successfully!");
      navigate('/chat');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-form-container">
      <header>
        <h1>⚛️🔥 AnonChat 🔥⚛️</h1>
      </header>

      <h1>Sign Up</h1>
      
      <form className="auth-form" onSubmit={handleSignUp}>
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
        <button type="submit" className="auth-button">Sign Up</button>
        {error && <p className="error-message">{error}</p>}
      </form>
    </div>
  );
}

export function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await auth.signInWithEmailAndPassword(email, password);
      alert("Signed in successfully!");
      navigate('/chat');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-form-container">
      <header>
        <h1>⚛️🔥 AnonChat 🔥⚛️</h1>
      </header>

      <h1>Sign In</h1>

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
    <button className="sign-out-btn" onClick={() => auth.signOut()}>
      Sign Out
    </button>
  );
}