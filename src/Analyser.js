class Analyser {
  constructor(detect) {
    this.detect = detect;
  }

  start({stream, source, context = new AudioContext()}) {
    return new Promise((resolve) => {
      this.audioContext = context;
      this.analyserTime = this.audioContext.createAnalyser();
      this.analyserFreq = this.audioContext.createAnalyser();
      const src = stream
        ? this.audioContext.createMediaStreamSource(stream)
        : source;
      src.connect(this.analyserTime);
      src.connect(this.analyserFreq);
      this.analyserTime.fftSize = 2048;
      this.analyserFreq.fftSize = 4096;
      this.bufferLengthTime = this.analyserTime.frequencyBinCount;
      this.bufferLengthFreq = this.analyserFreq.frequencyBinCount;
      this.dataArrayTime = new Uint8Array(this.bufferLengthTime);
      this.dataArrayFreq = new Uint8Array(this.bufferLengthFreq);
      this.bandHz =
        this.audioContext.sampleRate / 2 / (this.analyserFreq.fftSize / 2);
      resolve();
    });
  }

  tick(scale) {
    this.analyserTime.getByteTimeDomainData(this.dataArrayTime);
    this.analyserFreq.getByteFrequencyData(this.dataArrayFreq);

    this.detect.detectStart(scale);
    for (let i = 0; i < this.bufferLengthFreq; i++) {
      const hz = i * this.bandHz;
      const value = this.dataArrayFreq[i] / 128;
      this.detect.detectProcess(value, hz + this.bandHz * 0.5);
    }
    this.detect.detectEnd(scale);
  }
}
