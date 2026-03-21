import { useState, Suspense, useCallback, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Noise,
  Vignette,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

import Blackhole from "./components/Blackhole";
import Telemetry from "./components/Telemetry";
import FPSCamera from "./components/FPSCamera";
import BlackholeAudioSystem from "./components/BlackholeAudioSystem";
import AudioControls from "./components/audio_controls";
import audioMatrixDefaults from "./audio/audioMatrix.json";

export default function App() {
  const [mass, setMass] = useState(1.5);
  const [spin, setSpin] = useState(0.8);
  const [fpsMode, setFpsMode] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [cinematicMode, setCinematicMode] = useState(false);
  const [audioControls, setAudioControls] = useState(() => ({
    ...audioMatrixDefaults,
  }));
  const showAudioMatrix = false;
  const hadPointerLockRef = useRef(false);

  const exitFpsMode = useCallback((restoreUi = true) => {
    setFpsMode(false);
    document.exitPointerLock?.();
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    if (restoreUi) {
      setCinematicMode(false);
    }
  }, []);

  const enterFpsMode = useCallback(() => {
    hadPointerLockRef.current = false;
    setFpsMode(true);
    setCinematicMode(true);

    const canvas = document.querySelector("canvas");
    if (canvas) {
      canvas.setAttribute("tabindex", "0");
      canvas.focus();
      try {
        canvas.requestPointerLock?.();
      } catch {
        // Pointer lock can require another user gesture in some browsers.
      }
    }

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }

    window.focus();
  }, []);

  const toggleFpsMode = useCallback(async () => {
    if (fpsMode) {
      exitFpsMode(true);
      return;
    }
    enterFpsMode();
  }, [enterFpsMode, exitFpsMode, fpsMode]);

  useEffect(() => {
    if (!fpsMode) {
      hadPointerLockRef.current = false;
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
      setCinematicMode(false);
      return;
    }

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        exitFpsMode(true);
        return;
      }

      const key = e.key.toLowerCase();
      const hasPrimaryMod = e.ctrlKey || e.metaKey;
      const isZoomKey =
        key === "+" || key === "=" || key === "-" || key === "0";
      const blockedWithMod =
        hasPrimaryMod &&
        (isZoomKey ||
          [
            "r",
            "t",
            "w",
            "n",
            "l",
            "p",
            "o",
            "s",
            "f",
            "g",
            "h",
            "j",
            "k",
            "d",
            "u",
          ].includes(key));
      const blockedStandalone = ["f1", "f3", "f5", "f6", "f11", "f12"].includes(
        key,
      );

      if (blockedWithMod || blockedStandalone) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onPointerLockChange = () => {
      const canvas = document.querySelector("canvas");
      if (document.pointerLockElement === canvas) {
        hadPointerLockRef.current = true;
        return;
      }

      // Ignore initial lock transition events until we've actually acquired lock once.
      if (hadPointerLockRef.current) {
        exitFpsMode(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerlockchange", onPointerLockChange);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
    };
  }, [exitFpsMode, fpsMode]);

  return (
    <div className="relative w-full h-screen bg-[var(--bg)] overflow-hidden">
      <div className="grain" />
      <div className="scanline absolute inset-0 opacity-10 pointer-events-none z-40" />

      {!fpsMode && (
        <button
          onClick={() => setCinematicMode((v) => !v)}
          className="absolute top-3 left-3 md:top-4 md:left-4 z-[70] pointer-events-auto mono text-[10px] tracking-[0.12em] px-2 py-1 tech-border bg-black/30 text-[var(--fg)]/60 hover:text-[var(--accent)]/80 hover:bg-black/50 transition-colors"
        >
          {cinematicMode ? "UI: OFF" : "UI: ON"}
        </button>
      )}

      {/* FPS Crosshair */}
      {fpsMode && !cinematicMode && (
        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-[var(--accent)] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 mix-blend-screen opacity-80 shadow-[0_0_8px_#ccff00]" />
      )}

      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 5, 25], fov: 45 }} tabIndex={0}>
          <color attach="background" args={["#000000"]} />
          <ambientLight intensity={0.1} />
          <Suspense fallback={null}>
            <Blackhole mass={mass} spin={spin} />
          </Suspense>

          <FPSCamera active={fpsMode} mass={mass} />
          <BlackholeAudioSystem
            mass={mass}
            spin={spin}
            fpsMode={fpsMode}
            enabled={audioEnabled}
            controls={audioControls}
          />
          {!fpsMode && (
            <OrbitControls
              enablePan={false}
              enableDamping
              dampingFactor={0.05}
              minDistance={8}
              maxDistance={40}
            />
          )}

          <EffectComposer>
            <Bloom
              intensity={1.15}
              luminanceThreshold={0.22}
              luminanceSmoothing={0.82}
              blendFunction={BlendFunction.SCREEN}
            />
            <Vignette eskil={false} offset={0.1} darkness={0.9} />
          </EffectComposer>
        </Canvas>
      </div>

      {!cinematicMode && (
        <Telemetry
          mass={mass}
          setMass={setMass}
          fpsMode={fpsMode}
          setFpsMode={setFpsMode}
          onToggleFps={toggleFpsMode}
          audioEnabled={audioEnabled}
          setAudioEnabled={setAudioEnabled}
        />
      )}

      {!cinematicMode && showAudioMatrix && (
        <AudioControls
          controls={audioControls}
          setControls={setAudioControls}
          fpsMode={fpsMode}
        />
      )}
    </div>
  );
}
