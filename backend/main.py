from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Profit Calculator API")

# Allow Next.js to talk to us
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PurchaseInput(BaseModel):
    product_name: str
    packs: int = Field(gt=0, description="Number of packs bought")
    cost_per_pack: float = Field(gt=0, description="Buying price per pack")
    kg_per_pack: float = Field(gt=0, description="Weight of one pack in kg")
    selling_price_per_kg: float = Field(gt=0, description="Selling price per kg")


@app.post("/calculate")
def calculate(data: PurchaseInput):
    total_kg = data.packs * data.kg_per_pack
    total_cost = data.packs * data.cost_per_pack
    cost_per_kg = total_cost / total_kg

    profit_per_kg = data.selling_price_per_kg - cost_per_kg
    profit_per_pack = profit_per_kg * data.kg_per_pack

    total_revenue = data.selling_price_per_kg * total_kg
    total_profit = total_revenue - total_cost
    profit_margin = (total_profit / total_cost) * 100

    return {
        "product_name": data.product_name,
        "summary": {
            "total_kg": round(total_kg, 2),
            "total_cost": round(total_cost, 2),
            "cost_per_kg": round(cost_per_kg, 2),
            "selling_price_per_kg": data.selling_price_per_kg,
            "total_revenue": round(total_revenue, 2),
        },
        "profit": {
            "profit_per_kg": round(profit_per_kg, 2),
            "profit_per_pack": round(profit_per_pack, 2),
            "total_profit": round(total_profit, 2),
            "profit_margin_percent": round(profit_margin, 2),
            "is_loss": total_profit < 0,
        },
    }