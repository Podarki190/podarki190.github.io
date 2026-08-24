"""Обложка для соцсетей: 1200x630 из первой фотографии поста.

ВКонтакте отказывается делать карточку по вертикальной картинке
(link_photo_sizing_rule), поэтому нужна именно горизонтальная. Фотография
вписывается целиком — обрезать нельзя, на ней товар. Пустые поля по бокам
заполняются ею же в сильном размытии: получается фон, а не дыра.
"""
import sys, pathlib
from PIL import Image, ImageOps, ImageFilter

W, H = 1200, 630

def make(src: pathlib.Path, dst: pathlib.Path) -> None:
    im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
    back = ImageOps.fit(im, (W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(28))
    fore = im.copy()
    fore.thumbnail((W, H), Image.LANCZOS)
    back.paste(fore, ((W - fore.width) // 2, (H - fore.height) // 2))
    back.save(dst, "JPEG", quality=82, optimize=True, progressive=True)

if __name__ == "__main__":
    # Обложка берётся с первого снимка. Если на нём товар мелковат — в карточке
    # соцсети он утонет, и тогда источник задаётся вручную: папка=номер.
    #   python ogimage.py static/blog tablichka-pereryv-do=3
    root = pathlib.Path(sys.argv[1])
    override = dict(a.split("=") for a in sys.argv[2:])
    for folder in sorted(p for p in root.iterdir() if p.is_dir()):
        src = folder / f"{override.get(folder.name, '1')}.jpg"
        assert src.exists(), f"нет {src}"
        make(src, folder / "og.jpg")
        print(f"{folder.name:<32} <- {src.name}  {(folder / 'og.jpg').stat().st_size // 1024} КБ")
