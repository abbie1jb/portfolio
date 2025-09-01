// Node script to generate WORK_DISPLAY/manifest.json by scanning WORK_DISPLAY folders.
// Usage: node scripts/generate-work-manifest.js
// This script finds the first .gltf/.glb under each top-level WORK_DISPLAY subfolder
// (prefers CAD_MODEL locations implicitly because they are deeper) and writes a manifest
// of the form:
// {
//   "items": [
//     { "name": "Table_Temporary", "model": "WORK_DISPLAY/Table_Temporary/CAD_MODEL/.../scene.gltf" },
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

function isGltfFile(name) {
  return /\.(gltf|glb)$/i.test(name);
}

// Recursively search for first gltf/glb file within `dir`.
// Returns absolute path to file or null.
function findFirstGltf(dir, depth = 0, maxDepth = 6) {
  if (depth > maxDepth) return null;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return null;
  }

  // Prefer files directly in this folder first
  for (const e of entries) {
    if (e.isFile() && isGltfFile(e.name)) {
      return path.join(dir, e.name);
    }
  }

  // Then search subdirectories (depth-first)
  for (const e of entries) {
    if (e.isDirectory()) {
      const found = findFirstGltf(path.join(dir, e.name), depth + 1, maxDepth);
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
      console.log('Found image for', folderName, '->', toWebPath(relative));
      continue;
    }

    // Fallback to CAD_MODEL/.gltf search
    const preferredPaths = [
      path.join(folderPath, 'CAD_MODEL'),
      folderPath
    ];

    for (const p of preferredPaths) {
      modelPath = findFirstGltf(p);
      if (modelPath) break;
    }

    if (!modelPath) {
      // As a last resort, scan the whole folder
      modelPath = findFirstGltf(folderPath);
    }

    if (modelPath) {
      const relative = path.relative(projectRoot, modelPath);
      items.push({
        name: folderName,
        model: toWebPath(relative)
      });
      console.log('Found model for', folderName, '->', toWebPath(relative));
    } else {
      console.warn('No image or .gltf/.glb found under', folderName, '- skipping');
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
