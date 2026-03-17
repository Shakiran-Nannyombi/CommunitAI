"""
Auth routes.

POST /auth/register  — create account, returns JWT
POST /auth/login     — email+password, returns JWT
GET  /auth/me        — validate token, returns user info
POST /auth/demo      — log in as the demo account (creates it if needed)
"""

from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.db import get_db
from backend.models.db import User

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    display_name: str = ""


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    display_name: str
    is_demo: bool


# ── Helpers ───────────────────────────────────────────────────────────────────

def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _make_token(user: User) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode(
        {"sub": str(user.id), "exp": expire},
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


def _token_response(user: User) -> TokenOut:
    return TokenOut(
        access_token=_make_token(user),
        user_id=str(user.id),
        email=user.email,
        display_name=user.display_name,
        is_demo=user.is_demo,
    )


async def _get_or_create_demo(db: AsyncSession) -> User:
    """Return the demo user, creating it (and seeding data) if it doesn't exist."""
    result = await db.execute(select(User).where(User.email == settings.DEMO_EMAIL))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            email=settings.DEMO_EMAIL,
            hashed_password=_hash(settings.DEMO_PASSWORD),
            display_name="Demo User",
            is_demo=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    return user


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenOut, status_code=201)
async def register(payload: RegisterIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        hashed_password=_hash(payload.password),
        display_name=payload.display_name or payload.email.split("@")[0],
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=TokenOut)
async def login(payload: LoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not _verify(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return _token_response(user)


@router.post("/demo", response_model=TokenOut)
async def demo_login(db: AsyncSession = Depends(get_db)) -> TokenOut:
    user = await _get_or_create_demo(db)
    return _token_response(user)


@router.get("/me", response_model=TokenOut)
async def me(token: str, db: AsyncSession = Depends(get_db)) -> TokenOut:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload["sub"]
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return _token_response(user)
