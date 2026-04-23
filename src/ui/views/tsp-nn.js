import { h, symMatrix } from "../../utils.js";
import { createMatrixInput } from "../matrix-input.js";
import { createSolutionPanel } from "../step-renderer.js";
import { solveTSPNearestNeighbor } from "../../algorithms/tsp-nn.js";
import { viewHeader, panel, numberField } from "./common.js";

export function renderTspNnView(root) {
  const matrix = createMatrixInput({
    size: 6,
    minSize: 3,
    maxSize: 10,
    symmetric: false,
    diagonal: "inf",
  });

  const sol = createSolutionPanel();
  const startField = numberField({
    label: "Старт",
    value: 1, min: 1, max: 6,
    onChange: () => {},
  });

  const sizeInput = h("input", { type: "number", value: 6, min: 3, max: 10 });
  sizeInput.addEventListener("input", () => {
    const n = Math.max(3, Math.min(10, +sizeInput.value || 3));
    matrix.setSize(n);
    startField.input.max = n;
  });

  const btnSolve = h("button", { class: "btn primary" }, "Решить");
  const btnExample = h("button", { class: "btn" }, "Загрузить пример");
  const btnReset = h("button", { class: "btn ghost" }, "Сбросить");

  btnSolve.addEventListener("click", () => {
    try {
      const M = matrix.getMatrix();
      const start = Math.max(0, Math.min(M.length - 1, (+startField.input.value || 1) - 1));
      const { steps } = solveTSPNearestNeighbor(M, start);
      sol.render(steps, "TSP: ближайший сосед + 2-opt");
    } catch (e) {
      sol.renderError(e.message);
    }
  });

  btnExample.addEventListener("click", () => {
    // example from the prompt
    const ex = [
      [Infinity, 5, 2, 9, 3, 3],
      [6, Infinity, 3, 9, 3, 12],
      [2, 13, Infinity, 2, 3, 3],
      [6, 2, 4, Infinity, 12, 6],
      [3, 17, 6, 5, Infinity, 3],
      [5, 8, 15, 5, 3, Infinity],
    ];
    matrix.setMatrix(ex);
    sizeInput.value = 6;
    startField.input.value = 1;
    startField.input.max = 6;
  });

  btnReset.addEventListener("click", () => {
    matrix.setSize(matrix.getSize());
    matrix.setMatrix(Array.from({ length: matrix.getSize() }, () =>
      Array(matrix.getSize()).fill(Infinity)
    ));
    sol.clear();
  });

  root.appendChild(viewHeader(
    "TSP — метод ближайшего соседа + 2-opt",
    "Жадно строим маршрут, затем улучшаем его попарной заменой рёбер (1-оптимальное решение)."
  ));
  root.appendChild(panel("Параметры",
    h("div", { class: "row" }, [
      h("div", { class: "field" }, [h("label", {}, "Размер n"), sizeInput]),
      startField.el,
    ])
  ));
  root.appendChild(panel("Матрица расстояний (строка = откуда, столбец = куда)",
    matrix.element,
    h("div", { class: "hint" }, "Пустая ячейка = ∞ (ребро отсутствует). Диагональ = ∞ всегда.")
  ));
  root.appendChild(h("div", { class: "row" }, [btnSolve, btnExample, btnReset]));
  root.appendChild(sol.element);
}
