class VisualVideo {
  constructor(di, video, canvas, color, avCanvas) {
    this.avCanvas = avCanvas;
    this.diameter = di;
    this.canvas = canvas;
    this.context = canvas.getContext("2d");
    this.video = video;
    this.color = color;
    this.canvas.height = this.diameter;
    this.canvas.width = this.diameter;
    this.mode = "camera";
    this.setUpMouse();
  }

  toggleMode() {
    if (this.mode === "camera") {
      this.mode = "mouse";
    } else if (this.mode === "mouse") {
      this.mode = "canvas";
    } else if (this.mode === "canvas") {
      this.mode = "camera";
    }
  }

  setUpMouse() {
    this.mouseHue = 0;
    this.mouseLit = 100;
    this.mouseSat = 100;
    this.canvas.addEventListener("click", (e) => {
      this.clicked = !this.clicked;
    });
    this.canvas.addEventListener("mousemove", (e) => {
      if (this.clicked) {
        return;
      }
      this.mouseHue = (e.clientX / this.canvas.clientWidth) * 360;
      this.mouseLit = (1 - e.clientY / this.canvas.clientHeight) * 100;
    });
    this.canvas.addEventListener("wheel", (e) => {
      const inc = (Math.min(100, Math.max(-100, e.deltaY / 100)) / 100) * 50;
      this.mouseSat = Math.min(100, Math.max(0, this.mouseSat + inc));
    });
  }

  start(stream) {
    return new Promise((resolve) => {
      try {
        this.video.srcObject = stream;
      } catch (error) {
        this.video.src = URL.createObjectURL(stream);
      }
      this.video.play();
      this.video.onloadedmetadata = () => {
        this.width =
          (this.video.videoWidth / this.video.videoHeight) * this.canvas.width;
        this.video.width = this.video.videoWidth;
        this.video.height = this.video.videoHeight;
        this.offX = (this.width - this.canvas.width) * -0.5;
        resolve();
      };
    });
  }

  tick() {
    if (this.mode === "camera") {
      this.context.drawImage(
        this.video,
        this.offX,
        0,
        this.width,
        this.diameter
      );
    } else if (this.mode === "mouse") {
      this.context.fillStyle = `hsl(${this.mouseHue}, ${this.mouseSat}%, ${this.mouseLit}%)`;
      this.context.fillRect(0, 0, this.diameter, this.diameter);
    } else if (this.mode === "canvas") {
      this.context.drawImage(
        this.avCanvas,
        this.offX,
        0,
        this.width,
        this.diameter
      );
    }
    const imgData = this.context.getImageData(
      0,
      0,
      this.diameter,
      this.diameter
    );
    this.color.processImageData(imgData);
    this.context.putImageData(imgData, 0, 0);
  }
}
