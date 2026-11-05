import type { Settings } from "./types";
export type Sound =
  | "jump"
  | "land"
  | "attack"
  | "dash"
  | "hit"
  | "enemy"
  | "pickup"
  | "relic"
  | "checkpoint"
  | "ui"
  | "boss"
  | "victory"
  | "defeat"
  | "step";
const MELODIES = [
  [64, 67, 71, 74, 71, 67, 62, 67, 64, 67, 72, 71, 67, 64, 62, 59],
  [57, 64, 69, 71, 64, 60, 67, 69, 57, 64, 72, 71, 67, 64, 60, 59],
  [52, 59, 64, 67, 64, 59, 55, 62, 52, 59, 67, 66, 62, 59, 55, 54],
  [45, 52, 57, 60, 57, 52, 48, 55, 45, 52, 60, 59, 55, 52, 48, 47],
];
export class AudioEngine {
  context: AudioContext | null = null;
  failed = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private beat = 0;
  private level = 0;
  private playing = false;
  constructor(public settings: Settings) {}
  async unlock() {
    try {
      if (!this.context) this.context = new AudioContext();
      if (this.context.state === "suspended") await this.context.resume();
      this.failed = false;
    } catch {
      this.failed = true;
    }
  }
  set(settings: Settings) {
    this.settings = { ...settings };
  }
  private tone(
    freq: number,
    duration: number,
    volume: number,
    type: OscillatorType = "square",
    delay = 0,
    end?: number,
  ) {
    try {
      const c = this.context;
      if (!c || c.state !== "running" || this.settings.muted || volume <= 0)
        return;
      const o = c.createOscillator(),
        g = c.createGain(),
        t = c.currentTime + delay;
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (end)
        o.frequency.exponentialRampToValueAtTime(
          Math.max(20, end),
          t + duration,
        );
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(volume, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      o.connect(g);
      g.connect(c.destination);
      o.start(t);
      o.stop(t + duration + 0.02);
    } catch {
      this.failed = true;
    }
  }
  sfx(sound: Sound) {
    if (!this.context || this.failed) return;
    const v = this.settings.sfx * 0.12;
    switch (sound) {
      case "jump":
        this.tone(220, 0.16, v, "square", 0, 660);
        break;
      case "attack":
        this.tone(220, 0.09, v, "sawtooth", 0, 60);
        break;
      case "dash":
        this.tone(620, 0.18, v, "triangle", 0, 100);
        break;
      case "hit":
        this.tone(140, 0.22, v, "sawtooth", 0, 40);
        break;
      case "enemy":
        this.tone(260, 0.12, v, "square", 0, 80);
        break;
      case "pickup":
        this.tone(880, 0.09, v, "sine");
        this.tone(1320, 0.12, v, "sine", 0.06);
        break;
      case "relic":
      case "checkpoint":
        [523, 659, 784, 1047].forEach((n, i) =>
          this.tone(n, 0.22, v, "triangle", i * 0.08),
        );
        break;
      case "boss":
        this.tone(65, 0.5, v * 1.6, "sawtooth", 0, 35);
        break;
      case "victory":
        [523, 659, 784, 1047, 784, 1047, 1318].forEach((n, i) =>
          this.tone(n, 0.38, v, "square", i * 0.14),
        );
        break;
      case "defeat":
        [330, 294, 247, 165].forEach((n, i) =>
          this.tone(n, 0.35, v, "triangle", i * 0.15),
        );
        break;
      case "step":
        this.tone(80, 0.035, v * 0.2, "triangle");
        break;
      case "land":
        this.tone(90, 0.07, v * 0.4, "triangle");
        break;
      default:
        this.tone(660, 0.06, v * 0.5, "sine");
    }
  }
  music(level: number, playing: boolean) {
    this.level = level;
    this.playing = playing;
    if (!this.timer)
      this.timer = setInterval(() => {
        if (!this.playing || !this.context || this.settings.muted) return;
        const melody = MELODIES[this.level % 4],
          note = melody[this.beat % melody.length],
          v = this.settings.music * 0.035;
        this.tone(440 * 2 ** ((note - 69) / 12), 0.28, v, "triangle");
        if (this.beat % 2 === 0)
          this.tone(440 * 2 ** ((note - 24 - 69) / 12), 0.4, v * 0.9, "sine");
        this.beat++;
      }, 260);
  }
  stop() {
    this.playing = false;
  }
  destroy() {
    if (this.timer) clearInterval(this.timer);
    this.context?.close().catch(() => {});
  }
}
