import { h, INF } from "../../utils.js";
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
  root.appendChild(h("div", { class: "row" }, [btnSolve, btnReset]));
  root.appendChild(sol.element);
}
