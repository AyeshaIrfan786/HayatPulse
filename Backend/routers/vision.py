

import io
import os

import numpy as np
from fastapi import APIRouter, File, HTTPException, UploadFile
from PIL import Image
from tensorflow.keras.models import load_model

IMG_SIZE = (224, 224)
MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "ml_models")

router = APIRouter(prefix="/api/vision", tags=["vision"])

MODEL_CONFIG = {
    "xray": {
        "file": os.path.join(MODELS_DIR, "xray_model.h5"),
        "label_0": "Normal",
        "label_1": "Pneumonia suspected",
    },
    "skin": {
        "file": os.path.join(MODELS_DIR, "skin_model.h5"),
        "label_0": "Benign / low concern",
        "label_1": "Suspicious - refer for review",
    },
    "eye": {
        "file": os.path.join(MODELS_DIR, "eye_model.h5"),
        "label_0": "Cataract signs detected - refer for review",
        "label_1": "No signs detected (normal)",
    },
}

_loaded_models = {}


def get_model(key):
    if key not in _loaded_models:
        path = MODEL_CONFIG[key]["file"]
        if not os.path.exists(path):
            return None
        _loaded_models[key] = load_model(path)
    return _loaded_models[key]


async def run_prediction(key: str, file: UploadFile):
    model = get_model(key)
    if model is None:
        raise HTTPException(
            status_code=503,
            detail=f"The '{key}' model file wasn't found in core_backend/ml_models/. "
                   f"Copy {os.path.basename(MODEL_CONFIG[key]['file'])} there.",
        )

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    raw = await file.read()
    img = Image.open(io.BytesIO(raw)).convert("RGB").resize(IMG_SIZE)
    arr = np.expand_dims(np.array(img) / 255.0, axis=0)

    score = float(model.predict(arr, verbose=0)[0][0])
    is_class_1 = score > 0.5
    finding = MODEL_CONFIG[key]["label_1"] if is_class_1 else MODEL_CONFIG[key]["label_0"]
    confidence = score if is_class_1 else (1 - score)

    return {
        "status": "success",
        "module": key,
        "finding": finding,
        "confidence": round(confidence, 3),
        "disclaimer": "Pre-screening result only. Not a diagnosis - refer to a qualified doctor.",
    }


@router.get("/status")
def vision_status():
    trained = [k for k in MODEL_CONFIG if os.path.exists(MODEL_CONFIG[k]["file"])]
    return {"status": "Vision models ready", "available_models": trained}


@router.post("/xray")
async def predict_xray(file: UploadFile = File(...)):
    return await run_prediction("xray", file)


@router.post("/skin")
async def predict_skin(file: UploadFile = File(...)):
    return await run_prediction("skin", file)


@router.post("/eye")
async def predict_eye(file: UploadFile = File(...)):
    return await run_prediction("eye", file)