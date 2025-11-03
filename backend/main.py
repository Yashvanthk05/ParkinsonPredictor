from fastapi import FastAPI,File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import pickle
import xgboost as xgb
import joblib
import numpy as np
import pandas as pd
from PIL import Image
import io
import tensorflow as tf
import base64
import math
from scipy.stats import skew, kurtosis
from typing import Literal,List, Dict, Any,Optional 
from model import TypingInput, VoiceInput

app = FastAPI(title="Parkinson's Predictor API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    spiralmodel=tf.keras.models.load_model("spiralmodel.h5")
    wavemodel=tf.keras.models.load_model("wavemodel.h5")
    
    voicemodel = xgb.XGBClassifier()
    voicemodel.load_model("parkinsons_xgb.json")
    
    typingmodel = joblib.load("voting_model.joblib")

except Exception as e:
    print(f"Error loading models: {e}")
    
NUMERICAL_FEATURES = [
    'L_HoldTime_mean', 'R_HoldTime_mean', 'L_HoldTime_std', 'R_HoldTime_std',
    'L_HoldTime_skew', 'R_HoldTime_skew', 'L_HoldTime_kurt', 'R_HoldTime_kurt',
    'LL_LatencyTime_mean', 'LR_LatencyTime_mean', 'RL_LatencyTime_mean', 'RR_LatencyTime_mean',
    'LL_LatencyTime_std', 'LR_LatencyTime_std', 'RL_LatencyTime_std', 'RR_LatencyTime_std',
    'LL_LatencyTime_skew', 'LR_LatencyTime_skew', 'RL_LatencyTime_skew', 'RR_LatencyTime_skew',
    'LL_LatencyTime_kurt', 'LR_LatencyTime_kurt', 'RL_LatencyTime_kurt', 'RR_LatencyTime_kurt',
    'mean_diff_LR_RL_LatencyTime', 'mean_diff_LL_RR_LatencyTime',
    'mean_diff_L_R_HoldTime'
]
CATEGORICAL_FEATURES_OHE = ['Gender_Female', 'Gender_Male']
ALL_FEATURES_ORDER = NUMERICAL_FEATURES + CATEGORICAL_FEATURES_OHE

def extract_keystroke_features(log: List[Dict[str, Any]], gender: str) -> pd.DataFrame:
    import pandas as pd
    import numpy as np
    from scipy.stats import skew, kurtosis

    df = pd.DataFrame(log)

    if df.empty:
        print("Warning: Empty log received.")
        features = {col: 0 for col in NUMERICAL_FEATURES}
        features['Gender'] = gender 
        return pd.DataFrame([features])[ALL_FEATURES_ORDER]

    for col in ["hand", "holdTime", "latency", "direction"]:
        if col not in df.columns:
            df[col] = np.nan

    df["holdTime"] = pd.to_numeric(df["holdTime"], errors='coerce')
    df["latency"] = pd.to_numeric(df["latency"], errors='coerce')

    df_hold = df.dropna(subset=["hand", "holdTime"])
    df_latency = df.dropna(subset=["direction", "latency"])
    df_latency = df_latency[df_latency["latency"] > 0] 

    features = {}

    for hand in ["L", "R"]:
        vals = df_hold.loc[df_hold["hand"] == hand, "holdTime"]
        features[f"{hand}_HoldTime_mean"] = vals.mean()
        features[f"{hand}_HoldTime_std"] = vals.std(ddof=0)
        features[f"{hand}_HoldTime_skew"] = skew(vals) if len(vals) > 2 else 0
        features[f"{hand}_HoldTime_kurt"] = kurtosis(vals) if len(vals) > 3 else 0

    for direction in ["LL", "LR", "RL", "RR"]:
        vals = df_latency.loc[df_latency["direction"] == direction, "latency"]
        features[f"{direction}_LatencyTime_mean"] = vals.mean()
        features[f"{direction}_LatencyTime_std"] = vals.std(ddof=0)
        features[f"{direction}_LatencyTime_skew"] = skew(vals) if len(vals) > 2 else 0
        features[f"{direction}_LatencyTime_kurt"] = kurtosis(vals) if len(vals) > 3 else 0

    features["mean_diff_LR_RL_LatencyTime"] = features.get("LR_LatencyTime_mean", 0) - features.get("RL_LatencyTime_mean", 0)
    features["mean_diff_LL_RR_LatencyTime"] = features.get("LL_LatencyTime_mean", 0) - features.get("RR_LatencyTime_mean", 0)
    features["mean_diff_L_R_HoldTime"] = features.get("L_HoldTime_mean", 0) - features.get("R_HoldTime_mean", 0)

    features["Gender_Female"] = 1 if gender == "Female" else 0
    features["Gender_Male"]= 1 if gender == "Male" else 0

    df_features = pd.DataFrame([features]).fillna(0)
    
    return df_features[ALL_FEATURES_ORDER]

@app.post("/predicttyping")
def predict_typing(data: TypingInput):
    try:
        if not data.log:
            raise HTTPException(status_code=400, detail="Empty keystroke log")

        log_dicts = [entry.dict() for entry in data.log]
        
        X = extract_keystroke_features(log_dicts, data.gender)
        
        X.to_csv("debug_typing_features_raw_for_pipeline.csv", index=False) 
        
        y_pred = typingmodel.predict(X)[0]
        y_prob = typingmodel.predict_proba(X)[0][1]
        
        return {"prediction": int(y_pred), "probability": float(y_prob)}

    except Exception as e:
        print(f"Error in /predicttyping: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predictvoice")
def predict_voice(data: VoiceInput):
    try:
        df = pd.DataFrame([data.dict()])
        prob = voicemodel.predict_proba(df)[:, 1][0]
        pred = int(prob > 0.5)
        return {"prediction": pred, "probability": float(prob)}
    except Exception as e:
        print(f"Error in /predictvoice: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


def preprocess_image(image_bytes):
    img = Image.open(io.BytesIO(image_bytes)).convert("L")
    img = img.resize((128, 128))
    img = np.array(img).astype("float32") / 255.0
    img = np.expand_dims(img, axis=(0, -1))
    return img

@app.post("/predictspiral")
async def predict_spiral(file: UploadFile = File(...)):
    try:
        image_bytes=await file.read()
        img=preprocess_image(image_bytes)
        prediction=spiralmodel.predict(img)[0][0]
        pred_class=int(prediction>0.5)
        return {"prediction": pred_class, "probability": float(prediction)}
    except Exception as e:
        print(f"Error in /predictspiral: {e}")
        raise HTTPException(status_code=500, detail=f"Image prediction failed: {str(e)}")


@app.post("/predictwave")
async def predict_wave(file: UploadFile = File(...)):
    try:
        image_bytes=await file.read()
        img=preprocess_image(image_bytes)
        prediction=wavemodel.predict(img)[0][0]
        pred_class=int(prediction>0.5)
        return {"prediction": pred_class, "probability": float(prediction)}
    except Exception as e:
        print(f"Error in /predictwave: {e}")
        raise HTTPException(status_code=500, detail=f"Image prediction failed: {str(e)}")


def _ensure_wave_intermediate_model():
    """Build or reuse an intermediate model that outputs feature maps for all layers.
    Returns (intermediate_model, layer_meta) where layer_meta is a list of dicts with
    name, type, and output_shape for each output layer.
    """
    global _wave_intermediate_model, _wave_layer_meta
    try:
        _ = _wave_intermediate_model  # noqa
        _ = _wave_layer_meta  # noqa
    except NameError:
        _wave_intermediate_model = None
        _wave_layer_meta = None

    if _wave_intermediate_model is not None:
        return _wave_intermediate_model, _wave_layer_meta

    def collect_feature_layers(model: tf.keras.Model):
        outs_local = []
        meta_local = []
        for lyr in getattr(model, 'layers', []):
            # Obtain output shape robustly
            shp = None
            try:
                shp = getattr(lyr, 'output_shape', None)
                if shp is None:
                    out = getattr(lyr, 'output', None)
                    shp = getattr(out, 'shape', None)
            except Exception:
                shp = None

            rank = None
            shp_list = None
            if shp is not None:
                if isinstance(shp, (tuple, list)):
                    shp_list = list(shp)
                    rank = len(shp_list)
                elif isinstance(shp, tf.TensorShape):
                    shp_list = shp.as_list()
                    rank = shp.rank
                else:
                    try:
                        shp_list = list(shp)
                        rank = len(shp_list)
                    except Exception:
                        shp_list = None

            # We want 4D activations: (batch, H, W, C)
            if rank == 4 and shp_list is not None:
                try:
                    outs_local.append(lyr.output)
                    meta_local.append({
                        "name": lyr.name,
                        "type": lyr.__class__.__name__,
                        "shape": shp_list,
                    })
                except Exception:
                    # Some layers may not be accessible this way; skip
                    continue
        return outs_local, meta_local

    # Try primary wave model first
    candidates = []
    if 'wavemodel' in globals() and isinstance(wavemodel, tf.keras.Model):
        candidates.append(("wavemodel", wavemodel))
    # Try optional wavemodel2 if present on disk
    try:
        wavemodel2 = tf.keras.models.load_model("wavemodel2.h5")
        candidates.append(("wavemodel2", wavemodel2))
    except Exception:
        pass
    # As a last resort, try spiralmodel (if it's a CNN)
    if 'spiralmodel' in globals() and isinstance(spiralmodel, tf.keras.Model):
        candidates.append(("spiralmodel", spiralmodel))

    for name, model in candidates:
        outs, meta = collect_feature_layers(model)
        if outs:
            _wave_intermediate_model = tf.keras.Model(inputs=model.input, outputs=outs)
            _wave_layer_meta = meta
            return _wave_intermediate_model, _wave_layer_meta

    raise RuntimeError("No 4D feature map layers found in candidate models")


def _activation_to_mosaic(act: np.ndarray, max_channels: int = 16, tile_cols: int = 4) -> Image.Image:
    """Convert a 4D activation (1, H, W, C) into a tiled PIL image.
    Only the first max_channels channels are included.
    """
    if act.ndim != 4:
        raise ValueError("Activation must be 4D (1, H, W, C)")
    _, h, w, c = act.shape
    c = min(c, max_channels)
    # Normalize each channel to 0..255
    tiles = []
    for i in range(c):
        ch = act[0, :, :, i]
        ch_min = float(np.min(ch))
        ch_max = float(np.max(ch))
        if ch_max > ch_min:
            ch_norm = (ch - ch_min) / (ch_max - ch_min)
        else:
            ch_norm = np.zeros_like(ch)
        img = (ch_norm * 255.0).astype(np.uint8)
        tiles.append(Image.fromarray(img, mode='L'))

    tile_rows = int(math.ceil(c / tile_cols))
    mosaic = Image.new('L', (w * tile_cols, h * tile_rows))
    for idx, tile in enumerate(tiles):
        r = idx // tile_cols
        col = idx % tile_cols
        mosaic.paste(tile, (col * w, r * h))
    return mosaic


def _img_to_data_url(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    return f"data:image/png;base64,{b64}"


@app.post("/explainwave")
async def explain_wave(file: UploadFile = File(...)):
    """Return per-layer feature map mosaics for the wave CNN."""
    try:
        image_bytes = await file.read()
        # Preprocess input to 128x128x1 [0,1]
        img_tensor = preprocess_image(image_bytes)

        # Create a displayable preprocessed image
        display_arr = (img_tensor[0, :, :, 0] * 255.0).astype(np.uint8)
        display_img = Image.fromarray(display_arr, mode='L')
        display_url = _img_to_data_url(display_img)

        inter_model, meta = _ensure_wave_intermediate_model()
        activations = inter_model.predict(img_tensor)

        # If only one layer, Keras returns a single array, normalize to list
        if not isinstance(activations, list):
            activations = [activations]

        layers_payload = []
        for m, act in zip(meta, activations):
            try:
                mosaic = _activation_to_mosaic(act, max_channels=16, tile_cols=4)
                mosaic_url = _img_to_data_url(mosaic)
            except Exception:
                mosaic_url = None
            layers_payload.append({
                "name": m["name"],
                "type": m["type"],
                "shape": m["shape"],
                "mosaic": mosaic_url,
            })

        return {
            "input": {"image": display_url, "shape": [128, 128, 1]},
            "layers": layers_payload,
        }
    except Exception as e:
        print(f"Error in /explainwave: {e}")
        raise HTTPException(status_code=500, detail=f"Explain failed: {str(e)}")


@app.get("/")
def root():
    return {"message": "Welcome to Parkinson's Predictor API"}

