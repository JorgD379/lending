#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const script = `
import json, re
from pathlib import Path
from openpyxl import load_workbook

root = Path(r"${rootDir.replace(/\\/g, '\\\\')}")
xlsx_root = root / "Решения по отрослям"
data_dir = root / "data"
proc_dir = data_dir / "processes"
industries_path = data_dir / "industries.json"
subindustries_path = data_dir / "subindustries.json"

proc_dir.mkdir(parents=True, exist_ok=True)

def slugify(text):
    text = str(text or "").lower().replace(".xlsx", "")
    map_ru = {
      "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"e","ж":"zh","з":"z","и":"i","й":"y",
      "к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f",
      "х":"h","ц":"ts","ч":"ch","ш":"sh","щ":"sch","ь":"","ы":"y","ъ":"","э":"e","ю":"yu","я":"ya"
    }
    out = "".join(map_ru.get(ch, ch) for ch in text)
    out = re.sub(r"[^a-z0-9]+", "-", out).strip("-")
    return out

def strip_ext(filename):
    return re.sub(r"\\.xlsx$", "", filename, flags=re.IGNORECASE).strip()

def read_sheet_rows(file_path):
    wb = load_workbook(file_path, data_only=True)
    ws = wb[wb.sheetnames[0]]
    headers = []
    for cell in ws[1]:
        if cell.value is None:
            continue
        h = str(cell.value).strip()
        if h:
            headers.append(h)
    rows = []
    if not headers:
        return rows
    max_col = len(headers)
    for row in ws.iter_rows(min_row=2, max_col=max_col, values_only=True):
        if not any(row):
            continue
        item = {}
        for i, key in enumerate(headers):
            val = row[i] if i < len(row) and row[i] is not None else ""
            item[key] = str(val).strip() if isinstance(val, str) else val
        rows.append(item)
    return rows

with open(industries_path, "r", encoding="utf-8") as f:
    industries = json.load(f)

id_to_slug = {x["id"]: x["slug"] for x in industries}
subindustries = {x["slug"]: [] for x in industries}

for old in proc_dir.glob("*.json"):
    old.unlink()

dirs = sorted([p for p in xlsx_root.iterdir() if p.is_dir()], key=lambda p: p.name)
for d in dirs:
    m = re.match(r"^(\\d{2})\\.", d.name)
    if not m:
        continue
    ind_id = m.group(1)
    industry_slug = id_to_slug.get(ind_id)
    if not industry_slug:
        continue

    files = sorted([f for f in d.glob("*.xlsx")], key=lambda p: p.name)
    for file in files:
        file_slug = slugify(file.name)
        display_title = strip_ext(file.name)
        process_file = f"{industry_slug}--{file_slug}"
        rows = read_sheet_rows(file)
        with open(proc_dir / f"{process_file}.json", "w", encoding="utf-8") as pf:
            json.dump(rows, pf, ensure_ascii=False, indent=2)
        subindustries[industry_slug].append({
            "title": display_title,
            "slug": file_slug,
            "processesFile": process_file
        })

with open(subindustries_path, "w", encoding="utf-8") as sf:
    json.dump(subindustries, sf, ensure_ascii=False, indent=2)

print("Done: generated full subindustries and processes JSON.")
`;

const result = spawnSync('python', ['-c', script], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
