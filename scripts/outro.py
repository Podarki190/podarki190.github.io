"""Концовка ролика: карточка с названием мастерской, сайтом и телефоном.

Рисуется здесь, а не фильтром drawtext, по простой причине: drawtext на Windows
требует настроенного fontconfig, без него ffmpeg падает с segfault. Pillow берёт
шрифт файлом и работает всегда.

    python scripts/outro.py 720 1280 outro.png
"""
import sys
import pathlib
from PIL import Image, ImageDraw, ImageFont

# Палитра сайта: тёмная хвоя и латунь. Ролик заканчивается затемнением, и
# карточка на тёмном подхватывает его, а не бьёт по глазам белым прямоугольником.
BG = (26, 30, 28)
BRASS = (198, 160, 92)
INK = (238, 236, 230)
MUTED = (150, 150, 144)

FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_PLAIN = "C:/Windows/Fonts/segoeui.ttf"


def make(width: int, height: int, dst: pathlib.Path) -> None:
    img = Image.new("RGB", (width, height), BG)
    d = ImageDraw.Draw(img)
    k = width / 720  # всё кратно ширине, чтобы карточка жила на любом размере

    # (шрифт, кегль, текст, цвет, отступ сверху, линия под строкой)
    plan = [
        (FONT_BOLD, 58, "ЛАЗЕР КЛИН", BRASS, 0, False),
        (FONT_PLAIN, 26, "лазерная резка и гравировка", MUTED, 10, True),
        (FONT_BOLD, 38, "lazerklin.ru", INK, 54, False),
        (FONT_BOLD, 38, "+7 926 664-21-21", INK, 12, False),
        (FONT_PLAIN, 24, "город Клин", MUTED, 26, False),
    ]

    # Высота строки берётся из МЕТРИК шрифта, а не из габаритов чернил. Габариты
    # меряют только закрашенные пиксели: у строки без выносных элементов они
    # заметно меньше реальной строки, и следующая строка налезает на предыдущую.
    # На этом я споткнулся дважды, поэтому здесь ascent + descent.
    rows = []
    for path, size, text, colour, gap, rule in plan:
        font = ImageFont.truetype(path, int(size * k))
        ascent, descent = font.getmetrics()
        rows.append({
            "font": font, "text": text, "colour": colour, "rule": rule,
            "gap": int(gap * k), "w": font.getlength(text), "h": ascent + descent,
        })

    total = sum(r["gap"] + r["h"] + (int(26 * k) if r["rule"] else 0) for r in rows)

    # Чуть выше геометрического центра: в вертикальном кадре центр
    # воспринимается низковатым, а нижнюю треть на телефоне закрывает интерфейс.
    y = (height - total) // 2 - int(height * 0.05)

    for row in rows:
        y += row["gap"]
        d.text((round((width - row["w"]) / 2), y), row["text"], font=row["font"],
               fill=row["colour"], anchor="la")
        y += row["h"]
        if row["rule"]:
            y += int(14 * k)
            d.line([(width // 2 - int(70 * k), y), (width // 2 + int(70 * k), y)],
                   fill=BRASS, width=max(1, int(2 * k)))
            y += int(12 * k)

    img.save(dst, "PNG")


if __name__ == "__main__":
    w, h, out = int(sys.argv[1]), int(sys.argv[2]), pathlib.Path(sys.argv[3])
    make(w, h, out)
    print(f"{out.name}: {w}x{h}")
