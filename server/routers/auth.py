"""Auth routes — signup, login, me."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.database import get_db
from server.models import User
from server.schemas import SignupRequest, LoginRequest, UserOut
from server.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(user: User) -> dict:
    return UserOut.model_validate(user).model_dump(mode="json")


# ── POST /api/auth/signup ────────────────────────
@router.post("/signup", status_code=201)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == body.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already in use")

    user = User(
        name=body.name.strip(),
        email=body.email.lower().strip(),
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"id": str(user.id), "email": user.email})

    return {"token": token, "user": _user_out(user)}


# ── POST /api/auth/login ─────────────────────────
@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).where(User.email == body.email.lower())
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"id": str(user.id), "email": user.email})

    return {"token": token, "user": _user_out(user)}


# ── GET /api/auth/me ─────────────────────────────
@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return {"user": _user_out(current_user)}
