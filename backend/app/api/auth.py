import os
import datetime
from typing import Optional, Dict, Any
import jwt
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Revoked tokens set for logout mechanism
revoked_tokens = set()

# Pre-configured platform users across enterprise roles
USERS_DB: Dict[str, Dict[str, Any]] = {
    "admin": {
        "id": "USR-001",
        "username": "Admin User",
        "email": "admin@supplychain.ai",
        "role": "ADMIN",
        "password": "password123"
    },
    "logistics_manager": {
        "id": "USR-002",
        "username": "Logistics Manager",
        "email": "logistics@supplychain.ai",
        "role": "LOGISTICS MANAGER",
        "password": "password123"
    },
    "analyst": {
        "id": "USR-003",
        "username": "Risk Analyst",
        "email": "analyst@supplychain.ai",
        "role": "ANALYST",
        "password": "password123"
    },
    "viewer": {
        "id": "USR-004",
        "username": "Platform Viewer",
        "email": "viewer@supplychain.ai",
        "role": "VIEWER",
        "password": "password123"
    }
}

class LoginRequest(BaseModel):
    username: str
    password: Optional[str] = None
    role: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

def create_access_token(user_data: Dict[str, Any], expires_delta: Optional[datetime.timedelta] = None) -> str:
    to_encode = {
        "sub": user_data["username"],
        "id": user_data["id"],
        "email": user_data["email"],
        "role": user_data["role"],
    }
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.datetime.utcnow()})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def get_current_user_from_token(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication token")
    
    token = authorization.split(" ")[1]
    if token in revoked_tokens:
        raise HTTPException(status_code=401, detail="Token has been revoked")
    
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return {
            "id": payload.get("id"),
            "username": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest):
    uname = (req.username or "").strip().lower()
    user = None
    
    # Check direct key match
    if uname in USERS_DB:
        user = USERS_DB[uname]
    else:
        # Search by username, email, role, or role aliases
        for key, u in USERS_DB.items():
            if (
                u["username"].lower() == uname 
                or u["email"].lower() == uname 
                or u["role"].lower() == uname
                or key.replace("_", " ") == uname
                or (req.role and u["role"].upper() == req.role.upper())
            ):
                user = u
                break

    # If still not matched, check substring keywords
    if not user:
        if "admin" in uname:
            user = USERS_DB["admin"]
        elif "logistics" in uname:
            user = USERS_DB["logistics_manager"]
        elif "analyst" in uname:
            user = USERS_DB["analyst"]
        elif "viewer" in uname:
            user = USERS_DB["viewer"]
        else:
            # Fallback to admin so user is never stranded
            user = USERS_DB["admin"]
        
    # Accept standard password, demo passwords, or blank in demo mode
    pwd = (req.password or "").strip()
    valid_passwords = {user["password"], "password123", "admin123", "password", "admin", ""}
    if pwd and pwd not in valid_passwords:
        raise HTTPException(
            status_code=401, 
            detail="Incorrect password. Use 'password123' for any account, or click a Quick Role Sign-In button."
        )
        
    token = create_access_token(user)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@router.get("/me")
def get_me(user: Dict[str, Any] = Depends(get_current_user_from_token)):
    return {
        "id": user["id"],
        "username": user["username"],
        "email": user["email"],
        "role": user["role"]
    }

@router.post("/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        revoked_tokens.add(token)
    return {"status": "SUCCESS", "message": "Successfully logged out and session revoked"}
