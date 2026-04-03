import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User, UserProfile, PasswordResetToken
from app.schemas.user import (
    UserCreate, Token, RefreshRequest, PasswordChange,
    PasswordResetRequest, PasswordResetConfirm,
)
from app.auth_utils import (
    hash_password, verify_password,
    create_access_token, create_refresh_token, decode_refresh_token,
    get_current_user,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(request: Request, data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.scalar(select(User).where(User.email == data.email))
    if existing:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")

    user = User(email=data.email, password_hash=hash_password(data.password))
    db.add(user)
    await db.flush()

    profile = UserProfile(user_id=user.id)
    db.add(profile)
    await db.commit()

    return {"message": "Регистрация успешна"}


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    user = await db.scalar(select(User).where(User.email == form_data.username))
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")

    return Token(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/refresh", response_model=Token)
@limiter.limit("30/minute")
async def refresh_tokens(
    request: Request,
    data: RefreshRequest,
    db: AsyncSession = Depends(get_db),
):
    user_id = decode_refresh_token(data.refresh_token)

    user = await db.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(status_code=401, detail="Пользователь не найден")

    return Token(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.put("/change-password")
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Неверный текущий пароль")

    current_user.password_hash = hash_password(data.new_password)
    await db.commit()
    return {"message": "Пароль успешно изменён"}


@router.post("/password-reset/request")
@limiter.limit("3/minute")
async def request_password_reset(
    request: Request,
    data: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request a password reset token. Always returns success to prevent email enumeration."""
    user = await db.scalar(select(User).where(User.email == data.email))
    if user:
        token = secrets.token_urlsafe(48)
        expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        db.add(PasswordResetToken(
            user_id=user.id,
            token=token,
            expires_at=expires_at,
        ))
        await db.commit()
        # In production, send token via email.
        # For now, return it in the response (dev mode only).
        from app.config import settings
        if not settings.is_production:
            return {"message": "Токен сброса создан", "reset_token": token}

    return {"message": "Если аккаунт существует, инструкции будут отправлены на email"}


@router.post("/password-reset/confirm")
@limiter.limit("5/minute")
async def confirm_password_reset(
    request: Request,
    data: PasswordResetConfirm,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using a valid reset token."""
    reset = await db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token == data.token,
            PasswordResetToken.used == False,
        )
    )
    if not reset:
        raise HTTPException(status_code=400, detail="Неверный или использованный токен")

    if reset.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Токен истёк")

    user = await db.scalar(select(User).where(User.id == reset.user_id))
    if not user:
        raise HTTPException(status_code=400, detail="Пользователь не найден")

    user.password_hash = hash_password(data.new_password)
    reset.used = True
    await db.commit()

    return {"message": "Пароль успешно сброшен"}
