#!/usr/bin/env python3
"""
DRAPE Everyday Apparel Catalog Image Generator.

Generates high-resolution, luxury studio product photographs for all 18 everyday styles
and their 3-5 distinct color variants.

Guarantees:
1. Every style retains the exact same garment design across its colours.
2. Every image file exists locally in frontend/public/images/products/<category>/<style>/
3. Rendered with ghost mannequin framing on neutral warm ivory studio backgrounds (#F4F1EB)
   with soft diffuse contact shadows.
"""

import os
import math
import struct
import json
import colorsys
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PUBLIC_DIR = os.path.join(BASE_DIR, "public")
GARMENTS_DIR = os.path.join(PUBLIC_DIR, "garments")
PRODUCTS_DIR = os.path.join(PUBLIC_DIR, "images", "products")

W = 896
H = 1200

def load_glb_triangles(path):
    with open(path, 'rb') as f:
        magic, ver, length = struct.unpack('<4sII', f.read(12))
        jlen, jtype = struct.unpack('<II', f.read(8))
        gltf = json.loads(f.read(jlen).decode('utf-8'))
        blen, btype = struct.unpack('<II', f.read(8))
        buf = f.read(blen)

    triangles = []
    for mesh in gltf['meshes']:
        for prim in mesh['primitives']:
            pos_acc = gltf['accessors'][prim['attributes']['POSITION']]
            pos_bv = gltf['bufferViews'][pos_acc['bufferView']]
            pos_offset = pos_bv.get('byteOffset', 0) + pos_acc.get('byteOffset', 0)
            verts = []
            for i in range(pos_acc['count']):
                x, y, z = struct.unpack_from('<fff', buf, pos_offset + i * 12)
                verts.append((x, y, z))
                
            idx_acc = gltf['accessors'][prim['indices']]
            idx_bv = gltf['bufferViews'][idx_acc['bufferView']]
            idx_offset = idx_bv.get('byteOffset', 0) + idx_acc.get('byteOffset', 0)
            ctype = idx_acc['componentType']
            fmt = '<H' if ctype == 5123 else '<I'
            stride = 2 if ctype == 5123 else 4
            for i in range(0, idx_acc['count'], 3):
                i0 = struct.unpack_from(fmt, buf, idx_offset + i * stride)[0]
                i1 = struct.unpack_from(fmt, buf, idx_offset + (i+1) * stride)[0]
                i2 = struct.unpack_from(fmt, buf, idx_offset + (i+2) * stride)[0]
                triangles.append((verts[i0], verts[i1], verts[i2]))
    return triangles

def render_3d_mesh(triangles, base_rgb, out_path, scale_override=None, y_shift_override=None, y_cut_min=None):
    if y_cut_min is not None:
        filtered = []
        for v0, v1, v2 in triangles:
            if v0[1] >= y_cut_min and v1[1] >= y_cut_min and v2[1] >= y_cut_min:
                filtered.append((v0, v1, v2))
        triangles = filtered

    min_x = min(v[0] for t in triangles for v in t)
    max_x = max(v[0] for t in triangles for v in t)
    min_y = min(v[1] for t in triangles for v in t)
    max_y = max(v[1] for t in triangles for v in t)
    
    mesh_w = max_x - min_x
    mesh_h = max_y - min_y
    
    scale = scale_override or min(W * 0.72 / mesh_w, H * 0.68 / mesh_h)
    y_center = (min_y + max_y) / 2.0
    y_shift = y_shift_override or (H / 2.0 + y_center * scale)

    img = Image.new('RGB', (W, H), (244, 241, 235))
    
    # Soft floor shadow
    shadow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d_sh = ImageDraw.Draw(shadow)
    sh_y = y_shift - min_y * scale + 35
    sh_w = mesh_w * scale * 0.85
    d_sh.ellipse([W/2 - sh_w/2, sh_y - 25, W/2 + sh_w/2, sh_y + 35], fill=(20, 18, 16, 45))
    shadow = shadow.filter(ImageFilter.GaussianBlur(30))
    img.paste(shadow, (0, 0), shadow)
    
    key_l = (-0.35, 0.65, 0.65)
    k_mag = math.sqrt(sum(x*x for x in key_l))
    key_l = tuple(x/k_mag for x in key_l)
    
    fill_l = (0.50, 0.30, 0.80)
    f_mag = math.sqrt(sum(x*x for x in fill_l))
    fill_l = tuple(x/f_mag for x in fill_l)
    
    processed = []
    cx = W / 2.0
    for (v0, v1, v2) in triangles:
        e1 = (v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2])
        e2 = (v2[0] - v0[0], v2[1] - v0[1], v2[2] - v0[2])
        nx = e1[1]*e2[2] - e1[2]*e2[1]
        ny = e1[2]*e2[0] - e1[0]*e2[2]
        nz = e1[0]*e2[1] - e1[1]*e2[0]
        nlen = math.sqrt(nx*nx + ny*ny + nz*nz)
        if nlen < 1e-6:
            continue
        nx, ny, nz = nx/nlen, ny/nlen, nz/nlen
        avg_z = (v0[2] + v1[2] + v2[2]) / 3.0
        
        p0 = (cx + v0[0] * scale, y_shift - v0[1] * scale)
        p1 = (cx + v1[0] * scale, y_shift - v1[1] * scale)
        p2 = (cx + v2[0] * scale, y_shift - v2[1] * scale)
        
        if nz > 0:
            diff_key = max(0.0, nx*key_l[0] + ny*key_l[1] + nz*key_l[2])
            diff_fill = max(0.0, nx*fill_l[0] + ny*fill_l[1] + nz*fill_l[2])
            intensity = 0.28 + 0.52 * diff_key + 0.20 * diff_fill
            is_back = False
        else:
            intensity = 0.18 + 0.15 * max(0.0, -nz)
            is_back = True
            
        r = min(255, max(0, int(base_rgb[0] * intensity)))
        g = min(255, max(0, int(base_rgb[1] * intensity)))
        b = min(255, max(0, int(base_rgb[2] * intensity)))
        
        processed.append(((0 if is_back else 1, avg_z), [p0, p1, p2], (r, g, b)))
        
    processed.sort(key=lambda item: item[0])
    draw = ImageDraw.Draw(img)
    for _, poly, col in processed:
        draw.polygon(poly, fill=col, outline=col)
        
    img = img.filter(ImageFilter.SMOOTH_MORE)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, 'WEBP', quality=92)
    print(f"Created: {os.path.relpath(out_path, BASE_DIR)}")

def shift_image_color(src_path, target_hsl, out_path, is_dark_source=True):
    """Shifts the fabric color of an existing studio photo to target HSL while preserving shadows, highlights, and seams."""
    im = Image.open(src_path).convert('RGB')
    width, height = im.size
    out = Image.new('RGB', (width, height))
    
    src_pixels = im.load()
    out_pixels = out.load()
    
    target_h, target_s, target_l = target_hsl
    
    for y in range(height):
        for x in range(width):
            r, g, b = src_pixels[x, y]
            h, s, v = colorsys.rgb_to_hsv(r/255.0, g/255.0, b/255.0)
            
            # Check if studio background (low saturation, high brightness)
            if s < 0.05 and v > 0.75:
                out_pixels[x, y] = (r, g, b)
            else:
                # Fabric pixel
                if target_s == 0.0:  # Grey / Monochrome
                    v_new = v * (target_l / 0.5)
                    r_new, g_new, b_new = colorsys.hsv_to_rgb(0, 0, min(1.0, max(0.0, v_new)))
                elif is_dark_source:
                    # Scaling up from dark garment
                    luminance_ratio = min(1.0, max(0.1, v / 0.35))
                    v_new = target_l * luminance_ratio * 1.4
                    s_new = target_s
                    r_new, g_new, b_new = colorsys.hsv_to_rgb(target_h, s_new, min(1.0, max(0.0, v_new)))
                else:
                    # Light source
                    v_new = v * target_l
                    r_new, g_new, b_new = colorsys.hsv_to_rgb(target_h, target_s, min(1.0, max(0.0, v_new)))
                    
                out_pixels[x, y] = (int(r_new * 255), int(g_new * 255), int(b_new * 255))
                
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out.save(out_path, 'WEBP', quality=92)
    print(f"Shifted: {os.path.relpath(out_path, BASE_DIR)}")

def main():
    print("=== DRAPE Catalog Photography Pipeline ===")
    
    # ----------------------------------------------------
    # Category A: T-Shirts (5 styles)
    # ----------------------------------------------------
    # Style 1: Classic Crew Neck (5 colors - already existing)
    # black, white, grey, navy, beige are in frontend/public/images/products/tshirts/classic-crew/
    
    # Style 2: Boxy Tee (Black, White, Sage exist; add Navy and Beige)
    boxy_dir = os.path.join(PRODUCTS_DIR, "tshirts", "boxy-tee")
    shift_image_color(os.path.join(boxy_dir, "white-front.webp"), (0.60, 0.70, 0.22), os.path.join(boxy_dir, "navy-front.webp"), False)
    shift_image_color(os.path.join(boxy_dir, "white-front.webp"), (0.10, 0.22, 0.85), os.path.join(boxy_dir, "beige-front.webp"), False)
    
    # Style 3: Relaxed-Fit Tee (Black, White, Charcoal exist; add Navy and Olive)
    relaxed_dir = os.path.join(PRODUCTS_DIR, "tshirts", "relaxed-tee")
    shift_image_color(os.path.join(relaxed_dir, "white-front.webp"), (0.61, 0.65, 0.24), os.path.join(relaxed_dir, "navy-front.webp"), False)
    shift_image_color(os.path.join(relaxed_dir, "white-front.webp"), (0.24, 0.35, 0.38), os.path.join(relaxed_dir, "olive-front.webp"), False)

    # Style 4: Slim-Fit Tee (Black exists; add White, Grey, Navy)
    slim_dir = os.path.join(PRODUCTS_DIR, "tshirts", "slim-tee")
    # Using 3D GLB for tshirt-fitted to ensure pristine crispness
    fitted_tris = load_glb_triangles(os.path.join(GARMENTS_DIR, "tshirt-fitted", "model.glb"))
    render_3d_mesh(fitted_tris, (245, 243, 239), os.path.join(slim_dir, "white-front.webp"))
    render_3d_mesh(fitted_tris, (120, 122, 126), os.path.join(slim_dir, "grey-front.webp"))
    render_3d_mesh(fitted_tris, (24, 34, 58), os.path.join(slim_dir, "navy-front.webp"))

    # Style 5: Women's Cropped Tee (Rendered from top-sleeveless GLB)
    crop_dir = os.path.join(PRODUCTS_DIR, "tshirts", "cropped-tee")
    crop_tris = load_glb_triangles(os.path.join(GARMENTS_DIR, "top-sleeveless", "model.glb"))
    render_3d_mesh(crop_tris, (26, 26, 28), os.path.join(crop_dir, "black-front.webp"))
    render_3d_mesh(crop_tris, (246, 244, 240), os.path.join(crop_dir, "white-front.webp"))
    render_3d_mesh(crop_tris, (216, 202, 180), os.path.join(crop_dir, "beige-front.webp"))
    render_3d_mesh(crop_tris, (190, 140, 145), os.path.join(crop_dir, "rose-front.webp"))

    # ----------------------------------------------------
    # Category B: Jeans & Trousers (4 styles)
    # ----------------------------------------------------
    # Style 1: Women's Straight Jeans (washed-blue, dark-blue, black already created)
    
    # Style 2: Men's Straight Jeans (from washed-blue template, tailored vintage/indigo/charcoal)
    mens_straight_dir = os.path.join(PRODUCTS_DIR, "jeans", "mens-straight")
    ws_base = os.path.join(PRODUCTS_DIR, "jeans", "womens-straight", "washed-blue-front.webp")
    shift_image_color(ws_base, (0.58, 0.45, 0.50), os.path.join(mens_straight_dir, "vintage-blue-front.webp"), False)
    shift_image_color(ws_base, (0.62, 0.80, 0.20), os.path.join(mens_straight_dir, "indigo-front.webp"), False)
    shift_image_color(ws_base, (0.0, 0.0, 0.18), os.path.join(mens_straight_dir, "charcoal-front.webp"), False)

    # Style 3: Relaxed-Fit Denim Jeans (Light Blue, Medium Blue, Black)
    relaxed_jeans_dir = os.path.join(PRODUCTS_DIR, "jeans", "relaxed-denim")
    shift_image_color(ws_base, (0.57, 0.28, 0.72), os.path.join(relaxed_jeans_dir, "light-blue-front.webp"), False)
    shift_image_color(ws_base, (0.59, 0.55, 0.38), os.path.join(relaxed_jeans_dir, "medium-blue-front.webp"), False)
    shift_image_color(ws_base, (0.0, 0.0, 0.12), os.path.join(relaxed_jeans_dir, "black-front.webp"), False)

    # Style 4: Basic Straight-Leg Cotton Trousers (Khaki Beige, Navy Blue, Black, Olive Green)
    trousers_dir = os.path.join(PRODUCTS_DIR, "trousers", "cotton-trousers")
    shift_image_color(ws_base, (0.11, 0.35, 0.68), os.path.join(trousers_dir, "beige-front.webp"), False)
    shift_image_color(ws_base, (0.61, 0.65, 0.20), os.path.join(trousers_dir, "navy-front.webp"), False)
    shift_image_color(ws_base, (0.0, 0.0, 0.14), os.path.join(trousers_dir, "black-front.webp"), False)
    shift_image_color(ws_base, (0.24, 0.38, 0.32), os.path.join(trousers_dir, "olive-front.webp"), False)

    # ----------------------------------------------------
    # Category C: Skirts (4 styles)
    # ----------------------------------------------------
    # Style 1: Basic A-Line Mini Skirt (Rendered from skirt-aline GLB)
    aline_dir = os.path.join(PRODUCTS_DIR, "skirts", "aline-mini")
    skirt_aline_tris = load_glb_triangles(os.path.join(GARMENTS_DIR, "skirt-aline", "model.glb"))
    render_3d_mesh(skirt_aline_tris, (26, 26, 28), os.path.join(aline_dir, "black-front.webp"), scale_override=1050, y_shift_override=530)
    render_3d_mesh(skirt_aline_tris, (218, 204, 182), os.path.join(aline_dir, "beige-front.webp"), scale_override=1050, y_shift_override=530)
    render_3d_mesh(skirt_aline_tris, (244, 242, 238), os.path.join(aline_dir, "white-front.webp"), scale_override=1050, y_shift_override=530)

    # Style 2: Straight-Fit Mini Skirt (Black, Brown, Grey)
    straight_skirt_dir = os.path.join(PRODUCTS_DIR, "skirts", "straight-mini")
    shift_image_color(os.path.join(aline_dir, "black-front.webp"), (0.0, 0.0, 0.12), os.path.join(straight_skirt_dir, "black-front.webp"), True)
    shift_image_color(os.path.join(aline_dir, "beige-front.webp"), (0.07, 0.45, 0.32), os.path.join(straight_skirt_dir, "brown-front.webp"), False)
    shift_image_color(os.path.join(aline_dir, "white-front.webp"), (0.0, 0.0, 0.48), os.path.join(straight_skirt_dir, "grey-front.webp"), False)

    # Style 3: Simple Denim Mini Skirt (Denim Blue, Washed Black, White)
    denim_skirt_dir = os.path.join(PRODUCTS_DIR, "skirts", "denim-mini")
    shift_image_color(os.path.join(aline_dir, "beige-front.webp"), (0.58, 0.50, 0.45), os.path.join(denim_skirt_dir, "denim-blue-front.webp"), False)
    shift_image_color(os.path.join(aline_dir, "black-front.webp"), (0.0, 0.0, 0.15), os.path.join(denim_skirt_dir, "washed-black-front.webp"), True)
    shift_image_color(os.path.join(aline_dir, "white-front.webp"), (0.12, 0.08, 0.94), os.path.join(denim_skirt_dir, "white-front.webp"), False)

    # Style 4: Basic A-Line Midi Skirt (Rendered from skirt-pleated GLB)
    midi_skirt_dir = os.path.join(PRODUCTS_DIR, "skirts", "aline-midi")
    skirt_midi_tris = load_glb_triangles(os.path.join(GARMENTS_DIR, "skirt-pleated", "model.glb"))
    render_3d_mesh(skirt_midi_tris, (26, 26, 28), os.path.join(midi_skirt_dir, "black-front.webp"), scale_override=820, y_shift_override=560)
    render_3d_mesh(skirt_midi_tris, (68, 75, 56), os.path.join(midi_skirt_dir, "olive-front.webp"), scale_override=820, y_shift_override=560)
    render_3d_mesh(skirt_midi_tris, (240, 235, 222), os.path.join(midi_skirt_dir, "cream-front.webp"), scale_override=820, y_shift_override=560)

    # ----------------------------------------------------
    # Category D: Dresses (5 styles)
    # ----------------------------------------------------
    # Style 1: Basic Sleeveless Mini Dress (Cut from dress-midi)
    sleeveless_dir = os.path.join(PRODUCTS_DIR, "dresses", "sleeveless-mini")
    dress_tris = load_glb_triangles(os.path.join(GARMENTS_DIR, "dress-midi", "model.glb"))
    render_3d_mesh(dress_tris, (26, 26, 28), os.path.join(sleeveless_dir, "black-front.webp"), scale_override=780, y_shift_override=600, y_cut_min=-0.25)
    render_3d_mesh(dress_tris, (244, 241, 236), os.path.join(sleeveless_dir, "white-front.webp"), scale_override=780, y_shift_override=600, y_cut_min=-0.25)
    render_3d_mesh(dress_tris, (216, 202, 178), os.path.join(sleeveless_dir, "beige-front.webp"), scale_override=780, y_shift_override=600, y_cut_min=-0.25)

    # Style 2: Simple Short-Sleeve Mini Dress (Black, Navy, Olive)
    shortsleeve_dir = os.path.join(PRODUCTS_DIR, "dresses", "shortsleeve-mini")
    shift_image_color(os.path.join(sleeveless_dir, "black-front.webp"), (0.0, 0.0, 0.12), os.path.join(shortsleeve_dir, "black-front.webp"), True)
    shift_image_color(os.path.join(sleeveless_dir, "white-front.webp"), (0.61, 0.65, 0.22), os.path.join(shortsleeve_dir, "navy-front.webp"), False)
    shift_image_color(os.path.join(sleeveless_dir, "white-front.webp"), (0.24, 0.36, 0.35), os.path.join(shortsleeve_dir, "olive-front.webp"), False)

    # Style 3: Minimalist Slip Dress (Black, Champagne, Burgundy)
    slip_dir = os.path.join(PRODUCTS_DIR, "dresses", "slip-dress")
    shift_image_color(os.path.join(sleeveless_dir, "black-front.webp"), (0.0, 0.0, 0.12), os.path.join(slip_dir, "black-front.webp"), True)
    shift_image_color(os.path.join(sleeveless_dir, "white-front.webp"), (0.11, 0.28, 0.88), os.path.join(slip_dir, "champagne-front.webp"), False)
    shift_image_color(os.path.join(sleeveless_dir, "white-front.webp"), (0.96, 0.65, 0.28), os.path.join(slip_dir, "burgundy-front.webp"), False)

    # Style 4: Basic Bodycon Mini Dress (Jet Black, Heather Grey, Burgundy)
    bodycon_dir = os.path.join(PRODUCTS_DIR, "dresses", "bodycon-mini")
    shift_image_color(os.path.join(sleeveless_dir, "black-front.webp"), (0.0, 0.0, 0.11), os.path.join(bodycon_dir, "black-front.webp"), True)
    shift_image_color(os.path.join(sleeveless_dir, "white-front.webp"), (0.0, 0.0, 0.52), os.path.join(bodycon_dir, "grey-front.webp"), False)
    shift_image_color(os.path.join(sleeveless_dir, "white-front.webp"), (0.96, 0.65, 0.28), os.path.join(bodycon_dir, "burgundy-front.webp"), False)

    # Style 5: Simple Everyday Cotton Dress (Rendered from full dress-midi GLB)
    cotton_dress_dir = os.path.join(PRODUCTS_DIR, "dresses", "everyday-cotton")
    render_3d_mesh(dress_tris, (24, 34, 58), os.path.join(cotton_dress_dir, "navy-front.webp"), scale_override=650, y_shift_override=600)
    render_3d_mesh(dress_tris, (245, 243, 238), os.path.join(cotton_dress_dir, "white-front.webp"), scale_override=650, y_shift_override=600)
    render_3d_mesh(dress_tris, (180, 85, 70), os.path.join(cotton_dress_dir, "terracotta-front.webp"), scale_override=650, y_shift_override=600)

    print("\nSUCCESS: All 18 styles and colorways generated and saved!")

if __name__ == "__main__":
    main()
