#!/usr/bin/env node
/* eslint-disable no-console */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const script = `
import json, os, re
from pathlib import Path
from openpyxl import load_workbook

root = Path(r"${rootDir.replace(/\\/g, '\\\\')}")
xlsx_root = root / "Решения по отрослям"
data_dir = root / "data"
proc_dir = data_dir / "processes"
data_dir.mkdir(parents=True, exist_ok=True)
proc_dir.mkdir(parents=True, exist_ok=True)

def slugify(text):
    text = text.lower().replace(".xlsx", "")
    map_ru = {
      "а":"a","б":"b","в":"v","г":"g","д":"d","е":"e","ё":"e","ж":"zh","з":"z","и":"i","й":"y",
      "к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","у":"u","ф":"f",
      "х":"h","ц":"ts","ч":"ch","ш":"sh","щ":"sch","ь":"","ы":"y","ъ":"","э":"e","ю":"yu","я":"ya"
    }
    out = ""
    for ch in text:
        out += map_ru.get(ch, ch)
    out = re.sub(r"[^a-z0-9]+", "-", out).strip("-")
    return out

industries = []
subindustries = {}

for idx, industry_dir in enumerate(sorted([p for p in xlsx_root.iterdir() if p.is_dir()]), start=1):
    title = industry_dir.name
    slug = slugify(title.split(".", 1)[-1] if "." in title else title)
    industries.append({"id": f"{idx:02d}", "title": title, "slug": slug})
    subindustries[slug] = []

    for file in sorted(industry_dir.glob("*.xlsx")):
        sub_slug = slugify(file.name)
        item = {"title": file.name, "slug": sub_slug}
        if "металургия" in file.name.lower():
            item["processesFile"] = "metallurgy-chernaya-i-tsvetnaya"
        subindustries[slug].append(item)

        if item.get("processesFile"):
            wb = load_workbook(file, data_only=True)
            ws = wb["Металлургия_CV_процессы"]
            headers = [c.value for c in ws[1][:8]]
            rows = []
            for row in ws.iter_rows(min_row=2, max_col=8, values_only=True):
                if not any(row):
                    continue
                rows.append({headers[i]: (row[i] if row[i] is not None else "") for i in range(8)})
            with open(proc_dir / "metallurgy-chernaya-i-tsvetnaya.json", "w", encoding="utf-8") as f:
                json.dump(rows, f, ensure_ascii=False, indent=2)

with open(data_dir / "industries.generated.json", "w", encoding="utf-8") as f:
    json.dump(industries, f, ensure_ascii=False, indent=2)
with open(data_dir / "subindustries.generated.json", "w", encoding="utf-8") as f:
    json.dump(subindustries, f, ensure_ascii=False, indent=2)

print("Done: generated JSON files from xlsx.")
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
