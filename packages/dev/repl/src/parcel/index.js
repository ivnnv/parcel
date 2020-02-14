// @flow
import type {Assets, REPLOptions} from '../utils';
import type {BundleOutput} from './ParcelWorker';

import {wrap} from 'comlink';

const worker = wrap(
  new Worker('./ParcelWorker.js', {name: 'Parcel Worker Main'}),
);
// const worker = {
//   ready: Promise.resolve(true),
//   bundle(assets) {
//     return {
//       assets,
//       graphs: [
//         {
//           name: "test",
//           content: `digraph graphname
// {
//     a -> b -> c;
//     b -> d;
// }`,
//         },
//       ],
//     };
//   },
// };

export const workerReady: Promise<void> = worker.ready;

export function bundle(
  assets: Assets,
  options: REPLOptions,
): Promise<BundleOutput> {
  return worker.bundle(assets, options);
}
