from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import numpy_financial as npf  # irr real

app = FastAPI(title="Engine", version="0.1.0")

# CORS para permitir llamadas desde el front (localhost:3000)
ALLOWED_ORIGINS = [
    "http://localhost:3000", "http://127.0.0.1:3000",
    "http://localhost:3001", "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "service": "engine"}

@app.get("/health")
def health():
    return {"ok": True}

class RunPayload(BaseModel):
    version_id: str
    mode: str = "unlevered"
    inputs: dict | None = None

@app.post("/run")
def run(payload: RunPayload):
    x = payload.inputs or {}
    price  = float(x.get("price", 100))
    volume = float(x.get("volume", 1000))
    wacc   = float(x.get("wacc", 0.15))

    years = list(range(0, 11))  # t0..t10
    cashflows = np.array([-1_000_000.0] + [price * volume * 0.20 for _ in range(10)], dtype=float)

    van = float(cashflows[0] + np.sum(cashflows[1:] / (1.0 + wacc) ** np.arange(1, len(cashflows))))
    try:
        tir = float(npf.irr(cashflows))
    except Exception:
        tir = None

    cum = np.cumsum(cashflows)
    payback_years = next((i for i, v in enumerate(cum) if v >= 0), None)

    return {"summary": {"van": van, "tir": tir, "payback_years": payback_years},
            "cashflows": [float(c) for c in cashflows],
            "years": years}
