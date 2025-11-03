import React, { useState } from "react";
import "./styles/ModelExplain.css";

// Minimal conceptual layer list (captions only)
const modelLayers = [
  { type: "Input", name: "Input (Wave Image)" },
  { type: "Conv2D", name: "Conv2D 3×3" },
  { type: "ReLU", name: "ReLU" },
  { type: "Conv2D", name: "Conv2D 3×3" },
  { type: "ReLU", name: "ReLU" },
  { type: "MaxPool", name: "MaxPooling 2×2" },
  { type: "Conv2D", name: "Conv2D 3×3" },
  { type: "ReLU", name: "ReLU" },
  { type: "MaxPool", name: "MaxPooling 2×2" },
];

// Helpers: simple in-browser processing
function toGrayscale128(imgEl) {
  const size = 128;
  const cnv = document.createElement("canvas");
  cnv.width = size;
  cnv.height = size;
  const ctx = cnv.getContext("2d");
  ctx.drawImage(imgEl, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const out = new Float32Array(size * size);
  for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    out[j] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  return { data: out, width: size, height: size };
}

function conv3x3(input, w, h, k) {
  const out = new Float32Array(w * h);
  const get = (x, y) => {
    if (x < 0) x = 0;
    if (y < 0) y = 0;
    if (x >= w) x = w - 1;
    if (y >= h) y = h - 1;
    return input[y * w + x];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      sum += get(x - 1, y - 1) * k[0];
      sum += get(x, y - 1) * k[1];
      sum += get(x + 1, y - 1) * k[2];
      sum += get(x - 1, y) * k[3];
      sum += get(x, y) * k[4];
      sum += get(x + 1, y) * k[5];
      sum += get(x - 1, y + 1) * k[6];
      sum += get(x, y + 1) * k[7];
      sum += get(x + 1, y + 1) * k[8];
      if (sum < 0) sum = 0;
      if (sum > 255) sum = 255;
      out[y * w + x] = sum;
    }
  }
  return out;
}

function relu(arr) {
  const out = new Float32Array(arr.length);
  for (let i = 0; i < arr.length; i++) out[i] = arr[i] < 0 ? 0 : arr[i];
  return out;
}

function maxPool2x2(input, w, h) {
  const W = Math.floor(w / 2),
    H = Math.floor(h / 2);
  const out = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i0 = input[2 * y * w + 2 * x];
      const i1 = input[2 * y * w + (2 * x + 1)];
      const i2 = input[(2 * y + 1) * w + 2 * x];
      const i3 = input[(2 * y + 1) * w + (2 * x + 1)];
      out[y * W + x] = Math.max(i0, i1, i2, i3);
    }
  }
  return { data: out, width: W, height: H };
}

function toDataURL(arr, w, h) {
  const cnv = document.createElement("canvas");
  cnv.width = w;
  cnv.height = h;
  const ctx = cnv.getContext("2d");
  const imgData = ctx.createImageData(w, h);
  for (let i = 0, j = 0; i < arr.length; i++, j += 4) {
    const v = Math.max(0, Math.min(255, arr[i]));
    imgData.data[j] = v;
    imgData.data[j + 1] = v;
    imgData.data[j + 2] = v;
    imgData.data[j + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  return cnv.toDataURL();
}

export default function ModelExplain2() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [frames, setFrames] = useState(null);
  const [error, setError] = useState("");

  const kernels = {
    edgeX: [-1, 0, 1, -2, 0, 2, -1, 0, 1],
    edgeY: [-1, -2, -1, 0, 0, 0, 1, 2, 1],
    sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
    blur: [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9],
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleExplain = async () => {
    if (!file) {
      setError("Please select an image first.");
      return;
    }
    setIsLoading(true);
    setError("");
    setFrames(null);
    try {
      const imgEl = await new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });

      const g = toGrayscale128(imgEl);
      const inputUrl = toDataURL(g.data, g.width, g.height);

      const c1_edgeX = conv3x3(g.data, g.width, g.height, kernels.edgeX);
      const c1_edgeY = conv3x3(g.data, g.width, g.height, kernels.edgeY);
      const c1_sharp = conv3x3(g.data, g.width, g.height, kernels.sharpen);
      const c1_blur = conv3x3(g.data, g.width, g.height, kernels.blur);

      const r1_edgeX = relu(c1_edgeX);
      const r1_edgeY = relu(c1_edgeY);
      const r1_sharp = relu(c1_sharp);
      const r1_blur = relu(c1_blur);

      const p_edgeX = maxPool2x2(r1_edgeX, g.width, g.height);
      const p_edgeY = maxPool2x2(r1_edgeY, g.width, g.height);
      const p_sharp = maxPool2x2(r1_sharp, g.width, g.height);
      const p_blur = maxPool2x2(r1_blur, g.width, g.height);

      const c2 = conv3x3(
        p_edgeX.data,
        p_edgeX.width,
        p_edgeX.height,
        kernels.edgeY
      );

      const urls = {
        input: inputUrl,
        convs: [
          toDataURL(c1_edgeX, g.width, g.height),
          toDataURL(c1_edgeY, g.width, g.height),
          toDataURL(c1_sharp, g.width, g.height),
          toDataURL(c1_blur, g.width, g.height),
          toDataURL(c2, p_edgeX.width, p_edgeX.height),
        ],
        relus: [
          toDataURL(r1_edgeX, g.width, g.height),
          toDataURL(r1_edgeY, g.width, g.height),
          toDataURL(r1_sharp, g.width, g.height),
          toDataURL(r1_blur, g.width, g.height),
        ],
        pools: [
          toDataURL(p_edgeX.data, p_edgeX.width, p_edgeX.height),
          toDataURL(p_edgeY.data, p_edgeY.width, p_edgeY.height),
          toDataURL(p_sharp.data, p_sharp.width, p_sharp.height),
          toDataURL(p_blur.data, p_blur.width, p_blur.height),
        ],
      };

      const convQueue = [...urls.convs];
      const reluQueue = [...urls.relus];
      const poolQueue = [...urls.pools];
      const outFrames = [];
      let last = urls.input;
      for (const l of modelLayers) {
        let img;
        switch (l.type) {
          case "Input":
            img = urls.input;
            break;
          case "Conv2D":
            img = convQueue.length ? convQueue.shift() : last;
            break;
          case "ReLU":
            img = reluQueue.length ? reluQueue.shift() : last;
            break;
          case "MaxPool":
            img = poolQueue.length ? poolQueue.shift() : last;
            break;
          default:
            img = last;
            break;
        }
        outFrames.push(img);
        last = img;
      }
      setFrames(outFrames);
    } catch (err) {
      setError(err?.message || "Failed to visualize image");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='app-container'>
      <header className='explain-header'>
        <h1>How the CNN processes your image</h1>
        <p>
          Upload a drawing; we’ll show conceptual Conv/ReLU/Pooling outputs.
        </p>
      </header>

      <div className='explain'>
        <main className='explain-main'>
          {frames && (
            <section className='activations'>
              <h3 className='section-title'>Layer outputs</h3>
              <div className='frames-grid'>
                {modelLayers.map((ml, i) => (
                  <div className='frame-item' key={i}>
                    <div className='frame-img'>
                      <img src={frames[i]} alt={`Layer ${i} output`} />
                    </div>
                    <div className='frame-caption'>
                      <div className='name'>{ml.name}</div>
                      <div className='type'>{ml.type}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>

        <aside className='explain-detail'>
          <div className='uploader'>
            <label htmlFor='explain-file'>Upload image (wave)</label>
            <input
              id='explain-file'
              type='file'
              accept='image/*'
              onChange={handleFileChange}
            />
            {previewUrl && (
              <div className='explain-preview'>
                <img src={previewUrl} alt='preview' />
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
            )}
            <button
              type='button'
              className='primary'
              onClick={handleExplain}
              disabled={isLoading || !file}
            >
              {isLoading ? "Explaining..." : "Explain image through layers"}
            </button>
            {error && (
              <div className='error-box' style={{ marginTop: 8 }}>
                {error}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
