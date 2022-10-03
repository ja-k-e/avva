class Color {
  constructor() {
    this.avgHSL = null;
    this.rgb = [];
  }

  get avgHSLStyle() {
    const [h, s, l] = this.avgHSL;
    return `hsl(${h * 360}, ${s * 100}%, ${l * 100}%)`;
  }

  avgHSLTuned(args = {}) {
    const clippedRatio = (val, min = 0, max = 1) =>
      Math.max(0, Math.min(val, max) - min) / (max - min);

    const [h, s, l] = this.avgHSL;
    const hue = h + ((args.hueOffset || 0) % 1);
    const sat = clippedRatio(s, args.minSat, args.maxSat);
    const lit = clippedRatio(l, args.minLit, args.maxLit);
    return [hue, sat, lit];
  }

  processImageData(imageData, ease) {
    const data = imageData.data;
    const len = imageData.data.length;
    const avg = [0, 0, 0];
    for (let i = 0; i < len; i += 4) {
      const colorIdx = i * 0.25;
      const newRGB = [data[i], data[i + 1], data[i + 2]];
      const prevRGB = this.rgb[colorIdx];
      const easeRGB = Color.easeVals(prevRGB, newRGB, ease);
      imageData.data[i + 0] = easeRGB[0];
      imageData.data[i + 1] = easeRGB[1];
      imageData.data[i + 2] = easeRGB[2];
      avg[0] += easeRGB[0];
      avg[1] += easeRGB[1];
      avg[2] += easeRGB[2];
      this.rgb[colorIdx] = easeRGB;
    }
    const colors = len * 0.25;
    avg[0] /= colors;
    avg[1] /= colors;
    avg[2] /= colors;
    this.avgHSL = Color.rgbToHSL(avg);
  }

  static easeVals(prev, next, ease = 0.0125) {
    return prev ? next.map((n, i) => (n - prev[i]) * ease + prev[i]) : next;
  }

  static rgbToHSL(rgb) {
    const r = rgb[0] / 255;
    const g = rgb[1] / 255;
    const b = rgb[2] / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const hsl = [0, 0, (max + min) / 2];

    if (max === min) {
      return hsl;
    }

    const difference = max - min;
    hsl[1] =
      hsl[2] > 0.5 ? difference / (2 - max - min) : difference / (max + min);
    switch (max) {
      case r:
        hsl[0] = (g - b) / difference + (g < b ? 6 : 0);
        break;
      case g:
        hsl[0] = (b - r) / difference + 2;
        break;
      case b:
        hsl[0] = (r - g) / difference + 4;
        break;
    }
    hsl[0] /= 6;

    return hsl;
  }

  static hslToRGB(hsl) {
    let [h, s, l] = hsl;

    let c = (1 - Math.abs(2 * l - 1)) * s,
      x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
      m = l - c / 2,
      r = 0,
      g = 0,
      b = 0;
    if (0 <= h && h < 0.1666667) {
      r = c;
      g = x;
      b = 0;
    } else if (0.1666667 <= h && h < 0.3333334) {
      r = x;
      g = c;
      b = 0;
    } else if (0.3333334 <= h && h < 0.5) {
      r = 0;
      g = c;
      b = x;
    } else if (0.5 <= h && h < 0.666667) {
      r = 0;
      g = x;
      b = c;
    } else if (0.666667 <= h && h < 0.8333333) {
      r = x;
      g = 0;
      b = c;
    } else if (0.8333333 <= h && h <= 1) {
      r = c;
      g = 0;
      b = x;
    }
    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255),
    ];
  }
}
