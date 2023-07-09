export class Keyboard {
  constructor() {
    this.map = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    document.body.addEventListener("keydown", this.onDown.bind(this));
    document.body.addEventListener("keyup", this.onUp.bind(this));
    this._down = {};
  }

  indexFromKey(key) {
    return "awsedftgyhujkol".split("").indexOf(key);
  }

  onDown({ key }) {
    const index = this.indexFromKey(key);
    if (index > -1 && !this._down[key]) {
      this._down[key] = 1;
      this.map[index % 12]++;
    }
  }
  onUp({ key }) {
    const index = this.indexFromKey(key);
    if (index > -1) {
      this._down[key] = 0;
      this.map[index % 12]--;
    }
  }

  toBlocks() {
    const total = this.map.reduce((n, x) => n + x, 0);
    return this.map.map((n, index) => ({
      position: index / 12,
      size: n / total,
      volume: 1,
    }));
  }
}
