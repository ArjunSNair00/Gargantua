import { useState } from "react";
import audioMatrixDefaults from "../audio/audioMatrix.json";

const rows = [
  {
    key: "synthGain",
    label: "SYNTH GAIN",
    min: 0,
    max: 2,
    step: 0.01,
  },
  {
    key: "modulationAmount",
    label: "MODULATION",
    min: 0,
    max: 2,
    step: 0.01,
  },
  {
    key: "cutoffScale",
    label: "CUTOFF SCALE",
    min: 0.3,
    max: 2.2,
    step: 0.01,
  },
  {
    key: "cutoffOffset",
    label: "CUTOFF OFFSET",
    min: -1600,
    max: 1600,
    step: 1,
  },
  {
    key: "distortionAmount",
    label: "DISTORTION",
    min: 0.2,
    max: 2.2,
    step: 0.01,
  },
  {
    key: "chaosAmount",
    label: "CHAOS",
    min: 0,
    max: 1.4,
    step: 0.01,
  },
  {
    key: "blackholeMp3Gain",
    label: "BLACKHOLE MP3",
    min: 0,
    max: 0.5,
    step: 0.005,
  },
  {
    key: "ambientGain",
    label: "AMBIENT MP3",
    min: 0,
    max: 0.5,
    step: 0.005,
  },
];

const defaultValues = audioMatrixDefaults;

export default function AudioControls({ controls, setControls, fpsMode }) {
  const [open, setOpen] = useState(true);

  const setValue = (key, value) => {
    setControls((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="absolute left-3 bottom-3 md:left-5 md:bottom-5 z-[65] pointer-events-none">
      <div className="pointer-events-auto w-[min(88vw,22rem)] tech-border bg-black/70 backdrop-blur-md">
        <div className="px-3 py-2 border-b border-[var(--grid-line)] flex items-center justify-between">
          <div className="mono text-[10px] tracking-[0.16em] text-[var(--accent)]">
            AUDIO MATRIX
          </div>
          <div className="flex items-center gap-2">
            {fpsMode && (
              <span className="mono text-[9px] text-[var(--danger)]/80">
                FPS LOCK
              </span>
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              className="mono text-[10px] px-2 py-0.5 tech-border text-[var(--fg)]/70 hover:text-[var(--accent)]"
            >
              {open ? "HIDE" : "SHOW"}
            </button>
          </div>
        </div>

        {open && (
          <div className="p-3 space-y-2 max-h-[46vh] overflow-y-auto">
            {rows.map((row) => (
              <label key={row.key} className="block">
                <div className="flex items-center justify-between mono text-[10px] mb-1">
                  <span className="text-[var(--fg)]/70">{row.label}</span>
                  <span className="text-[var(--accent)]/90">
                    {Number(controls[row.key]).toFixed(row.step < 1 ? 3 : 0)}
                  </span>
                </div>
                <input
                  type="range"
                  min={row.min}
                  max={row.max}
                  step={row.step}
                  value={controls[row.key]}
                  onChange={(e) => setValue(row.key, Number(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </label>
            ))}

            <button
              onClick={() =>
                setControls({
                  ...defaultValues,
                })
              }
              className="w-full mt-2 btn-noisia"
            >
              RESET AUDIO TUNING
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
