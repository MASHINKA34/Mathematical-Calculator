import { INF, fmt } from "../utils.js";

/**
 * Prim's MST algorithm.
 *   dist[i][j] = weight (symmetric), INF = no edge.
 *   start = 0-based start vertex.
 */
export function solvePrim(dist, start = 0) {
  const n = dist.length;
  if (start < 0 || start >= n) throw new Error("Некорректная начальная вершина.");

  const inTree = Array(n).fill(false);
  inTree[start] = true;
  const mstEdges = [];
  let total = 0;

  const steps = [];

  steps.push({
    title: "Постановка",
    text:
      `Дано: граф G с ${n} вершинами и матрицей весов. ` +
      `Построить минимальное остовное дерево (MST) алгоритмом Прима.\n` +
      `Начальная вершина: <span class="hi">${start + 1}</span>.`,
  });

  steps.push({
    title: "Шаг 0 — инициализация",
    text:
      `U = { ${start + 1} }  (включённые вершины)\n` +
      `T = { }              (рёбра дерева)\n` +
      `Суммарный вес: 0`,
    graph: mstGraph(dist, n, [], [start]),
  });

  let iter = 0;
  while (true) {
    // find min edge (u,v) with u in tree, v not
    let bu = -1, bv = -1, bw = INF;
    for (let u = 0; u < n; u++) {
      if (!inTree[u]) continue;
      for (let v = 0; v < n; v++) {
        if (inTree[v]) continue;
        if (dist[u][v] < bw) { bw = dist[u][v]; bu = u; bv = v; }
      }
    }
    if (bu === -1) break;
    iter++;

    // show candidate edges before selection
    const cand = [];
    for (let u = 0; u < n; u++) {
      if (!inTree[u]) continue;
      for (let v = 0; v < n; v++) {
        if (inTree[v]) continue;
        if (dist[u][v] !== INF) cand.push([u, v, dist[u][v]]);
      }
    }
    cand.sort((a, b) => a[2] - b[2]);

    const candStr = cand
      .map(([u, v, w]) =>
        (u === bu && v === bv)
          ? `  (${u + 1}, ${v + 1}) = ${fmt(w)}  ← <span class="hi">минимум</span>`
          : `  (${u + 1}, ${v + 1}) = ${fmt(w)}`
      )
      .join("\n");

    mstEdges.push([bu, bv, bw]);
    inTree[bv] = true;
    total += bw;

    steps.push({
      title: `Шаг ${iter}: рассматриваем рёбра из U в V\\U`,
      text:
        `Текущее U = { ${listSet(inTree, true, bv)} } (до шага)\n\n` +
        `Кандидаты:\n${candStr}\n\n` +
        `Добавляем в дерево ребро <span class="hi">(${bu + 1}, ${bv + 1})</span>, вес ${fmt(bw)}.\n` +
        `U = { ${listSet(inTree)} },  суммарный вес T = ${fmt(total)}.`,
      graph: mstGraph(dist, n, mstEdges, listSetIdx(inTree), [bu, bv]),
    });
  }

  // final table of steps
  const rows = [["0", "—", "—", `{${start + 1}}`]];
  {
    const set = new Set([start]);
    mstEdges.forEach(([u, v, w], i) => {
      set.add(v);
      rows.push([String(i + 1), `(${u + 1}, ${v + 1})`, fmt(w), `{${[...set].sort((a, b) => a - b).map((x) => x + 1).join(", ")}}`]);
    });
  }

  steps.push({
    title: "Таблица шагов",
    text: "",
    table: { head: ["Шаг", "Добавлено ребро", "Вес", "U"], rows },
  });

  const connected = mstEdges.length === n - 1;
  if (!connected) {
    steps.push({
      title: "Результат",
      final: true,
      text: `<span class="err">Граф несвязен — MST не построено полностью.</span>\nПостроено ${mstEdges.length} из ${n - 1} рёбер.`,
    });
    return { steps, mstEdges, totalWeight: total };
  }

  steps.push({
    title: "Результат",
    final: true,
    text:
      `MST = { ${mstEdges.map(([u, v]) => `(${u + 1},${v + 1})`).join(", ")} }\n` +
      `Суммарный вес: <span class="ok">${fmt(total)}</span>`,
    graph: mstGraph(dist, n, mstEdges, Array.from({ length: n }, (_, i) => i)),
  });

  return { steps, mstEdges, totalWeight: total };
}

function listSet(inTree, before = false, skip = -1) {
  return inTree
    .map((v, i) => v && !(before && i === skip) ? String(i + 1) : null)
    .filter(Boolean)
    .join(", ");
}
function listSetIdx(inTree) {
  return inTree.map((v, i) => v ? i : null).filter((x) => x !== null);
}

function mstGraph(dist, n, mstEdges, doneNodes, activeNodes = []) {
  const edges = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (dist[i][j] !== INF) edges.push([i, j, dist[i][j]]);
  return {
    n, edges,
    mstEdges: mstEdges.map(([u, v]) => [u, v]),
    doneNodes, activeNodes,
  };
}
