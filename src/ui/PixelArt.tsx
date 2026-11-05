import { useEffect, useRef } from "react";
import {
  drawHamster,
  drawCrystal,
  drawMushroom,
  drawGear,
  rect,
  poly,
  drawHeart,
  drawSeed,
} from "../game/art";
import type { Animation } from "../game/types";
export function HamsterPortrait({
  cosmetic = "adventurer",
  size = 96,
  animation = "idle",
  reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches,
}: {
  cosmetic?: string;
  size?: number;
  animation?: Animation;
  reducedMotion?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    let frame = 0;
    const start = performance.now();
    const animated =
      !reducedMotion && (animation === "victory" || animation === "defeat");
    const draw = (now: number) => {
      c.imageSmoothingEnabled = false;
      c.clearRect(0, 0, 96, 96);
      drawHamster(
        c,
        47,
        64,
        3,
        animation,
        animated ? (now - start) / 1000 : 0,
        1,
        cosmetic,
      );
      if (animated) frame = requestAnimationFrame(draw);
    };
    draw(start);
    return () => cancelAnimationFrame(frame);
  }, [cosmetic, animation, reducedMotion]);
  return (
    <canvas
      ref={ref}
      width={96}
      height={96}
      style={{ width: size, height: size }}
      className="pixel-art"
      role="img"
      aria-label="Golden hamster with a scarf and a wooden twig"
    />
  );
}
export function PixelItem({
  kind,
  size = 22,
  empty = false,
}: {
  kind: "heart" | "seed";
  size?: number;
  empty?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, 24, 24);
    if (kind === "heart") drawHeart(c, 2, 4, 1.2, empty);
    else drawSeed(c, 4, 4, 0, 1.2);
  }, [kind, empty]);
  return (
    <canvas
      ref={ref}
      width={24}
      height={24}
      style={{ width: size, height: size }}
      className="pixel-art"
      aria-hidden="true"
    />
  );
}
export function RegionArt({ index }: { index: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.imageSmoothingEnabled = false;
    const bg = ["#556d4a", "#455665", "#586357"][index];
    rect(c, 0, 0, 180, 86, bg);
    if (index === 0) {
      for (let i = 0; i < 4; i++) {
        const x = 15 + i * 50;
        rect(c, x, 5, 10, 80, "#354d35");
        poly(
          c,
          [
            [x - 19, 0],
            [x + 20, 0],
            [x + 31, 27],
            [x + 13, 34],
            [x - 23, 25],
          ],
          "#83925f",
        );
      }
      drawMushroom(c, 130, 74, 1.2);
      drawHamster(c, 74, 64, 1.6, "idle", 0, 1);
    } else if (index === 1) {
      drawCrystal(c, 45, 78, 0.9);
      drawCrystal(c, 128, 76, 0.6);
      rect(c, 72, 57, 50, 7, "#9daeb0");
      for (let i = 0; i < 4; i++) rect(c, 70 + i * 12, 8, 3, 3, "#b4c5c6");
    } else {
      rect(c, 20, 10, 10, 70, "#34493a");
      rect(c, 155, 0, 12, 86, "#34493a");
      drawGear(c, 81, 44, 28, 0, "#9aa487");
      rect(c, 100, 69, 40, 8, "#b2b79a");
    }
    rect(c, 0, 78, 180, 8, "#293c2d");
    rect(c, 0, 76, 180, 3, index === 1 ? "#9aabb1" : "#97a975");
  }, [index]);
  return (
    <canvas
      ref={ref}
      width={180}
      height={86}
      className="region-art"
      aria-hidden="true"
    />
  );
}
