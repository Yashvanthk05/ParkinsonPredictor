import React from "react";
import { Link } from "react-router-dom";
import "./styles/Navbar.css";

export default function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-logo">Parkinson's Predictor</div>
        <ul className="navbar-links">
          <li>
            <Link to="/voice">Voice Measurements</Link>
          </li>
          <li>
            <Link to="/keyboard">Typing</Link>
          </li>
          <li>
            <Link to="/drawing">Spiral & Wave</Link>
          </li>
        </ul>
      </div>
    </nav>
  );
}
