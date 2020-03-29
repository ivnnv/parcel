// @flow
import type {Asset, MutableAsset, Bundle, BundleGraph} from '@parcel/types';
import type {NodePath, Scope, VariableDeclarationKind} from '@babel/traverse';
import type {
  ClassDeclaration,
  FunctionDeclaration,
  Identifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ImportSpecifier,
  Node,
  VariableDeclarator,
} from '@babel/types';

import {simple as walkSimple} from '@parcel/babylon-walk';
import * as t from '@babel/types';
import {isVariableDeclarator, isVariableDeclaration} from '@babel/types';
import invariant from 'assert';
import nullthrows from 'nullthrows';

export function getName(
  asset: Asset | MutableAsset,
  type: string,
  ...rest: Array<string>
) {
  return (
    '$' +
    t.toIdentifier(asset.id) +
    '$' +
    type +
    (rest.length
      ? '$' +
        rest
          .map(name => (name === 'default' ? name : t.toIdentifier(name)))
          .join('$')
      : '')
  );
}

export function getIdentifier(
  asset: Asset | MutableAsset,
  type: string,
  ...rest: Array<string>
) {
  return t.identifier(getName(asset, type, ...rest));
}

export function getExportIdentifier(asset: Asset | MutableAsset, name: string) {
  return getIdentifier(asset, 'export', name);
}

export function needsPrelude(bundle: Bundle, bundleGraph: BundleGraph) {
  if (bundle.env.outputFormat !== 'global') {
    return false;
  }

  // If this is an entry bundle and it is referenced by other bundles,
  // we need to add the prelude code, which allows registering modules dynamically at runtime.
  return isEntry(bundle, bundleGraph) && isReferenced(bundle, bundleGraph);
}

export function isEntry(bundle: Bundle, bundleGraph: BundleGraph) {
  // If there is no parent JS bundle (e.g. in an HTML page), or environment is isolated (e.g. worker)
  // then this bundle is an "entry"
  return (
    !bundleGraph.hasParentBundleOfType(bundle, 'js') || bundle.env.isIsolated()
  );
}

export function isReferenced(bundle: Bundle, bundleGraph: BundleGraph) {
  // A bundle is potentially referenced if there are any child or sibling JS bundles that are not isolated
  return [
    ...bundleGraph.getChildBundles(bundle),
    ...bundleGraph.getSiblingBundles(bundle),
  ].some(
    b => b.type === 'js' && (!b.env.isIsolated() || bundle.env.isIsolated()),
  );
}

export function assertString(v: mixed): string {
  invariant(typeof v === 'string');
  return v;
}

const DereferenceVisitor = {
  Identifier(node: Identifier, scope: Scope) {
    dereferenceIdentifier(node, scope);
  },
};

// updates bindings in path.scope.getProgramParent()
export function pathDereference(path: NodePath<Node>) {
  walkSimple(path.node, DereferenceVisitor, path.scope.getProgramParent());
}

// like path.remove(), but updates bindings in path.scope.getProgramParent()
export function pathRemove(path: NodePath<Node>) {
  pathDereference(path);
  path.remove();
}

function dereferenceIdentifier(node, scope) {
  let binding = scope.getBinding(node.name);
  if (binding) {
    let i = binding.referencePaths.findIndex(v => v.node === node);
    if (i >= 0) {
      binding.dereference();
      binding.referencePaths.splice(i, 1);
      return;
    }

    let j = binding.constantViolations.findIndex(v =>
      Object.values(v.getBindingIdentifiers()).includes(node),
    );
    if (j >= 0) {
      binding.constantViolations.splice(j, 1);
      if (binding.constantViolations.length == 0) {
        binding.constant = true;
      }
      return;
    }
  }
}

export function removeReplaceBinding(
  scope: Scope,
  name: string,
  newPath: NodePath<
    | VariableDeclarator
    | ClassDeclaration
    | FunctionDeclaration
    | ImportSpecifier
    | ImportDefaultSpecifier
    | ImportNamespaceSpecifier,
  >,
  newKind?: VariableDeclarationKind,
) {
  let binding = nullthrows(scope.getBinding(name));
  let path = binding.path;
  let {node, parent} = path;
  invariant(
    isVariableDeclarator(node) && isVariableDeclaration(parent) && !node.init,
  );
  // $FlowFixMe Yes this is kind of provide, but ¯\_(ツ)_/¯
  path._remove();
  if (parent.declarations.length === 0) {
    path.parentPath.remove();
  }

  binding.path = newPath;
  binding.identifier = newPath.getBindingIdentifiers()[name];
  if (newKind) {
    binding.kind = newKind;
  }
}
