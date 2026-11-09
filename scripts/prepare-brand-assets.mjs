import { copyFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw new Error("Usage: node scripts/prepare-brand-assets.mjs <official-logo.png>");

const output = join(process.cwd(), "public", "brand");
await mkdir(output, { recursive: true });
await copyFile(source, join(output, "hirzexa-official.png"));

// Crop only the surrounding lavender canvas. The supplied mark remains unchanged.
const mark = sharp(source).extract({ left: 160, top: 160, width: 934, height: 934 });
await mark.clone().png().toFile(join(output, "hirzexa-mark.png"));
await mark.clone().resize(32, 32).png().toFile(join(output, "favicon-32.png"));
await mark.clone().resize(180, 180).png().toFile(join(output, "apple-touch-icon.png"));
await mark.clone().resize(192, 192).png().toFile(join(output, "icon-192.png"));
await mark.clone().resize(512, 512).png().toFile(join(output, "icon-512.png"));
