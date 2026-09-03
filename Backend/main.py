import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import get_db_connection

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hayatpulse")

app = FastAPI(title="HayatPulse AI Core API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:3000", "http://127.0.0.1:3000",
        "http://localhost:8080", "http://127.0.0.1:8080",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_router_specs = [
    ("routers.ocr", "OCR"),
    ("routers.vision", "Vision"),
    ("routers.maternal", "Maternal"),
]

for module_path, label in _router_specs:
    try:
        module = __import__(module_path, fromlist=["router"])
        app.include_router(module.router)
        logger.info(f"[OK] {label} router loaded")
    except Exception as e:
        logger.warning(f"[SKIPPED] {label} router could not be loaded: {e}")


@app.get("/")
def read_root():
    return {"status": "HayatPulse Enterprise Backend is Online"}


@app.get("/api/hospitals")
def get_hospitals():
    """Fetches all hospitals with available ICU beds from MySQL."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM hospitals ORDER BY available_icus DESC")
    hospitals = cursor.fetchall()

    cursor.close()
    conn.close()
    return {"status": "success", "count": len(hospitals), "data": hospitals}


@app.get("/api/hospitals/available-icu")
def get_available_icu():
    """Filters hospitals that have at least 1 open ICU bed."""
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error")

    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM hospitals WHERE available_icus > 0 ORDER BY available_icus DESC")
    available_hospitals = cursor.fetchall()

    cursor.close()
    conn.close()
    return {"status": "success", "count": len(available_hospitals), "data": available_hospitals}