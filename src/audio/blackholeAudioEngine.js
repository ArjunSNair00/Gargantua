const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const distanceToLowpassCutoff = (distance) => {
  const proximity = clamp(1 - distance / 45, 0, 1);
  return 900 + proximity * 3200;
};

// Lightweight Web Audio skeleton for a black-hole ambience bed.
export class BlackholeAudioEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.nodes = null;
    this.started = false;
    this.lastDrive = 0;
    this.nextChaosBurstAt = 0;
  }

  async init() {
    if (this.ctx) {
      return;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.0;

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 14;
    this.compressor.ratio.value = 3.5;
    this.compressor.attack.value = 0.01;
    this.compressor.release.value = 0.24;

    this.masterGain.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);

    this.nodes = this.#buildNodeGraph();
  }

  async resume() {
    if (!this.ctx) {
      await this.init();
    }
    if (!this.ctx) {
      return;
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
    if (!this.started) {
      this.start();
    }
  }

  start() {
    if (!this.ctx || this.started || !this.nodes) {
      return;
    }

    const {
      droneOsc,
      shimmerOsc,
      wobbleLfo,
      wobbleDepth,
      rumbleNoise,
      rumbleFilter,
      rumbleGain,
      chaosNoise,
      chaosFilter,
      chaosGain,
      droneFilter,
      droneGain,
      shimmerGain,
      preDrive,
      distortion,
      postFilter,
      stereo,
    } = this.nodes;

    droneOsc.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(preDrive);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(preDrive);

    rumbleNoise.connect(rumbleFilter);
    rumbleFilter.connect(rumbleGain);
    rumbleGain.connect(preDrive);

    chaosNoise.connect(chaosFilter);
    chaosFilter.connect(chaosGain);
    chaosGain.connect(preDrive);

    preDrive.connect(distortion);
    distortion.connect(postFilter);
    postFilter.connect(stereo);
    stereo.connect(this.masterGain);

    wobbleLfo.connect(wobbleDepth);
    wobbleDepth.connect(droneFilter.frequency);

    const now = this.ctx.currentTime;
    droneOsc.start(now);
    shimmerOsc.start(now);
    wobbleLfo.start(now);
    rumbleNoise.start(now);
    chaosNoise.start(now);

    this.started = true;
  }

  stop() {
    if (!this.ctx || !this.started || !this.nodes) {
      return;
    }

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.linearRampToValueAtTime(0.0, now + 0.2);
  }

  setEnabled(enabled) {
    if (!this.ctx || !this.masterGain) {
      return;
    }

    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.linearRampToValueAtTime(
      enabled ? 0.22 : 0.0,
      now + 0.2,
    );
  }

  getAudioContext() {
    return this.ctx;
  }

  getMasterGain() {
    return this.masterGain;
  }

  update(params) {
    if (!this.ctx || !this.nodes) {
      return;
    }

    const mass = clamp(params.mass ?? 1.5, 0.1, 12);
    const spin = clamp(params.spin ?? 0.8, 0, 1.5);
    const fpsMode = Boolean(params.fpsMode);
    const distance = clamp(params.distance ?? 24, 0.2, 500);
    const controls = params.controls ?? {};
    const synthGain = clamp(controls.synthGain ?? 1, 0, 2.5);
    const modulationAmount = clamp(controls.modulationAmount ?? 1, 0, 2.5);
    const cutoffScale = clamp(controls.cutoffScale ?? 1, 0.3, 2.2);
    const cutoffOffset = clamp(controls.cutoffOffset ?? 0, -2000, 2000);
    const distortionAmount = clamp(controls.distortionAmount ?? 1, 0.2, 2.5);
    const chaos = clamp(controls.chaosAmount ?? 0.9, 0, 1.4);

    const now = this.ctx.currentTime;
    const fpsBoost = fpsMode ? 1.2 : 1.0;
    const rs = 2 * mass;
    const proximity = clamp(1 - distance / 45, 0, 1);
    const horizonProximity = clamp(
      1 - (distance - rs) / (rs * 5 + 0.0001),
      0,
      1,
    );
    const threat = clamp(0.35 + chaos * 0.45 + horizonProximity * 0.6, 0, 1.8);

    const baseFreq = 18 + mass * 6 - proximity * 4;
    const rumbleLevel =
      clamp(0.05 + mass * 0.012 + proximity * 0.06, 0.03, 0.3) * fpsBoost;
    const shimmerFreq = 130 + spin * 70 + proximity * 30;
    const wobbleRate = (0.03 + spin * 0.11 + threat * 0.04) * modulationAmount;
    const wobbleDepth = (18 + mass * 3 + proximity * 18) * modulationAmount;
    const stereoPan = clamp(
      Math.sin(now * (0.33 + threat * 0.5)) * 0.4 * threat,
      -0.9,
      0.9,
    );
    const driveAmount = clamp(
      (80 + threat * 280 + proximity * 120) * distortionAmount,
      60,
      900,
    );

    if (Math.abs(driveAmount - this.lastDrive) > 12) {
      this.nodes.distortion.curve = this.#makeDistortionCurve(driveAmount);
      this.lastDrive = driveAmount;
    }

    this.nodes.droneOsc.frequency.setTargetAtTime(baseFreq, now, 0.15);
    this.nodes.droneFilter.frequency.setTargetAtTime(
      120 + mass * 12 + proximity * 65,
      now,
      0.2,
    );
    this.nodes.droneFilter.Q.setTargetAtTime(0.6 + threat * 3.2, now, 0.2);
    this.nodes.droneGain.gain.setTargetAtTime(
      (0.12 + proximity * 0.05) * fpsBoost * synthGain,
      now,
      0.2,
    );

    this.nodes.rumbleGain.gain.setTargetAtTime(
      rumbleLevel * synthGain,
      now,
      0.2,
    );
    this.nodes.rumbleFilter.frequency.setTargetAtTime(
      52 + mass * 4 + proximity * 20,
      now,
      0.25,
    );
    this.nodes.rumbleFilter.Q.setTargetAtTime(0.9 + threat * 2.0, now, 0.2);

    this.nodes.shimmerOsc.frequency.setTargetAtTime(shimmerFreq, now, 0.15);
    this.nodes.shimmerGain.gain.setTargetAtTime(
      (0.02 + spin * 0.02 + proximity * 0.03) * synthGain,
      now,
      0.2,
    );

    this.nodes.chaosFilter.frequency.setTargetAtTime(
      400 + proximity * 1200 + chaos * 300,
      now,
      0.2,
    );
    this.nodes.chaosFilter.Q.setTargetAtTime(1.2 + chaos * 8, now, 0.2);
    this.nodes.chaosGain.gain.setTargetAtTime(
      (0.012 + chaos * 0.03 + proximity * 0.035) * synthGain,
      now,
      0.2,
    );

    this.nodes.preDrive.gain.setTargetAtTime(
      (0.65 + threat * 0.7) * synthGain,
      now,
      0.2,
    );
    const cutoff = distanceToLowpassCutoff(distance);
    const cutoffWithControl = clamp(
      cutoff * cutoffScale + cutoffOffset,
      120,
      12000,
    );
    this.nodes.postFilter.frequency.setTargetAtTime(
      cutoffWithControl,
      now,
      0.2,
    );
    this.nodes.stereo.pan.setTargetAtTime(stereoPan, now, 0.18);

    this.nodes.wobbleLfo.frequency.setTargetAtTime(wobbleRate, now, 0.2);
    this.nodes.wobbleDepth.gain.setTargetAtTime(wobbleDepth, now, 0.2);

    if (
      now > this.nextChaosBurstAt &&
      Math.random() < 0.028 + chaos * 0.035 + proximity * 0.03
    ) {
      this.triggerChaosBurst(0.35 + threat * 0.35);
      this.nextChaosBurstAt =
        now +
        (0.7 + Math.random() * 1.8) * (1.15 - Math.min(0.7, proximity * 0.7));
    }
  }

  triggerMassChange(delta) {
    if (!this.ctx || !this.started) {
      return;
    }

    const now = this.ctx.currentTime;
    const magnitude = clamp(Math.abs(delta), 0.05, 2.5);
    const steps = Math.min(4, Math.max(1, Math.round(magnitude / 0.4)));
    const sign = Math.sign(delta) || 1;

    for (let i = 0; i < steps; i += 1) {
      const clickFreq = sign > 0 ? 620 + i * 90 : 500 - i * 40;
      this.#playClick(now + i * 0.04, clickFreq, 0.04 + magnitude * 0.02);
    }
  }

  triggerHorizonCrossing(intensity = 1.0) {
    if (!this.ctx || !this.started) {
      return;
    }

    const now = this.ctx.currentTime;
    const gain = clamp(0.16 * intensity, 0.08, 0.38);

    // Low boom body.
    this.#playPulse({
      time: now,
      startFreq: 120,
      endFreq: 42,
      duration: 1.1,
      gain,
      type: "triangle",
    });

    // Brief tearing edge for panic texture.
    this.#playPulse({
      time: now + 0.05,
      startFreq: 980,
      endFreq: 180,
      duration: 0.24,
      gain: gain * 0.45,
      type: "sawtooth",
    });
  }

  triggerChaosBurst(intensity = 0.5) {
    if (!this.ctx || !this.started) {
      return;
    }

    const now = this.ctx.currentTime;
    const burst = this.ctx.createBufferSource();
    burst.buffer = this.#createNoiseBuffer(0.18);

    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    hp.Q.value = 0.9;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    burst.connect(hp);
    hp.connect(gain);
    gain.connect(this.masterGain);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.05 * intensity, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    burst.start(now);
    burst.stop(now + 0.22);
  }

  dispose() {
    if (!this.ctx) {
      return;
    }

    try {
      this.ctx.close();
    } catch {
      // Ignore close errors during teardown.
    }

    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
    this.nodes = null;
    this.started = false;
    this.lastDrive = 0;
    this.nextChaosBurstAt = 0;
  }

  #buildNodeGraph() {
    const droneOsc = this.ctx.createOscillator();
    droneOsc.type = "sawtooth";
    droneOsc.frequency.value = 35;

    const droneFilter = this.ctx.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 220;
    droneFilter.Q.value = 0.4;

    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.1;

    const shimmerOsc = this.ctx.createOscillator();
    shimmerOsc.type = "triangle";
    shimmerOsc.frequency.value = 180;

    const shimmerGain = this.ctx.createGain();
    shimmerGain.gain.value = 0.03;

    const wobbleLfo = this.ctx.createOscillator();
    wobbleLfo.type = "sine";
    wobbleLfo.frequency.value = 0.06;

    const wobbleDepth = this.ctx.createGain();
    wobbleDepth.gain.value = 24;

    const rumbleNoise = this.#createNoiseSource();

    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = "bandpass";
    rumbleFilter.frequency.value = 72;
    rumbleFilter.Q.value = 0.9;

    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.value = 0.06;

    const chaosNoise = this.#createNoiseSource();

    const chaosFilter = this.ctx.createBiquadFilter();
    chaosFilter.type = "bandpass";
    chaosFilter.frequency.value = 900;
    chaosFilter.Q.value = 5;

    const chaosGain = this.ctx.createGain();
    chaosGain.gain.value = 0.02;

    const preDrive = this.ctx.createGain();
    preDrive.gain.value = 0.7;

    const distortion = this.ctx.createWaveShaper();
    distortion.oversample = "4x";
    distortion.curve = this.#makeDistortionCurve(180);

    const postFilter = this.ctx.createBiquadFilter();
    postFilter.type = "lowpass";
    postFilter.frequency.value = 2200;
    postFilter.Q.value = 0.6;

    const stereo = this.ctx.createStereoPanner();
    stereo.pan.value = 0;

    return {
      droneOsc,
      droneFilter,
      droneGain,
      shimmerOsc,
      shimmerGain,
      wobbleLfo,
      wobbleDepth,
      rumbleNoise,
      rumbleFilter,
      rumbleGain,
      chaosNoise,
      chaosFilter,
      chaosGain,
      preDrive,
      distortion,
      postFilter,
      stereo,
    };
  }

  #createNoiseSource() {
    const buffer = this.#createNoiseBuffer(2);

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  #createNoiseBuffer(seconds) {
    const bufferSize = Math.max(1, Math.floor(this.ctx.sampleRate * seconds));
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i += 1) {
      channel[i] = Math.random() * 2 - 1;
    }

    return buffer;
  }

  #playClick(time, frequency, gain) {
    const osc = this.ctx.createOscillator();
    osc.type = "square";
    osc.frequency.value = frequency;

    const g = this.ctx.createGain();
    g.gain.value = 0;

    osc.connect(g);
    g.connect(this.masterGain);

    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);

    osc.start(time);
    osc.stop(time + 0.08);
  }

  #playPulse({ time, startFreq, endFreq, duration, gain, type }) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(0.0001, endFreq),
      time + duration,
    );

    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), time + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(g);
    g.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + duration + 0.02);
  }

  #makeDistortionCurve(amount) {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const k = amount;
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i += 1) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }

    return curve;
  }
}
