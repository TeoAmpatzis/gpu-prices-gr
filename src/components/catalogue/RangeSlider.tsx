import { useState } from 'react';

interface RangeSliderProps {
  minBound: number;
  maxBound: number;
  step?: number;
  unit: string;
  minValue: number | null | undefined;
  maxValue: number | null | undefined;
  onChange: (min: number | null, max: number | null) => void;
  minAriaLabel: string;
  maxAriaLabel: string;
  fromPlaceholder: string;
  toPlaceholder: string;
}

/**
 * A dual-thumb range slider with synced numeric inputs.
 * Thumb dragging and number input typing stay in lock-step.
 * Null values represent unconstrained boundaries (full range).
 */
export function RangeSlider({
  minBound,
  maxBound,
  step = 1,
  unit,
  minValue,
  maxValue,
  onChange,
  minAriaLabel,
  maxAriaLabel,
  fromPlaceholder,
  toPlaceholder,
}: RangeSliderProps) {
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);

  // Extend visually if the user typed a value outside default bounds
  const effectiveMinBound = Math.min(minBound, minValue ?? minBound);
  const effectiveMaxBound = Math.max(maxBound, maxValue ?? maxBound);
  const span = Math.max(1, effectiveMaxBound - effectiveMinBound);

  const currentMin = minValue ?? effectiveMinBound;
  const currentMax = maxValue ?? effectiveMaxBound;

  const minPct = Math.max(0, Math.min(100, ((currentMin - effectiveMinBound) / span) * 100));
  const maxPct = Math.max(0, Math.min(100, ((currentMax - effectiveMinBound) / span) * 100));

  const handleSliderMin = (val: number) => {
    const clamped = Math.min(val, currentMax);
    onChange(clamped <= effectiveMinBound ? null : clamped, maxValue ?? null);
  };

  const handleSliderMax = (val: number) => {
    const clamped = Math.max(val, currentMin);
    onChange(minValue ?? null, clamped >= effectiveMaxBound ? null : clamped);
  };

  return (
    <div className="catalogue-slider-container">
      <div className="catalogue-slider">
        <div className="catalogue-slider-track" />
        <div
          className="catalogue-slider-fill"
          style={{
            left: `${minPct}%`,
            width: `${Math.max(0, maxPct - minPct)}%`,
          }}
        />
        <input
          type="range"
          min={effectiveMinBound}
          max={effectiveMaxBound}
          step={step}
          value={currentMin}
          aria-label={minAriaLabel}
          className="catalogue-slider-input"
          style={{ zIndex: activeThumb === 'min' || currentMin > effectiveMaxBound - span * 0.15 ? 3 : 1 }}
          onPointerDown={() => setActiveThumb('min')}
          onPointerUp={() => setActiveThumb(null)}
          onChange={(e) => handleSliderMin(Number(e.target.value))}
        />
        <input
          type="range"
          min={effectiveMinBound}
          max={effectiveMaxBound}
          step={step}
          value={currentMax}
          aria-label={maxAriaLabel}
          className="catalogue-slider-input"
          style={{ zIndex: activeThumb === 'max' ? 3 : 2 }}
          onPointerDown={() => setActiveThumb('max')}
          onPointerUp={() => setActiveThumb(null)}
          onChange={(e) => handleSliderMax(Number(e.target.value))}
        />
      </div>

      <div className="catalogue-range">
        <div className="catalogue-range-field">
          <input
            type="number"
            min="0"
            step="any"
            aria-label={minAriaLabel}
            placeholder={fromPlaceholder}
            value={minValue ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
              onChange(val, maxValue ?? null);
            }}
          />
          <span className="catalogue-range-unit">{unit}</span>
        </div>
        <span className="catalogue-range-sep">–</span>
        <div className="catalogue-range-field">
          <input
            type="number"
            min="0"
            step="any"
            aria-label={maxAriaLabel}
            placeholder={toPlaceholder}
            value={maxValue ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? null : Math.max(0, Number(e.target.value));
              onChange(minValue ?? null, val);
            }}
          />
          <span className="catalogue-range-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}
