import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Keep the worker's relative shared-module import intact across bundlers. */
export function prepareMapWorker(
  packageRoot = fileURLToPath(new URL('../node_modules/maplibre-gl/', import.meta.url)),
  outputRoot = fileURLToPath(new URL('../public/generated/maplibre/', import.meta.url)),
) {
  const { version } = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)) {
    throw new Error('MapLibre package version must be a safe versioned asset path');
  }
  const destination = join(outputRoot, version);
  mkdirSync(destination, { recursive: true });
  for (const filename of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
    copyFileSync(join(packageRoot, 'dist', filename), join(destination, filename));
  }
  copyFileSync(join(packageRoot, 'LICENSE.txt'), join(destination, 'LICENSE.txt'));
  return { version, destination };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { version } = prepareMapWorker();
  console.log(`Prepared MapLibre ${version} worker, shared module and license.`);
}
