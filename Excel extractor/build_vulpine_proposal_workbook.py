from __future__ import annotations

import copy
import hashlib
import re
import shutil
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


NS = {
    "ct": "http://schemas.openxmlformats.org/package/2006/content-types",
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

ET.register_namespace("", NS["main"])
ET.register_namespace("r", "http://schemas.openxmlformats.org/officeDocument/2006/relationships")
ET.register_namespace("mc", "http://schemas.openxmlformats.org/markup-compatibility/2006")
ET.register_namespace("x15", "http://schemas.microsoft.com/office/spreadsheetml/2010/11/main")
ET.register_namespace("xr", "http://schemas.microsoft.com/office/spreadsheetml/2014/revision")
ET.register_namespace("xr6", "http://schemas.microsoft.com/office/spreadsheetml/2016/revision6")
ET.register_namespace("xr10", "http://schemas.microsoft.com/office/spreadsheetml/2016/revision10")
ET.register_namespace("xr2", "http://schemas.microsoft.com/office/spreadsheetml/2015/revision2")


ROOT = Path(__file__).resolve().parent
SRC = ROOT / "Multi-Family Master Sheet V6.xlsx"
OUT_DIR = ROOT / "outputs" / "vulpine_bid"
OUT = OUT_DIR / "Multi-Family Master Sheet V6 - Vulpine Proposal.xlsx"
LOGO = Path(r"C:\Users\Vulpi\Downloads\vulpine-logo.png")
BANNER = Path(r"C:\Users\Vulpi\Downloads\1.png")


def q(ns: str, tag: str) -> str:
    return f"{{{NS[ns]}}}{tag}"


def parse_xml(data: bytes) -> ET.Element:
    return ET.fromstring(data)


def xml_bytes(root: ET.Element) -> bytes:
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def max_rid(root: ET.Element) -> int:
    values = []
    for rel in root.findall(q("rel", "Relationship")):
        rid = rel.attrib.get("Id", "")
        if rid.startswith("rId") and rid[3:].isdigit():
            values.append(int(rid[3:]))
    return max(values) if values else 0


def add_override(root: ET.Element, part: str, content_type: str) -> None:
    for node in root.findall(q("ct", "Override")):
        if node.attrib.get("PartName") == part:
            return
    ET.SubElement(root, q("ct", "Override"), PartName=part, ContentType=content_type)


def append_style(styles: bytes) -> tuple[bytes, dict[str, int]]:
    root = parse_xml(styles)
    ns = NS["main"]

    fonts = root.find(q("main", "fonts"))
    fills = root.find(q("main", "fills"))
    borders = root.find(q("main", "borders"))
    cell_xfs = root.find(q("main", "cellXfs"))
    if fonts is None or fills is None or borders is None or cell_xfs is None:
        raise RuntimeError("Could not find required style collections.")

    def add_font(size: str, color: str, bold: bool = False) -> int:
        idx = len(fonts)
        font = ET.SubElement(fonts, f"{{{ns}}}font")
        if bold:
            ET.SubElement(font, f"{{{ns}}}b")
        ET.SubElement(font, f"{{{ns}}}sz", val=size)
        ET.SubElement(font, f"{{{ns}}}color", rgb=color)
        ET.SubElement(font, f"{{{ns}}}name", val="Aptos")
        ET.SubElement(font, f"{{{ns}}}family", val="2")
        return idx

    def add_fill(color: str) -> int:
        idx = len(fills)
        fill = ET.SubElement(fills, f"{{{ns}}}fill")
        pattern = ET.SubElement(fill, f"{{{ns}}}patternFill", patternType="solid")
        ET.SubElement(pattern, f"{{{ns}}}fgColor", rgb=color)
        ET.SubElement(pattern, f"{{{ns}}}bgColor", indexed="64")
        return idx

    def add_border(color: str = "FFD7DEE8") -> int:
        idx = len(borders)
        border = ET.SubElement(borders, f"{{{ns}}}border")
        for side in ("left", "right", "top", "bottom"):
            node = ET.SubElement(border, f"{{{ns}}}{side}", style="thin")
            ET.SubElement(node, f"{{{ns}}}color", rgb=color)
        ET.SubElement(border, f"{{{ns}}}diagonal")
        return idx

    navy_fill = add_fill("FF111820")
    gold_fill = add_fill("FFF59E0B")
    soft_fill = add_fill("FFF7F8FA")
    line_fill = add_fill("FFEFF3F8")
    white_font = add_font("22", "FFFFFFFF", True)
    subtitle_font = add_font("11", "FFE8EDF3", False)
    heading_font = add_font("14", "FF111820", True)
    label_font = add_font("10", "FF334155", True)
    body_font = add_font("10", "FF1F2937", False)
    gold_font = add_font("10", "FFF59E0B", True)
    border = add_border()

    def add_xf(font_id: int, fill_id: int = 0, border_id: int = 0, align: dict[str, str] | None = None) -> int:
        idx = len(cell_xfs)
        attrs = {
            "numFmtId": "0",
            "fontId": str(font_id),
            "fillId": str(fill_id),
            "borderId": str(border_id),
            "xfId": "0",
            "applyFont": "1",
        }
        if fill_id:
            attrs["applyFill"] = "1"
        if border_id:
            attrs["applyBorder"] = "1"
        if align:
            attrs["applyAlignment"] = "1"
        xf = ET.SubElement(cell_xfs, f"{{{ns}}}xf", attrs)
        if align:
            ET.SubElement(xf, f"{{{ns}}}alignment", **align)
        return idx

    style_ids = {
        "hero": add_xf(white_font, navy_fill, 0, {"horizontal": "center", "vertical": "center", "wrapText": "1"}),
        "subtitle": add_xf(subtitle_font, navy_fill, 0, {"horizontal": "center", "vertical": "center"}),
        "section": add_xf(heading_font, 0, 0, {"horizontal": "left", "vertical": "center"}),
        "label": add_xf(label_font, soft_fill, border, {"horizontal": "left", "vertical": "center"}),
        "input": add_xf(body_font, line_fill, border, {"horizontal": "left", "vertical": "center", "wrapText": "1"}),
        "placeholder": add_xf(gold_font, soft_fill, border, {"horizontal": "center", "vertical": "center", "wrapText": "1"}),
        "body": add_xf(body_font, 0, 0, {"horizontal": "left", "vertical": "top", "wrapText": "1"}),
        "goldbar": add_xf(white_font, gold_fill, 0, {"horizontal": "center", "vertical": "center"}),
    }

    for collection in (fonts, fills, borders, cell_xfs):
        collection.attrib["count"] = str(len(collection))

    return xml_bytes(root), style_ids


def col_name(n: int) -> str:
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def c(ref: str, text: str, style: int | None = None) -> str:
    style_attr = f' s="{style}"' if style is not None else ""
    safe = (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    return f'<c r="{ref}" t="inlineStr"{style_attr}><is><t xml:space="preserve">{safe}</t></is></c>'


def row(idx: int, cells: list[str], height: int | None = None) -> str:
    ht = f' ht="{height}" customHeight="1"' if height else ""
    return f'<row r="{idx}"{ht}>{"".join(cells)}</row>'


def sheet_xml(title_cells: list[str], rows: list[str], merges: list[str], rel_id: str) -> bytes:
    merge_xml = ""
    if merges:
        merge_xml = f'<mergeCells count="{len(merges)}">' + "".join(f'<mergeCell ref="{m}"/>' for m in merges) + "</mergeCells>"
    cols = "".join(
        f'<col min="{i}" max="{i}" width="{w}" customWidth="1"/>'
        for i, w in enumerate([5, 16, 18, 18, 18, 18, 18, 18, 18, 18, 5], start=1)
    )
    body = "".join(title_cells + rows)
    xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
  <dimension ref="A1:K38"/>
  <sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>{cols}</cols>
  <sheetData>{body}</sheetData>
  {merge_xml}
  <drawing r:id="{rel_id}"/>
  <pageMargins left="0.35" right="0.35" top="0.35" bottom="0.35" header="0.2" footer="0.2"/>
  <pageSetup paperSize="1" orientation="portrait" fitToWidth="1" fitToHeight="1"/>
</worksheet>'''
    return xml.encode("utf-8")


def drawing_xml(items: list[dict[str, int | str]]) -> bytes:
    anchors = []
    for idx, item in enumerate(items, start=1):
        cx = int(item["width_px"]) * 9525
        cy = int(item["height_px"]) * 9525
        anchors.append(f'''<xdr:oneCellAnchor>
  <xdr:from><xdr:col>{item["col"]}</xdr:col><xdr:colOff>{item.get("col_off", 0)}</xdr:colOff><xdr:row>{item["row"]}</xdr:row><xdr:rowOff>{item.get("row_off", 0)}</xdr:rowOff></xdr:from>
  <xdr:ext cx="{cx}" cy="{cy}"/>
  <xdr:pic>
    <xdr:nvPicPr><xdr:cNvPr id="{idx}" name="{item["name"]}"/><xdr:cNvPicPr/></xdr:nvPicPr>
    <xdr:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="{item["rid"]}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
    <xdr:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
  </xdr:pic>
  <xdr:clientData/>
</xdr:oneCellAnchor>''')
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            + "".join(anchors) + "</xdr:wsDr>").encode("utf-8")


def rels_xml(targets: list[tuple[str, str]]) -> bytes:
    nodes = []
    for rid, target in targets:
        nodes.append(f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="{target}"/>')
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            + "".join(nodes) + "</Relationships>").encode("utf-8")


def worksheet_rels(drawing_target: str) -> bytes:
    return (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            f'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="{drawing_target}"/>'
            f'</Relationships>').encode("utf-8")


def make_new_sheets(styles: dict[str, int]) -> dict[str, bytes]:
    cover_title = [
        row(1, [c("A1", "", styles["hero"]), c("D1", "MULTIFAMILY CABINET PROPOSAL", styles["hero"])], 42),
        row(2, [c("D2", "Cabinetry. Refacing. Fast Installs. Built for Unit Turns.", styles["subtitle"])], 24),
    ]
    cover_rows = [
        row(5, [c("B5", "Prepared For", styles["section"])]),
        row(6, [c("B6", "Client Company", styles["label"]), c("D6", "[Client Company]", styles["input"])]),
        row(7, [c("B7", "Project Name", styles["label"]), c("D7", "[Project / Property Name]", styles["input"])]),
        row(8, [c("B8", "Contact", styles["label"]), c("D8", "[Contact Name]", styles["input"])]),
        row(9, [c("B9", "Location", styles["label"]), c("D9", "[Project Address / City]", styles["input"])]),
        row(10, [c("B10", "Prepared Date", styles["label"]), c("D10", "[Date]", styles["input"])]),
        row(12, [c("B12", "Proposal Scope", styles["section"])]),
        row(13, [c("B13", "Cabinet supply, refacing, turns, accessories, trim, and unit-specific bid detail per attached workbook.", styles["body"])]),
        row(16, [c("B16", "INSERT PROJECT IMAGE HERE", styles["placeholder"]), c("G16", "INSERT UNIT / KITCHEN IMAGE HERE", styles["placeholder"])], 132),
        row(25, [c("B25", "MULTIFAMILY EXPERTISE", styles["goldbar"]), c("E25", "FAST TURN AROUND", styles["goldbar"]), c("H25", "CONSISTENT QUALITY", styles["goldbar"])], 28),
        row(33, [c("B33", "480-267-9181", styles["section"]), c("F33", "Your solution partner for multifamily properties", styles["section"])]),
    ]
    cover_merges = [
        "A1:C4", "D1:K1", "D2:K2", "B5:E5", "D6:F6", "D7:F7", "D8:F8", "D9:F9", "D10:F10",
        "B12:F12", "B13:F14", "B16:F22", "G16:K22", "B25:D25", "E25:G25", "H25:J25", "B33:D33", "F33:K33",
    ]

    letter_title = [
        row(1, [c("A1", "", styles["hero"]), c("D1", "COVER LETTER", styles["hero"])], 42),
        row(2, [c("D2", "Vulpine Multifamily Cabinet Solutions", styles["subtitle"])], 24),
    ]
    letter_rows = [
        row(5, [c("B5", "Prepared For", styles["section"])]),
        row(6, [c("B6", "Company", styles["label"]), c("D6", "[Client Company]", styles["input"])]),
        row(7, [c("B7", "Project", styles["label"]), c("D7", "[Project / Property Name]", styles["input"])]),
        row(8, [c("B8", "Contact", styles["label"]), c("D8", "[Contact Name]", styles["input"])]),
        row(10, [c("B10", "Dear [Contact Name],", styles["body"]), c("H10", "INSERT PROJECT IMAGE HERE", styles["placeholder"])], 150),
        row(12, [c("B12", "Thank you for the opportunity to provide cabinet and refacing pricing for [Project / Property Name]. Vulpine is built for multifamily work: clear scopes, reliable unit-turn execution, consistent quality, and responsive communication from bid through install.", styles["body"])]),
        row(17, [c("B17", "This proposal package includes the detailed bid tabs and supporting takeoff information for the unit mix and scope shown in the workbook. Please review the assumptions, unit selections, finish choices, and any alternates before approval so we can lock the schedule and material path.", styles["body"])]),
        row(23, [c("B23", "We appreciate the chance to earn your business and look forward to being your cabinet solution partner.", styles["body"])]),
        row(27, [c("B27", "Sincerely,", styles["body"])]),
        row(29, [c("B29", "Vulpine", styles["section"])]),
        row(31, [c("B31", "480-267-9181", styles["body"])]),
    ]
    letter_merges = [
        "A1:C4", "D1:K1", "D2:K2", "B5:E5", "D6:F6", "D7:F7", "D8:F8",
        "B10:F10", "B12:F15", "B17:F21", "B23:F25", "B27:F27", "B29:F29", "B31:F31", "H10:K20",
    ]

    return {
        "xl/worksheets/sheet60.xml": sheet_xml(cover_title, cover_rows, cover_merges, "rId1"),
        "xl/worksheets/_rels/sheet60.xml.rels": worksheet_rels("../drawings/drawing6.xml"),
        "xl/drawings/drawing6.xml": drawing_xml([
            {"col": 0, "row": 0, "width_px": 160, "height_px": 160, "rid": "rId1", "name": "vulpine-logo.png"},
            {"col": 1, "row": 26, "width_px": 650, "height_px": 217, "rid": "rId2", "name": "vulpine-multifamily-banner.png"},
        ]),
        "xl/drawings/_rels/drawing6.xml.rels": rels_xml([("rId1", "../media/vulpine-logo.png"), ("rId2", "../media/vulpine-banner.png")]),
        "xl/worksheets/sheet61.xml": sheet_xml(letter_title, letter_rows, letter_merges, "rId1"),
        "xl/worksheets/_rels/sheet61.xml.rels": worksheet_rels("../drawings/drawing7.xml"),
        "xl/drawings/drawing7.xml": drawing_xml([
            {"col": 0, "row": 0, "width_px": 150, "height_px": 150, "rid": "rId1", "name": "vulpine-logo.png"},
        ]),
        "xl/drawings/_rels/drawing7.xml.rels": rels_xml([("rId1", "../media/vulpine-logo.png")]),
    }


def patch_workbook_xml(data: bytes, rid_cover: str, rid_letter: str) -> bytes:
    root = parse_xml(data)
    sheets = root.find(q("main", "sheets"))
    if sheets is None:
        raise RuntimeError("Workbook has no sheets element.")
    for existing in list(sheets):
        if existing.attrib.get("name") in {"Proposal Cover", "Cover Letter"}:
            sheets.remove(existing)
    first = copy.deepcopy(sheets[0])
    first.attrib.update({"name": "Proposal Cover", "sheetId": "60", "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id": rid_cover})
    second = copy.deepcopy(sheets[0])
    second.attrib.update({"name": "Cover Letter", "sheetId": "61", "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id": rid_letter})
    sheets.insert(0, second)
    sheets.insert(0, first)
    book_views = root.find(q("main", "bookViews"))
    if book_views is not None and len(book_views):
        book_views[0].attrib["activeTab"] = "0"
        book_views[0].attrib["firstSheet"] = "0"
    return xml_bytes(root)


def patch_workbook_rels(data: bytes) -> tuple[bytes, str, str]:
    root = parse_xml(data)
    next_id = max_rid(root) + 1
    rid_cover = f"rId{next_id}"
    rid_letter = f"rId{next_id + 1}"
    for rid, target in ((rid_cover, "worksheets/sheet60.xml"), (rid_letter, "worksheets/sheet61.xml")):
        ET.SubElement(
            root,
            q("rel", "Relationship"),
            Id=rid,
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet",
            Target=target,
        )
    return xml_bytes(root), rid_cover, rid_letter


def patch_content_types(data: bytes) -> bytes:
    root = parse_xml(data)
    add_override(root, "/xl/worksheets/sheet60.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml")
    add_override(root, "/xl/worksheets/sheet61.xml", "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml")
    add_override(root, "/xl/drawings/drawing6.xml", "application/vnd.openxmlformats-officedocument.drawing+xml")
    add_override(root, "/xl/drawings/drawing7.xml", "application/vnd.openxmlformats-officedocument.drawing+xml")
    has_png = any(node.attrib.get("Extension") == "png" for node in root.findall(q("ct", "Default")))
    if not has_png:
        ET.SubElement(root, q("ct", "Default"), Extension="png", ContentType="image/png")
    return xml_bytes(root)


def patch_app_props(data: bytes) -> bytes:
    text = data.decode("utf-8")
    text = text.replace("<vt:i4>59</vt:i4>", "<vt:i4>61</vt:i4>", 1)
    text = text.replace('<TitlesOfParts><vt:vector size="59" baseType="lpstr">', '<TitlesOfParts><vt:vector size="61" baseType="lpstr">', 1)
    text = text.replace(
        '<TitlesOfParts><vt:vector size="61" baseType="lpstr">',
        '<TitlesOfParts><vt:vector size="61" baseType="lpstr"><vt:lpstr>Proposal Cover</vt:lpstr><vt:lpstr>Cover Letter</vt:lpstr>',
        1,
    )
    return text.encode("utf-8")


def original_sheet_hashes(path: Path) -> dict[str, str]:
    with zipfile.ZipFile(path) as zf:
        names = sorted(n for n in zf.namelist() if re.fullmatch(r"xl/worksheets/sheet\d+\.xml", n))
        return {n: hashlib.sha256(zf.read(n)).hexdigest() for n in names}


def build() -> None:
    if not SRC.exists():
        raise FileNotFoundError(SRC)
    if not LOGO.exists():
        raise FileNotFoundError(LOGO)
    if not BANNER.exists():
        raise FileNotFoundError(BANNER)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    before_hashes = original_sheet_hashes(SRC)

    new_entries: dict[str, bytes] = {}
    with zipfile.ZipFile(SRC, "r") as zin:
        styles, style_ids = append_style(zin.read("xl/styles.xml"))
        rels, rid_cover, rid_letter = patch_workbook_rels(zin.read("xl/_rels/workbook.xml.rels"))
        new_entries.update(make_new_sheets(style_ids))
        new_entries["xl/styles.xml"] = styles
        new_entries["xl/_rels/workbook.xml.rels"] = rels
        new_entries["xl/workbook.xml"] = patch_workbook_xml(zin.read("xl/workbook.xml"), rid_cover, rid_letter)
        new_entries["[Content_Types].xml"] = patch_content_types(zin.read("[Content_Types].xml"))
        new_entries["docProps/app.xml"] = patch_app_props(zin.read("docProps/app.xml"))
        new_entries["xl/media/vulpine-logo.png"] = LOGO.read_bytes()
        new_entries["xl/media/vulpine-banner.png"] = BANNER.read_bytes()

        with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename in new_entries:
                    data = new_entries.pop(item.filename)
                elif item.filename in {"xl/media/image1.png", "xl/media/image2.png"}:
                    data = LOGO.read_bytes()
                else:
                    data = zin.read(item.filename)
                zout.writestr(item, data)
            for name, data in new_entries.items():
                zout.writestr(name, data)

    after_hashes = original_sheet_hashes(OUT)
    changed_original_sheets = [
        name for name, digest in before_hashes.items()
        if name in after_hashes and after_hashes[name] != digest
    ]
    if changed_original_sheets:
        raise RuntimeError(f"Original worksheet XML changed: {changed_original_sheets[:10]}")
    print(f"Created: {OUT}")
    print(f"Original worksheet XML files unchanged: {len(before_hashes)}")


if __name__ == "__main__":
    build()
