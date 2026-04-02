from __future__ import annotations

from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    category: Mapped[str] = mapped_column(String(100))

    vitamins: Mapped[list["ProductVitamin"]] = relationship(back_populates="product", cascade="all, delete-orphan")


class ProductVitamin(Base):
    __tablename__ = "product_vitamins"

    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True)
    vitamin_id: Mapped[int] = mapped_column(ForeignKey("vitamins.id"), index=True)
    amount_per_100g: Mapped[float] = mapped_column(Float)

    product: Mapped["Product"] = relationship(back_populates="vitamins")
