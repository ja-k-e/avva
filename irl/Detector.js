import {
  chordKeyFromNotes,
  chordFromStepAndType,
  CHORD_TYPES,
  NOTES_LIBRARY,
  STEP_NOTATIONS,
} from "https://unpkg.com/musical-scale@1.0.4/index.js";
import { rgbToHSL } from "./utils.js";

const CHORDS = {};
CHORD_TYPES.forEach((type) => {
  STEP_NOTATIONS.forEach((_, i) => {
    const chord = chordFromStepAndType(i, type);
    CHORDS[chord.key] = chord;
  });
});

const notes = Object.values(NOTES_LIBRARY).slice(24, 84);
const count = notes.length;
const trackingObjectStub = {};
notes.forEach(({ notation }) => (trackingObjectStub[notation] = 0));

export class Detector {
  initializeAudio(stream) {
    this.hzBandIndexes = notes.map(({ frequency }) =>
      Math.floor(frequency / stream.bandHz)
    );
    this.hzBandValues = this.hzBandIndexes.map(() => 0);
  }

  tickAudio(audioData) {
    const tracking = {};
    notes.forEach(({ notation }, i) => {
      const items = [1, 2, 13, 14, 25, 26, -1, -2, -13, -14, -25, -26];
      const neighbors = items.map((item) => item + i);
      const self = audioData[this.hzBandIndexes[i]];

      // ignoring bands that have louder neighbors
      const max = neighbors.reduce((value, index) => {
        if (index >= 0 && index < count) {
          value = Math.max(value, audioData[this.hzBandIndexes[index]]);
        }
        return value;
      }, 0);
      const freq = self > max ? self : 0;

      const valuePrev = this.hzBandValues[i];
      const valueNew = Math.pow(Math.min(1, freq / 128), 50);
      const factor = valueNew < valuePrev ? 0.0625 : 0.015625;
      const valueEased = valuePrev + (valueNew - valuePrev) * factor;
      tracking[notation] = tracking[notation] || {
        value: 0,
        octaves: 0,
      };
      tracking[notation].octaves++;
      tracking[notation].value += valueEased;

      this.hzBandValues[i] = valueEased;
    });

    const entries = Object.entries(tracking);
    const total = entries.reduce((a, b) => a + b[1].value, 0);
    const noteData = entries.map(([notation, { octaves, value }]) => {
      const prominence = value ? value / total : 0;
      const index = STEP_NOTATIONS.indexOf(notation);
      const ratio = value / octaves;
      // notation: letter
      // value: loudness of note (across all octaves)
      // index: numeric position of note (C-B)
      // prominence: how prominent note is across all notes
      // ratio: 0-1 loundess of note (value /)
      return { notation, value, index, prominence, ratio };
    });

    return {
      notes: noteData,
    };
  }

  processImageData(imageData) {
    const tracking = { ...trackingObjectStub };
    const dataCount = imageData.data.length;
    for (let i = 0; i < dataCount; i += 4) {
      const [h, _s, l] = rgbToHSL(
        imageData.data[i + 0],
        imageData.data[i + 1],
        imageData.data[i + 2]
      );
      const { notation } = notes[Math.floor(h * 12)];
      tracking[notation] = tracking[notation] || { count: 0, lit: 0 };
      tracking[notation].count++;
      tracking[notation].lit += l;
    }
    const entries = Object.entries(tracking);
    const total = dataCount / 4;
    const noteData = entries.map(([notation, { count, lit }]) => {
      const value = count ? lit / count : 0;
      const prominence = count ? count / total : 0;
      const index = STEP_NOTATIONS.indexOf(notation);
      return { notation, value, index, prominence, ratio: value };
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
      sorted,
      chordChange,
      label: option.chord ? option.chord.label : option.key,
      option,
      notes: noteData,
    };
  }
}
