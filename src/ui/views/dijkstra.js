import { h, symMatrix, INF } from "../../utils.js";
import { createMatrixInput } from "../matrix-input.js";
import { createSolutionPanel } from "../step-renderer.js";
import { solveDijkstra } from "../../algorithms/dijkstra.js";
import { viewHeader, panel, numberField } from "./common.js";

export function renderDijkstraView(root) {
  const matrix = createMatrixInput({
    size: 6, minSize: 2, maxSize: 12,
    symmetric: true, diagonal: "inf",
  });
  const sol = createSolutionPanel();

  const sizeInput = h("input", { type: "number", value: 6, min: 2, max: 12 });
  sizeInput.addEventListener("input", () => {
    const n = Math.max(2, Math.min(12, +sizeInput.value || 2));
    matrix.setSize(n);
    srcField.input.max = n;
    dstField.input.max = n;
  });

  const srcField = numberField({ label: "Исток", value: 1, min: 1, max: 6, onChange: () => {} });
  const dstField = numberField({ label: "Сток (0 = ко всем)", value: 6, min: 0, max: 6, onChange: () => {} });

  const btnSolve = h("button", { class: "btn primary" }, "Решить");
  const btnExample = h("button", { class: "btn" }, "Загрузить пример");
  const btnReset = h("button", { class: "btn ghost" }, "Сбросить");

  btnSolve.addEventListener("click", () => {
    try {
      const M = matrix.getMatrix();
      const s = Math.max(0, (+srcField.input.value || 1) - 1);
      const dRaw = +dstField.input.value;
      const d = dRaw <= 0 ? null : dRaw - 1;
      const { steps } = solveDijkstra(M, s, d);
      sol.render(steps, "Алгоритм Дейкстры");
    } catch (e) {
      sol.renderError(e.message);
    }
  });

  btnExample.addEventListener("click", () => {
    // 10-vertex example inspired by textbooks
    const edges = [
      [0, 1, 4], [0, 4, 15], [0, 5, 22],
      [1, 2, 11], [1, 6, 5], [1, 7, 7], [1, 8, 12],
      [2, 3, 6], [2, 6, 16], [2, 8, 2], [2, 9, 9],
      [3, 4, 10], [3, 9, 13],
      [4, 5, 8], [4, 9, 18],
      [5, 6, 7],
      [6, 7, 6], [6, 9, 14],
      [7, 8, 4], [7, 9, 11],
      [8, 9, 5],
    ];
    const M = symMatrix(10, edges);
    sizeInput.value = 10;
    matrix.setMatrix(M);
    srcField.input.max = 10;
    dstField.input.max = 10;
    srcField.input.value = 1;
    dstField.input.value = 10;
  });

  btnReset.addEventListener("click", () => {
    matrix.setMatrix(Array.from({ length: matrix.getSize() }, () =>
      Array(matrix.getSize()).fill(Infinity)
    ));
    sol.clear();
  });

  root.appendChild(viewHeader(
    "Алгоритм Дейкстры — кратчайший путь",
    "Для взвешенного графа без отрицательных рёбер. Матрица симметричная (неориентированный граф)."
  ));
  root.appendChild(panel("Параметры",
    h("div", { class: "row" }, [
      h("div", { class: "field" }, [h("label", {}, "Число вершин"), sizeInput]),
      srcField.el,
      dstField.el,
    ])
  ));
  root.appendChild(panel("Матрица весов рёбер", matrix.element,
    h("div", { class: "hint" }, "Граф неориентированный — при редактировании M[i][j] автоматически меняется M[j][i].")
  ));
  root.appendChild(h("div", { class: "row" }, [btnSolve, btnExample, btnReset]));
  root.appendChild(sol.element);
}
