import { h } from "../../utils.js";
import { createMatrixInput } from "../matrix-input.js";
import { createSolutionPanel } from "../step-renderer.js";
import { solvePrim } from "../../algorithms/prim.js";
import { viewHeader, panel, numberField } from "./common.js";

export function renderPrimView(root) {
  const matrix = createMatrixInput({
    size: 6, minSize: 2, maxSize: 12,
    symmetric: true, diagonal: "inf",
  });
  const sol = createSolutionPanel();

  const sizeInput = h("input", { type: "number", value: 6, min: 2, max: 12 });
  sizeInput.addEventListener("input", () => {
    const n = Math.max(2, Math.min(12, +sizeInput.value || 2));
    matrix.setSize(n);
    startField.input.max = n;
  });

  const startField = numberField({ label: "Старт", value: 1, min: 1, max: 6, onChange: () => {} });

  const btnSolve = h("button", { class: "btn primary" }, "Решить");
  const btnReset = h("button", { class: "btn ghost" }, "Сбросить");

  btnSolve.addEventListener("click", () => {
    try {
      const M = matrix.getMatrix();
      const s = Math.max(0, (+startField.input.value || 1) - 1);
      const { steps } = solvePrim(M, s);
      sol.render(steps, "Алгоритм Прима — MST");
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
    "Алгоритм Прима — минимальное остовное дерево",
    "Жадно добавляем минимальное ребро, соединяющее дерево с непосещённой вершиной."
  ));
  root.appendChild(panel("Параметры",
    h("div", { class: "row" }, [
      h("div", { class: "field" }, [h("label", {}, "Число вершин"), sizeInput]),
      startField.el,
    ])
  ));
  root.appendChild(panel("Матрица весов рёбер", matrix.element));
  root.appendChild(h("div", { class: "row" }, [btnSolve, btnReset]));
  root.appendChild(sol.element);
}
