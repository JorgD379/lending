# -*- coding: utf-8 -*-
"""Extract blog articles zip with correct Cyrillic paths."""
import json
import os
import shutil
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZIP = os.path.join(os.environ["USERPROFILE"], "Downloads", "Статьи(блог).zip")
OUT = os.path.join(ROOT, "_articles_import")


def main():
    if not os.path.isfile(ZIP):
        raise SystemExit(f"Zip not found: {ZIP}")
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT, exist_ok=True)
    with zipfile.ZipFile(ZIP, "r") as z:
        names = z.namelist()
        z.extractall(OUT)
    with open(os.path.join(OUT, "_zip_names.json"), "w", encoding="utf-8") as f:
        json.dump(names, f, ensure_ascii=False, indent=2)
    print("extracted", len(names), "entries to", OUT)


if __name__ == "__main__":
    main()
