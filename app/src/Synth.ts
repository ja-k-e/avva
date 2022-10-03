import { Gain, MonoSynth } from "tone";

const MAX_GAIN = 1;
const COUNT = 3;

export class Synth {
  chance = 0.2;
  playing = false;
  gain: Gain;
  notation: string = "C";
  synths: MonoSynth[];
  synthIndex = 0;
  value: number;

  constructor() {
    this.gain = new Gain(MAX_GAIN).toDestination();
    this.synths = new Array(COUNT).fill(0).map(() => {
      const gain = new Gain(1 / (COUNT * 0.6)).connect(this.gain);
      return new MonoSynth({
        envelope: { attack: 0.9, decay: 0.1, sustain: 0.1, release: 0.1 },
        oscillator: { type: "triangle8" },
      }).connect(gain);
    });
  }

  loop() {
    requestAnimationFrame(this.loop.bind(this));
    if (!this.playing || Math.random() > this.chance) {
      return;
    }
    const octave = Math.floor(Math.random() * 2) + 5;
    const note = `${this.notation}${octave}`;
    this.gain.gain.value = this.value * MAX_GAIN;
    this.synths[this.synthIndex].triggerAttackRelease(note, 0.1);
    this.synthIndex = this.synthIndex >= COUNT - 1 ? 0 : this.synthIndex + 1;
  }

  tick(notation: string, value: number) {
    this.notation = notation;
    this.value = value;
    this.playing = true;
  }

  stop() {
    this.playing = false;
  }
}
