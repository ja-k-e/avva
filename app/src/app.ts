import { Detect } from "./Detect";
import { Synth } from "./Synth";

const h1 = document.querySelector("h1") || document.createElement("h1");
const params = new URLSearchParams(window.location.search);
const n = parseInt(params.get("n") || "");
const noteFocus = Math.min(11, isNaN(n) ? 0 : n);
console.log(noteFocus);
let initialized = false;

document.body.addEventListener("click", initialize);

async function initialize() {
  if (initialized) {
    return;
  }
  initialized = true;

  const detect = new Detect();
  const synth = new Synth();
  synth.start();
  try {
    await detect.start();
    loop();
  } catch (e) {
    console.log(e);
  }

  function loop() {
    window.requestAnimationFrame(loop);
    const { notes } = detect.tick();
    const { notation, value, index, max, prominence, ratio } = notes[noteFocus];
    synth.tick(notation, max, max, max);

    document.body.style.setProperty("--note-index", index.toString());
    document.body.style.setProperty("--note-value", value.toString());
    document.body.style.setProperty("--note-max", max.toString());
    document.body.style.setProperty("--note-prominence", prominence.toString());
    document.body.style.setProperty("--note-ratio", ratio.toString());
    h1.innerHTML = `${notation} <br> ${max.toFixed(3)}`;
  }
}
