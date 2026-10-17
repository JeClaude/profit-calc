from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime, timedelta
from jose import JWTError, jwt
import motor.motor_asyncio
import os
from dotenv import load_dotenv

# Modern password hashing (bypasses bcrypt 72-byte limit & version errors)
from pwdlib import PasswordHash

load_dotenv()

app = FastAPI(title="Profit Calculator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE SETUP ---
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_key_change_in_production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7 # 7 days

client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
db = client.profit_calculator_db
users_collection = db.get_collection("users")
history_collection = db.get_collection("history")

# --- AUTH SETUP ---
password_hash = PasswordHash.recommended()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# --- MODELS ---
class UserRegister(BaseModel):
    phone_number: str
    password: str

class UserLogin(BaseModel):
    phone_number: str
    password: str

class PackDetail(BaseModel):
    kg: float = Field(gt=0)
    cost: float = Field(gt=0)

class PurchaseInput(BaseModel):
    product_name: str
    packs: List[PackDetail]
    selling_price_per_kg: float = Field(gt=0)

class SaveCalculationInput(PurchaseInput):
    result_data: dict

# --- HELPERS ---
def verify_password(plain_password, hashed_password):
    return password_hash.verify(plain_password, hashed_password)

def get_password_hash(password):
    return password_hash.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        phone_number: str = payload.get("sub")
        if phone_number is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await users_collection.find_one({"phone_number": phone_number})
    if user is None:
        raise credentials_exception
    return user

# --- ROUTES: AUTHENTICATION ---
@app.post("/api/register")
async def register(user: UserRegister):
    existing_user = await users_collection.find_one({"phone_number": user.phone_number})
    if existing_user:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    hashed_password = get_password_hash(user.password)
    new_user = {
        "phone_number": user.phone_number,
        "password": hashed_password,
        "created_at": datetime.utcnow()
    }
    await users_collection.insert_one(new_user)
    return {"message": "User created successfully"}

@app.post("/api/login")
async def login(user: UserLogin):
    # Find user in DB
    db_user = await users_collection.find_one({"phone_number": user.phone_number})
    
    # Verify password
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Incorrect phone number or password")
    
    access_token = create_access_token(data={"sub": db_user["phone_number"]})
    return {"access_token": access_token, "token_type": "bearer"}

# --- ROUTES: CALCULATIONS ---
@app.post("/api/calculate")
def calculate(data: PurchaseInput):
    total_kg = 0
    total_cost = 0
    pack_results = []

    for i, pack in enumerate(data.packs):
        pack_total_cost = pack.cost
        pack_cost_per_kg = pack.cost / pack.kg
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

    overall_cost_per_kg = total_cost / total_kg if total_kg > 0 else 0
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
            "profit_per_kg": round(data.selling_price_per_kg - overall_cost_per_kg, 2),
            "total_profit": round(total_profit, 2),
            "profit_margin_percent": round(profit_margin, 2),
            "is_loss": total_profit < 0,
        },
        "packs_breakdown": pack_results
    }

# --- ROUTES: SAVE & HISTORY ---
@app.post("/api/save-calculation")
async def save_calculation(data: SaveCalculationInput, current_user: dict = Depends(get_current_user)):
    record = {
        "user_id": str(current_user["_id"]),
        "phone_number": current_user["phone_number"],
        "created_at": datetime.utcnow(),
        "product_name": data.product_name,
        "packs": [pack.model_dump() for pack in data.packs],
        "selling_price_per_kg": data.selling_price_per_kg,
        "result_data": data.result_data
    }
    await history_collection.insert_one(record)
    return {"message": "Calculation saved successfully"}

@app.get("/api/history")
async def get_history(
    start_date: str = None, 
    end_date: str = None, 
    current_user: dict = Depends(get_current_user)
):
    # Base query: only get this user's history
    query = {"user_id": str(current_user["_id"])}
    
    # If a date filter is provided, add it to the query
    if start_date or end_date:
        date_filter = {}
        if start_date:
            date_filter["$gte"] = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        if end_date:
            date_filter["$lte"] = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        
        query["created_at"] = date_filter

    # Fetch and sort
    cursor = history_collection.find(query).sort("created_at", -1)
    history = await cursor.to_list(length=200)
    
    # Format for frontend
    for item in history:
        item["_id"] = str(item["_id"])
        item["created_at"] = item["created_at"].isoformat()
        
    return history