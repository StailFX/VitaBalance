from datetime import datetime
from typing import List
from pydantic import BaseModel, Field


class VitaminOut(BaseModel):
    id: int
    name: str
    code: str
    description: str
    deficiency_symptoms: str
    excess_symptoms: str
    unit: str
    norm_male_min: float
    norm_male_max: float
    norm_female_min: float
    norm_female_max: float

    class Config:
        from_attributes = True


class SymptomOut(BaseModel):
    id: int
    symptom_text: str
    vitamin_id: int
    weight: float

    class Config:
        from_attributes = True


class VitaminEntryCreate(BaseModel):
    vitamin_id: int
    value: float = Field(gt=0)
    source: str = "lab"


class VitaminEntryOut(BaseModel):
    id: int
    vitamin_id: int
    value: float
    source: str
    entry_date: datetime

    class Config:
        from_attributes = True


class SymptomSubmit(BaseModel):
    symptom_ids: List[int] = Field(min_length=1)
