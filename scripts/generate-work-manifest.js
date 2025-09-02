// Node script to generate WORK_DISPLAY/manifest.json by scanning WORK_DISPLAY folders.
// Usage: node scripts/generate-work-manifest.js
// This script finds the first image or 3D model file under each top-level WORK_DISPLAY subfolder
// (prefers DISPLAY_IMAGE, then RENDER_IMAGES, then CAD_MODEL with .gltf/.glb/.fbx) and writes a manifest
// of the form:
// {
//   "items": [
//     { "name": "Table_Temporary", "model": "WORK_DISPLAY/Table_Temporary/DISPLAY_IMAGE/image.jpg" },
//     ...
//   ]
// }
//
// Notes:
// - Output paths use forward slashes so they are web-friendly.
// - Run this whenever you add/remove folders under WORK_DISPLAY.
// - No external deps required.

const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const workDisplayDir = path.join(projectRoot, 'WORK_DISPLAY');
const manifestPath = path.join(workDisplayDir, 'manifest.json');

function toWebPath(p) {
  return p.split(path.sep).join('/');
}

function isModelFile(name) {
  return /\.(gltf|glb|fbx)$/i.test(name);
}

// Recursively search for first model file (.gltf/.glb/.fbx) within `dir`.
// Returns absolute path to file or null.
function findFirstModel(dir, depth = 0, maxDepth = 6) {
  if (depth > maxDepth) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return null;
  }

  // Prefer files directly in this folder first
  for (const e of entries) {
    if (e.isFile() && isModelFile(e.name)) {
      return path.join(dir, e.name);
    }
  }

  // Then search subdirectories (depth-first)
  for (const e of entries) {
    if (e.isDirectory()) {
      const found = findFirstModel(path.join(dir, e.name), depth + 1, maxDepth);
      if (found) return found;
    }
  }

  return null;
}

function findDisplayImage(folderPath) {
  const displayImagePath = path.join(folderPath, 'DISPLAY_IMAGE');
  if (!fs.existsSync(displayImagePath) || !fs.statSync(displayImagePath).isDirectory()) {
    return null;
  }

  const files = fs.readdirSync(displayImagePath);
  const imageFile = files.find(f => /\.(jpe?g|png|gif|webp)$/i.test(f));
  if (!imageFile) return null;

  return path.join(displayImagePath, imageFile);
}

function findRenderImage(folderPath) {
  const renderImagePath = path.join(folderPath, 'RENDER_IMAGES');
  if (!fs.existsSync(renderImagePath) || !fs.statSync(renderImagePath).isDirectory()) {
    return null;
  }

  const files = fs.readdirSync(renderImagePath);
  const imageFile = files.find(f => /\.(jpe?g|png|gif|webp)$/i.test(f));
  if (!imageFile) return null;

  return path.join(renderImagePath, imageFile);
}

function generateManifest() {
  if (!fs.existsSync(workDisplayDir) || !fs.statSync(workDisplayDir).isDirectory()) {
    console.error('WORK_DISPLAY directory not found at:', workDisplayDir);
    process.exitCode = 2;
    return;
  }

  const topLevel = fs.readdirSync(workDisplayDir, { withFileTypes: true });
  const items = [];

  for (const entry of topLevel) {
    if (!entry.isDirectory()) continue;
    const folderName = entry.name;
    const folderPath = path.join(workDisplayDir, folderName);

    // Prefer DISPLAY_IMAGE first
    let modelPath = findDisplayImage(folderPath);
    if (modelPath) {
      const relative = path.relative(projectRoot, modelPath);
      items.push({
        name: folderName,
        model: toWebPath(relative)
      });
      console.log('Found display image for', folderName, '->', toWebPath(relative));
      continue;
    }

    // Fallback to RENDER_IMAGES
    modelPath = findRenderImage(folderPath);
    if (modelPath) {
      const relative = path.relative(projectRoot, modelPath);
      items.push({
        name: folderName,
        model: toWebPath(relative)
      });
      console.log('Found render image for', folderName, '->', toWebPath(relative));
      continue;
    }

    // Fallback to CAD_MODEL model files (.gltf/.glb/.fbx)
    const preferredPaths = [
      path.join(folderPath, 'CAD_MODEL'),
      folderPath
    ];

    for (const p of preferredPaths) {
      modelPath = findFirstModel(p);
      if (modelPath) break;
    }

    if (!modelPath) {
      // As a last resort, scan the whole folder
      modelPath = findFirstModel(folderPath);
    }

    if (modelPath) {
      const relative = path.relative(projectRoot, modelPath);
      items.push({
        name: folderName,
        model: toWebPath(relative)
      });
      console.log('Found model for', folderName, '->', toWebPath(relative));
    } else {
      console.warn('No image or model file found under', folderName, '- skipping');
    }
  }

  const manifest = { items };

  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    console.log('Wrote manifest to', manifestPath);
    console.log('Items:', items.length);
    if (items.length === 0) {
      console.warn('Generated manifest has no items. Check WORK_DISPLAY folder structure.');
    }
  } catch (err) {
    console.error('Failed to write manifest:', err);
    process.exitCode = 3;
  }
}

generateManifest();
