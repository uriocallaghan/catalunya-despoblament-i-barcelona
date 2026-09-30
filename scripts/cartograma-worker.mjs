// Calcula un cartograma en un fil a part (vegeu cartograma.mjs).
import { parentPort, workerData } from 'worker_threads';
import { cartogram } from './cartograma.mjs';
const { arcs, geoms, values, extra, year } = workerData;
const { best } = cartogram(arcs, geoms, values, extra, { N: 512, rounds: 5, log: m => console.log(year + ' ' + m) });
parentPort.postMessage({ arcs, extra, best });
