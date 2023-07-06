export class Synth {
  constructor() {
    const main = new Tone.Gain();
    main.toDestination();
    main.gain.value = 0.6;
    this.setupChord(main);
    this.setupBass(main);
    this.setupNotes(main);
    Tone.Transport.start();
    Tone.Transport.bpm.value = 90;
  }

  setupBass(main) {
    const gain = new Tone.Gain();
    gain.gain.value = 0.2;
    this.bass = new Tone.Synth();
    this.bassPattern = new Tone.Pattern(
      (time, note) => {
        if (this.chordStarted) {
          this.bass.triggerAttackRelease(note, "4n", time);
        }
      },
      ["C2"],
      "randomWalk"
    );
    this.bassPattern.interval = "4n";
    this.bassPattern.humanize = true;
    this.bass.set({
      envelope: { attack: 0.01 },
      oscillator: { type: "square4" },
      portamento: 0.01,
    });
    this.bass.connect(gain);
    gain.connect(main);
    this.bassPattern.start();
  }

  setupChord(main) {
    this.chord = new Tone.PolySynth(Tone.DuoSynth, {
      envelope: { attack: 0.3, decay: 0.5 },
      oscillator: { type: "triangle4" },
      portamento: 1,
    });
    const gain = new Tone.Gain();
    gain.gain.value = 0.1;
    this.chord.connect(gain);
    gain.connect(main);
  }

  setupNotes(main) {
    this.synths = [
      new Tone.Synth(),
      new Tone.Synth(),
      new Tone.Synth(),
      new Tone.Synth(),
      new Tone.Synth(),
    ];
    this.synths.forEach((synth, i) => {
      synth.set({
        envelope: { attack: 0.2 },
        oscillator: { type: "triangle4" },
        portamento: 0.5,
      });
      const pan = new Tone.Panner();
      pan.pan.value = (i / this.synths.length - 0.5) / 0.5;
      const gain = new Tone.Gain();
      gain.gain.value = 0.1;
      synth.connect(pan);
      pan.connect(gain);
      gain.connect(main);
    });
  }

  playChord(chord) {
    const notes = [];
    this.bassPattern.values = chord.notes.map(({ notation, octave }, i) => {
      notes.push(`${notation}${octave + Math.floor(i / 3) + 4}`);
      return `${notation}${octave + Math.floor(i / 3) + 1}`;
    });
    const release = [];
    const attack = [...notes];
    (this.prevChord || []).forEach((n) => {
      const index = attack.indexOf(n);
      if (index !== -1) {
        attack.splice(index, 1);
      } else {
        release.push(n);
      }
    });
    this.prevChord = notes;
    this.chord.triggerRelease(release);
    this.chord.triggerAttack(attack);
    this.chordStarted = true;
  }

  playNotes(notes) {
    const joined = notes.join("");
    if (joined === this.prevNotes) {
      return;
    }
    this.prevNotes = joined;
    this.synths.forEach((synth, i) => {
      const note = notes[i % notes.length];
      if (note) {
        synth[this.notesStarted ? "setNote" : "triggerAttack"](
          `${note}${4 + Math.floor(i / 3)}`
        );
      }
    });
    this.notesStarted = true;
  }
}
