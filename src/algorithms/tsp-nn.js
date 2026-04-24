import { INF, fmt } from "../utils.js";

/**
 * TSP — метод ближайшего соседа + улучшение 2-opt.
 *
 *   dist[i][j]: distance matrix (может быть несимметричной).
 *   start: 0-based start vertex (если null — пробуем все и берём лучший).
 */
export function solveTSPNearestNeighbor(dist, start = 0) {
  const n = dist.length;
  const steps = [];

  if (start === null || start === undefined) {
    // try all, pick best
    let best = null;
    for (let s = 0; s < n; s++) {
      const r = runNN(dist, s);
      if (!best || (r.route && r.length < best.length)) best = r;
    }
    if (best) return solveTSPNearestNeighbor(dist, best.start);
    start = 0;
  }

  steps.push({
    title: "Постановка",
    text:
      `Задача коммивояжёра: посетить все ${n} городов по одному разу и вернуться в стартовый.\n` +
      `Метод: ближайший сосед.\n` +
      `Старт: <span class="hi">город ${start + 1}</span>.`,
    matrix: { data: dist, rowLabels: labels(n), colLabels: labels(n) },
  });

  const visited = new Array(n).fill(false);
  visited[start] = true;
  const route = [start];
  let length = 0;

  steps.push({
    title: `Шаг 0`,
    text:
      `Текущий маршрут: <span class="hi">[${route.map((x) => x + 1).join("]</span>")}</span>\n` +
      `Непосещённые: { ${notVisited(visited).map((x) => x + 1).join(", ")} }\n` +
      `L = 0`,
  });

  for (let step = 1; step < n; step++) {
    const cur = route[route.length - 1];
    let bestV = -1, bestW = INF;
    const lines = [`Из вершины ${cur + 1} ищем ближайший непосещённый город:`];
    for (let v = 0; v < n; v++) {
      if (v === cur) continue;
      if (visited[v]) continue;
      const w = dist[cur][v];
      lines.push(
        `  d(${cur + 1}, ${v + 1}) = ${fmt(w)}` +
        ((w !== INF && w < bestW) ? "" : "")
      );
      if (w < bestW) { bestW = w; bestV = v; }
    }
    if (bestV === -1) {
      steps.push({
        title: `Шаг ${step}`,
        text: `<span class="err">Из вершины ${cur + 1} нет пути к непосещённым городам. Маршрут построить нельзя.</span>`,
      });
      return { steps, route: null };
    }
    // annotate min
    for (let k = 1; k < lines.length; k++) {
      if (lines[k].includes(`${bestV + 1})`) && lines[k].includes(` ${fmt(bestW)}`)) {
        lines[k] += `  ← <span class="hi">минимум</span>`;
        break;
      }
    }

    route.push(bestV);
    visited[bestV] = true;
    length += bestW;

    steps.push({
      title: `Шаг ${step}`,
      text:
        lines.join("\n") +
        `\n\nПереходим в город ${bestV + 1}.\n` +
        `Маршрут: [${route.map((x) => x + 1).join(" → ")}], L = ${fmt(length)}`,
      graph: {
        n,
        edges: tspEdges(dist),
        pathEdges: routeEdges(route, false),
        activeNodes: [bestV],
        doneNodes: route.slice(0, -1),
      },
    });
  }

  // return
  const back = dist[route[route.length - 1]][start];
  if (back === INF) {
    steps.push({
      title: "Замыкание маршрута",
      text: `<span class="err">Из города ${route[route.length - 1] + 1} нельзя вернуться в ${start + 1}.</span>`,
    });
    return { steps, route: null };
  }
  length += back;
  const closedRoute = route.concat([start]);

  steps.push({
    title: "Замыкание маршрута",
    text:
      `Возвращаемся из ${route[route.length - 1] + 1} в ${start + 1}: ` +
      `d = ${fmt(back)}.\n` +
      `<span class="ok">Маршрут: ${closedRoute.map((x) => x + 1).join(" → ")}, L = ${fmt(length)}</span>`,
    graph: {
      n, edges: tspEdges(dist),
      pathEdges: routeEdges(closedRoute, false),
      doneNodes: Array.from({ length: n }, (_, i) => i),
    },
  });

  // -------- 2-opt improvement --------
  steps.push({
    title: "1-оптимальное улучшение (2-opt)",
    text:
      `Текущий маршрут: (${closedRoute.map((x) => x + 1).join(", ")}), L = ${fmt(length)}\n` +
      `Перебираем все пары рёбер (i,i+1) и (j,j+1); если их разворот уменьшает L — принимаем.`,
  });

  let improved = true;
  let pass = 0;
  const MAX_PASSES = 200;
  let cur = closedRoute.slice();
  while (improved && pass < MAX_PASSES) {
    improved = false;
    pass++;
    const improvementLines = [];
    outer: for (let i = 1; i < cur.length - 2; i++) {
      for (let j = i + 1; j < cur.length - 1; j++) {
        const a = cur[i - 1], b = cur[i];
        const c = cur[j], d = cur[j + 1];
        if (b === c) continue;
        const oldE = dist[a][b] + dist[c][d];
        const newE = dist[a][c] + dist[b][d];
        if (newE === INF) continue;
        if (newE + 1e-9 < oldE) {
          const newRoute = cur.slice(0, i).concat(cur.slice(i, j + 1).reverse(), cur.slice(j + 1));
          const newL = pathLength(newRoute, dist);
          // Для несимметричной матрицы разворот меняет внутренние рёбра —
          // принимаем улучшение только если полная длина реально уменьшилась.
          if (newL >= length - 1e-9) continue;
          const delta = length - newL;
          improvementLines.push(
            `Разворот отрезка [${cur.slice(i, j + 1).map((x) => x + 1).join(", ")}] → ` +
            `(${a + 1},${c + 1}) + (${b + 1},${d + 1}) = ${fmt(dist[a][c])} + ${fmt(dist[b][d])} = ${fmt(newE)} ` +
            `<span class="dim">(было ${fmt(oldE)}, Δ = −${fmt(delta)})</span>`
          );
          steps.push({
            title: `Проход ${pass}: найдено улучшение`,
            text:
              improvementLines.join("\n") +
              `\n\nНовый маршрут: <span class="ok">(${newRoute.map((x) => x + 1).join(", ")})</span>, ` +
              `L = <span class="ok">${fmt(newL)}</span>`,
            graph: {
              n, edges: tspEdges(dist),
              pathEdges: routeEdges(newRoute, false),
              doneNodes: Array.from({ length: n }, (_, i) => i),
            },
          });
          cur = newRoute;
          length = newL;
          improved = true;
          break outer;
        }
      }
    }
    if (!improved) {
      steps.push({
        title: `Проход ${pass}: улучшений не найдено`,
        text: `Маршрут локально оптимален относительно 2-opt.`,
      });
    }
  }

  steps.push({
    title: "Финальный маршрут",
    final: true,
    text:
      `<span class="ok">Маршрут: ${cur.map((x) => x + 1).join(" → ")}</span>\n` +
      `<span class="ok">L = ${fmt(length)}</span>`,
    graph: {
      n, edges: tspEdges(dist),
      pathEdges: routeEdges(cur, false),
      doneNodes: Array.from({ length: n }, (_, i) => i),
    },
  });

  return { steps, route: cur, length };
}

function runNN(dist, start) {
  const n = dist.length;
  const visited = new Array(n).fill(false);
  visited[start] = true;
  const route = [start];
  let length = 0;
  for (let step = 1; step < n; step++) {
    const cur = route[route.length - 1];
    let bestV = -1, bestW = INF;
    for (let v = 0; v < n; v++) {
      if (v === cur || visited[v]) continue;
      if (dist[cur][v] < bestW) { bestW = dist[cur][v]; bestV = v; }
    }
    if (bestV === -1) return { route: null, length: INF, start };
    route.push(bestV);
    visited[bestV] = true;
    length += bestW;
  }
  const back = dist[route[route.length - 1]][start];
  if (back === INF) return { route: null, length: INF, start };
  length += back;
  return { route: route.concat([start]), length, start };
}

function pathLength(route, dist) {
  let s = 0;
  for (let i = 0; i + 1 < route.length; i++) s += dist[route[i]][route[i + 1]];
  return s;
}

function notVisited(visited) {
  return visited.map((v, i) => v ? null : i).filter((x) => x !== null);
}

function labels(n) { return Array.from({ length: n }, (_, i) => String(i + 1)); }

function tspEdges(dist) {
  const n = dist.length;
  const edges = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (i !== j && dist[i][j] !== INF) edges.push([i, j, dist[i][j]]);
  // dedupe for undirected view
  const seen = new Set(); const out = [];
  for (const [i, j, w] of edges) {
    const k = [i, j].sort((a, b) => a - b).join("-");
    if (!seen.has(k)) { seen.add(k); out.push([i, j, w]); }
  }
  return out;
}

function routeEdges(route, directed) {
  const out = [];
  for (let i = 0; i + 1 < route.length; i++) out.push([route[i], route[i + 1]]);
  return out;
}
