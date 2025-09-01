// src/Pages/Register.js
import React, { useState } from 'react';
import { auth, firestore } from '../firebase';
import { useNavigate } from 'react-router-dom';
import EncryptionService from '../security/encrydecry';
import keyManager from '../security/keymanage'; 
import '../Styles/Register_s.css';

const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    firstName: '',
    lastName: '',
    gender: '',
    birthday: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Enhanced password validation
  const validatePassword = (password) => {
    const validations = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*()_+-={};:|<>?]/.test(password)
    };
    
    return validations;
  };

  const getPasswordErrorMessage = (validations) => {
    const errors = [];
    if (!validations.length) errors.push("at least 8 characters");
    if (!validations.uppercase) errors.push("uppercase letter");
    if (!validations.lowercase) errors.push("lowercase letter");
    if (!validations.number) errors.push("number");
    if (!validations.special) errors.push("special character (!@#$%^&*()_+-={};:|<>?)");
    
    return `Password must include: ${errors.join(", ")}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Check if passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Enhanced password validation
    const passwordValidations = validatePassword(formData.password);
    const isPasswordValid = Object.values(passwordValidations).every(Boolean);
    
    if (!isPasswordValid) {
      setError(getPasswordErrorMessage(passwordValidations));
      setLoading(false);
      return;
    }

    try {
      // Create user account with Firebase Authentication
      const userCredential = await auth.createUserWithEmailAndPassword(
        formData.email,
        formData.password
      );

      // Create initial user document in Firestore
      await firestore.collection('users').doc(userCredential.user.uid).set({
        uid: userCredential.user.uid,
        email: formData.email,
        createdAt: new Date(),
        lastSeen: new Date()
      });

      // Initialize user's encryption keys
      const userKeys = await keyManager.initializeUserKeys(
        userCredential.user.uid, 
        formData.password
      );

      // Prepare user profile data for encryption
      const userProfile = {
        username: formData.username || formData.email.split('@')[0],
        firstName: formData.firstName || '',
        lastName: formData.lastName || '',
        gender: formData.gender || '',
        birthday: formData.birthday || '',
        email: formData.email
      };

      // Encrypt user profile data with user's own public key
      const encryptedProfile = await EncryptionService.encryptUserProfileData(
        userProfile,
        userKeys.publicKey // Encrypt with user's own public key
      );

      // Update user document with encrypted profile
      await firestore.collection('users').doc(userCredential.user.uid).update({
        encryptedProfile: encryptedProfile // Store encrypted profile
      });

      alert("Account created successfully!");
      navigate('/userhome');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError("Email already in use. Please try a different email.");
      } else if (err.code === 'auth/invalid-email') {
        setError("Invalid email address.");
      } else if (err.message.includes('encryption')) {
        setError("Failed to encrypt profile data. Please try again.");
      } else {
        setError("Registration failed: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-form">
        <h1 className="register-title">🔥 AnonChat 🔥</h1>
        <h2>Create Account</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              required
              className="form-input"
            />
            <div className="password-hint">
              Password must contain at least 8 characters, including uppercase, lowercase, number, and special character
            </div>
          </div>

          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Username"
              required
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="First Name"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Last Name"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <select
                name="gender"
                value={formData.gender}
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
              <input
                type="date"
                name="birthday"
                value={formData.birthday}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>

          {error && <p className="error-message">{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default Register;