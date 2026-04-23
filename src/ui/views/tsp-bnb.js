import { h } from "../../utils.js";
import { createMatrixInput } from "../matrix-input.js";
import { createSolutionPanel } from "../step-renderer.js";
import { solveTSPBranchAndBound } from "../../algorithms/tsp-bnb.js";
import { viewHeader, panel } from "./common.js";

export function renderTspBnbView(root) {
  const matrix = createMatrixInput({
    size: 5,
    minSize: 3,
    maxSize: 9,
    symmetric: false,
    diagonal: "inf",
  });
  const sol = createSolutionPanel();

  const sizeInput = h("input", { type: "number", value: 5, min: 3, max: 9 });
  sizeInput.addEventListener("input", () => {
    const n = Math.max(3, Math.min(9, +sizeInput.value || 3));
    matrix.setSize(n);
  });

  const btnSolve = h("button", { class: "btn primary" }, "Решить");
  const btnExample = h("button", { class: "btn" }, "Загрузить пример");
  const btnReset = h("button", { class: "btn ghost" }, "Сбросить");

  btnSolve.addEventListener("click", () => {
    try {
      const M = matrix.getMatrix();
      const { steps } = solveTSPBranchAndBound(M);
      sol.render(steps, "TSP: метод ветвей и границ (Литтл)");
    } catch (e) {
      sol.renderError(e.message);
    }
  });

  btnExample.addEventListener("click", () => {
    const ex = [
      [Infinity, 5, 2, 9, 3, 3],
      [6, Infinity, 3, 9, 3, 12],
      [2, 13, Infinity, 2, 3, 3],
      [6, 2, 4, Infinity, 12, 6],
      [3, 17, 6, 5, Infinity, 3],
      [5, 8, 15, 5, 3, Infinity],
    ];
    sizeInput.value = 6;
    matrix.setMatrix(ex);
  });

  btnReset.addEventListener("click", () => {
    matrix.setMatrix(Array.from({ length: matrix.getSize() }, () =>
      Array(matrix.getSize()).fill(Infinity)
    ));
    sol.clear();
  });

  root.appendChild(viewHeader(
    "TSP — метод ветвей и границ",
    "Алгоритм Литтла: полная редукция матрицы на каждом узле, ветвление по ребру с максимальной оценкой θ."
  ));
  root.appendChild(panel("Параметры",
    h("div", { class: "row" }, [
      h("div", { class: "field" }, [h("label", {}, "Размер n"), sizeInput]),
    ])
  ));
  root.appendChild(panel("Матрица расстояний", matrix.element,
    h("div", { class: "hint" }, "Для несимметричных задач: M[i][j] ≠ M[j][i]. Размер ограничен 9 для разумного времени работы.")
  ));
  root.appendChild(h("div", { class: "row" }, [btnSolve, btnExample, btnReset]));
  root.appendChild(sol.element);
}
