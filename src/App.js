import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Pages/home';
import ChatRoom from './Pages/ChatRoom';
import { auth } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { SignUp, SignIn } from './Pages/auth';

function App() {
  const [user] = useAuthState(auth);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signin" element={<SigninPage />} />
          <Route path="/chat" element={user ? <ChatRoom /> : <Home />} />
        </Routes>
      </div>
    </Router>
  );
}

// Wrapper components to add styling
const SignupPage = () => (
  <div className="form-container">
    <SignUp />
  </div>
);

const SigninPage = () => (
  <div className="form-container">
    <SignIn />
  </div>
);

export default App;