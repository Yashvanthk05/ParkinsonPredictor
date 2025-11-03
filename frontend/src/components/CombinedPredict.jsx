import React, { useMemo, useRef, useState } from "react";
import "./styles/CombinedPredict.css";

const API_BASE = "https://parkinsonpredictor.onrender.com";

export default function CombinedPredict() {

  const [useTyping, setUseTyping] = useState(true);
  const [useSpiral, setUseSpiral] = useState(true);
  const [useWave, setUseWave] = useState(true);

  const [typingText, setTypingText] = useState("");
  const [gender, setGender] = useState("");
  const [log, setLog] = useState([]);
  const keyDownTime = useRef({});
  const lastKeyInfo = useRef(null);
  const leftKeys = "qwertasdfgzxcvb";
  const rightKeys = "yuiophjklnm";
  const getHand = (key) => (leftKeys.includes(key.toLowerCase()) ? "L" : "R");

  const [spiralFile, setSpiralFile] = useState(null);
  const [spiralPreview, setSpiralPreview] = useState(null);
  const [spiralNotes, setSpiralNotes] = useState("");

  const [waveFile, setWaveFile] = useState(null);
  const [wavePreview, setWavePreview] = useState(null);
  const [waveNotes, setWaveNotes] = useState("");

  const [typingResult, setTypingResult] = useState(null);
  const [spiralResult, setSpiralResult] = useState(null);
  const [waveResult, setWaveResult] = useState(null);
  const [combined, setCombined] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validTyping = useMemo(() => {
    if (!useTyping) return true;
    return typingText.trim().length > 0 && !!gender;
  }, [useTyping, typingText, gender]);

  const validSpiral = useMemo(() => {
    if (!useSpiral) return true;
    return !!spiralFile;
  }, [useSpiral, spiralFile]);

  const validWave = useMemo(() => {
    if (!useWave) return true;
    return !!waveFile;
  }, [useWave, waveFile]);

  const handleKeyDown = (e) => {
    if (!useTyping) return;
    const key = e.key;
    const now = performance.now();
    if (!keyDownTime.current[key]) keyDownTime.current[key] = now;
    const hand = getHand(key);
    let latency = null;
    let direction = null;
    if (lastKeyInfo.current) {
      latency = now - lastKeyInfo.current.time;
      direction = lastKeyInfo.current.hand + hand;
    }
    lastKeyInfo.current = { key, hand, time: now };
    setLog((prev) => [
      ...prev,
      { key, hand, timestamp: now, latency, direction, holdTime: null },
    ]);
  };
  const handleKeyUp = (e) => {
    if (!useTyping) return;
    const key = e.key;
    const now = performance.now();
    const startTime = keyDownTime.current[key];
    if (!startTime) return;
    const holdTime = now - startTime;
    setLog((prev) => {
      const newLog = [...prev];
      for (let i = newLog.length - 1; i >= 0; i--) {
        if (newLog[i].key === key && newLog[i].holdTime === null) {
          newLog[i].holdTime = holdTime;
          break;
        }
      }
      return newLog;
    });
    delete keyDownTime.current[key];
  };

  const onSpiralFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Upload an image file");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Image under 5MB");
      return;
    }
    setError("");
    setSpiralFile(f);
    setSpiralPreview(URL.createObjectURL(f));
  };

  const onWaveFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Upload an image file");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Image under 5MB");
      return;
    }
    setError("");
    setWaveFile(f);
    setWavePreview(URL.createObjectURL(f));
  };

  const callTyping = async () => {
    if (!useTyping) return null;
    if (!validTyping) throw new Error("Finish typing and select gender");
    const res = await fetch(`${API_BASE}/predicttyping`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log, gender }),
    });
    if (!res.ok) throw new Error("Typing prediction failed");
    return await res.json();
  };

  const callSpiral = async () => {
    if (!useSpiral) return null;
    if (!validSpiral) throw new Error("Select a spiral image");
    const fd = new FormData();
    fd.append("file", spiralFile);
    fd.append("notes", spiralNotes || "");
    const res = await fetch(`${API_BASE}/predictspiral`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error("Spiral prediction failed");
    return await res.json();
  };

  const callWave = async () => {
    if (!useWave) return null;
    if (!validWave) throw new Error("Select a wave image");
    const fd = new FormData();
    fd.append("file", waveFile);
    fd.append("notes", waveNotes || "");
    const res = await fetch(`${API_BASE}/predictwave`, {
      method: "POST",
      body: fd,
    });
    if (!res.ok) throw new Error("Wave prediction failed");
    return await res.json();
  };

  const majorityVote = (parts) => {
    const votes = parts.filter(Boolean);
    if (votes.length < 2) {
      return {
        status: "inconclusive",
        message: "Need at least two model results for majority vote.",
      };
    }
    const ones = votes.filter((v) => v?.prediction === 1);
    const zeros = votes.filter((v) => v?.prediction === 0);
    if (ones.length === zeros.length) {
      return {
        status: "tie",
        message: "Tie between classes; add another model or retry.",
      };
    }
    const majorityClass = ones.length > zeros.length ? 1 : 0;
    const group = majorityClass === 1 ? ones : zeros;
    const avgProb = group.length
      ? group.reduce(
          (s, v) => s + (typeof v.probability === "number" ? v.probability : 0),
          0
        ) / group.length
      : 0.5;
    return { status: "ok", prediction: majorityClass, probability: avgProb };
  };

  const handleRunAll = async () => {
    setIsLoading(true);
    setError("");
    setTypingResult(null);
    setSpiralResult(null);
    setWaveResult(null);
    setCombined(null);

    try {
      const [tRes, sRes, wRes] = await Promise.allSettled([
        callTyping(),
        callSpiral(),
        callWave(),
      ]);
      const typing = tRes.status === "fulfilled" ? tRes.value : null;
      const spiral = sRes.status === "fulfilled" ? sRes.value : null;
      const wave = wRes.status === "fulfilled" ? wRes.value : null;
      setTypingResult(typing);
      setSpiralResult(spiral);
      setWaveResult(wave);
      const combined = majorityVote([typing, spiral, wave]);
      setCombined(combined);
    } catch (err) {
      setError(err.message || "Failed to run combined predictions");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='app-container'>
      <div className='combined'>
        <header className='combined-header'>
          <h1>Combined Prediction (Majority Voting)</h1>
          <div className='toggles'>
            <label>
              <input
                type='checkbox'
                checked={useTyping}
                onChange={() => setUseTyping(!useTyping)}
              />{" "}
              Typing
            </label>
            <label>
              <input
                type='checkbox'
                checked={useSpiral}
                onChange={() => setUseSpiral(!useSpiral)}
              />{" "}
              Spiral
            </label>
            <label>
              <input
                type='checkbox'
                checked={useWave}
                onChange={() => setUseWave(!useWave)}
              />{" "}
              Wave
            </label>
          </div>
          <button
            onClick={handleRunAll}
            disabled={isLoading || (!useTyping && !useSpiral && !useWave)}
          >
            {isLoading ? "Predicting..." : "Run Combined Prediction"}
          </button>
          {error && (
            <div className='error-box' style={{ marginTop: 10 }}>
              {error}
            </div>
          )}
          {combined && (
            <div
              className={`result-box ${
                combined.prediction === 1 ? "positive" : "negative"
              }`}
            >
              {combined.status === "ok" ? (
                <>
                  <h2>
                    {combined.prediction === 1
                      ? "Positive for Parkinson's (Majority)"
                      : "Likely Healthy (Majority)"}
                  </h2>
                </>
              ) : (
                <>
                  <h2>Inconclusive</h2>
                  <p>{combined.message}</p>
                </>
              )}
            </div>
          )}
        </header>

        <section className='combined-grid'>
          {useTyping && (
            <div className='panel'>
              <h3>Typing</h3>
              <div className='form-row'>
                <label>
                  Gender:
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                  >
                    <option value=''>Select Gender</option>
                    <option value='Male'>Male</option>
                    <option value='Female'>Female</option>
                  </select>
                </label>
              </div>
              <textarea
                value={typingText}
                onChange={(e) => setTypingText(e.target.value)}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                placeholder='Type the paragraph here...'
                rows={6}
              />
              <details className='log-toggle'>
                <summary>Log preview</summary>
                <pre className='log-sm'>
                  {JSON.stringify(log.slice(-100), null, 2)}
                </pre>
              </details>
              {typingResult && (
                <div className='sub-result'>
                  <strong>Typing:</strong>{" "}
                  {typingResult.prediction === 1 ? "Positive" : "Healthy"}
                </div>
              )}
            </div>
          )}

          {useSpiral && (
            <div className='panel'>
              <h3>Spiral</h3>
              <input type='file' accept='image/*' onChange={onSpiralFile} />
              {spiralPreview && (
                <div className='drawing-preview'>
                  <img src={spiralPreview} alt='spiral preview' />
                </div>
              )}
              {spiralResult && (
                <div className='sub-result'>
                  <strong>Spiral:</strong>{" "}
                  {spiralResult.prediction === 1 ? "Positive" : "Healthy"}
                </div>
              )}
            </div>
          )}

          {useWave && (
            <div className='panel'>
              <h3>Wave</h3>
              <input type='file' accept='image/*' onChange={onWaveFile} />
              {wavePreview && (
                <div className='drawing-preview'>
                  <img src={wavePreview} alt='wave preview' />
                </div>
              )}
              {waveResult && (
                <div className='sub-result'>
                  <strong>Wave:</strong>{" "}
                  {waveResult.prediction === 1 ? "Positive" : "Healthy"}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
