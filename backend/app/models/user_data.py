from __future__ import annotations

from datetime import datetime

from sqlalchemy import String, Float, DateTime, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserVitaminEntry(Base):
    __tablename__ = "user_vitamin_entries"
    __table_args__ = (
        Index('ix_user_vitamin_entry', 'user_id', 'vitamin_id'),
        Index('ix_user_entry_date', 'user_id', 'entry_date'),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    vitamin_id: Mapped[int] = mapped_column(ForeignKey("vitamins.id"))
    value: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(20))
    entry_date: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)

    user: Mapped["User"] = relationship(back_populates="vitamin_entries")


class Favorite(Base):
    __tablename__ = "favorites"
    __table_args__ = (
        UniqueConstraint('user_id', 'recipe_id', name='uq_favorite_user_recipe'),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="favorites")
