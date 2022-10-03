const MAIN_GAIN = 0.05;
const NOTE_SELECTS = [0, 1, 2, 0];
const NOTE_CHANCE = 0.6;
const TWINKLE_CHANCE = 0.7;

const selectRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

class Synth {
  constructor() {
    this.step = 0;
    this.config = {
      synthType: "triangle",
      synthModType: "sine",
      synthTwinkleType: "sine",
      synthTwinkleModType: "sawtooth",
      synth(hue, sat, lit) {
        return {
          attack: 0.01,
          release: sat * 0.8,
          volume: 0.4,
        };
      },
      synthTwinkle(hue, sat, lit) {
        return {
          attack: 0.001,
          release: 0.2,
          volume: 0.1,
        };
      },
    };
  }

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

  tick(notes, hue, sat, lit, chance = NOTE_CHANCE) {
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

    const step = Math.floor(hue * notes.length);
    const { triad } = notes[step];
    const { note, octave } =
      triad.notes[NOTE_SELECTS[this.step % NOTE_SELECTS.length]];
    // synth
    if (Math.random() > chance) {
      const octaveOffset =
        selectRandom([0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5]) + 1;
      this.triggerNote({
        hz: Scale.frequencyFromNote(note, octave + octaveOffset),
        type: this.config.synthType,
        modType: this.config.synthModType,
        ...this.config.synth(hue, sat, lit),
      });
      this.step++;
    }
    // twinkle synth
    if (Math.random() > TWINKLE_CHANCE) {
      const octaveOffset = Math.round(Math.random() * 2) + 4;
      this.triggerNote({
        hz: Scale.frequencyFromNote(note, octave + octaveOffset),
        type: this.config.synthTwinkleType,
        modType: this.config.synthTwinkleModType,
        ...this.config.synthTwinkle(hue, sat, lit),
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
