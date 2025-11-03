import React, { useState } from "react";
import "./styles/SpiralDrawing.css";

export default function SpiralDrawing() {
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [type, setType] = useState("spiral"); // 'spiral' or 'wave'
  const API_BASE = "https://parkinsonpredictor.onrender.com";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);

    try {
      if (!notes.trim()) {
        setResult({ prediction: 0, probability: 0.5 });
      } else {
        setResult({ prediction: 0, probability: 0.68 });
      }
    } catch (err) {
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setResult({ error: "Please upload an image file." });
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setResult({ error: "Image must be under 5MB." });
      return;
    }

    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setResult(null);
  };

  const handleUpload = async (e) => {
    e?.preventDefault();
    if (!file) {
      setResult({ error: "Please choose an image to upload." });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const endpoint =
        type === "spiral"
          ? `${API_BASE}/predictspiral`
          : `${API_BASE}/predictwave`;

      const resp = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || "Upload failed");
      }

      const data = await resp.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message || "Upload error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='app-container'>
      <div className='drawing-container'>
        <h1>Spiral & Wave Drawing Predictor</h1>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleUpload();
          }}
        >
          <label>Type</label>
          <div className='drawing-type'>
            <label>
              <input
                type='radio'
                name='type'
                value='spiral'
                checked={type === "spiral"}
                onChange={() => setType("spiral")}
              />{" "}
              Spiral
            </label>
            <label>
              <input
                type='radio'
                name='type'
                value='wave'
                checked={type === "wave"}
                onChange={() => setType("wave")}
              />{" "}
              Wave
            </label>
          </div>

          <label htmlFor='drawing-file'>Upload image (spiral or wave)</label>
          <br />
          <input
            id='drawing-file'
            type='file'
            accept='image/*'
            onChange={handleFileChange}
          />

          {previewUrl && (
            <div className='drawing-preview'>
              <img src={previewUrl} alt='preview' />
              <div className='preview-actions'>
                <button
                  type='button'
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          )}
          <div className='drawing-actions'>
            <button type='submit' disabled={isLoading}>
              {isLoading
                ? "Uploading..."
                : `Analyze ${type === "spiral" ? "Spiral" : "Wave"}`}
            </button>
          </div>
        </form>

        {result && (
          <div
            className={`result-box ${
              result.prediction === 1 ? "positive" : "negative"
            }`}
          >
            <h2>
              {result.prediction === 1
                ? "Positive for Parkinson's"
                : "Negative for Parkinson's"}
            </h2>
            {/* <p>Confidence: {(result.probability * 100).toFixed(2)}%</p> */}
          </div>
        )}
      </div>
    </div>
  );
}
