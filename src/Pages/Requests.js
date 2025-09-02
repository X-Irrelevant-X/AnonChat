import { useState, useEffect } from 'react';
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
          
          // Get requester's user document to get their profile info
          const requesterDoc = await firestore.collection('users').doc(requestData.user1).get();
          if (requesterDoc.exists) {
            
            // Extract profile information from the friendship document
            const requestInfo = {
              id: doc.id,
              requesterId: requestData.user1,
              username: requestData.user1Username || 'Unknown User',
              email: requestData.user1Email || '',
              firstName: requestData.user1FirstName || '',
              lastName: requestData.user1LastName || '',
              birthday: requestData.user1Birthday || '',
              gender: requestData.user1Gender || '',
              requestId: doc.id,
              createdAt: requestData.createdAt
            };
            
            requestList.push(requestInfo);
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
      
      // Update friendship status to accepted and store both users' profile info
      await firestore.collection('friends').doc(request.requestId).update({
        status: 'accepted',
        user1PublicKey: requesterPublicKey, // Requester's public key
        user2PublicKey: exportedCurrentUserPublicKey, // Current user's public key
        user1Username: request.username, // Requester's username
        user1Email: request.email, // Requester's email
        user1FirstName: request.firstName, // Requester's first name
        user1LastName: request.lastName, // Requester's last name
        user1Birthday: request.birthday, // Requester's birthday
        user1Gender: request.gender, // Requester's gender
        user2Username: currentUserProfile.username || userData.email.split('@')[0], // Current user's username
        user2Email: userData.email, // Current user's email
        user2FirstName: currentUserProfile.firstName || '', // Current user's first name
        user2LastName: currentUserProfile.lastName || '', // Current user's last name
        user2Birthday: currentUserProfile.birthday || '', // Current user's birthday
        user2Gender: currentUserProfile.gender || '', // Current user's gender
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
        // Delete any existing chat between these users (if exists)
        const chatQuery = await firestore
          .collection('chats')
          .where('users', 'array-contains', user.uid)
          .get();
        
        for (const doc of chatQuery.docs) {
          const chatData = doc.data();
          if (chatData.users.includes(request.requesterId) && chatData.users.length === 2) {
            // Delete all messages in this chat
            const messagesQuery = await firestore.collection(`chats/${doc.id}/messages`).get();
            const batch = firestore.batch();
            
            // Delete all messages
            messagesQuery.forEach(messageDoc => {
              batch.delete(firestore.doc(`chats/${doc.id}/messages/${messageDoc.id}`));
            });
            
            // Delete the chat document
            batch.delete(firestore.doc(`chats/${doc.id}`));
            
            // Commit the batch deletion
            await batch.commit();
            break;
          }
        }
        
        // Delete the friend request
        await firestore.collection('friends').doc(request.requestId).delete();
        setRequests(requests.filter(r => r.id !== request.id));
        alert('Friend request rejected and any existing chat deleted');
      } catch (error) {
        console.error('Error rejecting request:', error);
        alert('Failed to reject request: ' + error.message);
      }
    }
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