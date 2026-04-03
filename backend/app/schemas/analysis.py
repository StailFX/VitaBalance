from typing import Optional, List
from pydantic import BaseModel


class VitaminAnalysisItem(BaseModel):
    vitamin_id: int
    vitamin_name: str
    value: Optional[float]
    unit: str
    norm_min: float
    norm_max: float
    status: str  # 'deficiency', 'normal', 'excess'
    severity: float  # percentage deviation from norm (0 = normal)


class HistoryVitaminEntry(BaseModel):
    vitamin_id: int
    vitamin_name: str
    value: float
    unit: str
    status: str

    class Config:
        from_attributes = True


class AnalysisSnapshot(BaseModel):
    date: str
    entries: List[HistoryVitaminEntry]


class ProductSearchResult(BaseModel):
    id: int
    name: str
    category: str
    vitamin_content: List["ProductVitaminContent"]

    class Config:
        from_attributes = True


class ProductVitaminContent(BaseModel):
    vitamin_id: int
    vitamin_name: str
    amount_per_100g: float
    unit: str


class ComparisonItem(BaseModel):
    vitamin_name: str
    date1_value: Optional[float] = None
    date2_value: Optional[float] = None
    change_percent: Optional[float] = None
    status1: str
    status2: str


ProductSearchResult.model_rebuild()
