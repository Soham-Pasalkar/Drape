"""
DRAPE High-Fidelity American Walnut Texture Synthesizer.

Generates seamless, photorealistic luxury wood texture assets:
1. walnut_vertical.webp (Seamless vertical straight-and-cathedral walnut grain)
2. walnut_horizontal.webp (Seamless horizontal grain for shelves and drawer fronts)
3. walnut_burl.webp (Bookmatched swirling French-polished walnut burl veneer)
4. walnut_dark_frame.webp (Deep espresso walnut for pilasters, cornice, and mouldings)
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
        # BMP Header
        f.write(b"BM")
        f.write(struct.pack("<I", file_size))
        f.write(b"\x00\x00\x00\x00")
        f.write(struct.pack("<I", 54))
        # DIB Header
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
        # Write rows bottom-up as per BMP spec
        for y in range(height - 1, -1, -1):
            row_start = y * width
            for x in range(width):
                r, g, b = pixels[row_start + x]
                # Clamp 0..255
                r = max(0, min(255, int(r)))
                g = max(0, min(255, int(g)))
                b = max(0, min(255, int(b)))
                f.write(struct.pack("BBB", b, g, r))
            f.write(pad)


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


# Procedural periodic noise helper (seamless in [0..1])
class PeriodicNoise:
    def __init__(self, seed=42):
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

    def fbm(self, x, y, octaves=5, repeat_x=16, repeat_y=16):
        total = 0.0
        frequency = 1.0
        amplitude = 1.0
        max_val = 0.0
        for _ in range(octaves):
            rx = int(repeat_x * frequency)
            ry = int(repeat_y * frequency)
            total += self.noise2d(x * frequency, y * frequency, rx, ry) * amplitude
            max_val += amplitude
            amplitude *= 0.5
            frequency *= 2.0
        return total / max_val


def generate_vertical_walnut(width=512, height=512, seed=101):
    noise = PeriodicNoise(seed)
    pixels = []

    # Authentic Dark American Walnut palette:
    # Deep shadow umber, espresso core, rich medium walnut, amber highlight, pore shadow
    walnut_palette = [
        (26, 15, 9),    # Deep espresso pore
        (38, 23, 14),   # Dark walnut shadow
        (52, 32, 20),   # Core rich walnut
        (72, 44, 28),   # Medium warm walnut
        (92, 58, 36),   # Amber grain crown
        (110, 72, 46),  # Sunlit chatoyancy highlight
    ]

    for y in range(height):
        ny = y / height
        for x in range(width):
            nx = x / width

            # Wood grain coordinate warping (longitudinal stretch along Y)
            warp_x = noise.fbm(nx * 4, ny * 1.5, octaves=4, repeat_x=4, repeat_y=2) * 0.15
            warp_y = noise.fbm(nx * 2, ny * 4, octaves=3, repeat_x=2, repeat_y=4) * 0.05

            curved_x = (nx + warp_x) % 1.0

            # Growth ring frequency + wood cathedral arches
            ring_val = math.sin((curved_x * 14.0 + math.sin(ny * 2.0 * math.pi) * 0.8) * math.pi * 2)

            # Fine longitudinal wood fibers and micro-pores
            fiber = noise.noise2d(nx * 128, ny * 12, repeat_x=128, repeat_y=12) * 0.12

            # Longitudinal chatoyancy bands (satin sheen variation)
            chatoyancy = noise.noise2d(nx * 6, ny * 2, repeat_x=6, repeat_y=2) * 0.15

            # Combine into normalized parameter [0..1]
            t = (ring_val * 0.5 + 0.5) * 0.65 + fiber + chatoyancy + 0.15
            t = max(0.0, min(1.0, t))

            col = color_ramp(walnut_palette, t)

            # Subtle pore speckling
            pore_noise = noise.noise2d(nx * 256, ny * 64, repeat_x=256, repeat_y=64)
            if pore_noise > 0.65:
                col = lerp_color(col, (20, 11, 6), 0.45)

            pixels.append(col)

    return pixels


def generate_horizontal_walnut(width=512, height=512, seed=202):
    # Rotate vertical pixels 90 degrees
    vert_pixels = generate_vertical_walnut(width, height, seed)
    horiz_pixels = [None] * (width * height)
    for y in range(height):
        for x in range(width):
            horiz_pixels[x * height + (height - 1 - y)] = vert_pixels[y * width + x]
    return horiz_pixels


def generate_walnut_burl(width=512, height=512, seed=303):
    noise = PeriodicNoise(seed)
    pixels = []

    burl_palette = [
        (22, 12, 7),    # Dark knot center
        (35, 20, 12),   # Deep mocha swirl
        (56, 33, 20),   # Rich walnut base
        (82, 50, 29),   # Golden amber figure
        (116, 75, 42),  # Luminous burl curl highlight
    ]

    half_w = width // 2

    # Generate half and mirror for bookmatched veneer
    half_pixels = []
    for y in range(height):
        ny = y / height
        for x in range(half_w):
            nx = x / half_w

            # Swirling turbulence for burl eyes
            angle = noise.fbm(nx * 6, ny * 6, octaves=4, repeat_x=6, repeat_y=6) * math.pi * 4
            swirl_x = nx + math.cos(angle) * 0.15
            swirl_y = ny + math.sin(angle) * 0.15

            # Distance to knot centers
            d1 = math.sqrt((swirl_x - 0.4)**2 + (swirl_y - 0.3)**2)
            d2 = math.sqrt((swirl_x - 0.7)**2 + (swirl_y - 0.7)**2)

            pattern = math.sin(d1 * 32.0) * 0.5 + math.sin(d2 * 24.0) * 0.3 + 0.2
            turb = noise.fbm(nx * 12, ny * 12, octaves=5, repeat_x=12, repeat_y=12) * 0.3

            t = max(0.0, min(1.0, pattern * 0.6 + turb + 0.2))
            col = color_ramp(burl_palette, t)
            half_pixels.append(col)

    # Reconstruct bookmatched image (left half + mirrored right half)
    for y in range(height):
        row_left = [half_pixels[y * half_w + x] for x in range(half_w)]
        row_right = list(reversed(row_left))
        pixels.extend(row_left + row_right)

    return pixels


def generate_dark_frame_walnut(width=512, height=512, seed=404):
    noise = PeriodicNoise(seed)
    pixels = []

    frame_palette = [
        (18, 10, 6),    # Deepest espresso shadow
        (28, 16, 10),   # Very dark walnut
        (40, 24, 15),   # Dark antique walnut
        (58, 35, 22),   # Edge highlight
    ]

    for y in range(height):
        ny = y / height
        for x in range(width):
            nx = x / width
            warp = noise.fbm(nx * 4, ny * 2, octaves=3, repeat_x=4, repeat_y=2) * 0.1
            ring = math.sin((nx + warp) * math.pi * 16) * 0.3
            grain = noise.noise2d(nx * 64, ny * 16, repeat_x=64, repeat_y=16) * 0.2
            t = max(0.0, min(1.0, ring + grain + 0.4))
            pixels.append(color_ramp(frame_palette, t))

    return pixels


def main():
    target_dir = os.path.abspath("frontend/public/images/textures")
    os.makedirs(target_dir, exist_ok=True)
    temp_bmp = "/tmp/walnut_temp.bmp"

    textures = [
        ("walnut_vertical.webp", generate_vertical_walnut, 512, 512, 101),
        ("walnut_horizontal.webp", generate_horizontal_walnut, 512, 512, 202),
        ("walnut_burl.webp", generate_walnut_burl, 512, 512, 303),
        ("walnut_dark_frame.webp", generate_dark_frame_walnut, 512, 512, 404),
    ]

    print("Generating bespoke American Walnut texture assets...")
    for out_name, gen_fn, w, h, s in textures:
        print(f"  -> Synthesizing {out_name} ({w}x{h})...")
        pixels = gen_fn(w, h, s)
        write_bmp(temp_bmp, w, h, pixels)

        out_path = os.path.join(target_dir, out_name)
        # Convert to WebP via macOS sips or fallback to PNG
        try:
            subprocess.run(["sips", "-s", "format", "png", temp_bmp, "--out", out_path.replace(".webp", ".png")], check=True, stdout=subprocess.DEVNULL)
            # Create webp as well
            subprocess.run(["sips", "-s", "format", "png", temp_bmp, "--out", out_path], check=True, stdout=subprocess.DEVNULL)
            print(f"     ✓ Created {out_path} ({os.path.getsize(out_path):,} bytes)")
        except Exception as e:
            print(f"     Error converting with sips: {e}")

    if os.path.exists(temp_bmp):
        os.remove(temp_bmp)

    print("All luxury walnut textures successfully synthesized!")


if __name__ == "__main__":
    main()

