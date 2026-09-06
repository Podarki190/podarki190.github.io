"""Контактный лист: строка — запись блога, три колонки — её фотографии.

Отбирать и проверять кадры надо по нему, а не открывая файлы по одному:
двадцать снимков превращаются в один взгляд. Именно так вскрылось, что в
посте про часы с Цоем стояли часы совсем другой группы.

    python scripts/contact.py лист.jpg chasy-dzhaz chasy-aviaciya ...
"""
import sys, pathlib
from PIL import Image

W = 420
ROOT = pathlib.Path("static/blog")

def sheet(out, slugs):
    rows = []
    for slug in slugs:
        row = []
        for i in (1, 2, 3):
            f = ROOT / slug / f"{i}.jpg"
            if not f.exists():
                print("НЕТ ФАЙЛА", f)
                continue
            im = Image.open(f)
            im.thumbnail((W, W), Image.LANCZOS)
            row.append(im)
        rows.append(row)

    heights = [max((im.height for im in r), default=0) for r in rows]
    canvas = Image.new("RGB", (W * 3, sum(heights)), "white")
    y = 0
    for row, h in zip(rows, heights):
        for j, im in enumerate(row):
            canvas.paste(im, (j * W + (W - im.width) // 2, y))
        y += h
    canvas.save(out, "JPEG", quality=78, optimize=True)
    return canvas.size

if __name__ == "__main__":
    out, slugs = sys.argv[1], sys.argv[2:]
    assert slugs, __doc__
    size = sheet(out, slugs)
    print(f"{out}  {size[0]}x{size[1]}  строки сверху вниз: {', '.join(slugs)}")
