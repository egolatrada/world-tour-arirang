/**
 * Lee el JPEG oficial (formas rojas sobre negro) y genera PNG:
 * formas en blanco, fondo y huecos transparentes.
 */
const path = require("path");
const Jimp = require("jimp");

const imgDir = path.join(__dirname, "..", "docs", "img");
const srcJpg = path.join(imgDir, "arirang-album-logo.jpg");
const outPng = path.join(imgDir, "arirang-album-logo.png");

function processPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  // Negro de fondo y recortes internos
  if (max < 48) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  // Rojo del logo (incluye bordes algo rosados)
  const redShape =
    r > 88 &&
    r > g + 14 &&
    r > b + 10 &&
    max > 75;

  if (redShape) {
    return { r: 255, g: 255, b: 255, a: 255 };
  }

  // Transición borde rojo↔negro
  if (max < 95 && min < 55) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  if (max > 160 && r > g && r > b) {
    const t = Math.min(1, (max - 95) / 160);
    return { r: 255, g: 255, b: 255, a: Math.round(t * 255) };
  }

  return { r: 0, g: 0, b: 0, a: 0 };
}

async function main() {
  const img = await Jimp.read(srcJpg);
  img.scan(0, 0, img.bitmap.width, img.bitmap.height, (x, y, idx) => {
    const r = img.bitmap.data[idx];
    const g = img.bitmap.data[idx + 1];
    const b = img.bitmap.data[idx + 2];
    const out = processPixel(r, g, b);
    img.bitmap.data[idx] = out.r;
    img.bitmap.data[idx + 1] = out.g;
    img.bitmap.data[idx + 2] = out.b;
    img.bitmap.data[idx + 3] = out.a;
  });

  await img.writeAsync(outPng);
  console.log("OK:", outPng);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
