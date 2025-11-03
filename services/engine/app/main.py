
from fastapi import FastAPI
from pydantic import BaseModel
import numpy as np

app = FastAPI()

class RunPayload(BaseModel):
    version_id: str
    mode: str = "unlevered"
    inputs: dict | None = None

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/run")
def run(payload: RunPayload):
    price = float((payload.inputs or {}).get("price", 100))
    volume = float((payload.inputs or {}).get("volume", 1000))
    wacc = float((payload.inputs or {}).get("wacc", 0.15))

    years = list(range(0, 6))
    cf = np.array([-500000] + [price*volume*0.2 for _ in range(5)])
    van = cf[0] + np.sum(cf[1:] / (1+wacc) ** np.arange(1, len(cf)))
    try:
        tir = np.irr(cf)
    except Exception:
        tir = None

    return {"summary":{"van":float(van),"tir":float(tir) if tir else None},"cashflows":[float(x) for x in cf],"years":years}
