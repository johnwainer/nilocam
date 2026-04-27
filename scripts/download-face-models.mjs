#!/usr/bin/env node
// Downloads face-api.js model weights into public/face-models/
// Run once: node scripts/download-face-models.mjs

import { createWriteStream, mkdirSync, existsSync } from "fs";
import { pipeline } from "stream/promises";
import path from "path";
import https from "https";

const BASE =
  "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";

const FILES = [
  "ssd_mobilenetv1_model-weights_manifest.json",
  "ssd_mobilenetv1_model-shard1",
  "ssd_mobilenetv1_model-shard2",
  "face_landmark_68_model-weights_manifest.json",
  "face_landmark_68_model-shard1",
  "face_recognition_model-weights_manifest.json",
  "face_recognition_model-shard1",
  "face_recognition_model-shard2",
];

const DEST = path.join(process.cwd(), "public", "face-models");
mkdirSync(DEST, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      pipeline(res, file).then(resolve).catch(reject);
    }).on("error", reject);
  });
}

let ok = 0;
for (const file of FILES) {
  const destPath = path.join(DEST, file);
  if (existsSync(destPath)) {
    console.log(`  skip  ${file}`);
    ok++;
    continue;
  }
  process.stdout.write(`  ↓     ${file} … `);
  try {
    await download(`${BASE}/${file}`, destPath);
    console.log("✓");
    ok++;
  } catch (err) {
    console.log(`✗  ${err.message}`);
  }
}

console.log(`\nDone: ${ok}/${FILES.length} model files in public/face-models/`);
