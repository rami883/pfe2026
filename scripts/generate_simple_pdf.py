from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "RAPPORT_PROJET_POUR_IA.md"
TARGET = ROOT / "RAPPORT_PROJET_POUR_IA.pdf"

PAGE_WIDTH = 595
PAGE_HEIGHT = 842
LEFT_MARGIN = 50
TOP_MARGIN = 60
BOTTOM_MARGIN = 50
FONT_SIZE = 11
LINE_HEIGHT = 15
MAX_CHARS = 88


def normalize_markdown_line(line: str) -> str:
    stripped = line.rstrip()

    if not stripped:
        return ""

    heading_match = re.match(r"^(#+)\s+(.*)$", stripped)
    if heading_match:
        level = len(heading_match.group(1))
        text = heading_match.group(2).strip()
        if level <= 2:
            return text.upper()
        return text

    if stripped.startswith("- "):
        return "- " + stripped[2:].strip()

    numbered_match = re.match(r"^(\d+)\.\s+(.*)$", stripped)
    if numbered_match:
        return f"{numbered_match.group(1)}. {numbered_match.group(2).strip()}"

    return stripped


def wrap_text(line: str, width: int = MAX_CHARS) -> list[str]:
    if not line:
        return [""]

    words = line.split()
    wrapped: list[str] = []
    current = ""

    for word in words:
        candidate = word if not current else f"{current} {word}"
        if len(candidate) <= width:
            current = candidate
            continue
        if current:
            wrapped.append(current)
        current = word

    if current:
        wrapped.append(current)

    return wrapped or [""]


def escape_pdf_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


def paginate(lines: list[str]) -> list[list[str]]:
    usable_height = PAGE_HEIGHT - TOP_MARGIN - BOTTOM_MARGIN
    lines_per_page = usable_height // LINE_HEIGHT
    pages: list[list[str]] = []
    current_page: list[str] = []

    for line in lines:
        if len(current_page) >= lines_per_page:
            pages.append(current_page)
            current_page = []
        current_page.append(line)

    if current_page:
        pages.append(current_page)

    return pages


def build_stream(lines: list[str]) -> bytes:
    start_y = PAGE_HEIGHT - TOP_MARGIN
    content = [
        "BT",
        f"/F1 {FONT_SIZE} Tf",
        f"1 0 0 1 {LEFT_MARGIN} {start_y} Tm",
    ]

    first_line = True
    for line in lines:
        if first_line:
            first_line = False
        else:
            content.append(f"0 -{LINE_HEIGHT} Td")

        printable = escape_pdf_text(line) if line else " "
        content.append(f"({printable}) Tj")

    content.append("ET")
    return "\n".join(content).encode("latin-1", errors="replace")


def build_pdf(pages: list[list[str]]) -> bytes:
    objects: list[bytes] = []

    def add_object(payload: bytes) -> int:
        objects.append(payload)
        return len(objects)

    font_id = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    page_object_ids: list[int] = []
    content_object_ids: list[int] = []
    pages_root_id_placeholder = add_object(b"<<>>")

    for page_lines in pages:
        stream = build_stream(page_lines)
        content_id = add_object(
            b"<< /Length "
            + str(len(stream)).encode("ascii")
            + b" >>\nstream\n"
            + stream
            + b"\nendstream"
        )
        content_object_ids.append(content_id)
        page_object_ids.append(0)

    for content_id in content_object_ids:
        page_id = add_object(
            (
                f"<< /Type /Page /Parent {pages_root_id_placeholder} 0 R "
                f"/MediaBox [0 0 {PAGE_WIDTH} {PAGE_HEIGHT}] "
                f"/Resources << /Font << /F1 {font_id} 0 R >> >> "
                f"/Contents {content_id} 0 R >>"
            ).encode("ascii")
        )
        page_object_ids[page_object_ids.index(0)] = page_id

    kids = " ".join(f"{page_id} 0 R" for page_id in page_object_ids)
    pages_root_payload = (
        f"<< /Type /Pages /Count {len(page_object_ids)} /Kids [{kids}] >>".encode(
            "ascii"
        )
    )
    objects[pages_root_id_placeholder - 1] = pages_root_payload

    catalog_id = add_object(
        f"<< /Type /Catalog /Pages {pages_root_id_placeholder} 0 R >>".encode("ascii")
    )

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]

    for index, payload in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf.extend(f"{index} 0 obj\n".encode("ascii"))
        pdf.extend(payload)
        pdf.extend(b"\nendobj\n")

    xref_offset = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    trailer = (
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\n"
        f"startxref\n{xref_offset}\n%%EOF\n"
    )
    pdf.extend(trailer.encode("ascii"))
    return bytes(pdf)


def main() -> None:
    source_lines = SOURCE.read_text(encoding="utf-8").splitlines()
    normalized_lines: list[str] = []

    for raw_line in source_lines:
        line = normalize_markdown_line(raw_line)
        normalized_lines.extend(wrap_text(line))

    pdf_bytes = build_pdf(paginate(normalized_lines))
    TARGET.write_bytes(pdf_bytes)
    print(f"PDF generated: {TARGET}")


if __name__ == "__main__":
    main()
