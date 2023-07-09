const SETTINGS_CHORD = {
  portamento: 1,
  harmonicity: 0.5,
  vibratoAmount: 0.6,
  voice0: {
    envelope: { attack: 0.3, decay: 0.5 },
    oscillator: { type: "triangle" },
  },
  voice1: {
    envelope: { attack: 0.3, decay: 0.5 },
    oscillator: { type: "sawtooth" },
  },
};

const SETTINGS_SYNTH_BASS = {
  portamento: 0.05,
  vibratoAmount: 0.4,
  voice0: {
    envelope: { attack: 0.1 },
    oscillator: { type: "square4" },
  },
  voice1: {
    envelope: { attack: 0.1 },
    oscillator: { type: "triangle" },
  },
};

const SETTINGS_SYNTH_TREBLE = {
  portamento: 0.6,
  harmonicity: 1,
  vibratoAmount: 0.6,
  voice0: {
    envelope: { attack: 0.3 },
    oscillator: { type: "triangle" },
  },
  voice1: {
    envelope: { attack: 0.3 },
    oscillator: { type: "sawtooth" },
  },
};

export class Synth {
  constructor() {
    const main = new Tone.Gain();
    main.toDestination();
    main.gain.value = 0.8;
    this.setupChord(main);
    this.setupNotes(main);
    Tone.Transport.start();
    Tone.Transport.bpm.value = 90;
  }

  setupChord(main) {
    this.chord = new Tone.PolySynth(Tone.DuoSynth, SETTINGS_CHORD);
    const gain = new Tone.Gain();
    gain.gain.value = 0.05;
    this.chord.connect(gain);
    gain.connect(main);
  }

  setupNotes(main) {
    const synthsBass = [new Tone.DuoSynth(), new Tone.DuoSynth()];
    const synthsTreble = [new Tone.DuoSynth(), new Tone.DuoSynth()];
    this.synths = { bass: synthsBass, treble: synthsTreble };
    synthsBass.forEach((synth, i) => {
      initSynth(synth, 0.2, i / synthsBass.length, SETTINGS_SYNTH_BASS);
    });
    synthsTreble.forEach((synth, i) => {
      initSynth(synth, 0.025, i / synthsTreble.length, SETTINGS_SYNTH_TREBLE);
    });

    function initSynth(synth, volume, ratio, settings) {
      synth.set(settings);
      const pan = new Tone.Panner();
      pan.pan.value = (ratio - 0.5) / 0.5;
      const gain = new Tone.Gain();
      gain.gain.value = volume;
      synth.connect(pan);
      pan.connect(gain);
      gain.connect(main);
    }
  }

  playChord(chord) {
    const notes = chord.notes.map(
      ({ notation, octave }, i) =>
        `${notation}${octave + Math.floor(i / 3) + 4}`
    );
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
    this.synths.treble.forEach((synth, i) => {
      const note = notes[i % notes.length];
      if (note) {
        synth[this.notesStarted ? "setNote" : "triggerAttack"](
          `${note}${4 + Math.floor(i / 3)}`
        );
      }
    });
    this.synths.bass.forEach((synth, i) => {
      const note = notes[i % notes.length];
      if (note) {
        synth[this.notesStarted ? "setNote" : "triggerAttack"](
          `${note}${2 + Math.floor(i / 3)}`
        );
      }
    });
    this.notesStarted = true;
  }
}
