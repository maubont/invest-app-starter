from __future__ import annotations

from pydantic import BaseModel, Field


class ProjectInputs(BaseModel):
    price: float = Field(..., description="Precio unitario del producto o servicio")
    volume: int = Field(..., description="Unidades esperadas por periodo")
    wacc: float = Field(..., description="Costo de capital ponderado")
    capex: float | None = Field(
        default=None,
        description="Inversión de capital inicial opcional que complementa el cálculo",
    )


class Assumption(BaseModel):
    key: str = Field(..., description="Identificador de la hipótesis")
    value: float = Field(..., description="Valor numérico asociado a la hipótesis")
    description: str | None = Field(
        default=None, description="Descripción corta del supuesto"
    )


class CashflowResult(BaseModel):
    years: list[int] = Field(..., description="Serie de años evaluados")
    cashflows: list[float] = Field(
        ..., description="Flujos de caja correspondientes por año"
    )


class RunSummary(BaseModel):
    van: float = Field(..., description="Valor Actual Neto calculado")
    tir: float | None = Field(default=None, description="Tasa interna de retorno")
    payback_years: int | None = Field(
        default=None, description="Primer año en el que el flujo acumulado es positivo"
    )


class RunResponse(BaseModel):
    summary: RunSummary
    years: list[int]
    cashflows: list[float]

    class Config:
        schema_extra = {
            "example": {
                "summary": {
                    "van": 1_250_000.54,
                    "tir": 0.21,
                    "payback_years": 4,
                },
                "years": [0, 1, 2, 3, 4, 5],
                "cashflows": [-1_000_000, 300_000, 320_000, 340_000, 360_000, 380_000],
            }
        }
