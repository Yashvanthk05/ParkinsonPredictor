import React, { useState } from "react";
import "./styles/VoiceMeasurement.css";

const featuresList = [
  {
    key: "MDVP_Fhi_Hz_",
    label: "MDVP.Fhi.Hz.",
    description: "Maximum vocal fundamental frequency",
  },
  {
    key: "MDVP_Flo_Hz_",
    label: "MDVP.Flo.Hz.",
    description: "Minimum vocal fundamental frequency",
  },
  {
    key: "MDVP_Jitter_",
    label: "MDVP.Jitter...",
    description: "Jitter percentage",
  },
  {
    key: "MDVP_Jitter_Abs_",
    label: "MDVP.Jitter.Abs.",
    description: "Absolute jitter",
  },
  {
    key: "MDVP_RAP",
    label: "MDVP.RAP",
    description: "Relative amplitude perturbation",
  },
  {
    key: "MDVP_PPQ",
    label: "MDVP.PPQ",
    description: "Five-point period perturbation quotient",
  },
  {
    key: "Jitter_DDP",
    label: "Jitter.DDP",
    description: "Avg. absolute difference of differences",
  },
  { key: "MDVP_Shimmer", label: "MDVP.Shimmer", description: "Local shimmer" },
  {
    key: "MDVP_Shimmer_dB_",
    label: "MDVP.Shimmer.dB.",
    description: "Shimmer in dB",
  },
  {
    key: "Shimmer_APQ3",
    label: "Shimmer.APQ3",
    description: "Three-point amplitude perturbation",
  },
  {
    key: "Shimmer_APQ5",
    label: "Shimmer.APQ5",
    description: "Five-point amplitude perturbation",
  },
  {
    key: "MDVP_APQ",
    label: "MDVP.APQ",
    description: "Amplitude perturbation quotient",
  },
  {
    key: "Shimmer_DDA",
    label: "Shimmer.DDA",
    description: "Avg. absolute difference of differences",
  },
  { key: "NHR", label: "NHR", description: "Noise-to-harmonics ratio" },
  { key: "HNR", label: "HNR", description: "Harmonics-to-noise ratio" },
  {
    key: "RPDE",
    label: "RPDE",
    description: "Recurrence period density entropy",
  },
  { key: "DFA", label: "DFA", description: "Detrended fluctuation analysis" },
  {
    key: "spread1",
    label: "spread1",
    description: "Nonlinear fundamental frequency variation",
  },
  {
    key: "spread2",
    label: "spread2",
    description: "Nonlinear fundamental frequency variation",
  },
  { key: "D2", label: "D2", description: "Correlation dimension" },
  { key: "PPE", label: "PPE", description: "Pitch period entropy" },
];

const initialFormState = featuresList.reduce((acc, feature) => {
  acc[feature.key] = "";
  return acc;
}, {});

export default function VoiceMeasurement() {
  const [formData, setFormData] = useState(initialFormState);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleJSONUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        // Update only valid keys
        const updatedForm = { ...initialFormState };
        Object.keys(updatedForm).forEach((key) => {
          if (jsonData[key] !== undefined) updatedForm[key] = jsonData[key];
        });
        setFormData(updatedForm);
      } catch (err) {
        setError("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    setError("");

    const processedData = {};
    try {
      for (const key in formData) {
        const value = parseFloat(formData[key]);
        if (isNaN(value)) throw new Error(`Invalid input for '${key}'`);
        processedData[key] = value;
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/predictvoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(processedData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Network response was not ok");
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`Prediction failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='app-container'>
      <h1>Voice Measurement Predictor</h1>

      <div className='json-upload'>
        <label>Upload JSON File:</label>
        <input type='file' accept='.json' onChange={handleJSONUpload} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className='grid-container'>
          {featuresList.map((feature) => (
            <div key={feature.key} className='input-group'>
              <label htmlFor={feature.key}>{feature.label}</label>
              <small>{feature.description}</small>
              <input
                type='number'
                step='any'
                id={feature.key}
                name={feature.key}
                value={formData[feature.key]}
                onChange={handleChange}
                required
              />
            </div>
          ))}
        </div>
        <button type='submit' disabled={isLoading}>
          {isLoading ? "Predicting..." : "Predict"}
        </button>
      </form>

      {error && <div className='error-box'>{error}</div>}

      {result && (
        <div
          className={`result-box ${
            result.prediction === 1 ? "positive" : "negative"
          }`}
        >
          <h2>
            {result.prediction === 1 ? "Positive for Parkinson's" : "Negative for Parkinson's"}
          </h2>
          {/* <p>Confidence: {(result.probability * 100).toFixed(2)}%</p> */}
        </div>
      )}
    </div>
  );
}
