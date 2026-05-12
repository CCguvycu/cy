"""
Generates the VoidLink .ico file for the Windows app.
Run this once before building: python icon_gen.py
"""

import math
from PIL import Image, ImageDraw, ImageFont


def make_icon(size: int, status_color=(0, 255, 136)) -> Image.Image:
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background circle
    pad = size // 8
    draw.ellipse([pad, pad, size - pad, size - pad], fill=(10, 10, 15, 255))

    # Hexagon
    cx, cy = size // 2, size // 2
    r = size // 2 - pad - 2
    points = [
        (cx + r * math.cos(math.pi / 2 + i * math.pi / 3),
         cy + r * math.sin(math.pi / 2 + i * math.pi / 3))
        for i in range(6)
    ]
    draw.polygon(points, outline=status_color, width=max(2, size // 32))

    # Letter V
    stroke = max(2, size // 16)
    left = size * 0.28
    right = size * 0.72
    top = size * 0.28
    mid_y = size * 0.68
    draw.line([(left, top), (cx, mid_y)], fill=status_color, width=stroke)
    draw.line([(right, top), (cx, mid_y)], fill=status_color, width=stroke)

    return img


def main():
    sizes = [16, 24, 32, 48, 64, 128, 256]
    frames = [make_icon(s) for s in sizes]

    # Save as .ico (multi-size)
    frames[0].save(
        'icon.ico',
        format='ICO',
        sizes=[(s, s) for s in sizes],
        append_images=frames[1:],
    )
    print("icon.ico generated")

    # Also save a 512px PNG for the installer
    make_icon(512).save('icon.png', format='PNG')
    print("icon.png generated")


if __name__ == '__main__':
    main()
