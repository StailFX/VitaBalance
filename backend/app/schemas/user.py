import re
from typing import Optional, List, Literal
from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=100)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class PasswordChange(BaseModel):
    old_password: str
    new_password: str = Field(min_length=6, max_length=100)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=100)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class ProfileUpdate(BaseModel):
    gender: Optional[Literal["male", "female"]] = None
    age: Optional[int] = Field(None, ge=1, le=150)
    height_cm: Optional[float] = Field(None, gt=0, le=300)
    weight_kg: Optional[float] = Field(None, gt=0, le=500)


class ProfileOut(BaseModel):
    gender: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None

    class Config:
        from_attributes = True


class UserOut(BaseModel):
    id: int
    email: str
    profile: Optional[ProfileOut] = None

    class Config:
        from_attributes = True
