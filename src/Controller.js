class Controller {
  constructor(parent, handlers) {
    parent.addEventListener("keyup", this.keyUpHandler.bind(this));
    this.handlers = handlers;
  }

  keyUpHandler({code}) {
    if (this.handlers[code]) {
      this.handlers[code]();
    }
  }
}
