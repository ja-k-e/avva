export const FFT_SIZE = 8192 * 2 * 2;

export class Stream {
  get bandHz() {
    return this.audioContext.sampleRate / 2 / (FFT_SIZE / 2);
  }

  constructor({ audio, video }) {
    this.audio = audio;
    this.video = video;
  }

  async start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: this.audio,
        video: this.video,
      });
      if (this.audio) {
        this.startAudio(stream);
      }
      if (this.video) {
        this.startVideo(stream);
      }
    } catch (e) {
      throw e;
    }
  }

  startAudio(stream) {
    this.audioContext = new AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    const source = this.audioContext.createMediaStreamSource(stream);
    source.connect(this.analyser);
    this.analyser.fftSize = FFT_SIZE;
    const bufferLengthFreq = this.analyser.frequencyBinCount;
    this.audioData = new Uint8Array(bufferLengthFreq);
    this.analyser.getByteFrequencyData(this.audioData);
  }

  startVideo(stream) {
    this.videoElement = document.createElement("video");
    document.body.appendChild(this.videoElement);
    this.videoElement.autoplay = true;
    this.videoElement.muted = true;
    this.videoElement.playsInline = true;
    this.videoElement.srcObject = stream;
    this.videoElement.play();
  }

  tickAudio() {
    this.analyser.getByteFrequencyData(this.audioData);
  }
}
