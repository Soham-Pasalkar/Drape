"use client";

import React from "react";
import { Sparkles, X } from "lucide-react";

export interface TryOnInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TryOnInfoModal({ isOpen, onClose }: TryOnInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-ink-black border border-warm-ivory/20 max-w-lg w-full p-6 space-y-4 relative text-warm-ivory shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-warm-ivory/60 hover:text-white"
          aria-label="Close dossier modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-acid-lime font-mono text-xs uppercase tracking-widest">
          <Sparkles className="w-4 h-4" />
          <span>DRAPE SPATIAL ATELIER • SPECIFICATION</span>
        </div>

        <h3 className="font-serif text-2xl font-light">Parametric 3D AR Virtual Try-On</h3>

        <div className="space-y-3 text-xs font-mono text-warm-ivory/80 leading-relaxed">
          <p>
            <strong>Camera Projection:</strong> Pinhole model K (population prior or card-calibrated focal length) with an off-axis frustum that includes the video&apos;s object-fit crop. Mirroring is a single CSS reflection of the whole layer stack.
          </p>
          <p>
            <strong>Tracking &amp; Jitter Filter:</strong> 1€ Filter (Casiez et al., 2012) on joint positions and quaternion SLERP in SO(3).
          </p>
          <p>
            <strong>Parametric Body:</strong> A simplified MHR-inspired proxy (elliptical torso sections, capsule limbs). It is not a full MHR reconstruction.
          </p>
          <p>
            <strong>Anthropometry:</strong> Body proportions are observed; absolute size is assumed from an anthropometric prior because a single webcam cannot measure it. Circumferences are indicative only.
          </p>
          <p>
            <strong>Cloth Dynamics:</strong> XPBD secondary simulation (fixed 60 Hz step) about the fitted garment shape, with stretch, bending, tether and collision constraints.
          </p>
          <p>
            <strong>Occlusion:</strong> Depth-only body proxy (colorWrite: false) occludes 3D garments when arms/hands pass in front of torso.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-warm-ivory text-ink-black font-mono text-xs uppercase tracking-widest hover:bg-white transition-colors"
        >
          Close Dossier
        </button>
      </div>
    </div>
  );
}

