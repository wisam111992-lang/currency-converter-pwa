#!/usr/bin/env python3
"""Generate PWA icons without external dependencies (pure stdlib PNG writer)."""
import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "icons")


def write_png(path, width, height, rows):
    raw = b"".join(b"\x00" + bytes(px for px in row) for row in rows)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        c += struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        return c

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def lerp(a, b, t):
    return int(round(a + (b - a) * t))


def make_icon(size, rounded):
    top = (37, 99, 235)      # blue-600
    bottom = (30, 58, 138)   # blue-900
    radius = int(size * 0.22) if rounded else 0
    rows = []

    # arrow geometry in a normalized 512 grid
    s = size / 512.0

    def R(v):
        return v * s

    white = (255, 255, 255, 255)
    # two swap arrows: up-arrow (right side) and down-arrow (left side)
    shaft_w = R(34)
    # right (up) arrow
    up_cx = R(320)
    up_shaft_top = R(150)
    up_shaft_bot = R(360)
    # left (down) arrow
    down_cx = R(192)
    down_shaft_top = R(152)
    down_shaft_bot = R(362)
    head_w = R(66)   # half width of head
    head_h = R(80)

    def in_up_arrow(x, y):
        # triangle head (apex up at up_shaft_top)
        apex_y = up_shaft_top
        base_y = up_shaft_top + head_h
        if apex_y <= y <= base_y:
            t = (y - apex_y) / head_h
            hw = head_w * t
            if abs(x - up_cx) <= hw:
                return True
        # shaft
        if base_y - R(6) <= y <= up_shaft_bot:
            if abs(x - up_cx) <= shaft_w / 2:
                return True
        return False

    def in_down_arrow(x, y):
        apex_y = down_shaft_bot
        base_y = down_shaft_bot - head_h
        if base_y <= y <= apex_y:
            t = (apex_y - y) / head_h
            hw = head_w * t
            if abs(x - down_cx) <= hw:
                return True
        if down_shaft_top <= y <= base_y + R(6):
            if abs(x - down_cx) <= shaft_w / 2:
                return True
        return False

    def inside_round(x, y):
        if radius == 0:
            return True
        cx = min(max(x, radius), size - 1 - radius)
        cy = min(max(y, radius), size - 1 - radius)
        dx, dy = x - cx, y - cy
        return dx * dx + dy * dy <= radius * radius

    # anti-aliased-ish edge via 2x supersample would be heavy; use simple edge alpha
    for y in range(size):
        row = []
        for x in range(size):
            t = y / max(size - 1, 1)
            r = lerp(top[0], bottom[0], t)
            g = lerp(top[1], bottom[1], t)
            b = lerp(top[2], bottom[2], t)

            # sample 4 points for coverage
            hits = 0
            for oy in (0.25, 0.75):
                for ox in (0.25, 0.75):
                    px, py = x + ox, y + oy
                    if not inside_round(px, py):
                        continue
                    if in_up_arrow(px, py) or in_down_arrow(px, py):
                        hits += 1
            if hits == 4:
                row.extend([255, 255, 255, 255])
            elif hits == 0:
                if not inside_round(x + 0.5, y + 0.5):
                    row.extend([0, 0, 0, 0])
                else:
                    row.extend([r, g, b, 255])
            else:
                # blend white over bg with partial coverage
                cov = hits / 4.0
                row.extend([
                    lerp(r, 255, cov),
                    lerp(g, 255, cov),
                    lerp(b, 255, cov),
                    255 if inside_round(x + 0.5, y + 0.5) else int(255 * cov),
                ])
        rows.append(row)
    return rows


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    specs = [
        ("icon-192.png", 192, True),
        ("icon-512.png", 512, True),
        ("icon-maskable-512.png", 512, False),
        ("apple-touch-icon.png", 180, False),
    ]
    for name, size, rounded in specs:
        path = os.path.join(OUT_DIR, name)
        write_png(path, size, size, make_icon(size, rounded))
        print("wrote", path)


if __name__ == "__main__":
    main()
