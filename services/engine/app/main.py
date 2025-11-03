from __future__ import annotations

import os

import numpy as np
import numpy_financial as npf
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.models.core import Assumption, ProjectInputs, RunResponse, RunSummary


class RunRequest(BaseModel):
    project: ProjectInputs
    assumptions: list[Assumption] | None = Field(
        default=None,
        description="Supuestos adicionales de cálculo",
    )

    class Config:
        schema_extra = {
            "example": {
                "project": {
                    "price": 120.0,
                    "volume": 950,
                    "wacc": 0.12,
                    "capex": 980000,
                },
                "assumptions": [
                    {
                        "key": "margin",
                        "value": 0.2,
                        "description": "Margen operativo estimado",
                    }
                ],
            }
        }


DEFAULT_ORIGINS = {
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
}

extra_origins = {
    origin.strip()
    for origin in os.getenv("ENGINE_CORS_ORIGINS", "").split(",")
    if origin.strip()
}

ALLOWED_ORIGINS = sorted(DEFAULT_ORIGINS | extra_origins)

app = FastAPI(title="Engine", version="0.1.0")

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


@app.post(
    "/run",
    response_model=RunResponse,
    response_model_exclude_none=True,
    summary="Ejecuta el motor financiero con los parámetros del proyecto",
)
def run(payload: RunRequest) -> RunResponse:
    inputs = payload.project

    price = float(inputs.price)
    volume = float(inputs.volume)
    wacc = float(inputs.wacc)
    capex = float(inputs.capex) if inputs.capex is not None else 1_000_000.0

    years = list(range(0, 11))
    cashflows = np.array(
        [-capex] + [price * volume * 0.20 for _ in range(1, len(years))],
        dtype=float,
    )

    discount_factors = (1.0 + wacc) ** np.arange(1, len(cashflows))
    van = float(cashflows[0] + np.sum(cashflows[1:] / discount_factors))

    try:
        tir = float(npf.irr(cashflows))
    except Exception:
        tir = None

    cumulative = np.cumsum(cashflows)
    payback_years = next(
        (int(index) for index, value in enumerate(cumulative) if value >= 0),
        None,
    )

    summary = RunSummary(van=van, tir=tir, payback_years=payback_years)

    return RunResponse(
        summary=summary,
        years=years,
        cashflows=[float(value) for value in cashflows],
    )
