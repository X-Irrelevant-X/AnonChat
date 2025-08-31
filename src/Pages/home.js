import React from 'react';
import { Link } from 'react-router-dom';
import '../Styles/home.css';

const Home = () => {
  return (
    <div className="home-container">
      <header>
        <h1>⚛️🔥 AnonChat 🔥⚛️</h1>
      </header>

      <main className="home-main">
        <Link to="/signup" className="btn">Sign Up</Link>
        <Link to="/signin" className="btn">Sign In</Link>
      </main>
    </div>
  );
};

export default Home;