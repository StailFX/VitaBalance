from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, DateTime, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    message: Mapped[str] = mapped_column(Text)
    type: Mapped[str] = mapped_column(String(50))  # 'deficiency', 'reminder', 'achievement', 'info'
    read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
