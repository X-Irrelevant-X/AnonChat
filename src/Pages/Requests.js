// src/Pages/Requests.js
import React, { useState, useEffect } from 'react';
import { auth, firestore } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import sessionManager from '../security/sessionManager';
import EncryptionService from '../security/encrydecry';
import '../Styles/requests.css';

const Requests = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load friend requests
  useEffect(() => {
    if (!user) return;

    const loadRequests = async () => {
      try {
        setLoading(true);
        
        // Check if session is active
        if (!sessionManager.isSessionActive()) {
          auth.signOut();
          navigate('/signin');
          return;
        }

        // Get pending friend requests where current user is the recipient (user2)
        const requestsQuery = await firestore
          .collection('friends')
          .where('user2', '==', user.uid)
          .where('status', '==', 'pending')
          .get();

        const requestList = [];
        
        for (const doc of requestsQuery.docs) {
          const requestData = doc.data();
          const requesterDoc = await firestore.collection('users').doc(requestData.user1).get();
          if (requesterDoc.exists) {
            requestList.push({
              id: doc.id,
              requesterId: requestData.user1,
              ...requesterDoc.data(),
              requestId: doc.id,
              createdAt: requestData.createdAt
            });
          }
        }
        
        setRequests(requestList);
      } catch (error) {
        console.error('Error loading requests:', error);
        alert('Failed to load requests: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, [user, navigate]);

  const handleAcceptRequest = async (request) => {
    try {
      // Get current user's public key
      const currentUserPublicKey = sessionManager.getPublicKey();
      const exportedCurrentUserPublicKey = await exportPublicKeyToString(currentUserPublicKey);
      
      // Get requester's public key from their user document
      const requesterDoc = await firestore.collection('users').doc(request.requesterId).get();
      if (!requesterDoc.exists) {
        throw new Error('Requester not found');
      }
      
      const requesterData = requesterDoc.data();
      const requesterPublicKey = requesterData.publicKey; // Already exported string
      
      // Update friendship status to accepted and store both public keys
      await firestore.collection('friends').doc(request.requestId).update({
        status: 'accepted',
        user1PublicKey: requesterPublicKey, // Requester's public key
        user2PublicKey: exportedCurrentUserPublicKey, // Current user's public key
        acceptedAt: new Date()
      });
      
      // Remove from requests list
      setRequests(requests.filter(r => r.id !== request.id));
      alert('Friend request accepted!');
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Failed to accept request: ' + error.message);
    }
  };

  const handleRejectRequest = async (request) => {
    if (window.confirm(`Reject friend request from ${request.username || request.email}?`)) {
      try {
        await firestore.collection('friends').doc(request.requestId).delete();
        setRequests(requests.filter(r => r.id !== request.id));
        alert('Friend request rejected');
      } catch (error) {
        console.error('Error rejecting request:', error);
        alert('Failed to reject request: ' + error.message);
      }
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

  const handleBack = () => {
    navigate('/userhome');
  };

  if (loading) {
    return (
      <div className="requests-container">
        <div className="requests-header">
          <button onClick={handleBack} className="back-button">← Back</button>
          <h1>Friend Requests</h1>
        </div>
        <div className="loading">Loading requests...</div>
      </div>
    );
  }

  return (
    <div className="requests-container">
      <div className="requests-header">
        <button onClick={handleBack} className="back-button">← Back</button>
        <h1>Friend Requests ({requests.length})</h1>
      </div>
      
      {requests.length === 0 ? (
        <div className="no-requests">
          <p>No pending friend requests.</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map(request => (
            <div key={request.id} className="request-item">
              <div className="requester-info">
                <div className="requester-avatar">
                  <span>{request.username?.charAt(0) || request.email?.charAt(0) || 'U'}</span>
                </div>
                <div className="requester-details">
                  <h3>{request.username || 'Unknown User'}</h3>
                  <p>{request.email}</p>
                  <p className="request-date">
                    Requested: {request.createdAt ? new Date(request.createdAt.toDate ? request.createdAt.toDate() : request.createdAt).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
              <div className="request-actions">
                <button 
                  onClick={() => handleAcceptRequest(request)}
                  className="action-button accept"
                >
                  Accept
                </button>
                <button 
                  onClick={() => handleRejectRequest(request)}
                  className="action-button reject"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Requests;