# CONTEXT

## 1) System Purpose

Gargantua is a real-time cinematic black hole experience built as an interactive simulation-art piece, not a scientific GR solver.

At runtime it combines:

- A procedural visual core (custom GLSL raymarching for lensing + accretion disk)
- A procedural-reactive audio core (Web Audio synthesis + reactive mp3 layers)
- A control shell (orbit mode and FPS mode with gravity-like motion)
- A diegetic telemetry UI (pseudo-physical readouts + operator controls)

What makes it unique is the tight coupling between observer state and both sensory outputs: camera motion and black-hole parameters continuously reshape visual behavior and sound design.

## 2) Core Mental Model

Think of the system as an observer-driven field simulator with two primary control variables and one positional variable:

- Mass (M): the dominant scalar controlling perceived gravitational intensity, event-horizon scale, shader behavior, and audio threat profile.
- Spin (aesthetic parameter): currently used more as stylistic/sonic modulation than full Kerr physics.
- Camera distance and pose: the key runtime input that determines perceived danger, FPS gravity feel, and spectral/audio filtering.

### Primary Forces

- Visual force: ray bending strength near origin and disk emission density.
- Motion force: thrust/inertia vs gravity pull toward origin.
- Audio force: proximity and mass reshape timbre, distortion, movement, and one-shot events.

### Reactive vs Static

Reactive:

- Shader uniforms (time, mass interpolation, camera position, resolution)
- Audio synthesis parameters (cutoff, drive, modulation, chaos, panning)
- Event-triggered one-shots (mass changes, horizon crossing, chaos bursts)
- UI telemetry values and logs

Static or mostly static:

- Scene composition (single black hole renderer + post stack)
- Base UI layout theme and style system
- Core audio graph topology (node network shape)

## 3) High-Level Architecture

## Runtime Layers

1. Orchestration layer

- src/App.jsx
- Owns global interactive state (mass, spin, fps mode, cinematic mode, audio enable, audio matrix controls)
- Wires rendering, controls, UI, and audio together

2. Rendering layer

- src/components/Blackhole.jsx
- Custom fragment shader raymarches inside a camera-centered shell
- Postprocessing in App adds Bloom and Vignette

3. Control and navigation layer

- src/components/FPSCamera.jsx
- FPS thrust, look, roll, boost, and gravity-like acceleration
- OrbitControls remains active outside FPS

4. Audio layer

- src/components/BlackholeAudioSystem.jsx orchestrates lifecycle and frame updates
- src/audio/blackholeAudioEngine.js implements procedural graph and event synthesis
- mp3 layers (blackhole, ambient) are blended with runtime modulation

5. UI and operator layer

- src/components/Telemetry.jsx
- Mass controls, FPS toggle, audio toggle, pseudo-physics diagnostics, operator log
- src/components/audio_controls.jsx exists as a tuning matrix UI (currently hidden by App flag)

### Architectural Flow

User input and camera state -> App state and mode gates ->

- Visual pipeline (shader uniforms + post)
- Audio pipeline (engine update + media layer filters/gains)
- UI pipeline (telemetry readouts/logs and controls)

## 4) Key Data Flow (Cause -> Effect)

## A) Simulation state -> shader output

- mass state in App -> Blackhole prop -> uniform uMass interpolation -> event horizon radius and disk regions shift -> lensing/disk brightness profile changes.
- camera position from render loop -> uniform uCameraPos -> ray origin and trace boundary change -> visible geometry and lensing context update.
- elapsed time -> uniform uTime -> animated disk swirl/noise evolution.
- device resolution -> uniform uResolution -> screen-space ray setup remains correct.

Result: every frame produces a stylized physically inspired image, not a cached texture.

## B) Simulation state -> audio modulation

- mass/spin/fps/distance from useFrame in BlackholeAudioSystem -> BlackholeAudioEngine.update(params)
- update() computes proximity/threat metrics -> maps to oscillator frequencies, filter cutoff, distortion drive, modulation depth/rate, panning, and chaos gain
- shared distanceToLowpassCutoff(distance) controls both synth post-filter and blackhole mp3 lowpass path (coherent spectral motion)
- ambient mp3 bypasses lowpass as stable environmental bed

Result: sound intensity and tone track observer context continuously.

## C) Discrete events -> transient audio gestures

- mass change detection in BlackholeAudioSystem -> triggerMassChange(delta) -> one or more clicks
- horizon proximity crossing -> triggerHorizonCrossing(intensity) -> low boom + tearing transient
- random chaos conditions inside update -> triggerChaosBurst(intensity)

Result: important moments are punctuated by synthesized one-shots, not static SFX files.

## D) User input -> system behavior

- Telemetry mass buttons -> setMass -> immediate visual and audio remapping
- FPS toggle/ESC/pointer lock transitions in App -> mode changes, fullscreen behavior, UI visibility, control source switching
- keyboard/mouse in FPSCamera -> thrust + orientation update -> camera transform changes -> feeds both rendering and audio distance cues
- audio toggle -> master gain ramp + media layer play/pause behavior

## 5) Important Modules and Why They Exist

## src/App.jsx

Purpose:

- System governor and composition root.
  Why it exists:
- Centralizes cross-cutting state transitions (FPS lifecycle, cinematic UI state, audio enable, control matrix).
  Connections:
- Sends state into Blackhole, FPSCamera, BlackholeAudioSystem, Telemetry.
- Owns postprocessing stack and camera/control mode handoff.

## src/components/Blackhole.jsx

Purpose:

- Visual simulation core.
  Why it exists:
- Encapsulates custom GLSL raymarching and black-hole rendering heuristics.
  Connections:
- Receives mass/spin; reads camera/time/resolution per frame; outputs final visual field for post stack.

## src/components/FPSCamera.jsx

Purpose:

- First-person locomotion model with inertia and gravity-like pull.
  Why it exists:
- Provides an experiential mode distinct from orbit inspection.
  Connections:
- Reads mass for gravity scaling; updates shared camera pose; reports pose back to App for handoff continuity.

## src/components/BlackholeAudioSystem.jsx

Purpose:

- Runtime audio orchestrator.
  Why it exists:
- Bridges render-state data (camera distance, mass, mode) to audio engine and media layers.
  Connections:
- Owns unlock/init lifecycle, frame-level updates, and event triggering.
- Uses BlackholeAudioEngine plus blackhole/ambient media layers.

## src/audio/blackholeAudioEngine.js

Purpose:

- Procedural audio DSP-like behavior in Web Audio API.
  Why it exists:
- Keeps soundscape generative and state-driven rather than relying on fixed tracks.
  Connections:
- Exposes update() and trigger methods for the orchestration layer.

## src/components/Telemetry.jsx

Purpose:

- Diegetic operator HUD and control surface.
  Why it exists:
- Makes simulation state inspectable and controllable without leaving immersion.
  Connections:
- Receives App state and mutators; emits user commands (mass, fps, audio).

## src/components/audio_controls.jsx + src/audio/audioMatrix.json

Purpose:

- Parameter tuning interface and persisted defaults for audio response shaping.
  Why it exists:
- Fast iteration path for sonic behavior without code edits.
  Connections:
- App loads defaults; BlackholeAudioSystem and engine read controls each frame.

## 6) Design Philosophy

## Procedural over static

The project prioritizes generated behavior:

- Visuals are shader-synthesized each frame
- Core ambience is oscillator/noise driven
- Events are synthesized transients

## Realism-inspired, experience-first

The system borrows equations and motifs from black-hole physics but intentionally compresses complexity into controllable real-time heuristics.

## Controlled chaos

The aesthetic target is cinematic, ominous, and unstable. Noise fields, doppler-like tinting, and chaos bursts are expressive choices, not strict physical outputs.

## Responsiveness over strict correctness

Mode switching, camera handoff, and audio ramps are tuned for immediate feel and continuity in interactive play.

## 7) Constraints and Assumptions

## Physics and rendering simplifications

- No full geodesic integration in curved spacetime.
- Lensing is a heuristic inverse-cube directional pull.
- Disk emission uses procedural FBM and artist-tuned beaming factors.
- HUD values are pseudo-scaled educational indicators, not calibrated astrophysical measurement outputs.

## Audio simplifications

- Not a physically modeled accretion acoustic simulation.
- Uses psychoacoustic mapping from simulation variables to synthesis parameters.
- Randomized chaos bursts trade determinism for atmosphere.

## Performance constraints

- Shader march loop and postprocessing are GPU-heavy; visual choices favor quality/feel over low-end optimization.
- Bundle includes large media assets; startup and build outputs reflect that tradeoff.
- Browser autoplay policies require explicit user gesture to unlock audio.

## Interaction assumptions

- Pointer lock/fullscreen available in browser.
- Keyboard/mouse input expected for full FPS behavior.
- Desktop-first immersion, with responsive UI styling but high visual workload.

## 8) Extension Points

## Rendering extensions

- Add multiple disk layers (temperature bands, volumetric scattering).
- Introduce optional physically stricter light-path integration modes.
- Add quality tiers (ray steps/post intensity) for adaptive performance.

## Audio extensions

- Add spatialized 3D panning with velocity-dependent Doppler for layers.
- Add preset system for audio matrix profiles (cinematic, harsh, minimal, realistic).
- Add event bus abstraction so non-audio systems can publish semantic events.

## Simulation/control extensions

- Expose spin as active renderer parameter with frame-dragging-inspired terms.
- Add autopilot trajectories or scripted flythrough paths.
- Add configurable movement profiles (assist mode, Newtonian mode, arcade mode).

## UI/extensions for tooling

- Re-enable and persist audio matrix panel in production with profile save/load.
- Add instrumentation panel for frame time, ray steps, and audio CPU usage.
- Add scenario presets (mass, spin, distance, post stack settings) for reproducible demos.

## Toward framework generalization

This codebase can evolve into a reusable "reactive simulation stage" pattern:

- Shared core state
- Visual synthesizer module
- Audio synthesizer module
- Input/controller module
- Telemetry/operator module

The existing separation between App orchestrator, shader renderer, and audio orchestrator already matches this direction.

## 9) Practical Onboarding Path

1. Read src/App.jsx first to understand ownership of global state and mode transitions.
2. Read src/components/Blackhole.jsx next to understand visual generation assumptions.
3. Read src/components/BlackholeAudioSystem.jsx and src/audio/blackholeAudioEngine.js together for the reactive sound pipeline.
4. Read src/components/FPSCamera.jsx for movement dynamics and camera coupling.
5. Read src/components/Telemetry.jsx for operator controls and pseudo-physics display contract.

Once these are clear, the rest of the repository is mostly infrastructure, styling, and asset support.
