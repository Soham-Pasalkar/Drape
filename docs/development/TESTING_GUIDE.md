# DRAPE — Comprehensive Test Suite & Quality Assurance Guide

DRAPE maintains a rigorous, multi-tiered automated verification suite spanning both backend microservices and frontend client rendering/AR simulation engines.

---

## 1. Quick Verification Matrix

| Test Suite | Execution Command | Test Count | Scope |
|---|---|---|---|
| **Backend Pytest** | `cd backend && .venv/bin/pytest tests/` | 109 | Auth, Catalog, Cart, Checkout, Payments, Wardrobe, Studio, IDOR security |
| **Commerce Suite** | `npm --prefix frontend run test:commerce` | 21 | Assortment, pricing minor units, variant availability, search, filtering |
| **AR Baseline Runner** | `npm --prefix frontend run test:ar` | 282 | Calibration, camera, kinematics, XPBD cloth dynamics, GLB parity |
| **Garment Validator** | `npm --prefix frontend run validate:garments` | 8 | GLB meshes, vertex count, anchor placement, and XPBD simulation metadata |
| **Frontend Lint** | `npm --prefix frontend run lint` | Full codebase | ESLint Next.js configuration (0 errors, 0 warnings) |
| **Production Build** | `npm --prefix frontend run build` | 23 routes | Static generation, TypeScript compilation, and route trace validation |

---

## 2. Backend Pytest Execution

The backend test suite is configured for both root-level and subproject directory execution:

### Option A: From Repository Root
```bash
backend/.venv/bin/pytest backend/tests/
```

### Option B: From Backend Directory
```bash
cd backend
.venv/bin/pytest tests/
```

### Targeted Module Testing
```bash
# Test authentication & customer account security
.venv/bin/pytest tests/test_auth.py

# Test DRAPE Studio stylist, wear diary, and outfit planner
.venv/bin/pytest tests/test_drape_studio.py

# Test payment adapter and webhook signature verification
.venv/bin/pytest tests/test_payments.py
```

---

## 3. Frontend Commerce & Catalog Verification

Verifies commercial data integrity, product photography mappings, variant pricing ($ USD cents minor-unit integer arithmetic), and 3D garment compatibility:

```bash
cd frontend
npm run test:commerce
```

Key verifications:
- Exactly 18 active demo products across balanced categories.
- Unique product IDs, slugs, and SKUs.
- Verified disk existence for all product photography in `public/images/`.
- Strict 3D garment registry compatibility (zero fake AR mappings).
- Category, size, and color filtering isolation without cross-contamination.

---

## 4. Augmented Reality (AR) Baseline Verification

DRAPE's 3D Virtual Try-On is anchored on the frozen **Milestone 0.9 AR baseline**. The automated AR test suite runs headless using node-three canvas simulation:

```bash
cd frontend
npm run test:ar
```

### Note on Canonical Test Count (282 vs 284)
- **Canonical Count:** **282 Passed**
- Earlier development reports recorded 284 tests when two temporary 2MB local Chrome developer recordings (`drape-session-chrome-*.json`) were placed in `docs/aidlc/sessions/rig/`.
- During repository hygiene finalization, these two disposable developer recordings were safely purged, reducing `test-ar-replay` from 7 tests to 5 tests.
- All 24 core AR test suites pass with 100% green integrity across all 282 assertions.

---

## 5. 3D Garment Asset Validation

Validates the canonical 8 production GLB garment models:

```bash
cd frontend
npm run validate:garments
```

Audited garment models:
1. `tshirt-crewneck` (847 verts, 1504 tris, shoulder_center anchor)
2. `tshirt-oversized` (847 verts, 1504 tris, shoulder_center anchor)
3. `tshirt-fitted` (847 verts, 1504 tris, shoulder_center anchor)
4. `top-longsleeve` (847 verts, 1504 tris, shoulder_center anchor)
5. `top-sleeveless` (609 verts, 1120 tris, shoulder_center anchor)
6. `skirt-aline` (1095 verts, 1984 tris, waist_center anchor)
7. `skirt-pleated` (1767 verts, 3264 tris, waist_center anchor)
8. `dress-midi` (899 verts, 1680 tris, shoulder_center anchor)
