"use client";

import React from "react";
import { Ruler, X } from "lucide-react";

export interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardWidthPx: number;
  onCardWidthPxChange: (width: number) => void;
  cardDistance: number;
  onCardDistanceChange: (distance: number) => void;
  onApply: () => void;
  onReset: () => void;
}

export function CalibrationModal({
  isOpen,
  onClose,
  cardWidthPx,
  onCardWidthPxChange,
  cardDistance,
  onCardDistanceChange,
  onApply,
  onReset,
}: CalibrationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-ink-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-ink-black border border-warm-ivory/20 max-w-md w-full p-6 space-y-5 relative text-warm-ivory shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-warm-ivory/60 hover:text-white"
          aria-label="Close calibration modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2 text-electric-blue font-mono text-xs uppercase tracking-widest">
          <Ruler className="w-4 h-4" />
          <span>Camera Metric Scale Calibration</span>
        </div>

        <h3 className="font-serif text-2xl font-light">ISO ID-1 Reference Card</h3>

        <p className="text-xs font-mono text-warm-ivory/70 leading-relaxed">
          Monocular RGB webcams do not provide absolute metric depth. Hold a standard credit/identity card (85.60 mm width) parallel to the camera at approximately 0.5 meters to calibrate the focal length. This does not calibrate your body size.
        </p>

        <div className="space-y-3 font-mono text-xs">
          <div>
            <label className="text-warm-ivory/60 block text-[10px] uppercase mb-1">
              Card Apparent Width in Stream (Pixels)
            </label>
            <input
              type="number"
              value={cardWidthPx}
              onChange={(e) => onCardWidthPxChange(Number(e.target.value))}
              className="w-full bg-warm-ivory/10 border border-warm-ivory/20 px-3 py-2 text-warm-ivory font-mono text-xs focus:outline-none focus:border-electric-blue"
            />
          </div>

          <div>
            <label className="text-warm-ivory/60 block text-[10px] uppercase mb-1">
              Distance to Camera (Meters)
            </label>
            <input
              type="number"
              step="0.05"
              value={cardDistance}
              onChange={(e) => onCardDistanceChange(Number(e.target.value))}
              className="w-full bg-warm-ivory/10 border border-warm-ivory/20 px-3 py-2 text-warm-ivory font-mono text-xs focus:outline-none focus:border-electric-blue"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={onApply}
            className="flex-1 py-2.5 bg-electric-blue text-white font-mono text-xs uppercase tracking-widest hover:bg-electric-blue/90 transition-colors shadow-md"
          >
            Apply Calibration
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2.5 border border-warm-ivory/20 text-warm-ivory/70 font-mono text-xs uppercase tracking-widest hover:text-white hover:border-warm-ivory transition-colors"
          >
            Reset to Prior
          </button>
        </div>
      </div>
    </div>
  );
}

