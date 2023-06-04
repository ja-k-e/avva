import {
  chordKeyFromNotes,
  chordFromStepAndType,
  CHORD_TYPES,
  NOTES_LIBRARY,
  STEP_NOTATIONS,
} from "https://unpkg.com/musical-scale@1.0.4/index.js";

const CHORDS = {};
CHORD_TYPES.forEach((type) => {
  STEP_NOTATIONS.forEach((_, i) => {
    const chord = chordFromStepAndType(i, type);
    CHORDS[chord.key] = chord;
  });
});

const notes = Object.values(NOTES_LIBRARY).slice(24, 84);
const count = notes.length;

export class Detector {
  constructor() {}

  async start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      this.analyser.fftSize = 8192 * 2 * 2;

      const bufferLengthFreq = this.analyser.frequencyBinCount;
      this.data = new Uint8Array(bufferLengthFreq);
      const bandHz =
        this.audioContext.sampleRate / 2 / (this.analyser.fftSize / 2);

      this.indexes = notes.map(({ frequency }) =>
        Math.floor(frequency / bandHz)
      );

      this.analyser.getByteFrequencyData(this.data);
      this.values = this.indexes.map(() => 0);
      return;
    } catch (e) {
      throw e;
    }
  }

  tick() {
    this.analyser.getByteFrequencyData(this.data);
    const tracking = {};
    notes.forEach(({ notation }, i) => {
      // const items = [1, 2, 13, 14, 25, 26, -1, -2, -13, -14, -25, -26];
      const items = [1, 2, 13, 14, -1, -2, -13, -14];
      const neighbors = items.map((item) => item + i);
      const self = this.data[this.indexes[i]];

      // ignoring bands that have louder neighbors
      const max = neighbors.reduce((value, index) => {
        if (index >= 0 && index < count) {
          value = Math.max(value, this.data[this.indexes[index]]);
        }
        return value;
      }, 0);
      const freq = self > max ? self : 0;

      const valuePrev = this.values[i];
      const valueNew = Math.pow(Math.min(1, freq / 128), 50);
      const factor = valueNew < valuePrev ? 0.0625 : 0.015625;
      const valueEased = valuePrev + (valueNew - valuePrev) * factor;
      tracking[notation] = tracking[notation] || {
        value: 0,
        octaves: 0,
      };
      tracking[notation].octaves++;
      tracking[notation].value += valueEased;

      this.values[i] = valueEased;
    });

    const entries = Object.entries(tracking);
    const total = entries.reduce((a, b) => a + b[1].value, 0);
    const noteData = entries.map(([notation, { octaves, value }]) => {
      const prominence = value ? value / total : 0;
      const index = STEP_NOTATIONS.indexOf(notation);
      const ratio = value / octaves;
      return { notation, value, index, prominence, ratio };
    });
    // array of notes sorted by prominence
    const sorted = Array.from(noteData).sort(
      (a, b) => b.prominence - a.prominence
    );
    // combinations of prominent notes to check for chords
    const combos = [
      [sorted[0], sorted[1], sorted[2], sorted[3]],
      [sorted[0], sorted[1], sorted[2]],
      [sorted[0], sorted[1], sorted[3]],
    ];
    // chord combinations sorted by avg prominence to determine which is most likely
    const chordOptions = combos
      .map((combo) => {
        const key = chordKeyFromNotes(combo);
        // getting avg value of potential chord notes
        const avg =
          combo.reduce((a, { prominence }) => prominence + a, 0) / combo.length;
        const chord = CHORDS[key];
        return { chord, key, avg };
      })
      .sort((a, b) => b.avg - a.avg);
    // the first _chord_ in the array (most prominent might not be chord!)
    const firstChord = chordOptions.find(({ chord }) => Boolean(chord));
    // finding the previous chord in the array
    const prevChord = chordOptions.find(
      ({ key }) => key === this.previousChordKey
    );
    // the actual option we're going with in order of priority
    const option = prevChord || firstChord || chordOptions[0];
    const newChordKey = option.chord ? option.key : this.previousChordKey;
    const chordChange = newChordKey !== this.previousChordKey;
    this.previousChordKey = newChordKey;

    return {
      chordChange,
      label: option.chord ? option.chord.label : option.key,
      option,
      notes: noteData,
    };
  }
}
