from sqlalchemy import String, Float, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Vitamin(Base):
    __tablename__ = "vitamins"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    code: Mapped[str] = mapped_column(String(20), unique=True)
    description: Mapped[str] = mapped_column(Text)
    deficiency_symptoms: Mapped[str] = mapped_column(Text)
    excess_symptoms: Mapped[str] = mapped_column(Text)
    unit: Mapped[str] = mapped_column(String(30))
    norm_male_min: Mapped[float] = mapped_column(Float)
    norm_male_max: Mapped[float] = mapped_column(Float)
    norm_female_min: Mapped[float] = mapped_column(Float)
    norm_female_max: Mapped[float] = mapped_column(Float)


class SymptomVitaminMap(Base):
    __tablename__ = "symptom_vitamin_map"

    id: Mapped[int] = mapped_column(primary_key=True)
    symptom_text: Mapped[str] = mapped_column(String(255))
    vitamin_id: Mapped[int] = mapped_column(ForeignKey("vitamins.id"), index=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
