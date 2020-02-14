// @flow strict-local

import type {FilePath, InitialParcelOptions} from '@parcel/types';
import type {ParcelOptions} from './types';

import {getRootDir} from '@parcel/utils';
import loadDotEnv from './loadDotEnv';
import path from 'path';
import nullthrows from 'nullthrows';
import {resolveConfig} from '@parcel/utils';
import {NodeFS} from '@parcel/fs';
import Cache from '@parcel/cache';
import {NodePackageManager} from '@parcel/package-manager';

// Default cache directory name
const DEFAULT_CACHE_DIRNAME = '.parcel-cache';
const LOCK_FILE_NAMES = ['yarn.lock', 'package-lock.json', 'pnpm-lock.yaml'];

export default async function resolveOptions(
  initialOptions: InitialParcelOptions,
): Promise<ParcelOptions> {
  // $FlowFixMe
  let inputFS = process.browser
    ? nullthrows(initialOptions.inputFS)
    : initialOptions.inputFS || new NodeFS();
  let outputFS = initialOptions.outputFS || inputFS; // || new NodeFS();

  let inputCwd = inputFS.cwd();
  let outputCwd = outputFS.cwd();

  let entries: Array<FilePath>;
  if (initialOptions.entries == null || initialOptions.entries === '') {
    entries = [];
  } else if (Array.isArray(initialOptions.entries)) {
    entries = initialOptions.entries.map(entry =>
      path.resolve(inputCwd, entry),
    );
  } else {
    entries = [path.resolve(inputCwd, initialOptions.entries)];
  }

  let packageManager =
    initialOptions.packageManager || new NodePackageManager(inputFS);

  let rootDir =
    initialOptions.rootDir != null
      ? await inputFS.realpath(initialOptions.rootDir)
      : getRootDir(entries);

  let projectRootFile =
    (await resolveConfig(inputFS, path.join(rootDir, 'index'), [
      ...LOCK_FILE_NAMES,
      '.git',
      '.hg',
    ])) || path.join(inputCwd, 'index'); // ? Should this just be rootDir

  let lockFile = null;
  let rootFileName = path.basename(projectRootFile);
  if (LOCK_FILE_NAMES.includes(rootFileName)) {
    lockFile = projectRootFile;
  }
  let projectRoot = path.dirname(projectRootFile);

  let cacheDir =
    // If a cacheDir is provided, resolve it relative to cwd. Otherwise,
    // use a default directory resolved relative to the project root.
    initialOptions.cacheDir != null
      ? path.resolve(outputCwd, initialOptions.cacheDir)
      : path.resolve(projectRoot, DEFAULT_CACHE_DIRNAME);

  let cache = new Cache(outputFS, cacheDir);

  let mode = initialOptions.mode ?? 'development';
  let minify = initialOptions.minify ?? mode === 'production';

  return {
    config: initialOptions.config,
    defaultConfig: initialOptions.defaultConfig,
    patchConsole:
      initialOptions.patchConsole ?? process.env.NODE_ENV !== 'test',
    env: {
      ...initialOptions.env,
      ...(await loadDotEnv(
        initialOptions.env ?? {},
        inputFS,
        path.join(projectRoot, 'index'),
      )),
    },
    mode,
    minify,
    autoinstall: initialOptions.autoinstall ?? true,
    hot: initialOptions.hot ?? false,
    serve: initialOptions.serve ?? false,
    disableCache: initialOptions.disableCache ?? false,
    killWorkers: initialOptions.killWorkers ?? true,
    profile: initialOptions.profile ?? false,
    cacheDir,
    entries,
    rootDir,
    defaultEngines: initialOptions.defaultEngines,
    targets: initialOptions.targets,
    sourceMaps: initialOptions.sourceMaps ?? true,
    scopeHoist:
      initialOptions.scopeHoist ?? initialOptions.mode === 'production',
    publicUrl: initialOptions.publicUrl ?? '/',
    distDir:
      initialOptions.distDir != null
        ? await inputFS.realpath(initialOptions.distDir)
        : null,
    logLevel: initialOptions.logLevel ?? 'info',
    projectRoot,
    lockFile,
    inputFS,
    outputFS,
    cache,
    packageManager,
  };
}
