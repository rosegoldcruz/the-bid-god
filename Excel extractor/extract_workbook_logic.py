#!/usr/bin/env python3
import argparse
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkgrel": "http://schemas.openxmlformats.org/package/2006/relationships",
}

KEYWORDS = re.compile(
    r"(margin|factor|shipping|freight|install|installation|hardware|handle|markup|tax|total|summary|price|cost)",
    re.I,
)

def xml_from_zip(zf, path):
    try:
        return ET.fromstring(zf.read(path))
    except KeyError:
        return None

def col_row(cell_ref):
    m = re.match(r"([A-Z]+)(\d+)", cell_ref or "")
    return (m.group(1), int(m.group(2))) if m else ("", 0)

def get_text(cell, shared_strings):
    t = cell.attrib.get("t")
    v = cell.find("main:v", NS)

    if v is None:
        inline = cell.find("main:is/main:t", NS)
        return inline.text if inline is not None else ""

    raw = v.text or ""

    if t == "s":
        try:
            return shared_strings[int(raw)]
        except Exception:
            return raw

    return raw

def load_shared_strings(zf):
    root = xml_from_zip(zf, "xl/sharedStrings.xml")
    if root is None:
        return []

    values = []
    for si in root.findall("main:si", NS):
        parts = []
        for t in si.findall(".//main:t", NS):
            parts.append(t.text or "")
        values.append("".join(parts))
    return values

def load_workbook_relationships(zf):
    root = xml_from_zip(zf, "xl/_rels/workbook.xml.rels")
    rels = {}
    if root is None:
        return rels

    for rel in root:
        rel_id = rel.attrib.get("Id")
        target = rel.attrib.get("Target")
        if rel_id and target:
            rels[rel_id] = "xl/" + target.lstrip("/")
    return rels

def load_sheets(zf):
    workbook = xml_from_zip(zf, "xl/workbook.xml")
    rels = load_workbook_relationships(zf)

    sheets = []
    if workbook is None:
        return sheets, []

    for sheet in workbook.findall("main:sheets/main:sheet", NS):
        rel_id = sheet.attrib.get(f"{{{NS['rel']}}}id")
        sheets.append({
            "name": sheet.attrib.get("name"),
            "sheetId": sheet.attrib.get("sheetId"),
            "state": sheet.attrib.get("state", "visible"),
            "path": rels.get(rel_id),
            "relationshipId": rel_id,
        })

    defined_names = []
    for dn in workbook.findall("main:definedNames/main:definedName", NS):
        defined_names.append({
            "name": dn.attrib.get("name"),
            "localSheetId": dn.attrib.get("localSheetId"),
            "hidden": dn.attrib.get("hidden"),
            "value": dn.text,
        })

    return sheets, defined_names

def extract_sheet(zf, sheet, shared_strings):
    root = xml_from_zip(zf, sheet["path"])
    if root is None:
        return {
            "sheet": sheet,
            "cells": [],
            "formulas": [],
            "keyword_hits": [],
            "merged_ranges": [],
        }

    cells = []
    formulas = []
    keyword_hits = []

    for c in root.findall(".//main:sheetData/main:row/main:c", NS):
        ref = c.attrib.get("r")
        formula_el = c.find("main:f", NS)
        formula = formula_el.text if formula_el is not None else None
        value = get_text(c, shared_strings)

        cell_data = {
            "cell": ref,
            "value": value,
            "formula": formula,
            "type": c.attrib.get("t"),
            "style": c.attrib.get("s"),
        }

        if value or formula:
            cells.append(cell_data)

        if formula:
            formulas.append(cell_data)

        searchable = f"{value or ''} {formula or ''}"
        if KEYWORDS.search(searchable):
            keyword_hits.append(cell_data)

    merged_ranges = []
    for mc in root.findall(".//main:mergeCells/main:mergeCell", NS):
        merged_ranges.append(mc.attrib.get("ref"))

    return {
        "sheet": {
            "name": sheet["name"],
            "state": sheet["state"],
            "path": sheet["path"],
        },
        "cells": cells,
        "formulas": formulas,
        "keyword_hits": keyword_hits,
        "merged_ranges": merged_ranges,
    }

def summarize_sheet(sheet_result):
    cells = sheet_result["cells"]
    formulas = sheet_result["formulas"]
    keyword_hits = sheet_result["keyword_hits"]

    return {
        "name": sheet_result["sheet"]["name"],
        "state": sheet_result["sheet"]["state"],
        "non_empty_cells": len(cells),
        "formula_cells": len(formulas),
        "keyword_hits": len(keyword_hits),
        "merged_ranges": len(sheet_result["merged_ranges"]),
    }

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("xlsx_path", help="Path to the .xlsx workbook")
    parser.add_argument(
        "--out",
        default=None,
        help="Output JSON path. Defaults to workbook name + .extracted.json",
    )
    args = parser.parse_args()

    xlsx_path = Path(args.xlsx_path).expanduser().resolve()

    if not xlsx_path.exists():
        print(f"Missing workbook: {xlsx_path}", file=sys.stderr)
        sys.exit(1)

    if xlsx_path.suffix.lower() != ".xlsx":
        print(f"Expected .xlsx file, got: {xlsx_path}", file=sys.stderr)
        sys.exit(1)

    output_path = (
        Path(args.out).expanduser().resolve()
        if args.out
        else xlsx_path.with_suffix(".extracted.json")
    )

    with zipfile.ZipFile(xlsx_path, "r") as zf:
        shared_strings = load_shared_strings(zf)
        sheets, defined_names = load_sheets(zf)

        sheet_results = []
        for sheet in sheets:
            if not sheet.get("path"):
                continue
            sheet_results.append(extract_sheet(zf, sheet, shared_strings))

    result = {
        "workbook": {
            "file": str(xlsx_path),
            "sheet_count": len(sheets),
            "sheets": [
                {
                    "name": s["name"],
                    "sheetId": s["sheetId"],
                    "state": s["state"],
                    "path": s["path"],
                }
                for s in sheets
            ],
            "defined_names": defined_names,
        },
        "summary": [summarize_sheet(s) for s in sheet_results],
        "sheets": sheet_results,
    }

    output_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    print(json.dumps({
        "ok": True,
        "input": str(xlsx_path),
        "output": str(output_path),
        "sheet_count": len(sheets),
        "sheets": [s["name"] for s in sheets],
    }, indent=2))

if __name__ == "__main__":
    main()