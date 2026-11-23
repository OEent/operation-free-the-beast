import { Engine } from "./engine";
import { loadSettings } from "./storage";
const c = document.getElementById("game") as HTMLCanvasElement;
const e = new Engine(c, { standalone: true, settings: loadSettings() });
e.start();