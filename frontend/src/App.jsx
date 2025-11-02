import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import VoiceMeasurement from "./components/VoiceMeasurement";
import KeyboardTyping from "./components/KeyboardTyping";
import SpiralDrawing from "./components/SpiralDrawing";
import CombinedPredict from "./components/CombinedPredict";
import ModelExplain from "./components/ModelExplain";
import "./App.css";

function Home() {
  return (
    <div className='app-container'>
      <section style={{ textAlign: "left" }}>
        <h1>Welcome to Parkinson's Predictor</h1>
        <p>
          Choose a measurement type below to begin. Each tool provides a
          professional UI to collect data and send it to a model for prediction.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 18,
          }}
        >
          <a
            href='/voice'
            className='card'
            style={{
              padding: 16,
              textDecoration: "none",
              border: "1px solid #e6e6e6",
              borderRadius: 8,
            }}
          >
            <h3>Voice Measurements</h3>
            <p style={{ margin: 0, color: "#444" }}>
              Enter vocal features and run the voice predictor.
            </p>
          </a>

          <a
            href='/keyboard'
            className='card'
            style={{
              padding: 16,
              textDecoration: "none",
              border: "1px solid #e6e6e6",
              borderRadius: 8,
            }}
          >
            <h3>Keyboard Typing</h3>
            <p style={{ margin: 0, color: "#444" }}>
              Type a short sample to analyze motor control signals.
            </p>
          </a>

          <a
            href='/drawing'
            className='card'
            style={{
              padding: 16,
              textDecoration: "none",
              border: "1px solid #e6e6e6",
              borderRadius: 8,
            }}
          >
            <h3>Spiral & Wave Drawing</h3>
            <p style={{ margin: 0, color: "#444" }}>
              Upload or describe a drawing to analyze tremor characteristics.
            </p>
          </a>

          <a
            href='/explain'
            className='card'
            style={{
              padding: 16,
              textDecoration: "none",
              border: "1px solid #e6e6e6",
              borderRadius: 8,
            }}
          >
            <h3>Model Explain (CNN)</h3>
            <p style={{ margin: 0, color: "#444" }}>
              See how Conv2D, MaxPool, and Dense layers work visually.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}

export default function AppEntry() {
  return (
    <Router>
      <Navbar />
      <main style={{ padding: "20px" }}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/voice' element={<VoiceMeasurement />} />
          <Route path='/keyboard' element={<KeyboardTyping />} />
          <Route path='/drawing' element={<SpiralDrawing />} />
          <Route path='/combined' element={<CombinedPredict />} />
          <Route path='/explain' element={<ModelExplain />} />
          <Route
            path='*'
            element={<div className='app-container'>Not Found</div>}
          />
        </Routes>
      </main>
    </Router>
  );
}
