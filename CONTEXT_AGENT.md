# CONTEXT_AGENT

## Purpose

This file is an operational memory for autonomous agents and new engineers making changes in Gargantua.

Use it to answer:

- What subsystem owns this behavior?
- What can be changed safely?
- What must be validated before merging?

## System Identity in One Line

Gargantua is a reactive simulation stage where observer state (mass, mode, camera pose/distance) drives synchronized visual synthesis, audio synthesis, and telemetry UI.

## Core Runtime Contract

The app is governed by one central rule:

Global interactive state in App propagates to specialized engines each frame.

State domains:

- Scene state: mass, spin
- Mode state: fpsMode, cinematicMode
- Audio state: enabled + matrix controls
- Observer state: camera transform and distance

Outputs:

- Shader image (Blackhole)
- Procedural and layered audio (BlackholeAudioSystem + BlackholeAudioEngine)
- HUD and controls (Telemetry)

## Ownership Map (Who Owns What)

## App orchestration

- File: src/App.jsx
- Owns: top-level state, mode transitions, camera handoff logic, subsystem wiring
- Treat as: source of truth for cross-subsystem behavior

## Visual simulation

- File: src/components/Blackhole.jsx
- Owns: raymarch loop, lensing heuristics, disk emission model, tone mapping
- Treat as: high-risk performance and visual correctness zone

## FPS motion model

- File: src/components/FPSCamera.jsx
- Owns: input capture, thrust/inertia, gravity approximation, camera orientation updates
- Treat as: interaction-critical and mode-sensitive

## Audio orchestration

- File: src/components/BlackholeAudioSystem.jsx
- Owns: audio unlock lifecycle, per-frame audio parameter updates, event detection, media layer routing
- Treat as: bridge between simulation state and sound

## Audio synthesis engine

- File: src/audio/blackholeAudioEngine.js
- Owns: node graph, modulation mapping, distortion/filtering, one-shot synthesis
- Treat as: DSP logic and timbral behavior core

## Operator UI

- File: src/components/Telemetry.jsx
- Owns: mass control, mode toggles, pseudo-physics readouts, session log UI
- Treat as: user command surface, not physics authority

## Tuning surfaces

- Files: src/components/audio_controls.jsx, src/audio/audioMatrix.json
- Owns: runtime audio tuning defaults and sliders
- Treat as: safe behavioral tuning zone

## Decision Rules for Agents

When changing code, decide using these rules in order.

1. If behavior spans multiple subsystems, start in src/App.jsx.
2. If change is purely visual and frame-level, modify src/components/Blackhole.jsx.
3. If change is movement/input-only, modify src/components/FPSCamera.jsx.
4. If change is sound response to state, modify mapping in src/audio/blackholeAudioEngine.js and orchestration in src/components/BlackholeAudioSystem.jsx.
5. Prefer tuning existing mappings over adding new state variables.
6. Preserve realtime feel over strict physical correctness unless explicitly requested.

## Safe Change Zones

Low-risk changes (usually isolated):

- Telemetry labels/readout formulas that do not affect control flow
- audioMatrix defaults and slider ranges
- Postprocessing scalar values (Bloom/Vignette tuning)
- Audio mapping coefficients (cutoff/drive/gain ranges)

Medium-risk changes (need targeted regression checks):

- FPS key mapping and boost multipliers
- Mode toggle behavior and UI visibility conditions
- Horizon/near-event audio trigger thresholds

High-risk changes (require full manual sweep):

- Raymarch loop logic, step-size policy, disk hit conditions
- Pointer lock/fullscreen lifecycle
- Camera handoff between FPS and orbit
- Audio graph topology changes or node connection order

## Invariants (Do Not Break)

1. App remains the top-level state coordinator.
2. Blackhole shader still renders every frame from camera-based uniforms.
3. FPS mode and orbit mode remain mutually controlled by App mode state.
4. Audio unlock still depends on user gesture and does not spam init paths.
5. Distance-to-cutoff mapping remains coherent between synth and blackhole mp3 layer.
6. Build must pass via npm run build after any subsystem changes.

## Known Simplifications (Intentional)

Visual/physics:

- No full GR geodesic integration
- Heuristic lensing and disk shading
- Artistically tuned emissive behavior

Audio:

- Procedural-reactive sonification, not physically accurate space acoustics
- Randomized chaos events for atmosphere

UI/telemetry:

- Pseudo-scaled readouts communicate trends, not calibrated scientific values

## Typical Change Playbooks

## A) Add a new simulation parameter

1. Add state in src/App.jsx.
2. Pass as prop to visual/audio subsystems.
3. Map parameter in shader uniform and/or audio update.
4. Expose control in Telemetry or hidden tuning UI if needed.
5. Validate mode transitions and build.

## B) Make visuals darker/brighter

1. Start in src/components/Blackhole.jsx (disk brightness, beaming, tone mapping).
2. Then tune Bloom in src/App.jsx if needed.
3. Re-check high-mass and near-horizon viewpoints.

## C) Change FPS behavior

1. Edit movement equations in src/components/FPSCamera.jsx.
2. Ensure App mode transitions still enter/exit cleanly.
3. Verify pointer lock + ESC + fullscreen paths.

## D) Change sound character

1. Adjust mapping coefficients in src/audio/blackholeAudioEngine.js.
2. Update layer behavior in src/components/BlackholeAudioSystem.jsx if needed.
3. Keep audioMatrix defaults aligned with new ranges.

## Regression Checklist (Minimum)

Run after meaningful edits:

1. npm run build succeeds.
2. Orbit mode works before and after FPS session.
3. FPS enter/exit works via button and ESC.
4. Mass changes affect visuals and trigger audio events.
5. Audio toggle cleanly mutes/unmutes with no stuck state.
6. No obvious shader artifacts at near/far camera distances.

## Fast Mental Map

Input -> App state -> per-frame synthesis

Where synthesis means:

- Visual synthesis: shader march and post
- Audio synthesis: procedural graph + media layers
- UI synthesis: telemetry and controls

If a bug appears in one modality but not others, inspect that subsystem first.
If a bug appears across modalities, inspect App state flow first.
