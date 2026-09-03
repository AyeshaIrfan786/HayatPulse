

import os

import joblib
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "ml_models")
MODEL_PATH = os.path.join(MODELS_DIR, "maternal_risk_model.joblib")
ENCODER_PATH = os.path.join(MODELS_DIR, "maternal_risk_label_encoder.joblib")

router = APIRouter(prefix="/api/maternal", tags=["maternal"])

_model = None
_label_encoder = None


def get_model_and_encoder():
    global _model, _label_encoder
    if _model is None:
        if not os.path.exists(MODEL_PATH) or not os.path.exists(ENCODER_PATH):
            return None, None
        _model = joblib.load(MODEL_PATH)
        _label_encoder = joblib.load(ENCODER_PATH)
    return _model, _label_encoder


class VitalsInput(BaseModel):
    age: int = Field(..., ge=10, le=90)
    systolic_bp: int = Field(..., ge=50, le=250)
    diastolic_bp: int = Field(..., ge=30, le=180)
    blood_sugar: float = Field(..., ge=2.0, le=30.0)
    body_temp: float = Field(..., ge=90.0, le=110.0)
    heart_rate: int = Field(..., ge=30, le=200)


@router.get("/status")
def maternal_status():
    model, _ = get_model_and_encoder()
    return {"status": "Maternal model ready" if model else "Maternal model not found", "model_trained": model is not None}


@router.post("/predict")
def predict_risk(vitals: VitalsInput):
    model, label_encoder = get_model_and_encoder()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="The maternal risk model wasn't found in core_backend/ml_models/. "
                   "Copy maternal_risk_model.joblib and maternal_risk_label_encoder.joblib there.",
        )

    row = pd.DataFrame([{
        "Age": vitals.age,
        "SystolicBP": vitals.systolic_bp,
        "DiastolicBP": vitals.diastolic_bp,
        "BS": vitals.blood_sugar,
        "BodyTemp": vitals.body_temp,
        "HeartRate": vitals.heart_rate,
    }])

    prediction = model.predict(row)[0]
    probabilities = model.predict_proba(row)[0]
    label = label_encoder.inverse_transform([prediction])[0]
    confidence = float(max(probabilities))

    return {
        "status": "success",
        "risk_level": label,
        "confidence": round(confidence, 3),
        "disclaimer": "Automated risk pre-screening only. Not a diagnosis - refer to a qualified doctor for any concerning readings.",
    }