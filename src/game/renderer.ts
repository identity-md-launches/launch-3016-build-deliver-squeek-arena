import { Game } from "./engine";
import {
  rect,
  poly,
  pixelOval,
  drawHamster,
  drawSeed,
  drawHeart,
  drawEnemy,
  drawMushroom,
  drawCrystal,
  drawGear,
} from "./art";
import type { Platform } from "./types";
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private resizeObserver: ResizeObserver;
  private frame = 0;
  private last = 0;
  private presentationTime = 0;
  private accumulator = 0;
  private mounted = true;
  constructor(
    public canvas: HTMLCanvasElement,
    public game: Game,
  ) {
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Canvas is unavailable in this browser.");
    this.ctx = context;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.frame = requestAnimationFrame(this.tick);
  }
  private resize() {
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(
      260,
      Math.min(1800, Math.round((r.width / Math.max(1, r.height)) * 480)),
    );
    this.canvas.height = 480;
    this.game.viewWidth = this.canvas.width;
    this.ctx.imageSmoothingEnabled = false;
  }
  private tick = (now: number) => {
    if (!this.mounted) return;
    this.presentationTime = now / 1000;
    const elapsed = this.last ? Math.min((now - this.last) / 1000, 0.08) : 0;
    this.last = now;
    this.accumulator += elapsed;
    let count = 0;
    while (this.accumulator >= 1 / 120 && count++ < 10) {
      this.game.update(1 / 120);
      this.accumulator -= 1 / 120;
    }
    this.draw();
    this.frame = requestAnimationFrame(this.tick);
  };
  private tree(x: number, y: number, s: number, shade: number) {
    const c = this.ctx;
    c.save();
    c.translate(Math.round(x), Math.round(y));
    c.scale(s, s);
    const trunk = shade === 0 ? "#23392d" : shade === 1 ? "#354332" : "#4e5037",
      leaf = shade === 0 ? "#2c4937" : shade === 1 ? "#40583b" : "#596c43";
    poly(
      c,
      [
        [-16, 0],
        [-11, -142],
        [-28, -196],
        [-17, -205],
        [-4, -166],
        [0, -233],
        [14, -232],
        [11, -123],
        [22, 0],
      ],
      trunk,
    );
    rect(c, -5, -171, 4, 151, shade === 2 ? "#77704a" : trunk);
    poly(
      c,
      [
        [-8, 0],
        [-30, 9],
        [-36, 7],
        [-17, -9],
        [16, -7],
        [34, 6],
        [27, 11],
        [9, 2],
      ],
      trunk,
    );
    for (let j = 0; j < 9; j++) {
      const xx = Math.sin(j * 2.8) * 45,
        yy = -205 + Math.cos(j * 3) * 38;
      pixelOval(c, xx - 45, yy - 30, 90, 63, leaf, 6);
      if (shade === 2) rect(c, xx - 20, yy - 25, 26, 5, "#74824f");
    }
    c.restore();
  }
  background(
    theme: string,
    camera: number,
    time: number,
    w: number,
    h: number,
  ) {
    const c = this.ctx;
    const forest = theme === "forest",
      crystal = theme === "crystal";
    rect(c, 0, 0, w, h, forest ? "#8e9970" : crystal ? "#414e5b" : "#68716a");
    if (forest) {
      rect(c, 0, 0, w, 105, "#a4ac80");
      rect(c, 0, 105, w, 85, "#929e72");
      rect(c, 0, 190, w, 100, "#7d9066");
      pixelOval(
        c,
        w * 0.75 - ((camera * 0.03) % 100),
        35,
        100,
        100,
        "#d6cf9b",
        4,
      );
      for (let layer = 0; layer < 3; layer++) {
        const speed = 0.07 + layer * 0.12,
          spacing = layer === 0 ? 160 : 225,
          offset = camera * speed;
        for (
          let i = Math.floor(offset / spacing) - 1;
          i < (offset + w) / spacing + 2;
          i++
        ) {
          const x = i * spacing - offset + hash(i + layer * 8) * 70;
          this.tree(
            x,
            layer === 0 ? 390 : 420,
            layer === 0 ? 1.6 : layer === 1 ? 1.25 : 1.1,
            layer === 0 ? 0 : layer === 1 ? 1 : 2,
          );
        }
      }
      for (let i = 0; i < 10; i++) {
        const x = (i * 137 - camera * 0.3) % (w + 200);
        rect(c, x, 175 + hash(i) * 180, 3, 3, "#cbd09c");
      }
    } else if (crystal) {
      rect(c, 0, 0, w, 135, "#343f4e");
      poly(
        c,
        [
          [0, 120],
          [80, 148],
          [155, 80],
          [230, 150],
          [330, 94],
          [440, 155],
          [540, 95],
          [660, 180],
          [760, 120],
          [850, 170],
          [w, 110],
          [w, 480],
          [0, 480],
        ],
        "#465265",
      );
      for (
        let i = Math.floor((camera * 0.17) / 170) - 1;
        i < (camera * 0.17 + w) / 170 + 1;
        i++
      ) {
        const x = i * 170 - camera * 0.17;
        poly(
          c,
          [
            [x, 0],
            [x + 35, 0],
            [x + 48, 80 + hash(i) * 95],
            [x + 65, 110],
            [x + 85, 0],
            [x + 135, 0],
            [x + 100, 190],
            [x + 70, 223],
            [x + 20, 140],
          ],
          "#2d3c49",
        );
        drawCrystal(c, x + 70, 416, 1.2 + hash(i) * 1.5);
      }
      for (
        let i = Math.floor((camera * 0.4) / 240) - 1;
        i < (camera * 0.4 + w) / 240 + 1;
        i++
      ) {
        const x = i * 240 - camera * 0.4;
        drawCrystal(c, x, 418, 1.1);
        rect(c, x + 40, 70, 3, 6, "#9aabb7");
      }
      rect(c, 0, 420, w, 60, "#283a42");
      for (let i = 0; i < 35; i++)
        rect(
          c,
          i * 38 - ((camera * 0.3) % 38),
          447 + hash(i) * 30,
          20,
          2,
          "#49606a",
        );
    } else {
      rect(c, 0, 0, w, 116, "#555f5b");
      for (
        let i = Math.floor((camera * 0.15) / 180) - 1;
        i < (camera * 0.15 + w) / 180 + 1;
        i++
      ) {
        const x = i * 180 - camera * 0.15;
        rect(c, x, 58, 115, 330, "#424e49");
        rect(c, x + 8, 70, 99, 170, "#35453f");
        for (let row = 0; row < 3; row++)
          for (let col = 0; col < 3; col++)
            rect(
              c,
              x + 16 + col * 30,
              83 + row * 50,
              20,
              40,
              hash(i + col + row) > 0.5 ? "#87907a" : "#627365",
            );
        rect(c, x + 40, 5, 34, 54, "#45534b");
      }
      for (
        let i = Math.floor((camera * 0.3) / 300) - 1;
        i < (camera * 0.3 + w) / 300 + 1;
        i++
      ) {
        const x = i * 300 - camera * 0.3;
        rect(c, x + 20, 0, 18, 390, "#3d4940");
        rect(c, x + 25, 0, 4, 390, "#72816b");
        rect(c, x, 130, 75, 17, "#3d4940");
        drawGear(c, x + 110, 290, 60, time * 0.15, "#4e5c4d");
        rect(c, x + 75, 343, 78, 7, "#48584c");
      }
      if (theme === "boss") {
        rect(c, w * 0.5 - 120, 90, 240, 270, "#38493f");
        drawGear(c, w * 0.5, 240, 105, time * 0.1, "#566653");
        rect(c, w * 0.5 - 20, 190, 40, 100, "#879174");
        rect(c, w * 0.5 - 14, 200, 28, 80, "#b4ac7c");
      }
    }
    // A consistent dark horizon separates the collision layer from scenery.
    rect(
      c,
      0,
      408,
      w,
      72,
      forest ? "#303d2c" : crystal ? "#293a43" : "#384139",
    );
  }
  private terrain(p: Platform, theme: string) {
    const c = this.ctx,
      x = Math.round(p.x),
      y = p.y;
    const forest = theme === "forest",
      crystal = theme === "crystal";
    const outline = forest ? "#28372b" : crystal ? "#263442" : "#2a342f",
      top = forest ? "#9bad6b" : crystal ? "#a4b5ba" : "#a4a68b",
      edge = forest ? "#526444" : crystal ? "#5a7480" : "#626f5d",
      soil = forest ? "#605840" : crystal ? "#445363" : "#515b50";
    rect(c, x - 2, y, p.w + 4, p.h, outline);
    rect(c, x, y + 4, p.w, p.h - 4, soil);
    rect(c, x, y, p.w, 5, top);
    rect(c, x, y + 5, p.w, 8, edge);
    const thin = p.h < 30;
    for (let i = 0; i < p.w / 22; i++) {
      const xx = x + i * 22;
      if (forest) {
        rect(c, xx, y - 3 - (i % 3) * 2, 6, 5 + (i % 3) * 2, top);
        rect(c, xx + 9, y + 13, 3, 4, "#7d8054");
        if (!thin) rect(c, xx + 4, y + 30 + hash(xx) * 50, 7, 3, "#807150");
      } else if (crystal) {
        rect(c, xx + 4, y + 9, 12, 3, "#8299a1");
        if (!thin)
          poly(
            c,
            [
              [xx, y + 30],
              [xx + 16, y + 25],
              [xx + 21, y + 43],
              [xx + 7, y + 47],
            ],
            "#3d4b59",
          );
      } else {
        rect(c, xx + 7, y + 7, 3, 3, "#bfc0a1");
        if (thin) rect(c, xx + 2, y + 11, 13, 5, "#3a453e");
        else {
          rect(c, xx + 3, y + 28, 16, 5, "#485348");
          rect(c, xx + 4, y + 47, 3, 3, "#76806a");
        }
      }
    }
    if (p.conveyor) {
      for (let i = 0; i < p.w / 22; i++) {
        const off = (this.game.time * p.conveyor) % 22;
        poly(
          c,
          [
            [x + i * 22 + off, y + 2],
            [x + i * 22 + off + 7, y + 4],
            [x + i * 22 + off, y + 6],
          ],
          "#e2c381",
        );
      }
    }
  }
  private decor(theme: string, camera: number, w: number) {
    const c = this.ctx;
    for (
      let i = Math.floor(camera / 175) - 1;
      i < (camera + w) / 175 + 1;
      i++
    ) {
      const x = i * 175 + hash(i) * 65;
      if (theme === "forest") {
        if (i % 3 === 0) drawMushroom(c, x, 407, 0.8 + hash(i) * 0.9);
        else {
          for (let j = 0; j < 5; j++) {
            const xx = x + j * 7;
            poly(
              c,
              [
                [xx, 407],
                [xx - 4, 386 - hash(j + i) * 12],
                [xx + 3, 398],
                [xx + 6, 384],
                [xx + 8, 407],
              ],
              i % 2 === 0 ? "#687c49" : "#879562",
            );
          }
        }
        if (i % 4 === 0) {
          rect(c, x + 60, 376, 52, 30, "#303b2b");
          rect(c, x + 62, 378, 48, 25, "#7d714b");
          rect(c, x + 64, 381, 42, 4, "#9d8d60");
          rect(c, x + 66, 389, 38, 3, "#655e3d");
        }
      } else if (theme === "crystal") {
        if (i % 2 === 0) drawCrystal(c, x, 408, 0.5 + hash(i) * 0.4);
        else {
          rect(c, x, 390, 30, 18, "#364751");
          rect(c, x + 4, 390, 20, 4, "#687c87");
        }
      } else {
        if (i % 2 === 0) {
          rect(c, x, 365, 36, 43, "#2a352e");
          rect(c, x + 3, 368, 30, 37, "#65705a");
          rect(c, x + 6, 373, 24, 3, "#9ba486");
          poly(
            c,
            [
              [x + 5, 397],
              [x + 26, 373],
              [x + 30, 377],
              [x + 9, 401],
            ],
            "#839074",
          );
        } else {
          rect(c, x, 395, 47, 13, "#2b3930");
          rect(c, x + 3, 395, 40, 5, "#8b957b");
        }
      }
    }
  }
  private checkpoint(x: number, y: number, active: boolean) {
    const c = this.ctx;
    rect(c, x, y - 65, 4, 65, "#2b352a");
    rect(c, x + 4, y - 63, 31, 23, active ? "#edc47d" : "#899778");
    rect(c, x + 7, y - 60, 24, 3, active ? "#f7d99b" : "#a2ad8b");
    poly(
      c,
      [
        [x + 12, y - 49],
        [x + 18, y - 55],
        [x + 24, y - 49],
        [x + 18, y - 43],
      ],
      "#3d4b34",
    );
    rect(c, x - 6, y - 5, 17, 5, "#333e2d");
  }
  private boss() {
    const b = this.game.boss;
    if (!b) return;
    const c = this.ctx;
    c.save();
    c.translate(Math.round(b.x + b.w / 2), Math.round(b.y + b.h));
    if (b.hit > 0) c.globalAlpha = 0.55;
    const tell = b.state.startsWith("tell"),
      open = b.state === "exposed" || b.state === "defeated",
      bob = tell ? Math.round(Math.sin(this.game.time * 35) * 2) : 0;
    c.translate(0, bob);
    drawGear(c, -44, -12, 22, this.game.time * 1.5, "#a4a58b");
    drawGear(c, 44, -12, 22, -this.game.time * 1.5, "#a4a58b");
    rect(c, -56, -85, 112, 65, "#26362d");
    rect(c, -49, -89, 98, 62, "#7f8c72");
    rect(c, -44, -82, 88, 17, "#aab395");
    rect(c, -36, -106, 23, 23, "#2b3c30");
    rect(c, 16, -106, 23, 23, "#2b3c30");
    rect(c, -32, -102, 15, 16, "#6d7f66");
    rect(c, 20, -102, 15, 16, "#6d7f66");
    rect(c, -37, -65, 25, 13, tell ? "#e8ba72" : "#283d32");
    rect(c, 14, -65, 25, 13, tell ? "#e8ba72" : "#283d32");
    rect(c, -32, -63, 15, 4, "#d9d0a0");
    rect(c, 19, -63, 15, 4, "#d9d0a0");
    rect(c, -25, -47, 50, 31, "#344638");
    rect(c, -20, -44, 40, 24, open ? "#e7c47e" : "#8a9b7a");
    rect(c, -6, -42, 12, 20, open ? "#fff0ba" : "#b9c6a1");
    rect(c, -51, -31, 23, 15, "#697d64");
    rect(c, 31, -31, 23, 15, "#697d64");
    rect(c, -39, -11, 28, 10, "#42563e");
    rect(c, 15, -11, 28, 10, "#42563e");
    if (tell) {
      rect(c, -4, -138, 8, 17, "#f2d598");
      rect(c, -4, -116, 8, 5, "#f2d598");
    }
    c.restore();
  }
  private menu(w: number) {
    const c = this.ctx;
    const compact = w < 700;
    this.background("forest", 0, this.game.time, w, 480);
    this.terrain({ x: 0, y: 408, w, h: 120 }, "forest");
    this.decor("forest", 0, w);
    // A burrow doorway, hand-laid stone, and an adventurer at the edge of the clearing.
    const x = compact ? w * 0.75 : w * 0.74;
    this.tree(x + 55, 412, 1.4, 2);
    pixelOval(c, x - 12, 326, 78, 83, "#273c2b", 4);
    pixelOval(c, x - 4, 336, 61, 72, "#1d3025", 4);
    rect(c, x + 6, 344, 36, 64, "#3e4b2f");
    rect(c, x + 12, 350, 23, 58, "#b19b60");
    rect(c, x + 13, 352, 5, 56, "#d2b878");
    rect(c, x + 40, 365, 5, 5, "#e1c68d");
    drawMushroom(c, x - 30, 408, 1.2);
    drawMushroom(c, x + 88, 408, 0.8);
    drawHamster(
      c,
      x - 72,
      384,
      compact ? 3.1 : 3.7,
      "idle",
      this.game.time,
      -1,
      this.game.storage.profile.cosmetic,
    );
    const shade = c.createLinearGradient(0, 0, w, 0);
    shade.addColorStop(0, "rgba(22,33,25,.92)");
    shade.addColorStop(compact ? 0.65 : 0.42, "rgba(22,33,25,.78)");
    shade.addColorStop(1, "rgba(22,33,25,0)");
    c.fillStyle = shade;
    c.fillRect(0, 0, w, 480);
    // Foreground stems frame the adventure without obscuring its controls.
    for (const xx of [w - 40, w - 12]) {
      poly(
        c,
        [
          [xx, 480],
          [xx - 8, 430],
          [xx - 22, 420],
          [xx - 10, 447],
          [xx + 9, 428],
          [xx + 3, 480],
        ],
        "#354d33",
      );
    }
  }
  draw() {
    const g = this.game,
      c = this.ctx,
      w = this.canvas.width,
      h = 480;
    c.save();
    c.imageSmoothingEnabled = false;
    if (g.mode === "menu") {
      this.menu(w);
      c.restore();
      return;
    }
    this.background(g.level.theme, g.camera, g.time, w, h);
    if (g.shake > 0 && !g.storage.profile.settings.reducedMotion)
      c.translate(
        Math.sin(g.time * 100) * g.shake * 12,
        Math.cos(g.time * 110) * g.shake * 8,
      );
    c.translate(-Math.round(g.camera), 0);
    this.decor(g.level.theme, g.camera, w);
    for (const p of g.level.platforms)
      if (p.x + p.w > g.camera - 40 && p.x < g.camera + w + 40)
        this.terrain(p, g.level.theme);
    for (const h of g.level.hazards) {
      if (h.kind === "spikes") {
        for (let i = 0; i < h.w; i += 14) {
          poly(
            c,
            [
              [h.x + i, h.y + 14],
              [h.x + i + 7, h.y - 4],
              [h.x + i + 14, h.y + 14],
            ],
            "#26372c",
          );
          poly(
            c,
            [
              [h.x + i + 3, h.y + 12],
              [h.x + i + 7, h.y],
              [h.x + i + 11, h.y + 12],
            ],
            "#bec3aa",
          );
        }
      } else {
        rect(c, h.x, h.y + 18, h.w, 12, "#2e3d31");
        for (let i = 0; i < 4; i++)
          rect(c, h.x + 4 + i * 12, h.y + 19, 4, 8, "#a3ae8d");
        const phase = (g.time + (h.phase || 0)) % 3.8;
        if (phase > 2.1) {
          for (let i = 0; i < 7; i++) {
            const yy = h.y - ((g.time * 100 + i * 13) % 70);
            rect(c, h.x + hash(i) * 32, yy, 8 + hash(i) * 9, 12, "#c6c9af");
          }
        } else if (phase > 1.5) {
          rect(c, h.x + 5, h.y + 13, 6, 4, "#e5c486");
          rect(c, h.x + 33, h.y + 12, 5, 5, "#e5c486");
        }
      }
    }
    g.level.checkpoints.forEach((cp) =>
      this.checkpoint(cp.x, cp.y, cp.reached),
    );
    for (const i of g.level.items) {
      if (i.taken || i.x < g.camera - 30 || i.x > g.camera + w + 30) continue;
      if (i.kind === "seed") drawSeed(c, i.x, i.y, g.time);
      else if (i.kind === "heart")
        drawHeart(c, i.x, i.y + Math.sin(g.time * 3) * 2, 1.1);
      else {
        const y = i.y + Math.sin(g.time * 2) * 3;
        poly(
          c,
          [
            [i.x + 10, y - 4],
            [i.x + 23, y + 10],
            [i.x + 10, y + 28],
            [i.x - 3, y + 10],
          ],
          "#293c3d",
        );
        poly(
          c,
          [
            [i.x + 10, y],
            [i.x + 19, y + 10],
            [i.x + 10, y + 23],
            [i.x + 1, y + 10],
          ],
          "#b8b8d0",
        );
        rect(c, i.x + 7, y + 5, 3, 9, "#e5dfd7");
      }
    }
    if (g.levelIndex < 3) {
      const e = g.level.exit;
      rect(c, e.x - 5, e.y - 7, e.w + 10, e.h + 7, "#2a3b2e");
      rect(c, e.x, e.y, e.w, e.h, "#4f6242");
      rect(c, e.x + 9, e.y + 10, e.w - 18, e.h - 10, "#23392b");
      rect(
        c,
        e.x + 15,
        e.y + 17,
        e.w - 30,
        e.h - 17,
        g.levelSeeds >= g.level.required ? "#a4aa72" : "#5e7255",
      );
      poly(
        c,
        [
          [e.x + 25, e.y + 39],
          [e.x + 44, e.y + 39],
          [e.x + 44, e.y + 31],
          [e.x + 58, e.y + 47],
          [e.x + 44, e.y + 62],
          [e.x + 44, e.y + 54],
          [e.x + 25, e.y + 54],
        ],
        "#e7d7a0",
      );
    }
    for (const e of g.level.enemies)
      if (e.x > g.camera - 60 && e.x < g.camera + w + 60)
        drawEnemy(c, e, g.time);
    this.boss();
    for (const s of g.projectiles) {
      if (s.kind === "shock") {
        poly(
          c,
          [
            [s.x, s.y + s.h],
            [s.x + 4, s.y + 5],
            [s.x + 13, s.y],
            [s.x + 23, s.y + 7],
            [s.x + 30, s.y + s.h],
          ],
          "#c2cba0",
        );
        rect(c, s.x + 10, s.y + 8, 6, 12, "#f0d59e");
      } else {
        rect(c, s.x - 2, s.y - 2, s.w + 4, s.h + 4, "#2c4033");
        rect(c, s.x, s.y, s.w, s.h, s.kind === "spore" ? "#d5c9a0" : "#a8b09a");
      }
    }
    const p = g.player;
    if (p.invuln <= 0 || Math.floor(g.time * 14) % 2 === 0 || p.dash > 0) {
      if (p.dash > 0 && !g.storage.profile.settings.reducedMotion) {
        c.globalAlpha = 0.25;
        drawHamster(
          c,
          p.x + p.w / 2 - p.facing * 35,
          p.y + p.h - 12,
          2,
          "dodge",
          g.time,
          p.facing,
          g.storage.profile.cosmetic,
        );
        c.globalAlpha = 1;
      }
      drawHamster(
        c,
        p.x + p.w / 2,
        p.y + p.h - 12,
        2,
        g.mode === "victory" ? "victory" : p.anim,
        g.mode === "victory" && !g.storage.profile.settings.reducedMotion
          ? this.presentationTime
          : g.time,
        p.facing,
        g.storage.profile.cosmetic,
        p.hurt > 0,
      );
    }
    for (const f of g.particles) {
      c.globalAlpha = Math.max(0, f.life / f.max);
      rect(c, f.x, f.y, f.size, f.size, f.color);
    }
    c.globalAlpha = 1;
    // Signs are diegetic tutorials, not a separate instruction screen.
    if (g.levelIndex < 3)
      for (const s of g.level.signs) {
        if (Math.abs(p.x - s.x) < 210) {
          c.font = '16px "Pixelify Sans"';
          const tw = c.measureText(s.text).width;
          rect(c, s.x - tw / 2 - 8, s.y - 3, tw + 16, 25, "#26372b");
          c.fillStyle = "#f1e5c6";
          c.textAlign = "center";
          c.fillText(s.text, s.x, s.y + 15);
        }
      }
    c.restore();
  }
  destroy() {
    this.mounted = false;
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
  }
}
