import { INF, INF_SYMBOL, fmt, cloneMatrix } from "../utils.js";

/**
 * Dijkstra's shortest path algorithm with full step-by-step trace.
 *
 *   dist[i][j] = weight, INF means no edge.
 *   src, dst are 0-based indices (dst optional — traces full tree if omitted).
 */
export function solveDijkstra(dist, src, dst = null) {
  const n = dist.length;
  if (src < 0 || src >= n) throw new Error("Некорректная начальная вершина.");
  if (dst !== null && (dst < 0 || dst >= n)) throw new Error("Некорректная конечная вершина.");

  const d = Array(n).fill(INF);
  const pred = Array(n).fill(-1);
  const fixed = Array(n).fill(false);
  d[src] = 0;

  const steps = [];

  steps.push({
    title: "Постановка",
    text:
      `Дано: граф G c ${n} вершинами. Найти кратчайший путь ` +
      `из вершины <span class="hi">${src + 1}</span>` +
      (dst !== null ? ` до вершины <span class="hi">${dst + 1}</span>.` : ` до всех вершин.`),
  });

  steps.push({
    title: "Инициализация",
    text:
      `Метки расстояний:\n` +
      `  d[${src + 1}] = 0\n` +
      `  d[v] = ${INF_SYMBOL} для всех v ≠ ${src + 1}\n` +
      `Множество зафиксированных S = { }\n` +
      `Очередь Q = { ${Array.from({ length: n }, (_, i) => i + 1).join(", ")} }`,
    table: distTable(d, pred, fixed, n),
  });

  let stepN = 0;
  while (true) {
    // pick u with min d[u] among non-fixed
    let u = -1, best = INF;
    for (let v = 0; v < n; v++) {
      if (!fixed[v] && d[v] < best) { best = d[v]; u = v; }
    }
    if (u === -1) break;
    fixed[u] = true;
    stepN++;

    const neighbours = [];
    const updates = [];
    for (let v = 0; v < n; v++) {
      if (v === u || fixed[v]) continue;
      const w = dist[u][v];
      if (w === INF) continue;
      neighbours.push([v, w]);
      const nd = d[u] + w;
      if (nd < d[v]) {
        updates.push({ v, old: d[v], nd, w });
        d[v] = nd;
        pred[v] = u;
      }
    }

    const lines = [];
    lines.push(`Выбираем вершину с минимальной меткой из Q: <span class="hi">u = ${u + 1}</span>, d[${u + 1}] = ${fmt(d[u])}`);
    lines.push(`Фиксируем ${u + 1} → S = { ${listFixed(fixed)} }`);
    if (neighbours.length === 0) {
      lines.push(`<span class="dim">У вершины ${u + 1} нет непосещённых соседей.</span>`);
    } else {
      lines.push(`Обновляем метки соседей:`);
      for (const [v, w] of neighbours) {
        const upd = updates.find((x) => x.v === v);
        if (upd) {
          lines.push(
            `  (${u + 1},${v + 1}) = ${fmt(w)}: ` +
            `d[${v + 1}] = min(${fmt(upd.old)}, ${fmt(d[u])}+${fmt(w)}) = <span class="ok">${fmt(upd.nd)}</span>, ` +
            `pred[${v + 1}] = ${u + 1}`
          );
        } else {
          lines.push(
            `  (${u + 1},${v + 1}) = ${fmt(w)}: ` +
            `d[${v + 1}] = min(${fmt(d[v])}, ${fmt(d[u])}+${fmt(w)}) = ${fmt(d[v])} <span class="dim">(без изменений)</span>`
          );
        }
      }
    }

    steps.push({
      title: `Шаг ${stepN}: фиксируем вершину ${u + 1}`,
      text: lines.join("\n"),
      table: distTable(d, pred, fixed, n),
      graph: {
        n,
        edges: matrixToEdges(dist, false),
        doneNodes: listFixedIdx(fixed),
        activeNodes: [u],
        activeEdges: neighbours.map(([v]) => [u, v]),
      },
    });

    if (dst !== null && u === dst) break;
    if (d[u] === INF) {
      steps.push({
        title: "Стоп",
        text: `<span class="err">Оставшиеся вершины недостижимы из ${src + 1}.</span>`,
      });
      break;
    }
  }

  // build result
  let path = null, pathLen = null;
  if (dst !== null) {
    if (d[dst] === INF) {
      steps.push({
        title: "Результат",
        final: true,
        text: `<span class="err">Путь из ${src + 1} в ${dst + 1} не существует.</span>`,
      });
      return { steps, path: null, distances: d };
    }
    path = [];
    for (let v = dst; v !== -1; v = pred[v]) {
      path.push(v);
      if (v === src) break;
    }
    path.reverse();
    pathLen = d[dst];
    const arr = path.map((v) => v + 1).join(" → ");
    steps.push({
      title: `Восстановление пути по pred[]`,
      text:
        `Идём от вершины ${dst + 1} по предшественникам:\n` +
        path.slice().reverse().map((v, i) => {
          const p = pred[v];
          if (p === -1) return `  ${v + 1}  ← старт`;
          return `  ${v + 1}  ← pred = ${p + 1}`;
        }).join("\n"),
    });
    steps.push({
      title: `Результат`,
      final: true,
      text:
        `Кратчайший путь: <span class="ok">${arr}</span>\n` +
        `Длина пути: <span class="ok">${fmt(pathLen)}</span>`,
      graph: {
        n,
        edges: matrixToEdges(dist, false),
        pathEdges: pathEdges(path),
        doneNodes: [src, dst],
      },
    });
  } else {
    steps.push({
      title: "Результат — расстояния от истока",
      final: true,
      text: Array.from({ length: n }, (_, v) =>
        `  d[${src + 1} → ${v + 1}] = ${fmt(d[v])}` +
        (v !== src && d[v] !== INF ? ` (путь: ${reconstruct(v, pred, src).map(i => i + 1).join(" → ")})` : "")
      ).join("\n"),
    });
  }

  return { steps, path, pathLen, distances: d, pred };
}

function matrixToEdges(M, directed) {
  const edges = [];
  const n = M.length;
  for (let i = 0; i < n; i++) {
    for (let j = directed ? 0 : i + 1; j < n; j++) {
      if (i === j) continue;
      const w = M[i][j];
      if (w !== INF) edges.push([i, j, w]);
    }
  }
  return edges;
}

function pathEdges(path) {
  const out = [];
  for (let i = 0; i + 1 < path.length; i++) out.push([path[i], path[i + 1]]);
  return out;
}

function reconstruct(v, pred, src) {
  const p = [];
  for (let x = v; x !== -1; x = pred[x]) {
    p.push(x);
    if (x === src) break;
  }
  return p.reverse();
}

function listFixed(fixed) {
  return fixed.map((f, i) => f ? String(i + 1) : null).filter(Boolean).join(", ");
}
function listFixedIdx(fixed) {
  return fixed.map((f, i) => f ? i : null).filter((x) => x !== null);
}

function distTable(d, pred, fixed, n) {
  const vs = Array.from({ length: n }, (_, i) => String(i + 1));
  const row = (arr, fmtFn) => arr.map((x, i) => fixed[i] ? `${fmtFn(x)} ✓` : fmtFn(x));
  return {
    head: ["вершина", ...vs],
    rows: [
      ["d", ...row(d, fmt)],
      ["pred", ...row(pred, (p) => p === -1 ? "—" : String(p + 1))],
    ],
  };
}
