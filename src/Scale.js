// prettier-ignore
const LIB_NOTES = [
  "C0", "C#0", "D0", "D#0", "E0", "F0", "F#0", "G0", "G#0", "A0", "A#0", "B0",
  "C1", "C#1", "D1", "D#1", "E1", "F1", "F#1", "G1", "G#1", "A1", "A#1", "B1",
  "C2", "C#2", "D2", "D#2", "E2", "F2", "F#2", "G2", "G#2", "A2", "A#2", "B2",
  "C3", "C#3", "D3", "D#3", "E3", "F3", "F#3", "G3", "G#3", "A3", "A#3", "B3",
  "C4", "C#4", "D4", "D#4", "E4", "F4", "F#4", "G4", "G#4", "A4", "A#4", "B4",
  "C5", "C#5", "D5", "D#5", "E5", "F5", "F#5", "G5", "G#5", "A5", "A#5", "B5",
  "C6", "C#6", "D6", "D#6", "E6", "F6", "F#6", "G6", "G#6", "A6", "A#6", "B6",
  "C7", "C#7", "D7", "D#7", "E7", "F7", "F#7", "G7", "G#7", "A7", "A#7", "B7",
  "C8", "C#8", "D8", "D#8", "E8", "F8", "F#8", "G8", "G#8", "A8", "A#8", "B8",
];
// prettier-ignore
const LIB_HZ = [
  16.352, 17.324, 18.354, 19.445, 20.602, 21.827, 23.125, 24.5, 25.957, 27.5, 29.135, 30.868,
  32.703, 34.648, 36.708, 38.891, 41.203, 43.654, 46.249, 48.999, 51.913, 55, 58.27, 61.735,
  65.406, 69.296, 73.416, 77.782, 82.407, 87.307, 92.499, 97.999, 103.826, 110, 116.541, 123.471,
  130.813, 138.591, 146.832, 155.563, 164.814, 174.614, 184.997, 195.998, 207.652, 220, 233.082, 246.942,
  261.626, 277.183, 293.665, 311.127, 329.628, 349.228, 369.994, 391.995, 415.305, 440, 466.164, 493.883,
  523.251, 554.365, 587.33, 622.254, 659.255, 698.456, 739.989, 783.991, 830.609, 880, 932.328, 987.767,
  1046.502, 1108.731, 1174.659, 1244.508, 1318.51, 1396.913, 1479.978, 1567.982, 1661.219, 1760, 1864.655, 1975.533,
  2093.005, 2217.461, 2349.318, 2489.016, 2637.02, 2793.826, 2959.955, 3135.963, 3322.438, 3520, 3729.31, 3951.066,
  4186.01, 4434.92, 4698.63, 4978.03, 5274.04, 5587.65, 5919.91, 6271.93, 6644.88, 7040.00, 7458.62, 7902.13
];

const NOTE_FROM_FREQ = {};

class Scale {
  constructor(params = {key: "C", mode: "major"}, progression, onUpdate) {
    this.library = this.loadLibrary();
    this.onUpdate = onUpdate;
    this.progression = progression;
    this.updateScale(params);
  }

  updateScale(params) {
    if (this.errors(params)) {
      return;
    }
    this.loadScale(params);
    localStorage.setItem("musical-scale", JSON.stringify(params));
    if (this.onUpdate) {
      this.onUpdate(this);
    }
  }

  loadScale(params) {
    // clean up the key param
    this.key = this.paramKey(params.key);
    // set the mode
    this.mode = params.mode;
    this.notes = [];
    this.noteNames = [];
    this.scale = this.library.scales[this.paramMode(this.mode)];
    this.chordIndexes = {};

    // notes to cycle through
    const keys = this.library.keys;
    // starting index for key loop
    const offset = keys.indexOf(this.key);
    for (let s = 0; s < this.progression.length; s++) {
      const index = this.progression[s];
      const step = this.scale.steps[index];
      const idx = (offset + step) % keys.length;
      // relative octave. 0 = same as root, 1 = next ocave up
      const octave = offset + step > keys.length - 1 ? 1 : 0;
      // generate the relative triads
      const triad = this.generateTriad(
        index,
        idx,
        octave,
        this.scale.triads[index]
      );
      // save the reference to the chord
      const chordKey = triad.notes
        .map(({note}) => note)
        .sort()
        .join("");
      this.chordIndexes[chordKey] = this.notes.length;
      // define the note
      const note = {
        name: `${keys[idx]}${triad.type}`,
        step: index,
        note: keys[idx],
        octave,
        triad,
      };
      this.noteNames.push(keys[idx]);
      // add the note
      this.notes.push(note);
    }
  }

  // create a chord of notes based on chord type
  generateTriad(s, offset, octave, t) {
    // get the steps for this chord type
    const steps = this.library.triads[t];
    // instantiate the chord
    const chord = {
      type: t,
      interval: this.intervalFromType(s, t),
      notes: [],
    };
    // load the notes
    const keys = this.library.keys;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const idx = (offset + step) % keys.length;
      // relative octave to base
      const relative = offset + step > keys.length - 1 ? octave + 1 : octave;
      // define the note
      chord.notes.push({note: keys[idx], octave: relative});
    }
    return chord;
  }

  // proper interval notation from the step and type
  intervalFromType(step, type) {
    const steps = "i ii iii iv v vi vii".split(" ");
    const s = steps[step];
    switch (type) {
      case "maj":
        return s.toUpperCase();
      case "min":
        return s;
      case "aug":
        return s.toUpperCase() + "+";
      case "dim":
        return s + "°";
    }
    return s;
  }

  errors(params) {
    if (this.library.keys.indexOf(params.key) === -1) {
      if (Object.keys(this.library.flatSharp).indexOf(params.key) === -1) {
        console.error(
          `${params.key} is an invalid key. ${this.library.keys.join(", ")}`
        );
        return true;
      }
    } else if (this.library.modes.indexOf(params.mode) === -1) {
      console.error(
        `${params.mode} is an invalid mode. ${this.library.modes.join(", ")}`
      );
      return true;
    } else {
      return false;
    }
  }

  loadLibrary() {
    return {
      keys: "C C# D D# E F F# G G# A A# B".split(" "),
      scales: {
        ion: {
          name: "Ionian",
          steps: this.generateSteps("W W H W W W H"),
          dominance: [3, 0, 1, 0, 2, 0, 1],
          triads: this.generateTriads(0),
        },
        dor: {
          name: "Dorian",
          steps: this.generateSteps("W H W W W H W"),
          dominance: [3, 0, 1, 0, 2, 2, 1],
          triads: this.generateTriads(1),
        },
        phr: {
          name: "Phrygian",
          steps: this.generateSteps("H W W W H W W"),
          dominance: [3, 2, 1, 0, 2, 0, 1],
          triads: this.generateTriads(2),
        },
        lyd: {
          name: "Lydian",
          steps: this.generateSteps("W W W H W W H"),
          dominance: [3, 0, 1, 2, 2, 0, 1],
          triads: this.generateTriads(3),
        },
        mix: {
          name: "Mixolydian",
          steps: this.generateSteps("W W H W W H W"),
          dominance: [3, 0, 1, 0, 2, 0, 2],
          triads: this.generateTriads(4),
        },
        aeo: {
          name: "Aeolian",
          steps: this.generateSteps("W H W W H W W"),
          dominance: [3, 0, 1, 0, 2, 0, 1],
          triads: this.generateTriads(5),
        },
        loc: {
          name: "Locrian",
          steps: this.generateSteps("H W W H W W W"),
          dominance: [3, 0, 1, 0, 3, 0, 0],
          triads: this.generateTriads(6),
        },
        mel: {
          name: "Melodic Minor",
          steps: this.generateSteps("W H W W W W H"),
          dominance: [3, 0, 1, 0, 3, 0, 0],
          triads: "min min aug maj maj dim dim".split(" "),
        },
        har: {
          name: "Harmonic Minor",
          steps: this.generateSteps("W H W W H WH H"),
          dominance: [3, 0, 1, 0, 3, 0, 0],
          triads: "min dim aug min maj maj dim".split(" "),
        },
      },
      modes: [
        "ionian",
        "dorian",
        "phrygian",
        "lydian",
        "mixolydian",
        "aeolian",
        "locrian",
        "major",
        "minor",
        "melodic",
        "harmonic",
      ],
      flatSharp: {
        Cb: "B",
        Db: "C#",
        Eb: "D#",
        Fb: "E",
        Gb: "F#",
        Ab: "G#",
        Bb: "A#",
      },
      triads: {
        maj: [0, 4, 7],
        min: [0, 3, 7],
        dim: [0, 3, 6],
        aug: [0, 4, 8],
      },
    };
  }

  paramMode(mode) {
    return {
      minor: "aeo",
      major: "ion",
      ionian: "ion",
      dorian: "dor",
      phrygian: "phr",
      lydian: "lyd",
      mixolydian: "mix",
      aeolian: "aeo",
      locrian: "loc",
      melodic: "mel",
      harmonic: "har",
    }[mode];
  }

  paramKey(key) {
    if (this.library.flatSharp[key]) {
      return this.library.flatSharp[key];
    }
    return key;
  }

  generateTriads(offset) {
    // this is ionian, each mode bumps up one offset.
    const base = "maj min min maj maj min dim".split(" ");
    const triads = [];
    for (let i = 0; i < base.length; i++) {
      triads.push(base[(i + offset) % base.length]);
    }
    return triads;
  }

  generateSteps(stepsString) {
    const arr = stepsString.split(" ");
    const steps = [0];
    let step = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      let inc = 0;
      switch (arr[i]) {
        case "W":
          inc = 2;
          break;
        case "H":
          inc = 1;
          break;
        case "WH":
          inc = 3;
          break;
      }
      step += inc;
      steps.push(step);
    }
    return steps;
  }

  static frequencyFromNote(note, octave) {
    return LIB_HZ[LIB_NOTES.indexOf(`${note}${octave}`)] || 0;
  }

  static noteFromFrequency(freq, notes) {
    if (NOTE_FROM_FREQ[freq]) {
      return NOTE_FROM_FREQ[freq];
    }

    let index = 0;
    while (
      (LIB_HZ[index + 1] < freq && index < LIB_HZ.length) ||
      !notes.includes(LIB_NOTES[index].replace(/\d/, ""))
    ) {
      index++;
    }
    const noteString = LIB_NOTES[index];
    const note = noteString.replace(/\d/, "");
    const octave = parseInt(noteString.charAt(noteString.length - 1));
    NOTE_FROM_FREQ[freq] = {note, octave};
    return {note, octave};
  }
}
