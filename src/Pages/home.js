import React from 'react';
import { Link } from 'react-router-dom';
import '../Styles/home_s.css';

const Home = () => {
  return (
    <div className="home-container">
      <header>
        <h1>🔥 AnonChat 🔥</h1>
      </header>

      <main className="home-main">
        <Link to="/signin" className="btn">Log In</Link>
        <Link to="/signup" className="btn">Register</Link>
      </main>
    </div>
  );
};

export default Home;