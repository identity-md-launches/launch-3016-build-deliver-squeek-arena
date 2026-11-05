import type { Action } from "./types";
const KEY: Record<string, Action> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "jump",
  KeyW: "jump",
  ArrowUp: "jump",
  KeyJ: "attack",
  KeyX: "attack",
  KeyK: "dash",
  ShiftLeft: "dash",
  ShiftRight: "dash",
  KeyZ: "dash",
};
export class Input {
  enabled = true;
  held = new Set<Action>();
  pressed = new Set<Action>();
  private keys = new Set<string>();
  private touches = new Map<number, Action>();
  constructor(
    private active: () => boolean,
    private pause: () => void,
  ) {
    window.addEventListener("keydown", this.down);
    window.addEventListener("keyup", this.up);
    window.addEventListener("blur", this.clear);
  }
  private sync() {
    const next = new Set<Action>(
      [...this.keys].map((k) => KEY[k]).filter(Boolean),
    );
    this.touches.forEach((a) => next.add(a));
    for (const a of next) if (!this.held.has(a)) this.pressed.add(a);
    this.held = next;
  }
  private down = (e: KeyboardEvent) => {
    if (!this.enabled || e.defaultPrevented) return;
    if (e.code === "Escape" && this.active()) {
      e.preventDefault();
      this.pause();
      return;
    }
    if (
      !this.active() ||
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement ||
      (e.target instanceof HTMLButtonElement && e.code === "Space") ||
      e.ctrlKey ||
      e.metaKey
    )
      return;
    if (KEY[e.code]) {
      e.preventDefault();
      this.keys.add(e.code);
      this.sync();
    }
  };
  private up = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    this.sync();
  };
  touch(id: number, a: Action, down: boolean) {
    if (down) this.touches.set(id, a);
    else this.touches.delete(id);
    this.sync();
  }
  consume(a: Action) {
    const p = this.pressed.has(a);
    this.pressed.delete(a);
    return p;
  }
  end() {
    this.pressed.clear();
  }
  clear = () => {
    this.keys.clear();
    this.touches.clear();
    this.held.clear();
    this.pressed.clear();
  };
  destroy() {
    window.removeEventListener("keydown", this.down);
    window.removeEventListener("keyup", this.up);
    window.removeEventListener("blur", this.clear);
  }
}
