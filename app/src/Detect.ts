import { NOTES_LIBRARY, STEP_NOTATIONS } from "musical-scale";

const NOTES = Object.values(NOTES_LIBRARY).slice(24, 84);

export type Notation = typeof STEP_NOTATIONS[0];
type NotationData = { value: number; max: number; octaves: number };

export class Detect {
  audioContext: AudioContext;
  analyser: AnalyserNode;
  frequencyData: Uint8Array;
  frequencyIndexes: number[];
  frequencyValues: number[];

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
      this.analyser.fftSize = 8192 * 4;

      const bufferLengthFreq = this.analyser.frequencyBinCount;
      this.frequencyData = new Uint8Array(bufferLengthFreq);
      const bandHz =
        this.audioContext.sampleRate / 2 / (this.analyser.fftSize / 2);

      this.frequencyIndexes = NOTES.map(({ frequency }) =>
        Math.floor(frequency / bandHz)
      );

      this.analyser.getByteFrequencyData(this.frequencyData);
      this.frequencyValues = this.frequencyIndexes.map(() => 0);
      return;
    } catch (e) {
      throw e;
    }
  }

  tick() {
    this.analyser.getByteFrequencyData(this.frequencyData);
    const notationDataMap: {
      [K in Notation]?: NotationData;
    } = {};
    NOTES.forEach(({ notation }, i) => {
      const rawFrequency = this.frequencyData[this.frequencyIndexes[i]];
      const valuePrevious = this.frequencyValues[i];
      const valueCurrent = Math.pow(Math.min(1, rawFrequency / 128), 50);
      const valueEasingFactor =
        valueCurrent < valuePrevious ? 0.0625 : 0.015625;
      const valueEased =
        valuePrevious + (valueCurrent - valuePrevious) * valueEasingFactor;
      const notationData: NotationData = notationDataMap[notation] || {
        value: 0,
        max: 0,
        octaves: 0,
      };
      notationData.octaves++;
      notationData.value += valueEased;
      notationData.max = Math.max(notationData.max, valueEased);
      notationDataMap[notation] = notationData;
      this.frequencyValues[i] = valueEased;
    });

    const notationDataMapAsEntries = Object.entries(notationDataMap);
    const totalAllValues = notationDataMapAsEntries.reduce(
      (a, b) => a + b[1].value,
      0
    );
    const noteData = notationDataMapAsEntries.map(
      ([notationRaw, { octaves, value, max }]) => {
        const notation = notationRaw as Notation;
        const prominence = value / totalAllValues;
        const index = STEP_NOTATIONS.indexOf(notation);
        const ratio = value / octaves;
        return { notation, value, index, max, prominence, ratio };
      }
    );
    // array of notes sorted by prominence
    const notes = Array.from(noteData).sort(
      (a, b) => b.prominence - a.prominence
    );

    return {
      notes,
    };
  }
}
