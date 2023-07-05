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
const trackingObjectStub = {};
notes.forEach(({ notation }) => trackingObjectStub[notation] = 0);

export class Detector {
  constructor(canvas, context) {
    this.canvas = canvas;
    this.context = context;
    this.subCanvas = document.createElement("canvas");
    this.subContext = this.subCanvas.getContext("2d");
    this.subCanvas.width = 20;
    this.subCanvas.height = 20;
  }

  async start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);
      this.analyser.fftSize = 8192 * 2 * 2;

      this.video = document.createElement("video");
      document.body.appendChild(this.video);
      this.video.autoplay = true;
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.srcObject = stream;
      this.video.play();

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

  tickAudio() {
    this.analyser.getByteFrequencyData(this.data);
    const tracking = {};
    notes.forEach(({ notation }, i) => {
      const items = [1, 2, 13, 14, 25, 26, -1, -2, -13, -14, -25, -26];
      // const items = [1, 2, 13, 14, -1, -2, -13, -14];
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

    return {
      notes: noteData,
    };
  }

  drawVideo() {
    this.subContext.drawImage(this.video, 0, 0, this.subCanvas.width, this.subCanvas.height);
    const imageData = this.subContext.getImageData(0, 0, this.subCanvas.width, this.subCanvas.height);
    const dataCount = imageData.data.length;
    const tracking = [];
    const resolution = 48;
    for (let i = 0; i < resolution; i++) {
      tracking.push(0);
    }
    let lightness = 0;
    for (let i = 0; i < dataCount; i += 4) {
      const [h, s, l] = rgbToHSL(imageData.data[i + 0], imageData.data[i + 1], imageData.data[i + 2]);
      const hue = Math.floor(h * resolution);
      lightness += l;
      tracking[hue]++;
    }
    const pxCount = dataCount / 4;
    const max = Math.max(...tracking);
    this.context.save();
    this.context.globalAlpha = max / pxCount;
    this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    this.context.restore();
  }

  tickVideo() {
    this.drawVideo()

    const tracking = { ...trackingObjectStub };
    const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const dataCount = imageData.data.length;
    for (let i = 0; i < dataCount; i += 4) {
      const [h] = rgbToHSL(imageData.data[i + 0], imageData.data[i + 1], imageData.data[i + 2]);
      const { notation } = notes[Math.floor(h * 12)];
      tracking[notation] = tracking[notation] || 0;
      tracking[notation]++;
    }
    const entries = Object.entries(tracking);
    const total = dataCount / 4;
    const noteData = entries.map(([notation, value]) => {
      const prominence = value ? value / total : 0;
      const index = STEP_NOTATIONS.indexOf(notation);
      return { notation, value, index, prominence };
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

function rgbToHSL(r, g, b) {
  r /= 255, g /= 255, b /= 255;

  var max = Math.max(r, g, b);
  var min = Math.min(r, g, b);
  var h, s, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    var d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l]
}