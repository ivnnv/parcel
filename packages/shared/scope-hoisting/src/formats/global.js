// @flow

import type {Asset, Bundle, BundleGraph, Symbol} from '@parcel/types';
import type {NodePath} from '@babel/traverse';
import type {
  ExpressionStatement,
  Identifier,
  Program,
  Statement,
  StringLiteral,
  CallExpression,
} from '@babel/types';

import * as t from '@babel/types';
import template from '@babel/template';
import {relativeBundlePath} from '@parcel/utils';
import {assertString, getName, isEntry, isReferenced} from '../utils';
import nullthrows from 'nullthrows';

const IMPORT_TEMPLATE = template.expression<
  {|ASSET_ID: StringLiteral|},
  CallExpression,
>('parcelRequire(ASSET_ID)');
const EXPORT_TEMPLATE = template.statement<
  {|IDENTIFIER: Identifier, ASSET_ID: StringLiteral|},
  ExpressionStatement,
>('parcelRequire.register(ASSET_ID, IDENTIFIER);');
const IMPORTSCRIPTS_TEMPLATE = template.statement<
  {|BUNDLE: StringLiteral|},
  Statement,
>('importScripts(BUNDLE);');

export function generateBundleImports(
  from: Bundle,
  bundle: Bundle,
  assets: Set<Asset>,
  path: NodePath<Program>,
) {
  let statements = [];
  if (from.env.isWorker()) {
    statements.push(
      IMPORTSCRIPTS_TEMPLATE({
        BUNDLE: t.stringLiteral(relativeBundlePath(from, bundle)),
      }),
    );
  }
  path.unshiftContainer('body', statements);

  for (let asset of assets) {
    // `var ${id};` was inserted already, add RHS
    nullthrows(path.scope.getBinding(getName(asset, 'init')))
      .path.get('init')
      .replaceWith(IMPORT_TEMPLATE({ASSET_ID: t.stringLiteral(asset.id)}));
  }
}

export function generateExternalImport() {
  throw new Error(
    'External modules are not supported when building for browser',
  );
}

export function generateExports(
  bundleGraph: BundleGraph,
  bundle: Bundle,
  referencedAssets: Set<Asset>,
  path: NodePath<Program>,
) {
  let exported = new Set<Symbol>();
  let statements: Array<ExpressionStatement> = [];

  for (let asset of referencedAssets) {
    let exportsId = getName(asset, 'init');
    exported.add(exportsId);

    statements.push(
      EXPORT_TEMPLATE({
        ASSET_ID: t.stringLiteral(asset.id),
        IDENTIFIER: t.identifier(exportsId),
      }),
    );
  }

  let entry = bundle.getMainEntry();
  if (
    entry &&
    (!isEntry(bundle, bundleGraph) || isReferenced(bundle, bundleGraph))
  ) {
    let exportsId = assertString(entry.meta.exportsIdentifier);
    exported.add(exportsId);

    statements.push(
      EXPORT_TEMPLATE({
        ASSET_ID: t.stringLiteral(entry.id),
        IDENTIFIER: t.identifier(assertString(entry.meta.exportsIdentifier)),
      }),
    );
  }

  let decls = path.pushContainer('body', statements);
  for (let decl of decls) {
    let id = decl.get<NodePath<Identifier>>('expression.arguments.1');
    path.scope.getBinding(id.node.name)?.reference(id);
  }

  return exported;
}
