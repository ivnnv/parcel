// @flow
import type {Diagnostic} from '@parcel/diagnostic';
import type {Assets, CodeMirrorDiagnostic, REPLOptions} from '../utils';

import {expose} from 'comlink';
import Parcel from '@parcel/core';
// import SimplePackageInstaller from './SimplePackageInstaller';
// import {NodePackageManager} from '@parcel/package-manager';
// import {prettifyTime} from '@parcel/utils';
import fs from '../../fs.js';
import workerFarm from '../../workerFarm.js';
import {generatePackageJson, nthIndex} from '../utils/';
import defaultConfig from '@parcel/config-repl';

export type BundleOutput =
  | {|
      type: 'success',
      bundles: Array<{|
        name: string,
        content: string,
        size: number,
        time: number,
      |}>,
      buildTime: number,
      graphs: ?Array<{|name: string, content: string|}>,
    |}
  | {|
      type: 'failure',
      error?: Error,
      diagnostics: Map<string, Array<CodeMirrorDiagnostic>>,
    |};

expose({
  bundle,
  ready: new Promise(res => workerFarm.once('ready', () => res())),
});

const PathUtils = {
  APP_DIR: '/app',
  DIST_DIR: '/app/dist',
  CACHE_DIR: '/.parcel-cache/',
  APP_REGEX: /^\/app\//,
  addAppDir(v) {
    return `${PathUtils.APP_DIR}/${v}`;
  },
  removeAppDir(v) {
    return v.replace(PathUtils.APP_REGEX, '');
  },
};

function convertDiagnostics(diagnostics: Array<Diagnostic>) {
  let parsedDiagnostics = new Map<string, Array<CodeMirrorDiagnostic>>();
  for (let diagnostic of diagnostics) {
    if (diagnostic.filePath)
      diagnostic.filePath = PathUtils.removeAppDir(diagnostic.filePath);

    let {filePath, codeFrame, origin} = diagnostic;
    if (filePath && codeFrame) {
      let list = parsedDiagnostics.get(filePath);
      if (!list) {
        list = [];
        parsedDiagnostics.set(filePath, list);
      }

      let {start, end} = codeFrame.codeHighlights[0];

      let from = nthIndex(codeFrame.code, '\n', start.line - 1) + start.column;
      let to = nthIndex(codeFrame.code, '\n', end.line - 1) + end.column;

      list.push({
        from,
        to,
        severity: 'error',
        source: origin || 'info',
        message: codeFrame.codeHighlights[0].message || diagnostic.message,
      });
    }
  }
  return parsedDiagnostics;
}

async function bundle(
  assets: Assets,
  options: REPLOptions,
): Promise<BundleOutput> {
  let graphs = options.showGraphs ? [] : null;
  // $FlowFixMe
  globalThis.PARCEL_DUMP_GRAPHVIZ =
    graphs && ((name, content) => graphs.push({name, content}));

  const resultFromReporter = new Promise(res => {
    globalThis.PARCEL_JSON_LOGGER_STDOUT = d => {
      switch (d.type) {
        // case 'buildStart':
        //   console.log('📦 Started');
        //   break;
        // case 'buildProgress': {
        //   let phase = d.phase.charAt(0).toUpperCase() + d.phase.slice(1);
        //   let filePath = d.filePath || d.bundleFilePath;
        //   console.log(`🕓 ${phase} ${filePath ? filePath : ''}`);
        //   break;
        // }
        case 'buildSuccess':
          // console.log(`✅ Succeded in ${/* prettifyTime */ d.buildTime}`);
          // console.group('Output');
          // for (let {filePath} of d.bundles) {
          //   console.log(
          //     '%c%s:\n%c%s',
          //     'font-weight: bold',
          //     filePath,
          //     'font-family: monospace',
          //     await memFS.readFile(filePath, 'utf8'),
          //   );
          // }
          // console.groupEnd();
          res({success: d});
          break;
        case 'buildFailure': {
          // console.log(`❗️`, d);
          res({failure: d.message});
          break;
        }
      }
    };
    globalThis.PARCEL_JSON_LOGGER_STDERR = globalThis.PARCEL_JSON_LOGGER_STDOUT;
  });

  // $FlowFixMe
  globalThis.fs = fs;

  // TODO only create new instance if options/entries changed
  let entries = assets
    .filter(v => v.isEntry)
    .map(v => PathUtils.addAppDir(v.name));
  const b = new Parcel({
    entries,
    disableCache: true,
    cacheDir: PathUtils.CACHE_DIR,
    distDir: PathUtils.DIST_DIR,
    mode: 'production',
    hot: false,
    logLevel: 'verbose',
    patchConsole: false,
    workerFarm,
    defaultConfig: {
      ...defaultConfig,
      filePath: '<noop>',
    },
    inputFS: fs,
    outputFS: fs,
    minify: options.minify,
    publicUrl: options.publicUrl || undefined,
    scopeHoist: options.scopeHoist,
    // packageManager: new NodePackageManager(
    //   memFS,
    //   new SimplePackageInstaller(memFS),
    // ),
  });

  await fs.rimraf(PathUtils.APP_DIR);
  await fs.mkdirp(PathUtils.APP_DIR);
  await fs.writeFile(
    PathUtils.addAppDir('package.json'),
    generatePackageJson(options),
  );
  await fs.writeFile(PathUtils.addAppDir('yarn.lock'), '');

  await fs.mkdirp(PathUtils.addAppDir('src'));
  for (let {name, content} of assets) {
    await fs.writeFile(PathUtils.addAppDir(name), content);
  }

  try {
    await b.run();

    let output = await resultFromReporter;
    if (output.success) {
      let bundleContents = [];
      for (let {filePath, size, time} of output.success.bundles) {
        bundleContents.push({
          name: PathUtils.removeAppDir(filePath),
          content: await fs.readFile(filePath, 'utf8'),
          size,
          time,
        });
      }

      return {
        type: 'success',
        bundles: bundleContents,
        buildTime: output.success.buildTime,
        graphs,
      };
    } else {
      return {type: 'failure', diagnostics: convertDiagnostics(output.failure)};
    }
  } catch (error) {
    return {
      type: 'failure',
      error: error,
      diagnostics: convertDiagnostics(error.diagnostics),
    };
  }
}
