import { rgbToHSL } from "./utils.js";

export class Visual {
  constructor(onClick) {
    this.canvas = document.querySelector("canvas");
    this.context = this.canvas.getContext("2d", { willReadFrequently: true });
    this.subCanvas = document.createElement("canvas");
    this.subContext = this.subCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    this.subCanvas.width = 20;
    this.subCanvas.height = 20;
    this.canvas.addEventListener("click", onClick);
  }

  get height() {
    return this.canvas.height;
  }

  get width() {
    return this.canvas.width;
  }

  imageData() {
    return this.context.getImageData(0, 0, this.width, this.height);
  }

  clear() {
    this.context.clearRect(0, 0, this.width, this.height);
  }

  _rect(fill, x, y, w, h) {
    this.context.fillStyle = fill;
    this.context.fillRect(
      x * this.width,
      y * this.height,
      w * this.width,
      h * this.height
    );
  }

  render(blocks, height = 1) {
    let x = 0;
    blocks.forEach(({ position, size, volume }) => {
      const hue = Math.floor(position * 360);
      const fill = `hsl(${hue}, 100%, ${volume * 50 + 10}%)`;
      this._rect(fill, x, (1 - height) * 0.5, size, height);
      x += size;
    });
  }

  text(size, string) {
    this.context.font = `bold ${size * this.height}px 'Andale Mono',monospace`;
    this.context.fillStyle = `oklch(100% 0 360)`;
    this.context.textAlign = "center";
    this.context.textBaseline = "middle";

    this.context.fillText(string, this.width * 0.5, this.height * 0.5);
  }

  resize(width, height) {
    this.canvas.height = height;
    this.canvas.width = width;
  }

  superimposeVideo(video) {
    this.subContext.drawImage(
      video,
      0,
      0,
      this.subCanvas.width,
      this.subCanvas.height
    );
    const imageData = this.subContext.getImageData(
      0,
      0,
      this.subCanvas.width,
      this.subCanvas.height
    );
    const dataCount = imageData.data.length;
    const tracking = [];
    const resolution = 48;
    for (let i = 0; i < resolution; i++) {
      tracking.push(0);
    }
    let lightness = 0;
    for (let i = 0; i < dataCount; i += 4) {
      const [h, s, l] = rgbToHSL(
        imageData.data[i + 0],
        imageData.data[i + 1],
        imageData.data[i + 2]
      );
      const hue = Math.floor(h * resolution);
      lightness += l;
      tracking[hue]++;
    }
    const pxCount = dataCount / 4;
    const max = Math.max(...tracking);
    this.context.save();
    this.context.globalAlpha = max / pxCount;
    this.context.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
    this.context.restore();
  }
}
