import React, { useState, useRef, useEffect } from "react";
import "./styles/KeyboardTyping.css";

const PARAGRAPH =
  "Parkinson's disease affects millions of people worldwide. Early detection is crucial, and subtle changes in typing patterns or voice may provide important clues. By carefully analyzing hand movements, key timing, and rhythm, we can estimate the risk and encourage timely medical consultation. Consistent practice and attentive observation may improve both prediction accuracy and overall awareness of one's neurological health.";

export default function KeyboardTyping() {
  const [text, setText] = useState("");
  const [gender, setGender] = useState("");
  const [log, setLog] = useState([]);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const keyDownTime = useRef({});
  const lastKeyInfo = useRef(null);

  const leftKeys = "qwertasdfgzxcvb";
  const rightKeys = "yuiophjklnm";

  const [activeKey, setActiveKey] = useState(null);

  useEffect(() => {
    if (!activeKey) return;
    const t = setTimeout(() => setActiveKey(null), 120);
    return () => clearTimeout(t);
  }, [activeKey]);

  const getHand = (key) => {
    return leftKeys.includes(key.toLowerCase()) ? "L" : "R";
  };

  const handleKeyDown = (e) => {
    const key = e.key;
    if (key.length > 1 && key !== "Backspace" && key !== " ") {

      return;
    }
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
    setActiveKey(key);

    setLog((prev) => [
      ...prev,
      { key, hand, timestamp: now, latency, direction, holdTime: null },
    ]);
  };

  const handleKeyUp = (e) => {
    const key = e.key;
    const now = performance.now();
    const startTime = keyDownTime.current[key];
    if (!startTime) return;

    const holdTime = now - startTime;

    setLog((prev) => {
      const newLog = [...prev];
      for (let i = newLog.length - 1; i >= 0; i--) {
        if (newLog[i].key === key && newLog[i].holdTime === null) {
          newLog[i] = { ...newLog[i], holdTime: holdTime };
          break;
        }
      }
      return newLog;
    });
    delete keyDownTime.current[key];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResult(null);

    if (!text.trim()) {
      setError("Please type the paragraph before analyzing.");
      setIsLoading(false);
      return;
    }

    if (log.length < 10) {
      // Add a check for minimum log length
      setError("Please type more of the paragraph to gather sufficient data.");
      setIsLoading(false);
      return;
    }

    if (!gender) {
      setError("Please select your gender.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/predicttyping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ log, gender }),
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
    <>
      <div className='app-container'>
        <div className='typing-layout'>
          <div className='typing-main'>
            <h1>Keyboard Typing Predictor</h1>
            <p>Please type the following paragraph exactly as shown:</p>
            <blockquote className='paragraph'>{PARAGRAPH}</blockquote>

            <form onSubmit={handleSubmit} className='typing-form'>
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

              <div className='typing-area'>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  placeholder='Type the paragraph here...'
                  rows={8}
                />

                <div className='visual-keyboard' aria-hidden>
                  {[
                    "`1234567890-=",
                    "qwertyuiop[]\\",
                    "asdfghjkl;'",
                    "zxcvbnm,./",
                    " ",
                  ].map((row, idx) => (
                    <div key={idx} className={`kb-row kb-row-${idx}`}>
                      {row === " " ? (
                        <div className='kb-key kb-space' />
                      ) : (
                        Array.from(row).map((k) => (
                          <div
                            key={k}
                            className={`kb-key ${
                              activeKey &&
                              activeKey.toLowerCase() === k.toLowerCase()
                                ? "active"
                                : ""
                            }`}
                          >
                            {k}
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className='form-row'>
                <button type='submit' disabled={isLoading}>
                  {isLoading ? "Analyzing..." : "Analyze Typing"}
                </button>
              </div>
            </form>

            {error && <div className='error-box'>{error}</div>}

            {result && (
              <div className='result-box'>
                <h2>
                  {result.prediction === 1
                    ? "Positive for Parkinson's"
                    : "Likely Healthy"}
                </h2>
                {/* <p>Confidence: {(result.probability * 100).toFixed(2)}%</p> */}
              </div>
            )}
          </div>

          <aside className='typing-log'>
            <h3>Key Log (Last 200)</h3>
            <div className='log-preview'>
              <pre>{JSON.stringify(log.slice(-200), null, 2)}</pre>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
