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
from scipy.stats import skew, kurtosis
from typing import Literal,List, Dict, Any,Optional 
from model import TypingInput, VoiceInput

app = FastAPI(title="Parkinson's Predictor API", version="1.0")

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    spiralmodel=tf.keras.models.load_model("spiralmodel.h5")
    wavemodel=tf.keras.models.load_model("wavemodel.h5")
    
    voicemodel = xgb.XGBClassifier()
    voicemodel.load_model("parkinsons_xgb.json")
    
    typingmodel = joblib.load("parkinsons_model_pipeline_svc.pkl")

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
CATEGORICAL_FEATURES = ['Gender']
ALL_FEATURES_ORDER = NUMERICAL_FEATURES + CATEGORICAL_FEATURES 

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

    features["Gender"] = gender

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


@app.get("/")
def root():
    return {"message": "Welcome to Parkinson's Predictor API"}

