class VisualAudio {
  constructor(di, canvas, color) {
    this.diameter = di;
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.color = color;
    this.canvas.height = this.diameter;
    this.canvas.width = this.diameter;
  }

  tick(hue, sat, lit) {
    const imageData = this.context.getImageData(
      0,
      0,
      this.diameter,
      this.diameter
    );
    const len = imageData.data.length;
    const randVal = (val) =>
      Math.max(0, Math.min(1, val + (Math.random() * 0.2 - 0.1)));
    const detuned = () => [randVal(hue), randVal(sat), randVal(lit)];
    for (let i = 0; i < len; i += 4) {
      const newHSL = detuned();
      const newRGB = Color.hslToRGB(newHSL);
      const prevRGB = [
        imageData.data[i + 0],
        imageData.data[i + 1],
        imageData.data[i + 2],
      ];
      const easeRGB = Color.easeVals(prevRGB, newRGB, 0.025);
      imageData.data[i + 0] = easeRGB[0];
      imageData.data[i + 1] = easeRGB[1];
      imageData.data[i + 2] = easeRGB[2];
      imageData.data[i + 3] = 255;
    }
    this.context.putImageData(imageData, 0, 0);
    this.color.processImageData(imageData, 0.025);
  }
}
