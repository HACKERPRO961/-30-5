export const C = 4, T = 0.25, H = 3.0;
export const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0]; // K, D, G, B
export const rnd = (n) => Math.floor(Math.random() * n);

export function genMaze(N) {
  const cells = Array.from({ length: N * N }, () => [false, false, false, false]);
  const vis = new Array(N * N).fill(false);
  const id = (x, y) => y * N + x;
  const sx = rnd(N), sy = rnd(N);
  vis[id(sx, sy)] = true;
  const st = [[sx, sy]];
  while (st.length) {
    const [x, y] = st[st.length - 1];
    const nb = [];
    for (let d = 0; d < 4; d++) {
      const nx = x + DX[d], ny = y + DY[d];
      if (nx >= 0 && ny >= 0 && nx < N && ny < N && !vis[id(nx, ny)]) nb.push(d);
    }
    if (!nb.length) { st.pop(); continue; }
    const d = nb[rnd(nb.length)];
    const nx = x + DX[d], ny = y + DY[d];
    cells[id(x, y)][d] = true; cells[id(nx, ny)][(d + 2) % 4] = true;
    vis[id(nx, ny)] = true; st.push([nx, ny]);
  }
  // döngüler: birkaç duvarı yık
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    for (const d of [1, 2]) {
      const nx = x + DX[d], ny = y + DY[d];
      if (nx < N && ny < N && !cells[id(x, y)][d] && Math.random() < 0.11) {
        cells[id(x, y)][d] = true; cells[id(nx, ny)][(d + 2) % 4] = true;
      }
    }
  }
  return cells;
}

export function bfs(cells, N, sx, sy) {
  const dist = new Array(N * N).fill(-1);
  dist[sy * N + sx] = 0;
  const q = [[sx, sy]];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    for (let d = 0; d < 4; d++) {
      if (!cells[y * N + x][d]) continue;
      const nx = x + DX[d], ny = y + DY[d];
      if (dist[ny * N + nx] < 0) { dist[ny * N + nx] = dist[y * N + x] + 1; q.push([nx, ny]); }
    }
  }
  return dist;
}

export const cellOf = (N, x, z) => {
  const cx = Math.max(0, Math.min(N - 1, Math.floor(x / C)));
  const cy = Math.max(0, Math.min(N - 1, Math.floor(z / C)));
  return cy * N + cx;
};
export const cellCenter = (N, id) => [((id % N) + 0.5) * C, (Math.floor(id / N) + 0.5) * C];
export const openCount = (cells, id) => cells[id].filter(Boolean).length;

// Hücre ızgarasına göre görüş hattı (duvarlara çarpar)
export function losClear(cells, N, ax, az, bx, bz) {
  const len = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(1, Math.ceil(len / 0.3));
  let cx = Math.floor(ax / C), cy = Math.floor(az / C);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const nx = Math.floor((ax + (bx - ax) * t) / C), ny = Math.floor((az + (bz - az) * t) / C);
    if (nx < 0 || ny < 0 || nx >= N || ny >= N) return false;
    if (nx !== cx || ny !== cy) {
      const dirX = nx > cx ? 1 : 3, dirY = ny > cy ? 2 : 0;
      if (nx !== cx && ny !== cy) {
        const a = cells[cy * N + cx][dirX] && cells[cy * N + nx][dirY];
        const b = cells[cy * N + cx][dirY] && cells[ny * N + cx][dirX];
        if (!a && !b) return false;
      } else if (nx !== cx) { if (!cells[cy * N + cx][dirX]) return false; }
      else if (!cells[cy * N + cx][dirY]) return false;
      cx = nx; cy = ny;
    }
  }
  return true;
}
