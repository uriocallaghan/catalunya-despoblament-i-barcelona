// Cartograma continu per difusió (Gastner i Newman, PNAS 101:7499, 2004).
// La densitat de població es difon en una malla fins que és uniforme; cada vèrtex del mapa es desplaça
// amb la velocitat del flux v = -∇ρ/ρ. Es repeteix sobre el resultat per reduir l'error d'àrea (com go_cart).
// Tot en coordenades planes d'una projecció d'àrea igual. Condicions de contorn de Neumann per reflexió.

function fft(re, im, n, stride, off, inv, tre, tim, rev, cs, sn) {
  for (let i = 0; i < n; i++) { const j = off + rev[i] * stride; tre[i] = re[j]; tim[i] = im[j]; }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1, step = n / size;
    for (let i = 0; i < n; i += size) for (let j = 0; j < half; j++) {
      const k = j * step, c = cs[k], s = inv ? -sn[k] : sn[k];
      const a = i + j, b = a + half;
      const xr = tre[b] * c + tim[b] * s, xi = tim[b] * c - tre[b] * s;
      tre[b] = tre[a] - xr; tim[b] = tim[a] - xi; tre[a] += xr; tim[a] += xi;
    }
  }
  for (let i = 0; i < n; i++) { const j = off + i * stride; re[j] = tre[i]; im[j] = tim[i]; }
}
function makeFFT2(M) {
  const bits = Math.log2(M), rev = new Uint32Array(M);
  for (let i = 0; i < M; i++) { let r = 0; for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b); rev[i] = r; }
  const cs = new Float64Array(M / 2), sn = new Float64Array(M / 2);
  for (let k = 0; k < M / 2; k++) { cs[k] = Math.cos(2 * Math.PI * k / M); sn[k] = Math.sin(2 * Math.PI * k / M); }
  const tre = new Float64Array(M), tim = new Float64Array(M);
  return (re, im, inv) => {
    for (let y = 0; y < M; y++) fft(re, im, M, 1, y * M, inv, tre, tim, rev, cs, sn);
    for (let x = 0; x < M; x++) fft(re, im, M, M, x, inv, tre, tim, rev, cs, sn);
    if (inv) { const s = 1 / (M * M); for (let i = 0; i < M * M; i++) { re[i] *= s; im[i] *= s; } }
  };
}

// Anells (llistes de [x,y]) de cada geometria a partir dels arcs.
export function ringsOf(geom, arcs) {
  const ring = idx => { const pts = []; idx.forEach((a, k) => { const arc = a < 0 ? arcs[~a].slice().reverse() : arcs[a]; pts.push(...(k ? arc.slice(1) : arc)); }); return pts; };
  if (geom.type === 'Polygon') return [geom.arcs.map(ring)];
  if (geom.type === 'MultiPolygon') return geom.arcs.map(p => p.map(ring));
  return [];
}
const shoelace = r => { let s = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) s += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return s / 2; };
export const polyArea = polys => polys.reduce((s, p) => s + Math.abs(shoelace(p[0])) - p.slice(1).reduce((h, r) => h + Math.abs(shoelace(r)), 0), 0);

// arcs: array d'arcs [[x,y],…] en coordenades planes (es modifiquen). geoms: geometries TopoJSON. values: població.
// extra: punts addicionals a desplaçar (p. ex. centroides). Retorna estadístiques d'error.
export function cartogram(arcs, geoms, values, extra = [], { N = 512, rounds = 5, log = console.log } = {}) {
  const M = 2 * N, fft2 = makeFFT2(M);
  const pts = [...arcs.flat(), ...extra];
  const w = new Float64Array(M), wk = new Float64Array(M);
  for (let k = 0; k < M; k++) { const f = k < M / 2 ? k : k - M; w[k] = 2 * Math.PI * f / M; wk[k] = k === M / 2 ? 0 : w[k]; }
  const V = values.reduce((s, v) => s + v, 0);
  const stats = []; let best = null;
  for (let round = 0; round < rounds; round++) {
    // Domini: quadrat amb el mapa al centre ocupant-ne la meitat.
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
    const L = 2 * Math.max(x1 - x0, y1 - y0), cx = (x0 + x1) / 2 - L / 2, cy = (y0 + y1) / 2 - L / 2, h = L / N;
    const polys = geoms.map(g => ringsOf(g, arcs).map(p => p.map(r => r.map(([x, y]) => [(x - cx) / h, (y - cy) / h]))));
    const areas = polys.map(polyArea), A = areas.reduce((s, a) => s + a, 0);
    const mean = V / A; // densitat fora del mapa = densitat mitjana, per conservar la superfície total
    // Rasterització amb supermostreig 4×4 i regla parell-senar per scanline.
    const S = 4, acc = new Float64Array(N * N), cov = new Float64Array(N * N);
    polys.forEach((pp, i) => {
      const dens = values[i] / areas[i]; let by0 = Infinity, by1 = -Infinity;
      pp.forEach(p => p.forEach(r => r.forEach(([, y]) => { if (y < by0) by0 = y; if (y > by1) by1 = y; })));
      const rings = pp.flat();
      for (let sy = Math.max(0, Math.floor(by0 * S)); sy <= Math.min(N * S - 1, Math.ceil(by1 * S)); sy++) {
        const yy = (sy + .5) / S, xs = [];
        for (const r of rings) for (let a = 0, b = r.length - 1; a < r.length; b = a++) { const [xa, ya] = r[a], [xb, yb] = r[b]; if ((ya > yy) !== (yb > yy)) xs.push(xa + (yy - ya) / (yb - ya) * (xb - xa)); }
        xs.sort((p, q) => p - q); const row = Math.floor(yy);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let sx = Math.max(0, Math.ceil(xs[k] * S - .5)); sx <= Math.min(N * S - 1, Math.floor(xs[k + 1] * S - .5)); sx++) {
          const c = row * N + Math.floor(sx / S); acc[c] += dens; cov[c] += 1;
        }
      }
    });
    const re = new Float64Array(M * M), im = new Float64Array(M * M);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = y * N + x, v = (acc[c] + mean * (S * S - Math.min(S * S, cov[c]))) / (S * S);
      re[y * M + x] = v; re[y * M + (M - 1 - x)] = v; re[(M - 1 - y) * M + x] = v; re[(M - 1 - y) * M + (M - 1 - x)] = v;
    }
    fft2(re, im, false);
    const F0r = re.slice(), F0i = im.slice();
    const ar = new Float64Array(M * M), ai = new Float64Array(M * M), br = new Float64Array(M * M), bi = new Float64Array(M * M);
    // Camps en el temps t: a = ρ + i·∂xρ, b = ∂yρ (un sol IFFT complex per a dos camps reals).
    const fields = t => {
      for (let ky = 0; ky < M; ky++) for (let kx = 0; kx < M; kx++) {
        const j = ky * M + kx, e = Math.exp(-(w[kx] * w[kx] + w[ky] * w[ky]) * t), gr = F0r[j] * e, gi = F0i[j] * e;
        // ∂x ↔ i·ωx: i·ωx·G = -ωx·gi + i·ωx·gr ; a = G + i·(i ωx G) = G - ωx G
        ar[j] = gr - wk[kx] * gr; ai[j] = gi - wk[kx] * gi;
        br[j] = -wk[ky] * gi; bi[j] = wk[ky] * gr;
      }
      fft2(ar, ai, true); fft2(br, bi, true);
    };
    const vel = (u, v) => { // velocitat bilineal en unitats de cel·la (centres a +0.5)
      let gx = u - .5, gy = v - .5; gx = Math.max(0, Math.min(N - 1.0001, gx)); gy = Math.max(0, Math.min(N - 1.0001, gy));
      const ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy; let vx = 0, vy = 0;
      for (const [dx, dy, wgt] of [[0, 0, (1 - fx) * (1 - fy)], [1, 0, fx * (1 - fy)], [0, 1, (1 - fx) * fy], [1, 1, fx * fy]]) {
        const j = (iy + dy) * M + ix + dx; vx -= wgt * ai[j] / ar[j]; vy -= wgt * br[j] / ar[j];
      }
      return [vx, vy];
    };
    const P = pts.map(p => [(p[0] - cx) / h, (p[1] - cy) / h]);
    let t = 0, steps = 0; const tEnd = N * N;
    while (t < tEnd) {
      fields(t);
      let vmax = 0; const vs = P.map(([u, v]) => { const q = vel(u, v); const m = Math.hypot(q[0], q[1]); if (m > vmax) vmax = m; return q; });
      const dt = Math.min(.2 / Math.max(vmax, 1e-12), .15 * t + .05, tEnd - t);
      // Punt mig (RK2): velocitat a t+dt/2 a la posició intermèdia.
      fields(t + dt / 2);
      P.forEach((p, i) => { const q = vel(p[0] + vs[i][0] * dt / 2, p[1] + vs[i][1] * dt / 2); p[0] += q[0] * dt; p[1] += q[1] * dt; });
      t += dt; steps++;
    }
    P.forEach((p, i) => { pts[i][0] = p[0] * h + cx; pts[i][1] = p[1] * h + cy; });
    // Error d'àrea: àrea obtinguda / àrea objectiu - 1.
    const na = geoms.map(g => polyArea(ringsOf(g, arcs))), NA = na.reduce((s, a) => s + a, 0);
    const err = na.map((a, i) => Math.abs(a / (NA * values[i] / V) - 1));
    const wErr = err.reduce((s, e, i) => s + e * values[i], 0) / V, meanErr = err.reduce((s, e) => s + e, 0) / err.length;
    const st = { round: round + 1, steps, meanErr, popWeightedErr: wErr, maxErr: Math.max(...err) };
    stats.push(st); if (!best || wErr < best.popWeightedErr) best = { ...st, snap: pts.map(p => [p[0], p[1]]) };
    log(`ronda ${st.round}: ${steps} passos, error mitjà ${(meanErr * 100).toFixed(1)}%, ponderat per població ${(wErr * 100).toFixed(2)}%`);
  }
  best.snap.forEach((q, i) => { pts[i][0] = q[0]; pts[i][1] = q[1]; }); delete best.snap;
  return { stats, best };
}
