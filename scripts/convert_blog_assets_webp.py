"""
Конвертация растров в assets/blog/<slug>/ в WebP.
cover.jpg|png -> cover.webp; image-1.jpg -> inline-01.webp; ...
Уже существующий .webp с тем же целевым именем перезаписывается при наличии исходного растра.
Исходные jpg/png после успешной записи удаляются.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BLOG_ASSETS = ROOT / "assets" / "blog"
RASTER = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}
WEBP_Q = 88


def target_webp_name(src: Path) -> str | None:
    stem = src.stem.lower()
    if stem == "cover":
        return "cover.webp"
    m = re.fullmatch(r"image-(\d+)", stem)
    if m:
        return f"inline-{int(m.group(1)):02d}.webp"
    m = re.fullmatch(r"inline-(\d+)", stem)
    if m:
        return f"inline-{int(m.group(1)):02d}.webp"
    return None


def to_rgb(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        bg.paste(img, mask=img.split()[-1])
        return bg
    if img.mode != "RGB":
        return img.convert("RGB")
    return img


def convert_file(src: Path, dst: Path) -> bool:
    with Image.open(src) as im:
        im = to_rgb(im)
        dst.parent.mkdir(parents=True, exist_ok=True)
        im.save(dst, "WEBP", quality=WEBP_Q, method=6)
    return True


def main() -> int:
    if not BLOG_ASSETS.is_dir():
        print("Нет папки", BLOG_ASSETS, file=sys.stderr)
        return 1

    converted = 0
    skipped_unknown = []
    for src in sorted(BLOG_ASSETS.rglob("*")):
        if not src.is_file():
            continue
        if src.suffix.lower() not in RASTER:
            continue
        if src.name.startswith("."):
            continue
        name = target_webp_name(src)
        if not name:
            skipped_unknown.append(str(src.relative_to(ROOT)))
            continue
        dst = src.parent / name
        try:
            convert_file(src, dst)
            src.unlink()
            converted += 1
            print(f"OK {src.relative_to(ROOT)} -> {dst.relative_to(ROOT)}")
        except OSError as e:
            print(f"ERR {src}: {e}", file=sys.stderr)
            return 1

    if skipped_unknown:
        print("\nПропущены (неизвестное имя, оставлены как есть):")
        for p in skipped_unknown:
            print(" ", p)

    print(f"\nСконвертировано файлов: {converted}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
