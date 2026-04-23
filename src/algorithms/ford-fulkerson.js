import { INF, fmt, cloneMatrix } from "../utils.js";

/**
 * Ford-Fulkerson (Edmonds-Karp) maximum flow.
 *   cap[i][j] = capacity, 0 means no edge.
 *   s, t = 0-based source and sink.
 */
export function solveMaxFlow(capIn, s, t) {
  const n = capIn.length;
  if (s === t) throw new Error("Исток и сток должны быть разными вершинами.");
  if (s < 0 || s >= n || t < 0 || t >= n) throw new Error("Некорректные исток/сток.");

  // treat INF and missing as 0 capacity
  const cap = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    const v = capIn[i][j];
    if (v === INF || v === undefined || v === null) return 0;
    if (!Number.isFinite(v) || v < 0) return 0;
    return v;
  }));

  const res = cloneMatrix(cap); // residual capacities
  const flow = Array.from({ length: n }, () => Array(n).fill(0));

  const steps = [];

  steps.push({
    title: "Постановка",
    text:
      `Найти максимальный поток из вершины <span class="hi">${s + 1}</span> (исток) ` +
      `в вершину <span class="hi">${t + 1}</span> (сток).\n` +
      `Начальное состояние: поток f = 0 по всем рёбрам.`,
    matrix: {
      data: cap.map((row) => row.map((v) => v === 0 ? INF : v)),
      rowLabels: labels(n), colLabels: labels(n),
    },
  });

  let iter = 0, totalFlow = 0;

  while (true) {
    // BFS in residual
    const parent = Array(n).fill(-1);
    const visited = Array(n).fill(false);
    const q = [s]; visited[s] = true;
    while (q.length) {
      const u = q.shift();
      if (u === t) break;
      for (let v = 0; v < n; v++) {
        if (!visited[v] && res[u][v] > 0) {
          visited[v] = true;
          parent[v] = u;
          q.push(v);
        }
      }
    }

    if (!visited[t]) {
      steps.push({
        title: `Итерация ${iter + 1}: увеличивающего пути нет`,
        text:
          `Поиск в ширину из ${s + 1} в остаточной сети не находит путь до ${t + 1}.\n` +
          `<span class="ok">Алгоритм завершён.</span>`,
        matrix: {
          data: res.map((row) => row.map((v) => v === 0 ? INF : v)),
          rowLabels: labels(n), colLabels: labels(n),
        },
      });
      break;
    }

    // reconstruct path
    const path = [];
    for (let v = t; v !== -1; v = parent[v]) path.push(v);
    path.reverse();

    // bottleneck
    let bn = INF;
    for (let i = 0; i + 1 < path.length; i++) bn = Math.min(bn, res[path[i]][path[i + 1]]);

    // augment
    const increments = [];
    for (let i = 0; i + 1 < path.length; i++) {
      const u = path[i], v = path[i + 1];
      flow[u][v] += bn;
      flow[v][u] -= bn;
      res[u][v] -= bn;
      res[v][u] += bn;
      increments.push([u, v]);
    }
    totalFlow += bn;
    iter++;

    const bnLine = path.slice(0, -1).map((u, i) => `c(${u + 1},${path[i + 1] + 1}) = ${fmt(cap[u][path[i + 1]] - (flow[u][path[i + 1]] - bn))}`).join(", ");

    const capUpdates = path.slice(0, -1).map((u, i) => {
      const v = path[i + 1];
      return `  f(${u + 1},${v + 1}) += ${fmt(bn)},  остаток r(${u + 1},${v + 1}) = ${fmt(res[u][v])}`;
    }).join("\n");

    steps.push({
      title: `Итерация ${iter}: увеличивающий путь`,
      text:
        `Путь: <span class="hi">${path.map((x) => x + 1).join(" → ")}</span>\n` +
        `Узкое место (min остаточной пропускной способности): Δ = <span class="hi">${fmt(bn)}</span>\n\n` +
        `Увеличиваем поток на Δ = ${fmt(bn)}:\n` +
        capUpdates +
        `\n\nТекущий суммарный поток: f = <span class="ok">${fmt(totalFlow)}</span>`,
      matrix: {
        data: res.map((row) => row.map((v) => v === 0 ? INF : v)),
        rowLabels: labels(n), colLabels: labels(n),
      },
      graph: flowGraph(cap, flow, n, [], increments, [s, t]),
    });
  }

  // final flows
  const flowEdges = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (cap[i][j] > 0 && flow[i][j] > 0) flowEdges.push([i, j, flow[i][j], cap[i][j]]);

  const flowStr = flowEdges.map(([u, v, f, c]) => `  f(${u + 1}, ${v + 1}) = ${fmt(f)} / ${fmt(c)}`).join("\n");

  steps.push({
    title: "Результат",
    final: true,
    text:
      `<span class="ok">Максимальный поток: f_max = ${fmt(totalFlow)}</span>\n\n` +
      `Потоки по рёбрам:\n${flowStr || "  —"}`,
    graph: flowGraph(cap, flow, n, flowEdges.map(([u, v]) => [u, v]), [], [s, t]),
  });

  return { steps, maxFlow: totalFlow, flow };
}

function labels(n) { return Array.from({ length: n }, (_, i) => String(i + 1)); }

function flowGraph(cap, flow, n, pathEdges, activeEdges, sourceAndSink) {
  const edges = [];
  const labelsMap = {};
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (cap[i][j] > 0) {
        edges.push([i, j, cap[i][j]]);
        const f = flow[i][j] ?? 0;
        labelsMap[`${i}-${j}`] = `${fmt(f < 0 ? 0 : f)}/${fmt(cap[i][j])}`;
      }
    }
  }
  return {
    n, edges, directed: true,
    pathEdges, activeEdges,
    edgeLabels: labelsMap,
    activeNodes: sourceAndSink,
  };
}
