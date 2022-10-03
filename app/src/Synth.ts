import { STEP_NOTATIONS } from "musical-scale";
import { Notation } from "./Detect";
// prettier-ignore
const OCTAVE_STEP_FREQUENCIES: {
  [K in number]: { [K in number]: number }
} = {
    0: { 0: 16.352, 1: 17.324, 2: 18.354, 3: 19.445, 4: 20.602, 5: 21.827, 6: 23.125, 7: 24.5, 8: 25.957, 9: 27.5, 10: 29.135, 11: 30.868, },
    1: { 0: 32.703, 1: 34.648, 2: 36.708, 3: 38.891, 4: 41.203, 5: 43.654, 6: 46.249, 7: 48.999, 8: 51.913, 9: 55, 10: 58.27, 11: 61.735, },
    2: { 0: 65.406, 1: 69.296, 2: 73.416, 3: 77.782, 4: 82.407, 5: 87.307, 6: 92.499, 7: 97.999, 8: 103.826, 9: 110, 10: 116.541, 11: 123.471,  },
    3: { 0: 130.813, 1: 138.591, 2: 146.832, 3: 155.563, 4: 164.814, 5: 174.614, 6: 184.997, 7: 195.998, 8: 207.652, 9: 220, 10: 233.082, 11: 246.942, },
    4: { 0: 261.626, 1: 277.183, 2: 293.665, 3: 311.127, 4: 329.628, 5: 349.228, 6: 369.994, 7: 391.995, 8: 415.305, 9: 440, 10: 466.164, 11: 493.883, },
    5: { 0: 523.251, 1: 554.365, 2: 587.33, 3: 622.254, 4: 659.255, 5: 698.456, 6: 739.989, 7: 783.991, 8: 830.609, 9: 880, 10: 932.328, 11: 987.767, },
    6: { 0: 1046.502, 1: 1108.731, 2: 1174.659, 3: 1244.508, 4: 1318.51, 5: 1396.913, 6: 1479.978, 7: 1567.982, 8: 1661.219, 9: 1760, 10: 1864.655, 11: 1975.533, },
    7: { 0: 2093.005, 1: 2217.461, 2: 2349.318, 3: 2489.016, 4: 2637.02, 5: 2793.826, 6: 2959.955, 7: 3135.963, 8: 3322.438, 9: 3520, 10: 3729.31, 11: 3951.066, },
    8: { 0: 4186.01, 1: 4434.92, 2: 4698.63, 3: 4978.03, 4: 5274.04, 5: 5587.65, 6: 5919.91, 7: 6271.93, 8: 6644.88, 9: 7040, 10: 7458.62, 11: 7902.13, },
};

const MAIN_GAIN = 0.05;
const NOTE_CHANCE = 0.75;
const TWINKLE_CHANCE = 0.85;

export class Synth {
  step: number = 0;
  config = {
    synthType: "triangle",
    synthModType: "sine",
    synthTwinkleType: "sine",
    synthTwinkleModType: "triangle",
    synth(sat) {
      return {
        attack: 0.01,
        release: sat * 0.8,
        volume: 0.4,
      };
    },
    synthTwinkle: {
      attack: 0.001,
      release: 0.2,
      volume: 0.1,
    },
  };
  initialized = false;
  on = false;
  context: AudioContext;
  main: GainNode;
  filter: BiquadFilterNode;
  lastLit: number;

  constructor() {}

  initialize() {
    this.initialized = true;
    this.context = new AudioContext();
    this.main = this.context.createGain();
    this.filter = this.context.createBiquadFilter();
    this.filter.connect(this.main);
    this.main.connect(this.context.destination);

    this.main.gain.value = MAIN_GAIN;

    this.filter.type = "lowpass";
    this.filter.frequency.value = 440;
    this.filter.Q.value = 1;
  }

  start() {
    this.on = true;
    if (!this.initialized) {
      this.initialize();
    }
    this.main.gain.linearRampToValueAtTime(
      MAIN_GAIN,
      this.context.currentTime + 1
    );
  }

  stop() {
    this.on = false;
    this.main.gain.linearRampToValueAtTime(
      0.0000001,
      this.context.currentTime + 1
    );
  }

  tick(
    notation: Notation,
    hue: number,
    sat: number,
    lit: number,
    chance = NOTE_CHANCE
  ) {
    if (!this.on) {
      return;
    }
    const l = parseFloat(lit.toFixed(5));
    if (l !== this.lastLit) {
      this.lastLit = l;
      this.filter.frequency.linearRampToValueAtTime(
        Math.round(l * 12000 + 100),
        this.context.currentTime + 0.05
      );
    }

    // synth
    if (Math.random() > chance) {
      const octave = Math.floor(Math.random() * 2) + 5;
      const hz =
        OCTAVE_STEP_FREQUENCIES[octave][STEP_NOTATIONS.indexOf(notation)];
      this.triggerNote({
        hz,
        type: this.config.synthType,
        modType: this.config.synthModType,
        ...this.config.synth(sat),
      });
      this.step++;
    }
    // twinkle synth
    if (Math.random() > TWINKLE_CHANCE) {
      const octave = Math.floor(Math.random() * 2) + 5;
      const hz =
        OCTAVE_STEP_FREQUENCIES[octave][STEP_NOTATIONS.indexOf(notation)];
      this.triggerNote({
        hz,
        type: this.config.synthTwinkleType,
        modType: this.config.synthTwinkleModType,
        ...this.config.synthTwinkle,
      });
    }
  }

  toggle() {
    if (this.on) {
      this.stop();
    } else {
      this.start();
    }
  }

  triggerNote({ hz, type, modType, attack, release, volume }) {
    // Create oscillators
    const carrier = this.context.createOscillator();
    carrier.type = type;
    const mod = this.context.createOscillator();
    mod.type = modType;

    const pan = this.context.createStereoPanner();
    -pan.pan.setValueAtTime(Math.random() * 2 - 1, this.context.currentTime);

    // Set frequencies
    carrier.frequency.value = hz;
    mod.frequency.value = 14.3;

    // Create a gain node to control modulation depth
    const modGain = this.context.createGain();
    modGain.gain.value = 10;

    // Create a gain node to act as an envelope
    const envelope = this.context.createGain();
    envelope.gain.cancelScheduledValues(this.context.currentTime);
    envelope.gain.setValueAtTime(0, this.context.currentTime);

    // Set some parameter automation to actually generate the envelope
    envelope.gain.linearRampToValueAtTime(
      volume,
      this.context.currentTime + attack
    );
    envelope.gain.linearRampToValueAtTime(
      0,
      this.context.currentTime + attack + release
    );

    // Connect the nodes
    mod.connect(modGain);
    modGain.connect(carrier.detune); // This is the magic FM part!
    carrier.connect(envelope);
    envelope.connect(pan);
    pan.connect(this.filter);

    carrier.onended = () => {
      carrier.disconnect();
      mod.disconnect();
      modGain.disconnect();
      envelope.disconnect();
    };

    // Make sound
    mod.start();
    carrier.start();

    // Schedule automatic oscillation stop
    mod.stop(this.context.currentTime + attack + release);
    carrier.stop(this.context.currentTime + attack + release);
  }
}
