"""Фото работы -> фото для блога: автоуровни, резкость, длинная сторона 1400, q80.

Содержимое не трогаем: на изделиях гравированный текст, и любая перерисовка
превратит его в кракозябры. Только тон и размер.

    python scripts/prep.py "исходник.jpg" static/blog/<slug>/1.jpg [ещё пары...]
"""
import sys, pathlib
from PIL import Image, ImageOps, ImageFilter

SIDE, QUALITY = 1400, 80

def prep(src, dst):
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    im.thumbnail((SIDE, SIDE), Image.LANCZOS)
    im = ImageOps.autocontrast(im).filter(ImageFilter.UnsharpMask(2, 60, 3))
    im.save(dst, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return im.size

if __name__ == "__main__":
    args = sys.argv[1:]
    assert args and len(args) % 2 == 0, __doc__
    for src, dst in zip(args[0::2], args[1::2]):
        size = prep(src, dst)
        print(f"{dst}  {size[0]}x{size[1]}  {pathlib.Path(dst).stat().st_size // 1024} КБ")
