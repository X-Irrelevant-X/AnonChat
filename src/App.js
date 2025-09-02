import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { auth } from './firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

import Home from './Pages/home';
import UserHome from './Pages/userhome';
import { SignIn } from './Pages/auth';
import Register from './Pages/register';
import Profile from './Pages/profile';
import Friends from './Pages/Friends';
import Requests from './Pages/Requests';


function App() {
  const [user] = useAuthState(auth);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/signin" element={<SigninPage />} />
          <Route path="/userhome" element={user ? <UserHome /> : <Home />} />
          <Route path="/profile" element={user ? <Profile /> : <Home />} />
          <Route path="/friends" element={user ? <Friends /> : <Home />} />
          <Route path="/requests" element={user ? <Requests /> : <Home />} />
        </Routes>
      </div>
    </Router>
  );
}

const SignupPage = () => (
  <div className="form-container">
    <Register />
  </div>
);

const SigninPage = () => (
  <div className="form-container">
    <SignIn />
  </div>
);

export default App;
