import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  BlackholeAudioEngine,
  distanceToLowpassCutoff,
} from "../audio/blackholeAudioEngine";
import audioMatrixDefaults from "../audio/audioMatrix.json";
import blackholeMp3 from "../audio/blackhole.mp3";
import ambientMp3 from "../audio/ambient.mp3";

export default function BlackholeAudioSystem({
  mass,
  spin,
  fpsMode,
  enabled,
  controls,
}) {
  const { camera } = useThree();
  const engineRef = useRef(null);
  const blackholeLayerRef = useRef(null);
  const ambientLayerRef = useRef(null);
  const enabledRef = useRef(enabled);
  const controlsRef = useRef(controls);
  const previousMass = useRef(mass);
  const previousNearHorizon = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
    controlsRef.current = controls;
  }, [enabled, controls]);

  const ensureLayer = async ({ engine, src, withCutoff, initialGain }) => {
    const layerRef = withCutoff ? blackholeLayerRef : ambientLayerRef;
    if (layerRef.current) {
      return layerRef.current;
    }

    const ctx = engine.getAudioContext();
    const masterGain = engine.getMasterGain();
    if (!ctx || !masterGain) {
      return null;
    }

    const audioEl = new Audio(src);
    audioEl.loop = true;
    audioEl.preload = "auto";
    audioEl.crossOrigin = "anonymous";

    const source = ctx.createMediaElementSource(audioEl);

    const filter = withCutoff ? ctx.createBiquadFilter() : null;
    if (filter) {
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      filter.Q.value = 0.45;
    }

    const gain = ctx.createGain();
    gain.gain.value = initialGain;

    if (filter) {
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }
    gain.connect(masterGain);

    const layer = { audioEl, source, filter, gain };
    layerRef.current = layer;
    return layer;
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const engine = new BlackholeAudioEngine();
    engineRef.current = engine;

    const unlockAudio = async () => {
      const current = engineRef.current;
      if (!current) {
        return;
      }

      try {
        await current.resume();
      } catch {
        // Autoplay policies can block resume until user/browser allows it.
      }

      current.setEnabled(enabledRef.current);

      const liveControls = controlsRef.current;

      const blackholeLayer = await ensureLayer({
        engine: current,
        src: blackholeMp3,
        withCutoff: true,
        initialGain:
          liveControls?.blackholeMp3Gain ??
          audioMatrixDefaults.blackholeMp3Gain,
      });
      const ambientLayer = await ensureLayer({
        engine: current,
        src: ambientMp3,
        withCutoff: false,
        initialGain:
          liveControls?.ambientGain ?? audioMatrixDefaults.ambientGain,
      });

      if (!blackholeLayer || !ambientLayer) {
        return;
      }

      if (enabledRef.current && blackholeLayer.audioEl.paused) {
        try {
          await blackholeLayer.audioEl.play();
          await ambientLayer.audioEl.play();
        } catch {
          // Browsers can still block autoplay until a stronger gesture; retry on next interaction.
        }
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        unlockAudio();
      }
    };

    // Try immediately on mount; if browser allows autoplay for this context,
    // audio can start without an explicit click.
    unlockAudio();

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("touchstart", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);
    window.addEventListener("focus", unlockAudio);
    window.addEventListener("pageshow", unlockAudio);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      window.removeEventListener("focus", unlockAudio);
      window.removeEventListener("pageshow", unlockAudio);
      document.removeEventListener("visibilitychange", onVisible);
      [blackholeLayerRef, ambientLayerRef].forEach((refObj) => {
        if (!refObj.current) {
          return;
        }
        const { audioEl, source, filter, gain } = refObj.current;
        audioEl.pause();
        audioEl.src = "";
        source.disconnect();
        filter?.disconnect();
        gain.disconnect();
        refObj.current = null;
      });
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setEnabled(enabled);
    [blackholeLayerRef.current, ambientLayerRef.current]
      .filter(Boolean)
      .forEach((layer) => {
        if (enabled) {
          layer.audioEl.play().catch(() => {});
          return;
        }
        layer.audioEl.pause();
      });
  }, [enabled]);

  useEffect(() => {
    const delta = mass - previousMass.current;
    if (Math.abs(delta) > 0.001) {
      engineRef.current?.triggerMassChange(delta);
      previousMass.current = mass;
    }
  }, [mass]);

  useFrame(() => {
    const current = engineRef.current;
    if (!current) {
      return;
    }

    const distance = Math.max(0.001, camera.position.length());
    const rs = 2 * Math.max(0.1, mass);
    const nearHorizon = distance < rs * 2.4;

    if (nearHorizon && !previousNearHorizon.current) {
      const pulseIntensity = Math.min(1.4, 0.8 + (rs * 2.4 - distance) * 0.07);
      current.triggerHorizonCrossing(pulseIntensity);
    }

    previousNearHorizon.current = nearHorizon;

    current.update({ mass, spin, fpsMode, distance, controls });

    const blackholeLayer = blackholeLayerRef.current;
    const ambientLayer = ambientLayerRef.current;
    const ctx = current.getAudioContext();
    if (blackholeLayer && ctx) {
      const cutoff = distanceToLowpassCutoff(distance);
      const cutoffScale =
        controls?.cutoffScale ?? audioMatrixDefaults.cutoffScale;
      const cutoffOffset =
        controls?.cutoffOffset ?? audioMatrixDefaults.cutoffOffset;
      const cutoffWithControl = Math.min(
        12000,
        Math.max(120, cutoff * cutoffScale + cutoffOffset),
      );
      blackholeLayer.filter?.frequency.setTargetAtTime(
        cutoffWithControl,
        ctx.currentTime,
        0.2,
      );
      blackholeLayer.gain.gain.setTargetAtTime(
        controls?.blackholeMp3Gain ?? audioMatrixDefaults.blackholeMp3Gain,
        ctx.currentTime,
        0.2,
      );
    }

    if (ambientLayer && ctx) {
      ambientLayer.gain.gain.setTargetAtTime(
        controls?.ambientGain ?? audioMatrixDefaults.ambientGain,
        ctx.currentTime,
        0.2,
      );
    }
  });

  return null;
}
