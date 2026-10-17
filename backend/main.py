from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List

app = FastAPI(title="Profit Calculator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Remember to restrict this in production
    allow_methods=["*"],
    allow_headers=["*"],
)

class PackDetail(BaseModel):
    kg: float = Field(gt=0, description="Weight of this specific pack in kg")
    cost: float = Field(gt=0, description="Buying price of this specific pack")

class PurchaseInput(BaseModel):
    product_name: str
    packs: List[PackDetail]
    selling_price_per_kg: float = Field(gt=0)

@app.post("/api/calculate")
def calculate(data: PurchaseInput):
    total_kg = 0
    total_cost = 0
    pack_results = []

    # 1. Calculate general totals
    for i, pack in enumerate(data.packs):
        pack_total_cost = pack.cost
        pack_cost_per_kg = pack.cost / pack.kg
        
        # Calculate profit for this specific pack
        pack_revenue = data.selling_price_per_kg * pack.kg
        pack_profit = pack_revenue - pack_total_cost
        
        total_kg += pack.kg
        total_cost += pack_total_cost

        pack_results.append({
            "pack_number": i + 1,
            "kg": pack.kg,
            "cost": pack.cost,
            "cost_per_kg": round(pack_cost_per_kg, 2),
            "revenue": round(pack_revenue, 2),
            "profit": round(pack_profit, 2),
            "profit_margin_percent": round((pack_profit / pack.cost) * 100, 2) if pack.cost > 0 else 0
        })

    # 2. General summary calculations
    overall_cost_per_kg = total_cost / total_kg if total_kg > 0 else 0
    profit_per_kg = data.selling_price_per_kg - overall_cost_per_kg
    
    total_revenue = data.selling_price_per_kg * total_kg
    total_profit = total_revenue - total_cost
    profit_margin = (total_profit / total_cost) * 100 if total_cost > 0 else 0

    return {
        "product_name": data.product_name,
        "summary": {
            "total_kg": round(total_kg, 2),
            "total_cost": round(total_cost, 2),
            "cost_per_kg": round(overall_cost_per_kg, 2),
            "selling_price_per_kg": data.selling_price_per_kg,
            "total_revenue": round(total_revenue, 2),
        },
        "profit": {
            "profit_per_kg": round(profit_per_kg, 2),
            "total_profit": round(total_profit, 2),
            "profit_margin_percent": round(profit_margin, 2),
            "is_loss": total_profit < 0,
        },
        "packs_breakdown": pack_results
    }