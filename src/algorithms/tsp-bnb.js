import { INF, fmt, cloneMatrix } from "../utils.js";

/**
 * TSP — метод ветвей и границ (алгоритм Литтла).
 *
 *   dist[i][j]: исходная матрица (квадратная n×n), диагональ = ∞.
 */
export function solveTSPBranchAndBound(dist0) {
  const n = dist0.length;
  const steps = [];
  const MAX_STEPS = 300;

  if (n > 9) throw new Error("Для метода ветвей и границ ограничим n ≤ 9 (иначе слишком долго).");

  function tooManySteps() {
    return steps.length >= MAX_STEPS;
  }

  function addStep(step) {
    if (tooManySteps()) return false;
    steps.push(step);
    return true;
  }

  if (!addStep({
    title: "Постановка",
    text:
      `Задача коммивояжёра, решение методом ветвей и границ (алгоритм Литтла).\n` +
      `Строки матрицы — откуда, столбцы — куда.`,
    matrix: { data: dist0, rowLabels: labels(n), colLabels: labels(n) },
  })) {
    return { steps, route: null };
  }

  let best = { length: INF, route: null };

  const treeRoot = { id: 0, label: [], children: [], status: "normal" };
  let nextId = 1;

  // rowIdx / colIdx: original indices still present in this submatrix (tracks what was eliminated).
  const { M, hRows, hCols, rows0, cols0 } = reduce(dist0);
  const H0 = sum(hRows) + sum(hCols);

  if (!addStep({
    title: "Шаг 1: Редукция матрицы",
    text:
      `Вычисляем минимум по каждой строке и вычитаем его:\n` +
      hRows.map((h, i) => `  строка ${i + 1}: min = ${fmt(h)}`).join("\n") +
      `\nСумма констант редукции строк: h_строк = ${fmt(sum(hRows))}\n\n` +
      `Затем вычисляем минимум по столбцам приведённой матрицы:\n` +
      hCols.map((h, j) => `  столбец ${j + 1}: min = ${fmt(h)}`).join("\n") +
      `\nСумма констант редукции столбцов: h_столбцов = ${fmt(sum(hCols))}\n\n` +
      `Нижняя граница: H(B₀) = h_строк + h_столбцов = <span class="hi">${fmt(H0)}</span>`,
    matrix: { data: M, rowLabels: labels(n), colLabels: labels(n), emphasizeZeros: true },
  })) {
    return { steps, route: null };
  }

  treeRoot.label = [`B₀`, `H = ${fmt(H0)}`];

  // recursive branching
  const edgesFixed = [];  // edges of partial tour: pairs [origI, origJ]
  const forbidden = new Set(); // "i-j" of forbidden edges (to avoid cycles)
  branch(M, rows0, cols0, H0, edgesFixed, forbidden, treeRoot, 0);

  function branch(M, rows, cols, H, edgesFixed, forbidden, treeNode, depth) {
    if (tooManySteps()) {
      treeNode.status = "pruned";
      treeNode.label = [...treeNode.label, "ограничено по шагам"];
      return;
    }
    const size = rows.length;
    if (size === 0) {
      // tour complete
      const route = buildRoute(edgesFixed, n);
      const len = pathLen(route, dist0);
      if (len < best.length) {
        best = { length: len, route };
      }
      treeNode.status = "optimal";
      treeNode.label = [...treeNode.label, `L = ${fmt(len)}`];
      if (!addStep({
        title: `Маршрут собран: L = ${fmt(len)}`,
        text:
          `Добавленные рёбра образуют полный цикл:\n` +
          edgesFixed.map(([i, j]) => `  (${i + 1} → ${j + 1})`).join("\n") +
          `\nПолный маршрут: <span class="ok">${route.map((x) => x + 1).join(" → ")}</span>, ` +
          `L = <span class="ok">${fmt(len)}</span>` +
          (len < best.length ? `` : ``),
      })) {
        return;
      }
      return;
    }

    if (H >= best.length) {
      treeNode.status = "pruned";
      treeNode.label = [...treeNode.label, `H ≥ рекорд ${fmt(best.length)}`, "отсечена"];
      return;
    }

    // find zeros and compute θ for each
    let bestEdge = null, bestTheta = -1;
    const zeros = [];
    for (let ii = 0; ii < size; ii++) {
      for (let jj = 0; jj < size; jj++) {
        if (M[ii][jj] === 0) {
          // theta = min of row ii excluding jj + min of col jj excluding ii
          let rmin = INF;
          for (let k = 0; k < size; k++) if (k !== jj) rmin = Math.min(rmin, M[ii][k]);
          let cmin = INF;
          for (let k = 0; k < size; k++) if (k !== ii) cmin = Math.min(cmin, M[k][jj]);
          const rm = rmin === INF ? 0 : rmin;
          const cm = cmin === INF ? 0 : cmin;
          const theta = rm + cm;
          zeros.push({ ii, jj, theta, rm, cm });
          if (theta > bestTheta) { bestTheta = theta; bestEdge = { ii, jj, theta, rm, cm }; }
        }
      }
    }

    if (!bestEdge) {
      treeNode.status = "pruned";
      treeNode.label = [...treeNode.label, "нет нулей"];
      return;
    }

    const origI = rows[bestEdge.ii], origJ = cols[bestEdge.jj];

    const zTxt = zeros
      .map((z) => {
        const i0 = rows[z.ii] + 1, j0 = cols[z.jj] + 1;
        const mk = z === bestEdge ? `  ← <span class="hi">max</span>` : ``;
        return `  θ(${i0}, ${j0}) = ${fmt(z.rm)} + ${fmt(z.cm)} = ${fmt(z.theta)}${mk}`;
      })
      .join("\n");

    if (!addStep({
      title: `Узел ${treeNode.label[0]}: ветвление`,
      text:
    })) {
      return;
    }
        `Текущая нижняя граница: H = ${fmt(H)}\n` +
        `Зафиксированные рёбра: ${edgesFixed.length ? edgesFixed.map(([i, j]) => `(${i + 1}→${j + 1})`).join(", ") : "—"}\n\n` +
        `Оценки θ для нулевых элементов (θ = min строки без j + min столбца без i):\n` +
        zTxt +
        `\n\nВетвимся по ребру с максимальной θ: <span class="hi">(${origI + 1} → ${origJ + 1})</span>, θ = ${fmt(bestEdge.theta)}`,
      matrix: {
        data: M,
        rowLabels: rows.map((r) => String(r + 1)),
        colLabels: cols.map((c) => String(c + 1)),
        emphasizeZeros: true,
        highlight: { cells: [[bestEdge.ii, bestEdge.jj]] },
      },
    });

    // ---- branch INCLUDE (origI -> origJ) ----
    const incNode = { id: nextId++, label: [`B${nextId - 1}`, `вкл. (${origI + 1},${origJ + 1})`], children: [], status: "normal" };
    treeNode.children.push({ edgeLabel: `вкл.`, node: incNode });

    const newEdges = [...edgesFixed, [origI, origJ]];
    const newForbidden = new Set(forbidden);
    // also forbid edges that would close a premature cycle
    forbidCycleEdges(newEdges, newForbidden, n);

    // build new matrix without row origI, col origJ
    const newRows = rows.filter((_, k) => k !== bestEdge.ii);
    const newCols = cols.filter((_, k) => k !== bestEdge.jj);
    const subM = Array.from({ length: newRows.length }, () => Array(newCols.length).fill(0));
    for (let ii = 0, iiS = 0; ii < size; ii++) {
      if (ii === bestEdge.ii) continue;
      for (let jj = 0, jjS = 0; jj < size; jj++) {
        if (jj === bestEdge.jj) continue;
        subM[iiS][jjS] = M[ii][jj];
        jjS++;
      }
      iiS++;
    }
    // apply forbidden
    for (let ii = 0; ii < newRows.length; ii++)
      for (let jj = 0; jj < newCols.length; jj++)
        if (newForbidden.has(`${newRows[ii]}-${newCols[jj]}`)) subM[ii][jj] = INF;

    const { M: redM, hRows: hR, hCols: hC } = reduce(subM);
    const redCost = sum(hR) + sum(hC);
    const Hinc = H + redCost;
    incNode.label = [...incNode.label, `H = ${fmt(Hinc)}`];

    if (!addStep({
      title: `Ветвь «включить (${origI + 1}, ${origJ + 1})»`,
      text:
    })) {
      return;
    }
        `Зачёркиваем строку ${origI + 1} и столбец ${origJ + 1}.\n` +
        `Запрещаем обратные рёбра, ведущие к преждевременному замыканию цикла.\n` +
        `Редукция подматрицы: Δ = ${fmt(redCost)}\n` +
        `H(${incNode.label[0]}) = ${fmt(H)} + ${fmt(redCost)} = <span class="hi">${fmt(Hinc)}</span>`,
      matrix: {
        data: redM,
        rowLabels: newRows.map((r) => String(r + 1)),
        colLabels: newCols.map((c) => String(c + 1)),
        emphasizeZeros: true,
      },
    });

    if (Hinc < best.length) {
      branch(redM, newRows, newCols, Hinc, newEdges, newForbidden, incNode, depth + 1);
    } else {
      incNode.status = "pruned";
      incNode.label = [...incNode.label, "отсечена"];
    }

    // ---- branch EXCLUDE (origI -> origJ) ----
    const excNode = { id: nextId++, label: [`B${nextId - 1}`, `искл. (${origI + 1},${origJ + 1})`], children: [], status: "normal" };
    treeNode.children.push({ edgeLabel: `искл.`, node: excNode });

    const subM2 = cloneMatrix(M);
    subM2[bestEdge.ii][bestEdge.jj] = INF;
    const { M: redM2, hRows: hR2, hCols: hC2 } = reduce(subM2);
    const redCost2 = sum(hR2) + sum(hC2);
    const Hexc = H + redCost2;
    excNode.label = [...excNode.label, `H = ${fmt(Hexc)}`];

    if (!addStep({
      title: `Ветвь «исключить (${origI + 1}, ${origJ + 1})»`,
      text:
    })) {
      return;
    }
        `Ставим элемент (${origI + 1}, ${origJ + 1}) = ∞.\n` +
        `Редукция: Δ = ${fmt(redCost2)}\n` +
        `H(${excNode.label[0]}) = ${fmt(H)} + ${fmt(redCost2)} = <span class="hi">${fmt(Hexc)}</span>`,
      matrix: {
        data: redM2,
        rowLabels: rows.map((r) => String(r + 1)),
        colLabels: cols.map((c) => String(c + 1)),
        emphasizeZeros: true,
      },
    });

    if (Hexc < best.length) {
      branch(redM2, rows, cols, Hexc, edgesFixed, forbidden, excNode, depth + 1);
    } else {
      excNode.status = "pruned";
      excNode.label = [...excNode.label, "отсечена"];
    }
  }

  if (!best.route) {
    if (!addStep({
      title: "Результат",
      final: true,
      text: `<span class="err">Оптимальный маршрут не найден (возможно, матрица задана некорректно).</span>`,
      tree: treeRoot,
    })) {
      return { steps, route: null };
    }
    return { steps, route: null };
  }

  // mark optimal path in tree
  markOptimalPath(treeRoot, best);

  if (!addStep({
    title: "Дерево ветвлений",
    text: `Узлы показывают нижнюю границу H. Зелёным отмечен путь к оптимальному маршруту.`,
    tree: treeRoot,
  })) return { steps, route: best.route, length: best.length };

  if (!addStep({
    title: "Результат",
    final: true,
    text:
      `<span class="ok">Оптимальный маршрут: ${best.route.map((x) => x + 1).join(" → ")}</span>\n` +
      `<span class="ok">L = ${fmt(best.length)}</span>`,
    graph: {
      n,
      edges: allEdges(dist0),
      pathEdges: consecutive(best.route),
      directed: true,
      doneNodes: Array.from({ length: n }, (_, i) => i),
    },
  })) {
    return { steps, route: best.route, length: best.length };
  }

  return { steps, route: best.route, length: best.length };
}

/* ---------- helpers ---------- */

function labels(n) { return Array.from({ length: n }, (_, i) => String(i + 1)); }

function sum(a) { return a.reduce((s, x) => s + (x === INF ? 0 : x), 0); }

function reduce(M0) {
  const M = cloneMatrix(M0);
  const n = M.length;
  const m = M[0]?.length ?? 0;
  const hRows = Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let mn = INF;
    for (let j = 0; j < m; j++) mn = Math.min(mn, M[i][j]);
    if (mn === INF) mn = 0;
    hRows[i] = mn;
    if (mn > 0) for (let j = 0; j < m; j++) if (M[i][j] !== INF) M[i][j] -= mn;
  }
  const hCols = Array(m).fill(0);
  for (let j = 0; j < m; j++) {
    let mn = INF;
    for (let i = 0; i < n; i++) mn = Math.min(mn, M[i][j]);
    if (mn === INF) mn = 0;
    hCols[j] = mn;
    if (mn > 0) for (let i = 0; i < n; i++) if (M[i][j] !== INF) M[i][j] -= mn;
  }
  // rows0 / cols0 returned only if caller wants original indices
  return { M, hRows, hCols, rows0: Array.from({ length: n }, (_, i) => i), cols0: Array.from({ length: m }, (_, j) => j) };
}

function buildRoute(edges, n) {
  const from = new Map();
  for (const [i, j] of edges) from.set(i, j);
  const start = edges[0]?.[0] ?? 0;
  const route = [start];
  let cur = start;
  for (let k = 0; k < n; k++) {
    cur = from.get(cur);
    if (cur === undefined) break;
    route.push(cur);
    if (cur === start) break;
  }
  return route;
}

function pathLen(route, dist) {
  let s = 0;
  for (let i = 0; i + 1 < route.length; i++) s += dist[route[i]][route[i + 1]];
  return s;
}

function forbidCycleEdges(edges, forbidden, n) {
  // Build chain starts/ends. For any partial path a -> ... -> b, forbid b -> a.
  const from = new Map(), to = new Map();
  for (const [i, j] of edges) { from.set(i, j); to.set(j, i); }
  for (const [i] of edges) {
    let start = i; while (to.has(start)) start = to.get(start);
    let end = i; while (from.has(end)) end = from.get(end);
    if (end !== start) forbidden.add(`${end}-${start}`);
  }
  // Also: can't leave same i twice or enter same j twice
  for (const [i, j] of edges) {
    for (let k = 0; k < n; k++) {
      forbidden.add(`${i}-${k}`);
      forbidden.add(`${k}-${j}`);
    }
  }
}

function allEdges(M) {
  const n = M.length; const out = [];
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (i !== j && M[i][j] !== INF) out.push([i, j, M[i][j]]);
  return out;
}
function consecutive(route) {
  const out = [];
  for (let i = 0; i + 1 < route.length; i++) out.push([route[i], route[i + 1]]);
  return out;
}

function markOptimalPath(root, best) {
  // simplest: mark leaves with .status==="optimal" already set during DFS
  // just leave as-is.
}
