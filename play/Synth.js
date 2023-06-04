export class Synth {
  constructor() {
    this.synths = [new Tone.Synth(), new Tone.Synth(), new Tone.Synth(), new Tone.Synth(),new Tone.Synth(), new Tone.Synth(), new Tone.Synth(), new Tone.Synth()];
    const main = new Tone.Gain();
    main.toDestination();
    main.gain.value = 0.6;
    this.synths.forEach((synth, i) => {
      synth.set({
        envelope: { attack: 0.2 },
        oscillator: { type: "triangle4" },
        portamento: 0.5
      });
      const pan = new Tone.Panner();
      pan.pan.value = ((i / this.synths.length) - 0.5) / 0.5;
      const gain = new Tone.Gain();
      gain.gain.value = 0.1;
      synth.connect(pan);
      pan.connect(gain);
      gain.connect(main);
    });
    this.synths.forEach((synth) => synth.triggerAttack("C3"));
  }

  play({ chord }) {
    this.synths.forEach((synth, i) => {
      const { notation, octave } = chord.notes[i % chord.notes.length];
      synth.setNote(`${notation}${octave + 3 + Math.floor(i % 3)}`);
    });
  }
  playNotes(notes) {
    this.synths.forEach((synth, i) => {
      const note = notes[i % notes.length];
      if (note) {
        synth.setNote(`${note}${3 + Math.floor(i / 3)}`);
      }
    });
  }
}
