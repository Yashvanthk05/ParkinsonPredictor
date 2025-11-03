import React from "react";
import { NavLink } from "react-router-dom";
import "./styles/Navbar.css";

export default function Navbar() {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className='sidebar'>
        <div className='sidebar-header'>
          <div className='logo-circle'>PP</div>
          <div className='brand'>Parkinson Predictor</div>
        </div>

        <nav className='sidebar-nav'>
          <NavLink
            to='/'
            end
            className={({ isActive }) => (isActive ? "item active" : "item")}
          >
            Home
          </NavLink>
          <NavLink
            to='/voice'
            className={({ isActive }) => (isActive ? "item active" : "item")}
          >
            Voice Measurements
          </NavLink>
          <NavLink
            to='/keyboard'
            className={({ isActive }) => (isActive ? "item active" : "item")}
          >
            Keyboard Typing
          </NavLink>
          <NavLink
            to='/drawing'
            className={({ isActive }) => (isActive ? "item active" : "item")}
          >
            Spiral & Wave
          </NavLink>
          <NavLink
            to='/combined'
            className={({ isActive }) => (isActive ? "item active" : "item")}
          >
            Combined
          </NavLink>
          <NavLink
            to='/explain'
            className={({ isActive }) => (isActive ? "item active" : "item")}
          >
            Model Explain
          </NavLink>
        </nav>

        <div className='sidebar-footer'>
          <div className='muted'>v1.0</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className='mobile-nav'>
        <div className='mobile-header'>
          <div className='logo-circle'>PP</div>
          <div className='brand'>Parkinson Predictor</div>
        </div>
        <div className='mobile-links'>
          <NavLink
            to='/'
            end
            className={({ isActive }) => (isActive ? "mitem active" : "mitem")}
          >
            Home
          </NavLink>
          <NavLink
            to='/voice'
            className={({ isActive }) => (isActive ? "mitem active" : "mitem")}
          >
            Voice
          </NavLink>
          <NavLink
            to='/keyboard'
            className={({ isActive }) => (isActive ? "mitem active" : "mitem")}
          >
            Keyboard
          </NavLink>
          <NavLink
            to='/drawing'
            className={({ isActive }) => (isActive ? "mitem active" : "mitem")}
          >
            Drawing
          </NavLink>
          <NavLink
            to='/combined'
            className={({ isActive }) => (isActive ? "mitem active" : "mitem")}
          >
            Combined
          </NavLink>
          <NavLink
            to='/explain'
            className={({ isActive }) => (isActive ? "mitem active" : "mitem")}
          >
            Explain
          </NavLink>
        </div>
      </div>
    </>
  );
}
