import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import sessionManager from '../security/sessionManager';
import EncryptionService from '../security/encrydecry';
import '../Styles/requests.css';

// Firestore modular imports
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  deleteField
} from "firebase/firestore";

const firestore = getFirestore();

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

        if (!sessionManager.isSessionActive()) {
          auth.signOut();
          navigate('/signin');
          return;
        }

        const requestsQuery = query(
          collection(firestore, 'friends'),
          where('user2', '==', user.uid),
          where('status', '==', 'pending')
        );

        const requestsSnapshot = await getDocs(requestsQuery);

        const requestList = [];
        for (const docSnap of requestsSnapshot.docs) {
          const requestData = docSnap.data();
          let decryptedRequesterData = {};

          if (requestData.encryptedUser1Data) {
            try {
              decryptedRequesterData = await EncryptionService.decryptFriendData(
                requestData.encryptedUser1Data,
                requestData.user1,
                user.uid
              );
            } catch (err) {
              console.error('Failed to decrypt requester data:', err);
              decryptedRequesterData = { username: 'Unknown User', email: 'Unknown Email' };
            }
          } else {
            decryptedRequesterData = {
              username: requestData.user1Username || 'Unknown User',
              email: requestData.user1Email || '',
              firstName: requestData.user1FirstName || '',
              lastName: requestData.user1LastName || '',
              birthday: requestData.user1Birthday || '',
              gender: requestData.user1Gender || ''
            };
          }

          requestList.push({
            id: docSnap.id,
            requesterId: requestData.user1,
            username: decryptedRequesterData.username,
            email: decryptedRequesterData.email,
            firstName: decryptedRequesterData.firstName || '',
            lastName: decryptedRequesterData.lastName || '',
            birthday: decryptedRequesterData.birthday || '',
            gender: decryptedRequesterData.gender || '',
            requestId: docSnap.id,
            createdAt: requestData.createdAt,
            user1PublicKey: requestData.user1PublicKey
          });
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

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      const userData = userDocSnap.data();

      const privateKey = sessionManager.getPrivateKey();
      let currentUserProfile = {};
      if (userData.encryptedProfile) {
        currentUserProfile = await EncryptionService.decryptUserProfileData(
          userData.encryptedProfile,
          privateKey
        );
      }

      const user1Data = {
        username: request.username,
        email: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        birthday: request.birthday,
        gender: request.gender
      };

      const user2Data = {
        username: currentUserProfile.username || userData.email.split('@')[0],
        email: userData.email,
        firstName: currentUserProfile.firstName || '',
        lastName: currentUserProfile.lastName || '',
        birthday: currentUserProfile.birthday || '',
        gender: currentUserProfile.gender || ''
      };

      const encryptedUser1Data = await EncryptionService.encryptFriendData(
        user1Data,
        request.requesterId,
        user.uid
      );

      const encryptedUser2Data = await EncryptionService.encryptFriendData(
        user2Data,
        request.requesterId,
        user.uid
      );

      const requestRef = doc(firestore, 'friends', request.requestId);
      await updateDoc(requestRef, {
        status: 'accepted',
        user1PublicKey: request.user1PublicKey,
        user2PublicKey: exportedCurrentUserPublicKey,
        encryptedUser1Data,
        encryptedUser2Data,
        acceptedAt: new Date(),

        // remove plaintext
        user1Username: deleteField(),
        user1Email: deleteField(),
        user1FirstName: deleteField(),
        user1LastName: deleteField(),
        user1Birthday: deleteField(),
        user1Gender: deleteField(),
        user2Username: deleteField(),
        user2Email: deleteField(),
        user2FirstName: deleteField(),
        user2LastName: deleteField(),
        user2Birthday: deleteField(),
        user2Gender: deleteField()
      });

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
        const chatQuery = query(
          collection(firestore, 'chats'),
          where('users', 'array-contains', user.uid)
        );
        const chatSnap = await getDocs(chatQuery);

        for (const chatDoc of chatSnap.docs) {
          const chatData = chatDoc.data();
          if (chatData.users.includes(request.requesterId) && chatData.users.length === 2) {
            const messagesRef = collection(firestore, `chats/${chatDoc.id}/messages`);
            const messagesSnap = await getDocs(messagesRef);

            const batch = writeBatch(firestore);
            messagesSnap.forEach((msg) => {
              batch.delete(doc(firestore, `chats/${chatDoc.id}/messages/${msg.id}`));
            });

            batch.delete(doc(firestore, 'chats', chatDoc.id));
            await batch.commit();
            break;
          }
        }

        await deleteDoc(doc(firestore, 'friends', request.requestId));
        setRequests(requests.filter(r => r.id !== request.id));
        alert('Friend request rejected and any existing chat deleted');
      } catch (error) {
        console.error('Error rejecting request:', error);
        alert('Failed to reject request: ' + error.message);
      }
    }
  };

  const handleBack = () => navigate('/userhome');

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
        <div className="no-requests"><p>No pending friend requests.</p></div>
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
                <button onClick={() => handleAcceptRequest(request)} className="action-button accept">
                  Accept
                </button>
                <button onClick={() => handleRejectRequest(request)} className="action-button reject">
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
