from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, BackgroundTasks, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from pathlib import Path
from dotenv import load_dotenv
from jose import JWTError, jwt
from passlib.context import CryptContext
import stripe
import os
import logging
import uuid
import random

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'default_secret_key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 720  # 30 days

# Stripe setup
STRIPE_API_KEY = os.environ.get('STRIPE_API_KEY')
stripe.api_key = STRIPE_API_KEY
# Subscription packages - SECURITY: Define on backend only
SUBSCRIPTION_PACKAGES = {
    "monthly": {"amount": 10.00, "currency": "usd", "period": "month"},
    "yearly": {"amount": 100.00, "currency": "usd", "period": "year"}  # ~16% discount
}

# Create the main app
app = FastAPI(title="Golf Charity Subscription Platform")

# Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ========== MODELS ==========

class UserRole(str):
    USER = "user"
    ADMIN = "admin"

class SubscriptionStatus(str):
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    CANCELLED = "cancelled"

class PaymentStatus(str):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"

class DrawStatus(str):
    DRAFT = "draft"
    SIMULATED = "simulated"
    PUBLISHED = "published"

class VerificationStatus(str):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

# Request/Response Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    charity_id: Optional[str] = None
    charity_contribution_percent: int = 10

    @field_validator('charity_contribution_percent')
    @classmethod
    def validate_contribution(cls, v):
        if v < 10 or v > 100:
            raise ValueError('Contribution must be between 10-100%')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    charity_id: Optional[str] = None
    charity_contribution_percent: int = 10
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ScoreCreate(BaseModel):
    score_value: int
    score_date: datetime

    @field_validator('score_value')
    @classmethod
    def validate_score(cls, v):
        if v < 1 or v > 45:
            raise ValueError('Score must be between 1-45 (Stableford format)')
        return v

class ScoreResponse(BaseModel):
    id: str
    user_id: str
    score_value: int
    score_date: datetime
    created_at: datetime

class CharityCreate(BaseModel):
    name: str
    description: str
    image_url: Optional[str] = None
    events: Optional[List[str]] = []
    featured: bool = False

class CharityResponse(BaseModel):
    id: str
    name: str
    description: str
    image_url: Optional[str] = None
    events: List[str] = []
    featured: bool = False
    created_at:Optional[datetime] = None

class SubscriptionCreate(BaseModel):
    package_id: str  # \"monthly\" or \"yearly\"
    origin_url: str  # Frontend origin for redirect URLs

class DrawCreate(BaseModel):
    draw_date: datetime
    draw_logic: str = "random"  # "random" or "algorithmic"

class DrawResponse(BaseModel):
    id: str
    draw_date: datetime
    numbers_drawn: Optional[List[int]] = None
    draw_logic: str
    status: str
    published_at: Optional[datetime] = None
    prize_pool_5: float = 0.0
    prize_pool_4: float = 0.0
    prize_pool_3: float = 0.0
    created_at: datetime

class WinnerResponse(BaseModel):
    id: str
    draw_id: str
    user_id: str
    user_email: str
    user_name: str
    match_type: int  # 3, 4, or 5
    prize_amount: float
    verification_status: str
    proof_url: Optional[str] = None
    payment_status: str
    created_at: datetime

# ========== AUTHENTICATION HELPERS ==========

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

async def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ========== AUTH ENDPOINTS ==========

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    hashed_pw = hash_password(user_data.password)
    
    user = {
        "id": user_id,
        "email": user_data.email,
        "password": hashed_pw,
        "full_name": user_data.full_name,
        "role": UserRole.USER,
        "charity_id": user_data.charity_id,
        "charity_contribution_percent": user_data.charity_contribution_percent,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    # Create token
    token = create_access_token({"sub": user_id})
    
    # Remove password from response
    user.pop("password")
    user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return TokenResponse(access_token=token, user=UserResponse(**user))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token({"sub": user["id"]})
    
    user.pop("password")
    user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return TokenResponse(access_token=token, user=UserResponse(**user))

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user['created_at'] = datetime.fromisoformat(current_user['created_at'])
    return UserResponse(**current_user)

# ========== SUBSCRIPTION ENDPOINTS ==========

@api_router.post("/subscriptions/create-checkout")
async def create_subscription_checkout(
    data: SubscriptionCreate,
    current_user: dict = Depends(get_current_user)
):
    if data.package_id not in SUBSCRIPTION_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid subscription package")
    
    package = SUBSCRIPTION_PACKAGES[data.package_id]
    
    success_url = f"{data.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{data.origin_url}/subscription/cancel"
    
    try:
        # Create checkout session using official Stripe SDK
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': package["currency"],
                    'product_data': {
                        'name': f"Golf Charity {data.package_id.capitalize()} Subscription",
                    },
                    'unit_amount': int(package["amount"] * 100), # Stripe expects cents
                },
                'quantity': 1,
            }],
            mode='payment', # Use 'subscription' here if you set up Stripe Billing products
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": current_user["id"],
                "package_id": data.package_id,
                "purpose": "subscription"
            }
        )
    except Exception as e:
        logger.error(f"Stripe Checkout Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
    # Create payment transaction record
    transaction = {
        "id": str(uuid.uuid4()),
        "session_id": session.id, # Official SDK uses session.id
        "user_id": current_user["id"],
        "package_id": data.package_id,
        "amount": package["amount"],
        "currency": package["currency"],
        "payment_status": PaymentStatus.PENDING,
        "purpose": "subscription",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(transaction)
    
    # Return the URL so your React frontend can redirect the user
    return {"session_id": session.id, "url": session.url}


@api_router.get("/subscriptions/checkout-status/{session_id}")
async def get_checkout_status(session_id: str, current_user: dict = Depends(get_current_user)):
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction["payment_status"] == PaymentStatus.PAID:
        return {"status": "complete", "payment_status": "paid", "message": "Subscription already activated"}
    
    try:
        # Retrieve session from official Stripe SDK
        checkout_status = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        logger.error(f"Stripe Retrieve Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve payment status")
    
    # Update transaction if paid ('paid' is the standard status in Stripe)
    if checkout_status.payment_status == "paid" and transaction["payment_status"] != PaymentStatus.PAID:
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": PaymentStatus.PAID, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        package_id = transaction["package_id"]
        start_date = datetime.now(timezone.utc)
        end_date = start_date + timedelta(days=365 if package_id == "yearly" else 30)
        
        existing_sub = await db.subscriptions.find_one({"user_id": current_user["id"]})
        
        if existing_sub:
            await db.subscriptions.update_one(
                {"user_id": current_user["id"]},
                {"$set": {
                    "status": SubscriptionStatus.ACTIVE,
                    "plan_type": package_id,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        else:
            subscription = {
                "id": str(uuid.uuid4()),
                "user_id": current_user["id"],
                "plan_type": package_id,
                "status": SubscriptionStatus.ACTIVE,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.subscriptions.insert_one(subscription)
    
    return {
        "status": checkout_status.status,
        "payment_status": checkout_status.payment_status,
        "amount_total": checkout_status.amount_total / 100 if checkout_status.amount_total else 0, # Convert back to dollars
        "currency": checkout_status.currency
    }



@api_router.get("/subscriptions/my-subscription")
async def get_my_subscription(current_user: dict = Depends(get_current_user)):
    subscription = await db.subscriptions.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return subscription or {"status": "none"}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    # 1. Read the raw payload and signature
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature")
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    
    if not webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET is not set in .env")
        raise HTTPException(status_code=500, detail="Webhook secret missing")

    event = None

    # 2. Securely verify the event came from Stripe
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        logger.error("Invalid payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error("Invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # 3. Handle the successful checkout event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Extract the custom data we passed during checkout creation
        session_id = session.get('id')
        metadata = session.get('metadata', {})
        user_id = metadata.get('user_id')
        package_id = metadata.get('package_id')
        
        if user_id and package_id:
            logger.info(f"Processing successful payment for user {user_id}, package {package_id}")
            
            # Update the transaction record
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": PaymentStatus.PAID, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            # Calculate subscription dates
            start_date = datetime.now(timezone.utc)
            end_date = start_date + timedelta(days=365 if package_id == "yearly" else 30)
            
            # Upsert (update or insert) the user's subscription
            existing_sub = await db.subscriptions.find_one({"user_id": user_id})
            
            if existing_sub:
                await db.subscriptions.update_one(
                    {"user_id": user_id},
                    {"$set": {
                        "status": SubscriptionStatus.ACTIVE,
                        "plan_type": package_id,
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
            else:
                await db.subscriptions.insert_one({
                    "id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "plan_type": package_id,
                    "status": SubscriptionStatus.ACTIVE,
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
        else:
            logger.warning(f"Checkout completed but missing metadata: {session_id}")

    # Acknowledge receipt of the event
    return {"status": "success"}

# ========== SCORE ENDPOINTS ==========

@api_router.post("/scores", response_model=ScoreResponse)
async def create_score(score_data: ScoreCreate, current_user: dict = Depends(get_current_user)):
    # Check subscription
    subscription = await db.subscriptions.find_one({"user_id": current_user["id"]})
    if not subscription or subscription.get("status") != SubscriptionStatus.ACTIVE:
        raise HTTPException(status_code=403, detail="Active subscription required")
    
    # Get existing scores count
    scores_count = await db.scores.count_documents({"user_id": current_user["id"]})
    
    # If user has 5 scores, delete the oldest one
    if scores_count >= 5:
        oldest_score = await db.scores.find_one(
            {"user_id": current_user["id"]},
            sort=[("score_date", 1)]
        )
        await db.scores.delete_one({"id": oldest_score["id"]})
    
    # Create new score
    score = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "score_value": score_data.score_value,
        "score_date": score_data.score_date.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.scores.insert_one(score)
    
    score['score_date'] = datetime.fromisoformat(score['score_date'])
    score['created_at'] = datetime.fromisoformat(score['created_at'])
    
    return ScoreResponse(**score)

@api_router.get("/scores/my-scores", response_model=List[ScoreResponse])
async def get_my_scores(current_user: dict = Depends(get_current_user)):
    scores = await db.scores.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("score_date", -1).to_list(5)
    
    for score in scores:
        score['score_date'] = datetime.fromisoformat(score['score_date'])
        score['created_at'] = datetime.fromisoformat(score['created_at'])
    
    return [ScoreResponse(**score) for score in scores]

@api_router.delete("/scores/{score_id}")
async def delete_score(score_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.scores.delete_one({"id": score_id, "user_id": current_user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Score not found")
    return {"message": "Score deleted"}

# ========== CHARITY ENDPOINTS ==========

@api_router.post("/charities", response_model=CharityResponse)
async def create_charity(charity_data: CharityCreate, current_user: dict = Depends(get_current_admin)):
    charity = {
        "id": str(uuid.uuid4()),
        **charity_data.model_dump(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.charities.insert_one(charity)
    
    charity['created_at'] = datetime.fromisoformat(charity['created_at'])
    return CharityResponse(**charity)


@api_router.get("/charities", response_model=List[CharityResponse])
async def get_charities():
    try:
        # Use plural 'charities' to match your Atlas collection
        cursor = db.charities.find() 
        charities_data = await cursor.to_list(length=100) 
        
        charities_list = []
        
        for charity in charities_data:
            # 1. Map MongoDB _id to the 'id' field expected by your model
            charity["id"] = str(charity["_id"])
            
            # 2. Safety check for the date
            # We set it to None if it's missing or broken
            if 'created_at' in charity and charity['created_at']:
                if isinstance(charity['created_at'], str):
                    try:
                        charity['created_at'] = datetime.fromisoformat(charity['created_at'])
                    except (ValueError, TypeError):
                        charity['created_at'] = None
                # If it's already a datetime object, leave it as is
            else:
                charity['created_at'] = None
                
            # 3. Create the response object
            charities_list.append(charity)
            
        return charities_list
        
    except Exception as e:
        print(f"ERROR FETCHING CHARITIES: {e}")
        # Returning an empty list is safer than letting it crash
        return []
    


@api_router.get("/charities/{charity_id}", response_model=CharityResponse)
async def get_charity(charity_id: str):
    try:
        # Check by the string ID field or convert to ObjectId if necessary
        charity = await db.charities.find_one({"id": charity_id})
        
        if not charity:
            raise HTTPException(status_code=404, detail="Charity not found")
        
        # Mapping _id to id if needed
        if "_id" in charity:
            charity["id"] = str(charity["_id"])

        # Safe date conversion
        if 'created_at' in charity and isinstance(charity['created_at'], str):
            try:
                charity['created_at'] = datetime.fromisoformat(charity['created_at'])
            except:
                charity['created_at'] = None
        
        return charity
    except Exception as e:
        print(f"Error fetching single charity: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    
@api_router.delete("/charities/{charity_id}")
async def delete_charity(charity_id: str, current_user: dict = Depends(get_current_admin)):
    result = await db.charities.delete_one({"id": charity_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Charity not found")
    return {"message": "Charity deleted"}

@api_router.put("/users/charity-selection")
async def update_charity_selection(
    charity_id: str,
    contribution_percent: int = 10,
    current_user: dict = Depends(get_current_user)
):
    if contribution_percent < 10 or contribution_percent > 100:
        raise HTTPException(status_code=400, detail="Contribution must be between 10-100%")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {
            "charity_id": charity_id,
            "charity_contribution_percent": contribution_percent
        }}
    )
    
    return {"message": "Charity selection updated"}

# ========== DRAW ENDPOINTS ==========

@api_router.post("/draws", response_model=DrawResponse)
async def create_draw(draw_data: DrawCreate, current_user: dict = Depends(get_current_admin)):
    draw = {
        "id": str(uuid.uuid4()),
        "draw_date": draw_data.draw_date.isoformat(),
        "draw_logic": draw_data.draw_logic,
        "status": DrawStatus.DRAFT,
        "numbers_drawn": None,
        "published_at": None,
        "prize_pool_5": 0.0,
        "prize_pool_4": 0.0,
        "prize_pool_3": 0.0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.draws.insert_one(draw)
    
    draw['draw_date'] = datetime.fromisoformat(draw['draw_date'])
    draw['created_at'] = datetime.fromisoformat(draw['created_at'])
    
    return DrawResponse(**draw)

@api_router.post("/draws/{draw_id}/simulate")
async def simulate_draw(draw_id: str, current_user: dict = Depends(get_current_admin)):
    draw = await db.draws.find_one({"id": draw_id}, {"_id": 0})
    if not draw:
        raise HTTPException(status_code=404, detail="Draw not found")
    
    # Generate 5 random numbers (simulating user scores 1-45)
    numbers = [random.randint(1, 45) for _ in range(5)]
    
    # Calculate prize pools based on active subscribers
    active_subs_count = await db.subscriptions.count_documents({"status": SubscriptionStatus.ACTIVE})
    
    # Assume 10 per subscription goes to prize pool
    total_pool = active_subs_count * 10.0
    
    prize_5 = total_pool * 0.40  # 40%
    prize_4 = total_pool * 0.35  # 35%
    prize_3 = total_pool * 0.25  # 25%
    
    # Find winners (match user scores with drawn numbers)
    # For now, this is simplified - in production, you'd check actual user scores
    
    await db.draws.update_one(
        {"id": draw_id},
        {"$set": {
            "numbers_drawn": numbers,
            "status": DrawStatus.SIMULATED,
            "prize_pool_5": prize_5,
            "prize_pool_4": prize_4,
            "prize_pool_3": prize_3
        }}
    )
    
    return {"message": "Draw simulated", "numbers": numbers, "prize_pools": {
        "5_match": prize_5,
        "4_match": prize_4,
        "3_match": prize_3
    }}

@api_router.post("/draws/{draw_id}/publish")
async def publish_draw(draw_id: str, current_user: dict = Depends(get_current_admin)):
    draw = await db.draws.find_one({"id": draw_id}, {"_id": 0})
    if not draw:
        raise HTTPException(status_code=404, detail="Draw not found")
    
    if draw["status"] != DrawStatus.SIMULATED:
        raise HTTPException(status_code=400, detail="Draw must be simulated before publishing")
    
    await db.draws.update_one(
        {"id": draw_id},
        {"$set": {
            "status": DrawStatus.PUBLISHED,
            "published_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Draw published successfully"}

@api_router.get("/draws", response_model=List[DrawResponse])
async def get_draws():
    draws = await db.draws.find({}, {"_id": 0}).sort("draw_date", -1).to_list(100)
    
    for draw in draws:
        draw['draw_date'] = datetime.fromisoformat(draw['draw_date'])
        draw['created_at'] = datetime.fromisoformat(draw['created_at'])
        if draw.get('published_at'):
            draw['published_at'] = datetime.fromisoformat(draw['published_at'])
    
    return [DrawResponse(**draw) for draw in draws]

@api_router.get("/draws/{draw_id}", response_model=DrawResponse)
async def get_draw(draw_id: str):
    draw = await db.draws.find_one({"id": draw_id}, {"_id": 0})
    if not draw:
        raise HTTPException(status_code=404, detail="Draw not found")
    
    draw['draw_date'] = datetime.fromisoformat(draw['draw_date'])
    draw['created_at'] = datetime.fromisoformat(draw['created_at'])
    if draw.get('published_at'):
        draw['published_at'] = datetime.fromisoformat(draw['published_at'])
    
    return DrawResponse(**draw)

# ========== ADMIN ENDPOINTS ==========

@api_router.get("/admin/users")
async def get_all_users(current_user: dict = Depends(get_current_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.get("/admin/analytics")
async def get_analytics(current_user: dict = Depends(get_current_admin)):
    total_users = await db.users.count_documents({})
    active_subs = await db.subscriptions.count_documents({"status": SubscriptionStatus.ACTIVE})
    total_charities = await db.charities.count_documents({})
    total_draws = await db.draws.count_documents({})
    
    # Calculate total prize pool
    total_pool = active_subs * 10.0
    
    # Calculate charity contributions
    charity_contributions = active_subs * 10.0 * 0.1  # Minimum 10%
    
    return {
        "total_users": total_users,
        "active_subscriptions": active_subs,
        "total_charities": total_charities,
        "total_draws": total_draws,
        "total_prize_pool": total_pool,
        "charity_contributions": charity_contributions
    }

# ========== ROOT & HEALTH CHECK ==========

@api_router.get("/")
async def root():
    return {"message": "Golf Charity Subscription Platform API", "version": "1.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include router in app
app.include_router(api_router)

# CORS middleware
origins = [
    "http://localhost:5173",
    "https://golf-charity-app-green.vercel.app", # Your main domain
    "https://golf-charity-9zhcomft8-mittalsatyam1920-1250s-projects.vercel.app" # The specific preview link from your error
]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shutdown event
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Initialize admin user on startup
@app.on_event("startup")
async def create_admin_user():
    admin_email = "admin@example.com"
    admin_password = "Admin@1234"
    
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password": hash_password(admin_password),
            "full_name": "Platform Administrator",
            "role": UserRole.ADMIN,
            "charity_id": None,
            "charity_contribution_percent": 10,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info(f"Admin user created: {admin_email}")
    
    # Create sample charities if none exist
    charities_count = await db.charities.count_documents({})
    if charities_count == 0:
        sample_charities = [
            {
                "id": str(uuid.uuid4()),
                "name": "Golf Foundation UK",
                "description": "Supporting young people and communities through golf",
                "image_url": "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=400",
                "events": ["Annual Charity Golf Day - June 2026", "Youth Golf Camp - August 2026"],
                "featured": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Children's Health Foundation",
                "description": "Providing healthcare support for children in need",
                "image_url": "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=400",
                "events": ["Fundraiser Gala - July 2026"],
                "featured": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Environmental Golf Trust",
                "description": "Promoting sustainable golf courses and environmental conservation",
                "image_url": "https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=400",
                "events": ["Green Golf Initiative - September 2026"],
                "featured": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Veterans Golf Support",
                "description": "Helping veterans through rehabilitation and community golf programs",
                "image_url": "https://images.unsplash.com/photo-1592919505780-303950717480?w=400",
                "events": ["Veterans Golf Day - November 2026"],
                "featured": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        ]
        
        await db.charities.insert_many(sample_charities)
        logger.info(f"Created {len(sample_charities)} sample charities")
