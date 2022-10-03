class DetectSave {
  detectStart(scale) {
    this.scaleNotes = scale.noteNames;
    this.lowpass = 0;
    this.resetConfidence();
  }

  detectProcess(loudness, hz) {
    if (loudness > 0.3) {
      const {note, octave} = Scale.noteFromFrequency(hz, this.scaleNotes);
      if (octave >= 1 && octave <= 4) {
        this.confidence[note] += loudness;
      }
    }
    if (loudness > 0.8) {
      this.lowpass = hz;
    }
  }

  detectEnd(scale) {
    const best = {
      key: undefined,
      note: undefined,
      confidence: 0,
    };
    scale.notes.forEach((note) => {
      if (this.confidence[note.note] > best.confidence) {
        best.confidence = this.confidence[note.note];
        best.note = note;
        best.key = [...note.triad.notes.map(({note}) => note)].sort().join("");
      }
    });
    const min = Math.min(...Object.values(this.confidence));
    best.confidence -= min;
    for (let k in this.confidence) {
      this.confidence[k] -= min;
    }
    this.chordConfidence = best.confidence;
    this.chord = best.note;
    this.chordKey = best.key;
  }

  resetConfidence() {
    this.confidence = {};
    this.scaleNotes.forEach((note) => (this.confidence[note] = 0));
  }
}
