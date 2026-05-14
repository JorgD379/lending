"""
Подставляет в blog/<slug>/index.html обложку и inline-картинки из /assets/blog/<slug>/.
Запуск из корня репозитория: python scripts/wire_blog_article_images.py
Идемпотентен: повторный запуск не дублирует (плейсхолдеры уже сняты).
"""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BLOG = ROOT / "blog"
COVER_BLOCK = """    <div class="article-cover">
      <div class="article-cover-placeholder" role="img" aria-label="Обложка статьи"></div>
    </div>"""
OG_DEFAULT = "https://lab-itis.ru/assets/images/og-default.jpg"

RE_NOTE = re.compile(
    r'<div class="note"><p>\[Фото\s*(\d+)[\s\S]*?</p></div>',
    re.DOTALL,
)
RE_BLOCKQUOTE = re.compile(
    r"<blockquote>\s*<p><em>Место для изображения:[\s\S]*?</em></p>\s*</blockquote>",
    re.DOTALL,
)
RE_P_EM_BRACKET = re.compile(
    r"<p><em>\[Фото\s*(\d+)[\s\S]*?</em></p>",
    re.DOTALL,
)
RE_P_EM_PLAIN = re.compile(
    r"<p><em>Фото\s*(\d+)[\s\S]*?</em></p>",
    re.DOTALL,
)
RE_PHOTO_TABLE = re.compile(
    r'<table>\s*<colgroup>\s*<col style="width: 100%"/>\s*</colgroup>\s*<thead>\s*<tr>\s*<th[^>]*>[\s\S]*?Фото\s*(\d+)[\s\S]*?</th>\s*</tr>\s*</thead>\s*<tbody>\s*</tbody>\s*</table>',
    re.DOTALL,
)
RE_BLOG_GRID_CARD = re.compile(
    r'(<a class="bp-a" href="/blog/)([^/]+)(/" data-topic="[^"]+">\n'
    r'          <div class="bp-a-c">\n)'
    r'            (<div class="bp-a-c-g"></div>)',
)


def figure(slug: str, n: int) -> str:
    return (
        f'<figure class="article-inline-fig">'
        f'<img src="/assets/blog/{slug}/inline-{n:02d}.webp" alt="" '
        f'loading="lazy" decoding="async">'
        f"</figure>"
    )


def og_title(text: str) -> str:
    m = re.search(r'<meta property="og:title" content="([^"]*)"', text)
    return m.group(1) if m else ""


def wire_cover(text: str, slug: str, title: str) -> str:
    alt = html.escape(title, quote=True)
    block = (
        f'    <div class="article-cover">\n'
        f'      <img src="/assets/blog/{slug}/cover.webp" alt="{alt}" '
        f'width="1200" height="514" loading="eager" decoding="async">\n'
        f"    </div>"
    )
    return text.replace(COVER_BLOCK, block, 1)


def wire_og_images(text: str, slug: str) -> str:
    cover_abs = f"https://lab-itis.ru/assets/blog/{slug}/cover.webp"
    return text.replace(OG_DEFAULT, cover_abs)


def wire_inlines(text: str, slug: str, mode: str) -> str:
    if mode == "note":
        return RE_NOTE.sub(lambda m: figure(slug, int(m.group(1))), text)
    if mode == "blockquote":
        n = 1

        def bq_sub(_m: re.Match[str]) -> str:
            nonlocal n
            r = figure(slug, n)
            n += 1
            return r

        return RE_BLOCKQUOTE.sub(bq_sub, text)
    if mode == "pem_bracket":
        return RE_P_EM_BRACKET.sub(lambda m: figure(slug, int(m.group(1))), text)
    if mode == "pem_plain":
        return RE_P_EM_PLAIN.sub(lambda m: figure(slug, int(m.group(1))), text)
    if mode == "photo_table":
        return RE_PHOTO_TABLE.sub(lambda m: figure(slug, int(m.group(1))), text)
    raise ValueError(mode)


INLINE_MODE: dict[str, str] = {
    "defekty-metalla-klassifikatsiya": "blockquote",
    "kak-rabotaet-mashinnoe-zrenie": "blockquote",
    "kak-vnedrit-ii-v-proizvodstvo": "pem_bracket",
    "pochemu-zavodyi-vnedryayut-ii": "pem_plain",
    "s-chego-nachinat-vyibor-sistemyi": "photo_table",
    "pochemu-horoshie-proektyi-chasto-ne-prohodyat-soglasovanie": "photo_table",
}


def wire_blog_listing() -> bool:
    path = BLOG / "index.html"
    raw = path.read_text(encoding="utf-8")
    if 'bp-a-c">\n            <img src="/assets/blog/' in raw:
        return False

    def sub_card(m: re.Match[str]) -> str:
        slug = m.group(2)
        img = (
            f'            <img src="/assets/blog/{slug}/cover.webp" alt="" loading="lazy" '
            f'decoding="async" style="position:absolute;inset:0;width:100%;height:100%;'
            f"object-fit:cover;display:block\">\n"
        )
        return f"{m.group(1)}{slug}{m.group(3)}{img}            {m.group(4)}"

    out = RE_BLOG_GRID_CARD.sub(sub_card, raw)
    path.write_text(out, encoding="utf-8", newline="\n")
    return True


def process_file(path: Path) -> bool:
    slug = path.parent.name
    raw = path.read_text(encoding="utf-8")
    if "article-cover-placeholder" not in raw and "/assets/blog/" + slug + "/cover.webp" in raw:
        return False
    title = og_title(raw)
    out = wire_cover(raw, slug, title)
    out = wire_og_images(out, slug)
    mode = INLINE_MODE.get(slug, "note")
    out = wire_inlines(out, slug, mode)
    path.write_text(out, encoding="utf-8", newline="\n")
    return True


def main() -> int:
    changed = 0
    for path in sorted(BLOG.glob("*/index.html")):
        if process_file(path):
            print("wired", path.relative_to(ROOT))
            changed += 1
    print(f"updated {changed} article files")
    if wire_blog_listing():
        print("wired blog/index.html grid thumbnails")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
