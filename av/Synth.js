export class Synth {
  constructor() {
    this.synth = new Tone.PolySynth();
    this.synth.set({
      envelope: { attack: 0.2 },
      oscillator: { type: "triangle4" },
    });
    const pan = new Tone.Panner();
    pan.pan.value = -1;
    const gain = new Tone.Gain();
    gain.gain.value = 0.2;
    this.synth.connect(pan);
    pan.connect(gain);

    gain.toDestination();
  }

  play({ chord }) {
    this.synth.releaseAll();
    this.synth.triggerAttack(
      chord.notes
        .map(({ notation, octave }) => `${notation}${octave + 3}`)
        .concat(
          chord.notes.map(({ notation, octave }) => `${notation}${octave + 4}`)
        )
    );
  }
}
