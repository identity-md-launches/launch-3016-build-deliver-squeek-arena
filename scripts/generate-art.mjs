import { writeFile } from "node:fs/promises";
import { playwright, serve, chromiumOptions } from "./qa-utils.mjs";
const { chromium } = await playwright(),
  server = await serve();
let browser;
try {
  browser = await chromium.launch(chromiumOptions());
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(server.url);
  await page.locator(".game-canvas").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const png = await page.evaluate(() => {
    const out = document.createElement("canvas");
    out.width = 1200;
    out.height = 630;
    const c = out.getContext("2d");
    c.imageSmoothingEnabled = false;
    const scene = document.querySelector(".game-canvas");
    c.fillStyle = "#263b2c";
    c.fillRect(0, 0, 1200, 630);
    c.drawImage(scene, 0, 0, 1200, 600);
    c.fillStyle = "#eee5c8";
    c.font = '700 100px "Pixelify Sans"';
    c.fillText("Squeek Arena.", 70, 170);
    c.font = '500 28px "DM Sans"';
    c.fillText("Small paws. Big trouble.", 73, 225);
    c.font = '400 22px "DM Sans"';
    c.fillStyle = "#c8d0b5";
    c.fillText("Three worlds. One very big boss. No wallet needed.", 73, 274);
    c.fillStyle = "#e8ba72";
    c.fillRect(73, 322, 220, 62);
    c.fillStyle = "#282a20";
    c.font = '700 23px "DM Sans"';
    c.fillText("Start adventure", 96, 361);
    c.fillStyle = "#191d1b";
    c.fillRect(0, 570, 1200, 60);
    c.fillStyle = "#bdc8af";
    c.font = '400 20px "DM Sans"';
    c.fillText("An original hamster adventure on Squeekchain", 73, 609);
    return out.toDataURL("image/png").split(",")[1];
  });
  await writeFile("public/assets/share.png", Buffer.from(png, "base64"));
  console.log("Generated original 1200 × 630 share card.");
} finally {
  await browser?.close();
  await server.close();
}
