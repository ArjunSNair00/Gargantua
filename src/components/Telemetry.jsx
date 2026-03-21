import { useState, useEffect } from "react";
import {
  Settings,
  Zap,
  Lock,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
} from "lucide-react";
import { motion } from "framer-motion";

export default function Telemetry({
  mass,
  setMass,
  fpsMode,
  setFpsMode,
  onToggleFps,
  audioEnabled,
  setAudioEnabled,
}) {
  const [log, setLog] = useState(["SEQUENCE_INITIALIZED: SINGULARITY_LENS"]);
  const [time, setTime] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  const C = 299792458; // Speed of light m/s
  const G = 6.674e-11; // Gravity const

  // Fake mass multiplier for UI scale
  const actualMass = mass * 1.989e30; // mapping 1 unit to roughly 1 solar mass

  const rs = (2 * G * actualMass) / (C * C); // Schwarzschild radius calculation
  // Bekenstein-Hawking Entropy (pseudo-scale for UI)
  const entropy = (rs * rs * 3.14159 * 1e43).toExponential(3);

  useEffect(() => {
    const int = setInterval(() => setTime((t) => t + 1), 50);
    return () => clearInterval(int);
  }, []);

  const handleMassChange = (delta) => {
    setMass((m) => Math.max(0.1, m + delta));
    setLog((prev) =>
      [
        `SYS_UPD: MASS DEVIATION [Δ${delta > 0 ? "+" : ""}${delta}]`,
        ...prev,
      ].slice(0, 5),
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50 p-4 md:p-8 flex flex-col justify-between overflow-hidden">
      {/* Top Header */}
      <header className="flex justify-between items-start">
        <div className="flex flex-col">
          <h1 className="noisia-header text-[var(--accent)] tracking-tighter leading-none mix-blend-screen drop-shadow-[0_0_12px_rgba(204,255,0,0.4)]">
            GARGANTUA
          </h1>
          <div className="flex items-center gap-4 mt-2 pointer-events-auto">
            <span className="mono text-xs text-[var(--fg)] tech-border px-2 py-1 bg-black/40 backdrop-blur-md">
              OPCODE: KERR_METRIC
            </span>
            <button
              onClick={onToggleFps ?? (() => setFpsMode(!fpsMode))}
              className={`mono text-xs tech-border px-2 py-1 transition-colors backdrop-blur-md ${
                fpsMode
                  ? "bg-[var(--accent)] text-black font-bold shadow-[0_0_12px_#ccff00]"
                  : "text-[var(--accent)] bg-black/40 hover:bg-[var(--accent)]/20"
              }`}
            >
              {fpsMode ? "EXIT FPS [ESC]" : "ENTER FPS"}
            </button>
            <button
              onClick={() => setAudioEnabled((a) => !a)}
              className={`mono text-xs tech-border px-2 py-1 transition-colors backdrop-blur-md inline-flex items-center gap-1 ${
                audioEnabled
                  ? "text-[var(--accent)] bg-black/40 hover:bg-[var(--accent)]/20"
                  : "bg-[var(--danger)]/20 text-[var(--danger)] hover:bg-[var(--danger)]/30"
              }`}
            >
              {audioEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
              {audioEnabled ? "AUDIO ON" : "AUDIO MUTED"}
            </button>
            <div className="h-[1px] w-12 md:w-24 bg-[var(--accent)]/30 relative ml-2">
              <div className="absolute right-0 top-1/2 -mt-1 w-2 h-2 rounded-full bg-[var(--accent)] shadow-[0_0_8px_#ccff00]" />
            </div>
          </div>
        </div>

        <div className="hidden md:flex flex-col items-end mono text-xs text-right">
          <span className="text-[var(--fg)]/50">OBSERVER_CLOCK (T_f)</span>
          <span>T+{time.toString().padStart(6, "0")}</span>
          <span className="text-[var(--fg)]/50 mt-2">LOCAL_CLOCK (T_0)</span>
          <span className="text-[var(--accent)] text-lg tracking-tighter">
            T+
            {(time * Math.sqrt(Math.max(0, 1 - rs / (rs * 1.5))))
              .toFixed(2)
              .padStart(6, "0")}
          </span>
          <span className="text-[var(--danger)] mt-2 text-[10px]">
            GRAV_DILATION: √1 - Rs/r
          </span>
        </div>
      </header>

      {/* 12 Grid Middle Section */}
      <main className="grid grid-cols-12 gap-4 flex-1 my-8">
        <div className="col-span-8 relative">
          {/* Main Viewport Left Side */}
        </div>

        {/* Control Panel Container */}
        {!fpsMode && (
          <aside className="col-span-12 md:col-span-4 flex flex-col gap-4 pointer-events-none justify-end items-end relative h-full">
            {/* Collapsible Panel */}
            <motion.div
              initial={{ x: 0 }}
              animate={{
                x: isOpen ? 0 : "calc(100% + 2rem)",
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="flex flex-col gap-4 w-full origin-right relative pointer-events-auto"
            >
              {/* Toggle Button */}
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="absolute top-1/2 -left-12 -translate-y-1/2 bg-[var(--bg)]/80 tech-border p-2 text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors z-50 backdrop-blur-md"
              >
                {isOpen ? (
                  <ChevronRight size={16} />
                ) : (
                  <ChevronLeft size={16} />
                )}
              </button>
              {/* Readouts */}
              <div className="tech-border bg-[var(--bg)]/80 backdrop-blur-md p-4">
                <div className="flex items-center justify-between border-b border-[var(--grid-line)] pb-2 mb-4">
                  <span className="mono text-sm tracking-wide text-[var(--accent)] flex items-center gap-2">
                    <Zap size={14} /> THERMODYNAMICS
                  </span>
                  <span className="mono text-[10px] text-[var(--fg)]/50">
                    LIVE
                  </span>
                </div>

                <div className="space-y-3 mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--fg)]/60">
                      SCHWARZSCHILD RAD (Rs)
                    </span>
                    <span className="text-[var(--fg)]">
                      {rs.toExponential(2)} m
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--fg)]/60">ENTROPY (S)</span>
                    <span className="text-[var(--fg)]">{entropy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--danger)]/80">
                      HAWKING TEMP
                    </span>
                    <span className="text-[var(--danger)]">
                      {(1e-7 / mass).toExponential(2)} K
                    </span>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="tech-border bg-[var(--bg)]/80 backdrop-blur-md p-4 space-y-4">
                <span className="mono text-sm text-[var(--accent)] border-b border-[var(--grid-line)] pb-2 flex items-center gap-2">
                  <Settings size={14} /> MASS MANIFOLD
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleMassChange(-0.5)}
                    className="btn-noisia"
                  >
                    M - 0.5
                  </button>
                  <button
                    onClick={() => handleMassChange(0.5)}
                    className="btn-noisia"
                  >
                    M + 0.5
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-4 text-[var(--fg)]/40 mono text-[10px]">
                  <Lock size={12} /> <span>SPIN (J) LOCKED TO METRIC</span>
                </div>
              </div>

              {/* Execution Log */}
              <div className="tech-border bg-[var(--bg)]/80 backdrop-blur-md p-4 h-32 overflow-hidden relative">
                <div className="scanline absolute inset-0 opacity-20 pointer-events-none" />
                <span className="mono text-[10px] text-[var(--fg)]/50 mb-2 block border-b border-[var(--grid-line)] pb-1">
                  TERMINAL_I/O
                </span>
                <div className="space-y-1 mono text-[10px] text-[var(--accent)] flex flex-col">
                  {log.map((l, i) => (
                    <span key={i} style={{ opacity: 1 - i * 0.2 }}>
                      {">"} {l}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </aside>
        )}
      </main>
    </div>
  );
}
