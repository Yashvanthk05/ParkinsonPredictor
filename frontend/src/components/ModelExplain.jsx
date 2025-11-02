import React, { useState } from "react";
import "./styles/ModelExplain.css";

const modelLayers = [
  {
    type: "Input",
    name: "Input (Wave Image)",
    shape: "128×128×1",
    desc: "Grayscale wave drawing resized to 128×128 pixels.",
  },
  {
    type: "Conv2D",
    name: "Conv2D 3×3 ×32",
    shape: "128×128×32",
    desc: "32 learned 3×3 filters scan the image to detect low-level patterns (edges, corners). Padding keeps spatial size.",
  },
  {
    type: "BatchNorm",
    name: "BatchNorm",
    shape: "128×128×32",
    desc: "Stabilizes activations across the batch for faster, more stable training.",
  },
  {
    type: "ReLU",
    name: "ReLU",
    shape: "128×128×32",
    desc: "Nonlinear activation that zeroes out negative values, keeping positive signals.",
  },
  {
    type: "Conv2D",
    name: "Conv2D 3×3 ×32",
    shape: "128×128×32",
    desc: "Another 32 filters combine prior features to detect richer motifs.",
  },
  {
    type: "BatchNorm",
    name: "BatchNorm",
    shape: "128×128×32",
    desc: "Normalizes the new feature maps again.",
  },
  {
    type: "ReLU",
    name: "ReLU",
    shape: "128×128×32",
    desc: "Adds nonlinearity after normalization.",
  },
  {
    type: "MaxPool",
    name: "MaxPooling 2×2",
    shape: "64×64×32",
    desc: "Downsamples by taking the max in 2×2 windows — keeps strongest signals, halves width & height.",
  },
  {
    type: "Dropout",
    name: "Dropout 0.25",
    shape: "64×64×32",
    desc: "Randomly drops 25% of activations during training to reduce overfitting.",
  },
  {
    type: "Conv2D",
    name: "Conv2D 3×3 ×64",
    shape: "64×64×64",
    desc: "64 filters extract mid-level shapes and strokes.",
  },
  {
    type: "BatchNorm",
    name: "BatchNorm",
    shape: "64×64×64",
    desc: "Stabilizes mid-level features.",
  },
  {
    type: "ReLU",
    name: "ReLU",
    shape: "64×64×64",
    desc: "Applies nonlinearity.",
  },
  {
    type: "Conv2D",
    name: "Conv2D 3×3 ×64",
    shape: "64×64×64",
    desc: "Further combines mid-level features.",
  },
  {
    type: "BatchNorm",
    name: "BatchNorm",
    shape: "64×64×64",
    desc: "Normalizes features again.",
  },
  {
    type: "ReLU",
    name: "ReLU",
    shape: "64×64×64",
    desc: "Applies nonlinearity.",
  },
  {
    type: "MaxPool",
    name: "MaxPooling 2×2",
    shape: "32×32×64",
    desc: "Spatial downsampling to focus on the most salient features.",
  },
  {
    type: "Dropout",
    name: "Dropout 0.25",
    shape: "32×32×64",
    desc: "Regularizes mid-level features.",
  },
  {
    type: "Conv2D",
    name: "Conv2D 3×3 ×128",
    shape: "32×32×128",
    desc: "128 filters capture complex curve patterns and tremor textures.",
  },
  {
    type: "BatchNorm",
    name: "BatchNorm",
    shape: "32×32×128",
    desc: "Stabilizes deeper activations.",
  },
  {
    type: "ReLU",
    name: "ReLU",
    shape: "32×32×128",
    desc: "Applies nonlinearity.",
  },
  {
    type: "Conv2D",
    name: "Conv2D 3×3 ×128",
    shape: "32×32×128",
    desc: "Refines complex patterns further.",
  },
  {
    type: "BatchNorm",
    name: "BatchNorm",
    shape: "32×32×128",
    desc: "Normalizes deeper features.",
  },
  {
    type: "ReLU",
    name: "ReLU",
    shape: "32×32×128",
    desc: "Applies nonlinearity.",
  },
  {
    type: "MaxPool",
    name: "MaxPooling 2×2",
    shape: "16×16×128",
    desc: "Downsamples while keeping the strongest activations.",
  },
  {
    type: "Dropout",
    name: "Dropout 0.3",
    shape: "16×16×128",
    desc: "Stronger regularization for deeper layers.",
  },
  {
    type: "Conv2D",
    name: "Conv2D 3×3 ×256",
    shape: "16×16×256",
    desc: "256 filters summarize high-level configurations indicative of Parkinsonian patterns.",
  },
  {
    type: "BatchNorm",
    name: "BatchNorm",
    shape: "16×16×256",
    desc: "Normalizes high-level features.",
  },
  {
    type: "ReLU",
    name: "ReLU",
    shape: "16×16×256",
    desc: "Applies nonlinearity.",
  },
  {
    type: "MaxPool",
    name: "MaxPooling 2×2",
    shape: "8×8×256",
    desc: "Downsamples to compact, high-level representation.",
  },
  {
    type: "Dropout",
    name: "Dropout 0.4",
    shape: "8×8×256",
    desc: "Even stronger regularization to avoid memorization.",
  },
  {
    type: "Flatten",
    name: "Flatten",
    shape: "16384",
    desc: "Converts the 8×8×256 volume into a 1D vector for dense layers.",
  },
  {
    type: "Dense",
    name: "Dense 256 + BN + ReLU",
    shape: "256",
    desc: "Fully-connected layer learns a compact summary; normalized and rectified.",
  },
  {
    type: "Dropout",
    name: "Dropout 0.5",
    shape: "256",
    desc: "Strong regularization before the final layers.",
  },
  {
    type: "Dense",
    name: "Dense 128 + BN + ReLU",
    shape: "128",
    desc: "Further compresses into 128-dimensional representation.",
  },
  {
    type: "Dropout",
    name: "Dropout 0.5",
    shape: "128",
    desc: "Regularizes dense representation.",
  },
  {
    type: "Dense",
    name: "Dense 1 (Sigmoid)",
    shape: "1",
    desc: "Outputs probability of Parkinson's (0..1).",
  },
];

const typeColor = (t) => {
  switch (t) {
    case "Input":
      return "#e2f0ff";
    case "Conv2D":
      return "#d6f5d6";
    case "BatchNorm":
      return "#fff2cc";
    case "ReLU":
      return "#ffe6e6";
    case "MaxPool":
      return "#e6e6ff";
    case "Dropout":
      return "#f3e5f5";
    case "Flatten":
      return "#e0f7fa";
    case "Dense":
      return "#fbe9e7";
    default:
      return "#f5f5f5";
  }
};

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

export default function ModelExplain() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [explain, setExplain] = useState(null);
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
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const handleExplain = async () => {
    if (!file) {
      setError("Please select an image first.");
      return;
    }
    setIsLoading(true);
    setError("");
    setExplain(null);
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

      const url_c1_edgeX = toDataURL(c1_edgeX, g.width, g.height);
      const url_c1_edgeY = toDataURL(c1_edgeY, g.width, g.height);
      const url_c1_sharp = toDataURL(c1_sharp, g.width, g.height);
      const url_c1_blur = toDataURL(c1_blur, g.width, g.height);
      const url_r1_edgeX = toDataURL(r1_edgeX, g.width, g.height);
      const url_r1_edgeY = toDataURL(r1_edgeY, g.width, g.height);
      const url_r1_sharp = toDataURL(r1_sharp, g.width, g.height);
      const url_r1_blur = toDataURL(r1_blur, g.width, g.height);
      const url_p_edgeX = toDataURL(
        p_edgeX.data,
        p_edgeX.width,
        p_edgeX.height
      );
      const url_p_edgeY = toDataURL(
        p_edgeY.data,
        p_edgeY.width,
        p_edgeY.height
      );
      const url_p_sharp = toDataURL(
        p_sharp.data,
        p_sharp.width,
        p_sharp.height
      );
      const url_p_blur = toDataURL(p_blur.data, p_blur.width, p_blur.height);
      const url_c2 = toDataURL(c2, p_edgeX.width, p_edgeX.height);

      const layers = [
        {
          name: "Conv 3×3 (Edge X)",
          type: "Conv2D",
          shape: [1, g.height, g.width, 1],
          img: url_c1_edgeX,
        },
        {
          name: "Conv 3×3 (Edge Y)",
          type: "Conv2D",
          shape: [1, g.height, g.width, 1],
          img: url_c1_edgeY,
        },
        {
          name: "Conv 3×3 (Sharpen)",
          type: "Conv2D",
          shape: [1, g.height, g.width, 1],
          img: url_c1_sharp,
        },
        {
          name: "Conv 3×3 (Blur)",
          type: "Conv2D",
          shape: [1, g.height, g.width, 1],
          img: url_c1_blur,
        },
        {
          name: "ReLU (Edge X)",
          type: "ReLU",
          shape: [1, g.height, g.width, 1],
          img: url_r1_edgeX,
        },
        {
          name: "MaxPool 2×2 (Edge X)",
          type: "MaxPool",
          shape: [1, p_edgeX.height, p_edgeX.width, 1],
          img: url_p_edgeX,
        },
        {
          name: "Second Conv 3×3 on pooled",
          type: "Conv2D",
          shape: [1, p_edgeX.height, p_edgeX.width, 1],
          img: url_c2,
        },
      ];

      const convQueue = [
        url_c1_edgeX,
        url_c1_edgeY,
        url_c1_sharp,
        url_c1_blur,
        url_c2,
      ];
      const reluQueue = [url_r1_edgeX, url_r1_edgeY, url_r1_sharp, url_r1_blur];
      const poolQueue = [url_p_edgeX, url_p_edgeY, url_p_sharp, url_p_blur];
      const frames = [];
      let last = inputUrl;
      for (const ml of modelLayers) {
        let img;
        switch (ml.type) {
          case "Input":
            img = inputUrl;
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
        frames.push(img);
        last = img;
      }

      setExplain({
        input: { image: inputUrl, shape: [128, 128, 1] },
        layers,
        frames,
      });
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
          Upload a drawing to see example Conv/ReLU/Pooling transformations.
          Below, we list all layers in the network.
        </p>
      </header>

      <div className='explain'>
        <main className='explain-main'>
          {explain?.frames && (
            <section className='activations'>
              <h3 className='section-title'>Layer outputs</h3>
              <div className='frames-grid'>
                {modelLayers.map((ml, i) => (
                  <div className='frame-item' key={i}>
                    <div className='frame-img'>
                      <img src={explain.frames[i]} alt={`Layer ${i} output`} />
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

          <section className='arch' style={{ marginTop: 16 }}>
            <h3 className='section-title'>Network architecture</h3>
            <section className='explain-grid'>
              {modelLayers.map((l, idx) => (
                <div
                  key={idx}
                  className='node'
                  style={{ backgroundColor: typeColor(l.type) }}
                >
                  <div className='node-title'>{l.name}</div>
                  <div className='node-type'>{l.type}</div>
                  <div className='node-shape'>Output: {l.shape}</div>
                </div>
              ))}
            </section>
          </section>
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
