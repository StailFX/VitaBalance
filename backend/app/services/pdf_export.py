from io import BytesIO
from pathlib import Path
from typing import List, Tuple

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from app.schemas.analysis import VitaminAnalysisItem

PAGE_WIDTH, PAGE_HEIGHT = A4
LEFT_MARGIN = 18 * mm
RIGHT_MARGIN = 18 * mm
TOP_MARGIN = 20 * mm
BOTTOM_MARGIN = 16 * mm
CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN

FONT_NAME = "DejaVuSans"
FONT_BOLD_NAME = "DejaVuSans-Bold"
FONT_DIR = Path("/usr/share/fonts/truetype/dejavu")
FONT_PATH = FONT_DIR / "DejaVuSans.ttf"
FONT_BOLD_PATH = FONT_DIR / "DejaVuSans-Bold.ttf"


def _ensure_fonts_registered() -> None:
    registered = pdfmetrics.getRegisteredFontNames()
    if FONT_NAME not in registered and FONT_PATH.exists():
        pdfmetrics.registerFont(TTFont(FONT_NAME, str(FONT_PATH)))
    if FONT_BOLD_NAME not in registered and FONT_BOLD_PATH.exists():
        pdfmetrics.registerFont(TTFont(FONT_BOLD_NAME, str(FONT_BOLD_PATH)))


def _status_label(status: str) -> str:
    if status == "deficiency":
        return "Дефицит"
    if status == "excess":
        return "Избыток"
    if status == "normal":
        return "Норма"
    return "Нет данных"


def _summary_rows(analysis: List[VitaminAnalysisItem]) -> List[Tuple[str, int]]:
    return [
        ("Дефицитов", sum(1 for item in analysis if item.status == "deficiency")),
        ("В норме", sum(1 for item in analysis if item.status == "normal")),
        ("Избыток", sum(1 for item in analysis if item.status == "excess")),
        ("Нет данных", sum(1 for item in analysis if item.status == "no_data")),
    ]


def build_analysis_pdf(analysis: List[VitaminAnalysisItem]) -> bytes:
    _ensure_fonts_registered()

    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    pdf.setTitle("Vita Balance - Анализ витаминов")

    def start_page() -> float:
        pdf.setFont(FONT_BOLD_NAME, 18)
        pdf.setFillColor(HexColor("#111827"))
        pdf.drawString(LEFT_MARGIN, PAGE_HEIGHT - TOP_MARGIN, "Vita Balance")
        pdf.setFont(FONT_NAME, 12)
        pdf.setFillColor(HexColor("#374151"))
        pdf.drawString(LEFT_MARGIN, PAGE_HEIGHT - TOP_MARGIN - 8 * mm, "Экспорт анализа витаминов")
        pdf.setStrokeColor(HexColor("#E5E7EB"))
        pdf.line(LEFT_MARGIN, PAGE_HEIGHT - TOP_MARGIN - 12 * mm, PAGE_WIDTH - RIGHT_MARGIN, PAGE_HEIGHT - TOP_MARGIN - 12 * mm)
        return PAGE_HEIGHT - TOP_MARGIN - 18 * mm

    def ensure_space(y: float, needed: float) -> float:
        if y - needed < BOTTOM_MARGIN:
            pdf.showPage()
            return start_page()
        return y

    def draw_wrapped(text: str, x: float, y: float, width: float, font_name: str = FONT_NAME, font_size: int = 10, color: str = "#111827", leading: float = 5.2 * mm) -> float:
        pdf.setFont(font_name, font_size)
        pdf.setFillColor(HexColor(color))
        lines = simpleSplit(text, font_name, font_size, width)
        for line in lines:
            pdf.drawString(x, y, line)
            y -= leading
        return y

    y = start_page()

    pdf.setFont(FONT_BOLD_NAME, 13)
    pdf.setFillColor(HexColor("#111827"))
    pdf.drawString(LEFT_MARGIN, y, "Сводка")
    y -= 7 * mm

    for label, value in _summary_rows(analysis):
        y = ensure_space(y, 9 * mm)
        pdf.setFont(FONT_BOLD_NAME, 11)
        pdf.setFillColor(HexColor("#111827"))
        pdf.drawString(LEFT_MARGIN, y, f"{label}:")
        pdf.setFont(FONT_NAME, 11)
        pdf.drawString(LEFT_MARGIN + 42 * mm, y, str(value))
        y -= 6 * mm

    priority_deficiencies = [
        item for item in sorted(
            analysis,
            key=lambda current: current.severity,
            reverse=True,
        )
        if item.status == "deficiency" and item.severity > 0
    ][:3]

    if priority_deficiencies:
        y -= 3 * mm
        y = ensure_space(y, 18 * mm)
        pdf.setFont(FONT_BOLD_NAME, 13)
        pdf.setFillColor(HexColor("#111827"))
        pdf.drawString(LEFT_MARGIN, y, "Приоритетные дефициты")
        y -= 7 * mm
        for item in priority_deficiencies:
            y = ensure_space(y, 12 * mm)
            text = f"{item.vitamin_name}: дефицит {item.severity:.1f}%"
            y = draw_wrapped(text, LEFT_MARGIN, y, CONTENT_WIDTH, FONT_NAME, 10, "#B91C1C")
            y -= 1.5 * mm

    y -= 2 * mm
    y = ensure_space(y, 12 * mm)
    pdf.setFont(FONT_BOLD_NAME, 13)
    pdf.setFillColor(HexColor("#111827"))
    pdf.drawString(LEFT_MARGIN, y, "Показатели")
    y -= 7 * mm

    sorted_analysis = sorted(
        analysis,
        key=lambda item: (
            0 if item.status == "deficiency" else
            1 if item.status == "excess" else
            2 if item.status == "normal" else
            3,
            item.vitamin_name,
        ),
    )

    for item in sorted_analysis:
        block_height = 18 * mm
        y = ensure_space(y, block_height)

        pdf.setFillColor(HexColor("#F8FAFC"))
        pdf.roundRect(LEFT_MARGIN, y - 12 * mm, CONTENT_WIDTH, 14 * mm, 3 * mm, stroke=0, fill=1)

        pdf.setFont(FONT_BOLD_NAME, 10)
        pdf.setFillColor(HexColor("#111827"))
        pdf.drawString(LEFT_MARGIN + 4 * mm, y - 1 * mm, item.vitamin_name)

        pdf.setFont(FONT_NAME, 9)
        pdf.setFillColor(HexColor("#374151"))
        value_text = f"Значение: {item.value if item.value is not None else '—'} {item.unit}"
        norm_text = f"Норма: {item.norm_min}–{item.norm_max} {item.unit}"
        status_text = _status_label(item.status)
        if item.severity > 0:
            status_text += f" ({item.severity:.1f}%)"

        pdf.drawString(LEFT_MARGIN + 4 * mm, y - 6 * mm, value_text)
        pdf.drawString(LEFT_MARGIN + 62 * mm, y - 6 * mm, norm_text)
        pdf.drawRightString(PAGE_WIDTH - RIGHT_MARGIN - 4 * mm, y - 6 * mm, status_text)
        y -= 17 * mm

    pdf.save()
    return buffer.getvalue()
