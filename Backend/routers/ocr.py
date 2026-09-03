import os
import shutil
import sys
from fastapi import  APIRouter, UploadFile, File, HTTPException

# module_ocr path ko import ke liye add karna
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from module_ocr.ocr_engine import process_prescription

router = APIRouter(prefix="/api/ocr", tags=["OCR Module"])

TEMP_DIR = "temp_uploads"
os.makedirs(TEMP_DIR, exist_ok=True)

@router.post("/upload")
async def upload_prescription(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed.")

    file_path = os.path.join(TEMP_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        result = process_prescription(file_path)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
    
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)