import type { Animation, Enemy } from "./types";
export const PALETTE = {
  ink: "#202921",
  fur: "#ce9760",
  furLight: "#e8bc80",
  cream: "#f3ddb0",
  nose: "#c37d76",
  scarf: "#e9b764",
  leaf: "#687e4b",
  moss: "#8b9d63",
};
export function rect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
) {
  c.fillStyle = color;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
export function poly(
  c: CanvasRenderingContext2D,
  points: number[][],
  color: string,
) {
  c.fillStyle = color;
  c.beginPath();
  points.forEach(([x, y], i) =>
    i
      ? c.lineTo(Math.round(x), Math.round(y))
      : c.moveTo(Math.round(x), Math.round(y)),
  );
  c.closePath();
  c.fill();
}
export function pixelOval(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  step = 3,
) {
  for (let dy = 0; dy < h; dy += step) {
    const yy = (dy + step / 2 - h / 2) / (h / 2),
      span = (Math.sqrt(Math.max(0, 1 - yy * yy)) * w) / 2;
    rect(c, x + w / 2 - span, y + dy, span * 2, step, color);
  }
}
export function drawHamster(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 2,
  animation: Animation = "idle",
  time = 0,
  facing = 1,
  cosmetic = "adventurer",
  hurt = false,
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(scale * facing, scale);
  let bob =
    animation === "run"
      ? Math.round(Math.sin(time * 18) * 1.2)
      : animation === "idle"
        ? Math.floor(Math.sin(time * 2.6) * 0.5)
        : 0;
  if (animation === "victory") bob = -Math.abs(Math.sin(time * 5)) * 3;
  if (animation === "defeat") {
    c.rotate(-facing * (0.9 + Math.sin(time * 5) * 0.08));
    c.translate(-6, 4);
  }
  if (animation === "dodge") {
    c.rotate(time * 25 * facing);
    c.scale(1.1, 0.85);
  }
  c.translate(0, bob);
  const ink = hurt ? "#f3e2bd" : PALETTE.ink,
    fur = hurt ? "#f8e9c7" : PALETTE.fur,
    light = hurt ? "#fff1d5" : PALETTE.furLight,
    cream = PALETTE.cream;
  // Stepped, outlined silhouette. All coordinates use the same original pixel grid.
  rect(c, -9, -17, 5, 7, ink);
  rect(c, 3, -18, 6, 7, ink);
  rect(c, -8, -16, 3, 5, light);
  rect(c, 4, -17, 4, 5, light);
  rect(c, -7, -15, 2, 3, PALETTE.nose);
  rect(c, 5, -16, 2, 3, PALETTE.nose);
  rect(c, -8, -13, 16, 2, ink);
  rect(c, -11, -10, 21, 13, ink);
  rect(c, -9, -12, 18, 16, ink);
  rect(c, -7, 3, 14, 3, ink);
  rect(c, 9, -6, 3, 7, ink);
  rect(c, -8, -11, 16, 14, fur);
  rect(c, -10, -8, 19, 9, fur);
  rect(c, -7, -12, 13, 4, light);
  rect(c, -8, -8, 16, 7, light);
  rect(c, 8, -5, 3, 5, light);
  rect(c, -4, -2, 11, 6, cream);
  rect(c, -6, -1, 14, 3, cream);
  rect(c, 2, -8, 2, 3, ink);
  rect(c, 2, -8, 1, 1, "#fff5d8");
  rect(c, 8, -5, 3, 2, PALETTE.nose);
  rect(c, 7, -2, 3, 1, ink);
  rect(c, 7, -1, 1, 2, cream);
  rect(c, -7, -5, 4, 3, "#dda076");
  rect(c, 3, -3, 3, 2, "#dda076");
  rect(c, -10, -2, 2, 4, fur);
  const scarf =
    cosmetic === "moss"
      ? "#91a879"
      : cosmetic === "starlight"
        ? "#b9b7d5"
        : PALETTE.scarf;
  rect(c, -9, 0, 10, 2, ink);
  rect(c, -8, 0, 9, 2, scarf);
  rect(c, -10, 1, 3, 5, ink);
  rect(c, -10, 1, 2, 4, scarf);
  const stride = animation === "run" ? Math.round(Math.sin(time * 18) * 3) : 0;
  const jumping = animation === "jump",
    falling = animation === "fall";
  const leftFoot = jumping ? 2 : falling ? 6 : 4;
  const rightFoot = jumping ? 3 : falling ? 6 : 4;
  rect(c, -7 + stride, leftFoot, 6, 3, ink);
  rect(c, 3 - stride, rightFoot, 6, 3, ink);
  rect(c, -6 + stride, leftFoot, 4, 2, light);
  rect(c, 4 - stride, rightFoot, 4, 2, light);
  const armY = jumping ? -4 : falling ? -7 : 0;
  rect(c, 6, armY, 3, 3, ink);
  rect(c, 7, armY, 2, 2, light);
  if (falling) {
    rect(c, -13, -5, 4, 3, ink);
    rect(c, -12, -5, 3, 2, light);
  }
  if (animation === "attack") {
    c.save();
    c.translate(9, 0);
    c.rotate(-1.7 + ((time * 10) % 1) * 2.7);
    rect(c, 0, -2, 16, 4, ink);
    rect(c, 1, -1, 16, 2, "#ae8256");
    rect(c, 14, -5, 3, 5, "#ae8256");
    rect(c, 16, -7, 4, 3, "#c6d392");
    c.restore();
    poly(
      c,
      [
        [14, -16],
        [22, -12],
        [27, -3],
        [23, 7],
        [26, -1],
        [21, -9],
      ],
      "#f4dda1",
    );
  } else if (animation !== "dodge") {
    rect(c, 8, 1, 12, 3, ink);
    rect(c, 9, 1, 12, 2, "#b69364");
    rect(c, 17, -2, 3, 4, "#b69364");
    rect(c, 18, -4, 4, 3, "#9bad70");
  }
  if (animation === "victory") {
    rect(c, 6, -9, 4, 3, light);
    rect(c, 8, -12, 3, 4, light);
  }
  if (cosmetic === "champion") {
    rect(c, -6, -20, 13, 5, ink);
    rect(c, -5, -20, 3, 4, "#e2b75e");
    rect(c, 0, -22, 3, 6, "#f4ce77");
    rect(c, 4, -20, 2, 4, "#e2b75e");
  }
  c.restore();
}
export function drawSeed(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  time = 0,
  scale = 1,
) {
  c.save();
  c.translate(
    Math.round(x + 8),
    Math.round(y + 8 + Math.sin(time * 3 + x) * 2),
  );
  c.scale(scale, scale);
  poly(
    c,
    [
      [0, -8],
      [5, -4],
      [6, 2],
      [2, 8],
      [-3, 7],
      [-6, 2],
      [-5, -4],
    ],
    "#34352a",
  );
  poly(
    c,
    [
      [0, -6],
      [3, -3],
      [4, 2],
      [1, 6],
      [-2, 5],
      [-4, 1],
      [-3, -3],
    ],
    "#d9ae63",
  );
  rect(c, -1, -4, 2, 7, "#f1d798");
  c.restore();
}
export function drawHeart(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  empty = false,
) {
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  poly(
    c,
    [
      [1, 2],
      [4, 0],
      [7, 0],
      [9, 2],
      [11, 0],
      [14, 0],
      [17, 3],
      [17, 7],
      [9, 15],
      [1, 7],
    ],
    "#252d27",
  );
  if (!empty) {
    poly(
      c,
      [
        [3, 3],
        [5, 2],
        [7, 2],
        [9, 5],
        [12, 2],
        [14, 2],
        [15, 4],
        [15, 7],
        [9, 12],
        [3, 7],
      ],
      "#d99c85",
    );
    rect(c, 4, 3, 3, 2, "#f0c1a0");
  } else {
    rect(c, 3, 4, 12, 4, "#4d554a");
  }
  c.restore();
}
export function drawEnemy(c: CanvasRenderingContext2D, e: Enemy, time: number) {
  if (e.dead) return;
  const x = Math.round(e.x + e.w / 2),
    y = Math.round(e.y + e.h);
  c.save();
  c.translate(x, y);
  if (e.hit > 0) c.globalAlpha = 0.5 + Math.sin(time * 80) * 0.4;
  if (e.kind === "beetle") {
    const s = Math.round(Math.sin(e.time * 15) * 2);
    for (const side of [-1, 1]) {
      rect(c, side * 9 - 2, -8, 5, 8, "#25302b");
      rect(c, side * 12 - 2, -4 + s, 5, 3, "#a49a77");
    }
    pixelOval(c, -17, -29, 34, 26, "#24302a", 3);
    pixelOval(c, -14, -27, 28, 21, "#7d8c68", 3);
    pixelOval(c, -10, -26, 22, 14, "#a0a67a", 3);
    rect(c, -1, -26, 2, 20, "#566744");
    rect(c, -11, -14, 23, 11, "#354c3a");
    rect(c, -10, -15, 7, 5, "#e5d3a1");
    rect(c, 5, -15, 6, 5, "#e5d3a1");
    rect(c, -8, -14, 2, 3, "#202a25");
    rect(c, 7, -14, 2, 3, "#202a25");
    rect(c, -9, -32, 2, 6, "#25302b");
    rect(c, 8, -32, 2, 6, "#25302b");
  } else if (e.kind === "moth") {
    const f = Math.round(Math.sin(time * 19) * 8);
    poly(
      c,
      [
        [-3, -17],
        [-24, -29 - f],
        [-27, -18],
        [-18, -4],
        [-3, -8],
      ],
      "#292d3b",
    );
    poly(
      c,
      [
        [3, -17],
        [24, -29 - f],
        [27, -18],
        [18, -4],
        [3, -8],
      ],
      "#292d3b",
    );
    poly(
      c,
      [
        [-4, -17],
        [-23, -26 - f],
        [-22, -17],
        [-14, -8],
        [-4, -10],
      ],
      "#a49ab0",
    );
    poly(
      c,
      [
        [4, -17],
        [23, -26 - f],
        [22, -17],
        [14, -8],
        [4, -10],
      ],
      "#a49ab0",
    );
    rect(c, -4, -23, 8, 22, "#514a68");
    rect(c, -3, -22, 6, 6, "#d0c4bb");
    rect(c, -2, -21, 1, 2, "#202725");
    rect(c, 2, -21, 1, 2, "#202725");
  } else {
    rect(c, -17, -7, 34, 7, "#242c2b");
    rect(c, -13, -28, 26, 23, "#242c2b");
    rect(c, -11, -26, 22, 19, "#8e8f80");
    rect(c, -9, -25, 18, 8, "#b6b29a");
    rect(c, -6, -20, 12, 8, "#3d4c47");
    rect(c, -3, -18, 6, 4, e.state === "tell" ? "#ebc77e" : "#a7b59b");
    rect(c, -16, -13, 7, 5, "#626e63");
    rect(c, 10, -13, 7, 5, "#626e63");
    rect(c, -9, -5, 5, 5, "#646f60");
    rect(c, 5, -5, 5, 5, "#646f60");
  }
  if (e.state === "tell") {
    rect(c, -3, -49, 6, 11, "#f2d69a");
    rect(c, -3, -35, 6, 4, "#f2d69a");
  }
  if (e.hp < e.maxHp) {
    rect(c, -18, -57, 36, 4, "#28312b");
    rect(c, -17, -56, 34 * (e.hp / e.maxHp), 2, "#e8bf7e");
  }
  c.restore();
}
export function drawMushroom(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  size = 1,
  color = "#ba8061",
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(size, size);
  rect(c, -2, -13, 5, 13, "#b1ac85");
  rect(c, -1, -12, 2, 12, "#d1c4a0");
  poly(
    c,
    [
      [-12, -13],
      [-12, -18],
      [-7, -23],
      [5, -23],
      [12, -17],
      [12, -12],
    ],
    "#29352b",
  );
  poly(
    c,
    [
      [-10, -15],
      [-9, -18],
      [-5, -21],
      [4, -21],
      [10, -17],
      [10, -14],
    ],
    color,
  );
  rect(c, -6, -19, 3, 2, "#e8ce9d");
  rect(c, 4, -17, 3, 2, "#e8ce9d");
  c.restore();
}
export function drawCrystal(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.scale(s, s);
  poly(
    c,
    [
      [-14, 0],
      [-21, -25],
      [-14, -40],
      [-5, -23],
      [-1, -64],
      [10, -74],
      [22, -48],
      [15, -14],
      [27, -29],
      [31, -13],
      [23, 0],
    ],
    "#29343d",
  );
  poly(
    c,
    [
      [-12, -2],
      [-18, -25],
      [-13, -35],
      [-6, -22],
      [0, -60],
      [10, -68],
      [18, -46],
      [11, -14],
      [25, -24],
      [27, -12],
      [21, -2],
    ],
    "#7c8c99",
  );
  poly(
    c,
    [
      [1, -58],
      [10, -67],
      [8, -9],
      [-4, -4],
    ],
    "#b6c1ca",
  );
  poly(
    c,
    [
      [10, -66],
      [17, -46],
      [10, -13],
      [8, -9],
    ],
    "#8999ad",
  );
  rect(c, 4, -52, 3, 20, "#d8d8cb");
  c.restore();
}
export function drawGear(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  time: number,
  color = "#5b6255",
) {
  c.save();
  c.translate(Math.round(x), Math.round(y));
  c.rotate(time);
  for (let i = 0; i < 10; i++) {
    c.save();
    c.rotate((i * Math.PI) / 5);
    rect(c, -r * 0.18, -r, r * 0.36, r * 0.3, color);
    c.restore();
  }
  pixelOval(c, -r * 0.8, -r * 0.8, r * 1.6, r * 1.6, color, 4);
  pixelOval(c, -r * 0.43, -r * 0.43, r * 0.86, r * 0.86, "#252f2d", 3);
  rect(c, -5, -5, 10, 10, color);
  c.restore();
}
