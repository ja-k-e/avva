class Detect {
  constructor() {
    this.recentNotes = [];

    this.previousGuess = undefined;
    this.noteConfidence = 0;

    this.previousChordFinderKey = undefined;
    this.chordConfidence = 0;
  }

  get chordKey() {
    if (!this.chord) {
      return undefined;
    }

    return this.chord.triad.notes
      .map(({note}) => note)
      .sort()
      .join("");
  }

  detectStart(scale) {
    this.guess = undefined;
    this.guessLoudness = 0;
    this.scaleNotes = scale.noteNames;
    this.lowpass = 0;
  }

  detectProcess(loudness, hz) {
    if (loudness > this.guessLoudness) {
      const {note} = Scale.noteFromFrequency(hz, this.scaleNotes);
      this.guessLoudness = loudness;
      this.guess = note;
    }
    if (loudness > 0.75) {
      this.lowpass = hz;
    }
  }

  detectEnd(scale) {
    if (this.previousGuess === this.guess) {
      this.noteConfidence++;
      if (this.noteConfidence > 10) {
        const newNote = this.recentNotes[0] !== this.guess;
        if (newNote) {
          const existingIndex = this.recentNotes.indexOf(this.guess);
          if (existingIndex !== -1) {
            this.recentNotes.splice(existingIndex, 1);
          }
          this.recentNotes = [this.guess].concat(this.recentNotes);
        }

        this.chordFinderKey = this.recentNotes.slice(0, 3).sort().join("");
        if (this.previousChordFinderKey === this.chordFinderKey) {
          const index = scale.chordIndexes[detect.chordFinderKey];
          const note = scale.notes[index];
          if (note) {
            this.chordConfidence = Math.min(100, this.chordConfidence + 1);
            if (this.chordConfidence > 10) {
              this.chord = note;
            }
          }
        } else {
          this.chordConfidence = 0;
        }
        this.previousChordFinderKey = this.chordFinderKey;
        if (newNote) {
          // console.log(
          //   this.chord ? this.chord.name : "unknown",
          //   this.chordKey,
          //   this.chordFinderKey,
          //   this.chordConfidence
          // );
        }
      }
    } else {
      this.noteConfidence = 0;
      this.previousGuess = this.guess;
    }
  }
}
