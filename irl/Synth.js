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
    this.prevChord = [];
    Tone.Transport.scheduleRepeat(this.loop.bind(this), "16n");
    Tone.Transport.bpm.value = 140;
    Tone.Transport.start();
    this.dataChord = [];
    this.dataNotes = [];
  }

  loop(time) {
    if (this.chordChange) {
      this.playChord(time);
    }
    if (this.notesChange) {
      this.playNotes(time);
    }
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
    this.gains = {
      bass: { volume: 0.2, nodes: [] },
      treble: { volume: 0.1, nodes: [] },
    };
    synthsBass.forEach((synth, i) => {
      initSynth(
        synth,
        this.gains.bass,
        i / synthsBass.length,
        SETTINGS_SYNTH_BASS
      );
    });
    synthsTreble.forEach((synth, i) => {
      initSynth(
        synth,
        this.gains.treble,
        i / synthsTreble.length,
        SETTINGS_SYNTH_TREBLE
      );
    });

    function initSynth(synth, gains, ratio, settings) {
      synth.set(settings);
      const pan = new Tone.Panner();
      pan.pan.value = (ratio - 0.5) / 0.5;
      const gain = new Tone.Gain();
      gain.gain.value = 0;
      gains.nodes.push(gain);
      synth.connect(pan);
      pan.connect(gain);
      gain.connect(main);
    }
  }

  setChord(chord) {
    this.dataChord = chord.notes.map(
      ({ notation, octave }, i) =>
        `${notation}${octave + Math.floor(i / 3) + 4}`
    );
    this.chordChange = true;
  }

  playChord(time) {
    this.chordChange = false;
    const release = [];
    const attack = [...this.dataChord];
    this.prevChord.forEach((n) => {
      const index = attack.indexOf(n);
      if (index !== -1) {
        attack.splice(index, 1);
      } else {
        release.push(n);
      }
    });
    this.prevChord = [...this.dataChord];
    this.chord.triggerRelease(release, time);
    this.chord.triggerAttack(attack, time);
    this.chordStarted = true;
  }

  setNotes(notes) {
    const joined = notes.join("");
    if (joined === this.prevNotes) {
      return;
    }
    this.prevNotes = joined;
    this.dataNotes = notes;
    this.notesChange = true;
  }

  playNotes(time) {
    this.notesChange = false;
    this.synths.treble.forEach((synth, i) => {
      const note = this.dataNotes[i % this.dataNotes.length];
      if (note) {
        synth[this.notesStarted ? "setNote" : "triggerAttack"](
          `${note.notation}${4 + Math.floor(i / 3)}`,
          time
        );
        this.gains.treble.nodes[i].gain.value =
          this.gains.treble.volume * note.volume;
      }
    });
    this.synths.bass.forEach((synth, i) => {
      const note = this.dataNotes[i % this.dataNotes.length];
      if (note) {
        synth[this.notesStarted ? "setNote" : "triggerAttack"](
          `${note.notation}${2 + Math.floor(i / 3)}`,
          time
        );
        this.gains.bass.nodes[i].gain.value =
          this.gains.bass.volume * note.volume;
      }
    });
    this.notesStarted = true;
  }
}
