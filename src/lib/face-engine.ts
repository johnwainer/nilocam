// Client-side only — do NOT import from server code.
// Wraps face-api.js: model loading, descriptor extraction, and matching.

import type * as FaceApiNS from "face-api.js";

let faceapi: typeof FaceApiNS | null = null;
let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

const MODEL_URL = "/face-models";
const MATCH_THRESHOLD = 0.5; // euclidean distance — lower = stricter

async function load(): Promise<void> {
  if (modelsLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Dynamic import keeps face-api.js out of the server bundle
    faceapi = await import("face-api.js");
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();
  return loadPromise;
}

export async function ensureModels(): Promise<typeof FaceApiNS> {
  await load();
  return faceapi!;
}

export type DetectedFace = {
  descriptor: number[];
  bbox: { x: number; y: number; width: number; height: number };
};

/** Detect all faces in an HTMLImageElement or HTMLCanvasElement and return descriptors. */
export async function detectFaces(
  source: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<DetectedFace[]> {
  const api = await ensureModels();
  const detections = await api
    .detectAllFaces(source, new api.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections.map((d) => ({
    descriptor: Array.from(d.descriptor),
    bbox: {
      x: d.detection.box.x,
      y: d.detection.box.y,
      width: d.detection.box.width,
      height: d.detection.box.height,
    },
  }));
}

/** Detect a single (best) face from a selfie image for search. Returns null if no face found. */
export async function detectSingleFace(
  source: HTMLImageElement | HTMLCanvasElement
): Promise<number[] | null> {
  const api = await ensureModels();
  const detection = await api
    .detectSingleFace(source, new api.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!detection) return null;
  return Array.from(detection.descriptor);
}

/** Euclidean distance between two 128-dim descriptors. */
export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/** Returns true if two descriptors belong to the same person. */
export function isSamePerson(a: number[], b: number[]): boolean {
  return euclideanDistance(a, b) < MATCH_THRESHOLD;
}

/** Find the closest person_id from a list of labelled descriptors. */
export function findBestMatch(
  query: number[],
  labelled: { personId: string; descriptor: number[] }[]
): { personId: string; distance: number } | null {
  let best: { personId: string; distance: number } | null = null;
  for (const entry of labelled) {
    const d = euclideanDistance(query, entry.descriptor);
    if (d < MATCH_THRESHOLD && (!best || d < best.distance)) {
      best = { personId: entry.personId, distance: d };
    }
  }
  return best;
}

/** Load a URL into an HTMLImageElement (resolves when fully loaded). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
