"""
DRAPE Natural American Walnut Texture Synthesizer (Botanical Physics-Based).

Synthesizes authentic, handcrafted American Walnut (Juglans nigra) wood textures:
1. walnut_natural.png: Natural cathedral grain for door panels (warm chocolate, subtle parabolic arches, no liquid/marble swirl)
2. walnut_vertical.png: Long straight-and-undulating vertical grain for pilasters, stiles, and side columns
3. walnut_horizontal.png: Horizontal grain for shelves, plinth base, top cornice, and drawer fronts
4. walnut_dark_frame.png: Deep espresso solid walnut timber for outer framing and moulding profiles

Physics model:
- Tangential slice through conical annual growth rings: r = sqrt((x - x0)^2 + d0^2)
- Asymmetrical earlywood (gradual growth) to latewood (dense boundary) ring profiles
- Micro-capillary vessel pores aligned with grain
- Longitudinal diffuse chatoyancy (natural satin finish sheen)
"""

import math
import os
import random
import struct
import subprocess


def write_bmp(filename: str, width: int, height: int, pixels: list):
    """Writes standard 24-bit uncompressed Windows BMP file."""
    row_bytes = width * 3
    padding = (4 - (row_bytes % 4)) % 4
    image_size = (row_bytes + padding) * height
    file_size = 54 + image_size

    with open(filename, "wb") as f:
        f.write(b"BM")
        f.write(struct.pack("<I", file_size))
        f.write(b"\x00\x00\x00\x00")
        f.write(struct.pack("<I", 54))
        f.write(struct.pack("<I", 40))
        f.write(struct.pack("<i", width))
        f.write(struct.pack("<i", height))
        f.write(struct.pack("<H", 1))
        f.write(struct.pack("<H", 24))
        f.write(struct.pack("<I", 0))
        f.write(struct.pack("<I", image_size))
        f.write(struct.pack("<i", 2835))
        f.write(struct.pack("<i", 2835))
        f.write(struct.pack("<I", 0))
        f.write(struct.pack("<I", 0))

        pad = b"\x00" * padding
        for y in range(height - 1, -1, -1):
            row_start = y * width
            for x in range(width):
                r, g, b = pixels[row_start + x]
                r = max(0, min(255, int(r)))
                g = max(0, min(255, int(g)))
                b = max(0, min(255, int(b)))
                f.write(struct.pack("BBB", b, g, r))
            f.write(pad)


def convert_bmp_to_png(bmp_path: str, png_path: str):
    """Uses macOS sips to convert BMP to high-quality PNG."""
    cmd = ["/usr/bin/sips", "-s", "format", "png", bmp_path, "--out", png_path]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"sips failed: {res.stderr}")
    if os.path.exists(bmp_path):
        os.remove(bmp_path)


class PeriodicNoise:
    """Seamless 2D periodic gradient noise."""
    def __init__(self, seed=777):
        random.seed(seed)
        self.p = list(range(256))
        random.shuffle(self.p)
        self.p += self.p

    def fade(self, t):
        return t * t * t * (t * (t * 6 - 15) + 10)

    def lerp(self, a, b, t):
        return a + t * (b - a)

    def grad(self, hash_val, x, y):
        h = hash_val & 7
        u = x if h < 4 else y
        v = y if h < 4 else x
        return (u if (h & 1) == 0 else -u) + (v if (h & 2) == 0 else -v)

    def noise2d(self, x, y, repeat_x=16, repeat_y=16):
        xi = int(x) % repeat_x
        yi = int(y) % repeat_y
        xf = x - int(x)
        yf = y - int(y)

        u = self.fade(xf)
        v = self.fade(yf)

        aa = self.p[self.p[xi] + yi]
        ab = self.p[self.p[xi] + (yi + 1) % repeat_y]
        ba = self.p[self.p[(xi + 1) % repeat_x] + yi]
        bb = self.p[self.p[(xi + 1) % repeat_x] + (yi + 1) % repeat_y]

        x1 = self.lerp(self.grad(aa, xf, yf), self.grad(ba, xf - 1, yf), u)
        x2 = self.lerp(self.grad(ab, xf, yf - 1), self.grad(bb, xf - 1, yf - 1), u)
        return self.lerp(x1, x2, v)

    def fbm(self, x, y, octaves=4, repeat_x=16, repeat_y=16):
        total = 0.0
        freq = 1.0
        amp = 1.0
        max_v = 0.0
        for _ in range(octaves):
            rx = int(repeat_x * freq)
            ry = int(repeat_y * freq)
            total += self.noise2d(x * freq, y * freq, rx, ry) * amp
            max_v += amp
            amp *= 0.5
            freq *= 2.0
        return total / max_v


def lerp_color(c1, c2, t):
    t = max(0.0, min(1.0, t))
    return (
        c1[0] + (c2[0] - c1[0]) * t,
        c1[1] + (c2[1] - c1[1]) * t,
        c1[2] + (c2[2] - c1[2]) * t,
    )


def color_ramp(palette, t):
    t = max(0.0, min(1.0, t))
    n = len(palette) - 1
    idx = int(t * n)
    idx = min(idx, n - 1)
    local_t = (t * n) - idx
    return lerp_color(palette[idx], palette[idx + 1], local_t)


def generate_natural_cathedral_walnut(width=512, height=512, seed=404):
    """
    Synthesizes authentic natural American Walnut with gentle, restrained cathedral arches.
    Warm chocolate brown, moderate tonal contrast, fine wood fibers.
    """
    noise = PeriodicNoise(seed)
    pixels = []

    # Restrained, sophisticated American Black Walnut palette:
    # Warm dark chocolate to rich medium walnut to subtle amber highlight
    palette = [
        (38, 23, 14),   # Deep walnut shadow / ring boundary (#26170E)
        (48, 30, 19),   # Core chocolate walnut (#301E13)
        (58, 36, 23),   # Rich warm walnut body (#3A2417)
        (70, 44, 28),   # Medium walnut fiber (#462C1C)
        (82, 53, 34),   # Soft amber earlywood highlight (#523522)
    ]

    for y in range(height):
        ny = y / height
        for x in range(width):
            nx = x / width

            # Botanical trunk axis with very gentle natural sway
            trunk_center_x = 0.5 + 0.06 * math.sin(ny * 2.0 * math.pi)
            dx = (nx - trunk_center_x)

            # Flat-sawn tangential distance from cone axis:
            # d_cone = sqrt(dx^2 + cone_depth^2)
            # cone_depth varies slowly along Y, producing authentic parabolic cathedral arches
            cone_depth = 0.18 + 0.10 * math.sin(ny * 2.0 * math.pi)
            r = math.sqrt(dx * dx + cone_depth * cone_depth)

            # Gentle organic fiber distortion
            warp = noise.fbm(nx * 4, ny * 2, octaves=3, repeat_x=4, repeat_y=2) * 0.025
            r += warp

            # Wood growth rings: asymmetric earlywood (broad) to latewood (compact)
            ring_phase = (r * 18.0) % 1.0
            # Asymmetry curve: smooth rise, quick drop at ring boundary
            ring_shape = math.pow(math.sin(ring_phase * math.pi), 1.4)

            # Fine longitudinal wood fibers (stretched along Y)
            fiber_noise = noise.noise2d(nx * 128, ny * 8, repeat_x=128, repeat_y=8) * 0.08

            # Soft diffuse chatoyancy (natural satin sheen)
            sheen = noise.noise2d(nx * 4, ny * 2, repeat_x=4, repeat_y=2) * 0.06

            # Combine into normalized parameter [0..1] with moderate contrast
            t = 0.25 + ring_shape * 0.45 + fiber_noise + sheen
            t = max(0.0, min(1.0, t))

            col = color_ramp(palette, t)

            # Micro-pore vessels: subtle vertical pore tracks
            pore = noise.noise2d(nx * 256, ny * 32, repeat_x=256, repeat_y=32)
            if pore > 0.72:
                col = lerp_color(col, (28, 16, 10), 0.35)

            pixels.append(col)

    return pixels


def generate_natural_vertical_walnut(width=512, height=512, seed=505):
    """
    Synthesizes long, flowing straight-to-gently-undulating vertical grain for pilasters and stiles.
    """
    noise = PeriodicNoise(seed)
    pixels = []

    palette = [
        (34, 20, 12),   # Deep espresso shadow
        (44, 27, 17),   # Chocolate base
        (54, 34, 22),   # Medium warm walnut
        (66, 42, 27),   # Warm fiber highlight
    ]

    for y in range(height):
        ny = y / height
        for x in range(width):
            nx = x / width

            # Gentle longitudinal organic wave
            wave = noise.fbm(nx * 2, ny * 3, octaves=3, repeat_x=2, repeat_y=3) * 0.04
            straight_x = (nx + wave) % 1.0

            # Vertical grain lines
            grain_val = math.sin(straight_x * 24.0 * math.pi) * 0.5 + 0.5

            # Longitudinal fine fibers
            fibers = noise.noise2d(nx * 128, ny * 8, repeat_x=128, repeat_y=8) * 0.10

            # Satin sheen modulation
            satin = noise.noise2d(nx * 6, ny * 2, repeat_x=6, repeat_y=2) * 0.08

            t = 0.25 + grain_val * 0.40 + fibers + satin
            t = max(0.0, min(1.0, t))

            col = color_ramp(palette, t)

            # Micro-pore vessels
            pore = noise.noise2d(nx * 256, ny * 32, repeat_x=256, repeat_y=32)
            if pore > 0.70:
                col = lerp_color(col, (24, 14, 8), 0.30)

            pixels.append(col)

    return pixels


def generate_natural_horizontal_walnut(width=512, height=512, seed=606):
    """
    Synthesizes restrained horizontal grain for shelves, plinth, and drawer fronts.
    """
    vert = generate_natural_vertical_walnut(width, height, seed)
    horiz = [None] * (width * height)
    for y in range(height):
        for x in range(width):
            horiz[x * height + (height - 1 - y)] = vert[y * width + x]
    return horiz


def generate_dark_frame_walnut(width=512, height=512, seed=707):
    """
    Deep espresso solid walnut timber for outer framing and moulding profiles.
    """
    noise = PeriodicNoise(seed)
    pixels = []

    palette = [
        (26, 15, 9),    # Deep espresso (#1A0F09)
        (34, 20, 12),   # Dark chocolate (#22140C)
        (42, 25, 15),   # Rich deep walnut (#2A190F)
        (52, 32, 20),   # Subdued highlight (#342014)
    ]

    for y in range(height):
        ny = y / height
        for x in range(width):
            nx = x / width

            wave = noise.fbm(nx * 3, ny * 2, octaves=3, repeat_x=3, repeat_y=2) * 0.03
            curved_x = (nx + wave) % 1.0

            grain = math.sin(curved_x * 20.0 * math.pi) * 0.5 + 0.5
            fibers = noise.noise2d(nx * 128, ny * 8, repeat_x=128, repeat_y=8) * 0.08

            t = 0.25 + grain * 0.45 + fibers
            t = max(0.0, min(1.0, t))

            col = color_ramp(palette, t)
            pixels.append(col)

    return pixels


def main():
    out_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../public/images/textures")
    )
    os.makedirs(out_dir, exist_ok=True)

    textures = [
        ("walnut_natural", generate_natural_cathedral_walnut),
        ("walnut_vertical", generate_natural_vertical_walnut),
        ("walnut_horizontal", generate_natural_horizontal_walnut),
        ("walnut_dark_frame", generate_dark_frame_walnut),
    ]

    print("Generating natural American Walnut textures...")
    for name, gen_fn in textures:
        bmp_path = os.path.join(out_dir, f"{name}.bmp")
        png_path = os.path.join(out_dir, f"{name}.png")

        print(f"  -> Synthesizing {name} (512x512)...")
        pixels = gen_fn(512, 512)
        write_bmp(bmp_path, 512, 512, pixels)
        convert_bmp_to_png(bmp_path, png_path)

        size_kb = os.path.getsize(png_path) / 1024.0
        print(f"  ✓ Saved {name}.png ({size_kb:.1f} KB)")

    # Also update walnut_burl.png to be a restrained figured walnut rather than liquid marble
    # so any legacy reference to walnut_burl stays beautiful and understated
    burl_bmp = os.path.join(out_dir, "walnut_burl.bmp")
    burl_png = os.path.join(out_dir, "walnut_burl.png")
    print("  -> Updating walnut_burl.png with restrained cathedral grain...")
    burl_pixels = generate_natural_cathedral_walnut(512, 512, seed=808)
    write_bmp(burl_bmp, 512, 512, burl_pixels)
    convert_bmp_to_png(burl_bmp, burl_png)
    print(f"  ✓ Saved walnut_burl.png ({os.path.getsize(burl_png) / 1024.0:.1f} KB)")

    print("\n✅ All natural walnut textures synthesized successfully.")


if __name__ == "__main__":
    main()
