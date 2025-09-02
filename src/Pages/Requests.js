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

  const exportPublicKeyToString = async (key) => {
    const exported = await window.crypto.subtle.exportKey("spki", key);
    return arrayBufferToBase64(exported);
  };

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
      const currentUserPublicKey = sessionManager.getPublicKey();
      const exportedCurrentUserPublicKey = await exportPublicKeyToString(currentUserPublicKey);
      
      const requesterDoc = await firestore.collection('users').doc(request.requesterId).get();
      if (!requesterDoc.exists) {
        throw new Error('Requester not found');
      }
      
      const requesterData = requesterDoc.data();
      const requesterPublicKey = requesterData.publicKey;
      
      const userDoc = await firestore.collection('users').doc(user.uid).get();
      const userData = userDoc.data();
      
      const privateKey = sessionManager.getPrivateKey();
      let currentUserProfile = {};
      if (userData.encryptedProfile) {
        currentUserProfile = await EncryptionService.decryptUserProfileData(
          userData.encryptedProfile,
          privateKey
        );
      }
      
      await firestore.collection('friends').doc(request.requestId).update({
        status: 'accepted',
        user1PublicKey: requesterPublicKey, 
        user2PublicKey: exportedCurrentUserPublicKey, 
        user1Username: request.username, 
        user1Email: request.email, 
        user1FirstName: request.firstName, 
        user1LastName: request.lastName, 
        user1Birthday: request.birthday, 
        user1Gender: request.gender, 
        user2Username: currentUserProfile.username || userData.email.split('@')[0], 
        user2Email: userData.email, 
        user2FirstName: currentUserProfile.firstName || '',
        user2LastName: currentUserProfile.lastName || '', 
        user2Birthday: currentUserProfile.birthday || '',
        user2Gender: currentUserProfile.gender || '', 
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
        const chatQuery = await firestore
          .collection('chats')
          .where('users', 'array-contains', user.uid)
          .get();
        
        for (const doc of chatQuery.docs) {
          const chatData = doc.data();
          if (chatData.users.includes(request.requesterId) && chatData.users.length === 2) {
            
            const messagesQuery = await firestore.collection(`chats/${doc.id}/messages`).get();
            const batch = firestore.batch();
            
            
            messagesQuery.forEach(messageDoc => {
              batch.delete(firestore.doc(`chats/${doc.id}/messages/${messageDoc.id}`));
            });
            
            
            batch.delete(firestore.doc(`chats/${doc.id}`));
            
            
            await batch.commit();
            break;
          }
        }
        
        
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