import { h } from "../../utils.js";
import { createMatrixInput } from "../matrix-input.js";
import { createSolutionPanel } from "../step-renderer.js";
import { solveMaxFlow } from "../../algorithms/ford-fulkerson.js";
import { viewHeader, panel, numberField } from "./common.js";

export function renderFordFulkersonView(root) {
  const matrix = createMatrixInput({
    size: 7, minSize: 3, maxSize: 10,
    symmetric: false, diagonal: "zero",
  });
  const sol = createSolutionPanel();

  const sizeInput = h("input", { type: "number", value: 7, min: 3, max: 10 });
  sizeInput.addEventListener("input", () => {
    const n = Math.max(3, Math.min(10, +sizeInput.value || 3));
    matrix.setSize(n);
    srcField.input.max = n; dstField.input.max = n;
  });

  const srcField = numberField({ label: "Исток", value: 1, min: 1, max: 7, onChange: () => {} });
  const dstField = numberField({ label: "Сток", value: 7, min: 1, max: 7, onChange: () => {} });

  const btnSolve = h("button", { class: "btn primary" }, "Решить");
  const btnReset = h("button", { class: "btn ghost" }, "Сбросить");

  btnSolve.addEventListener("click", () => {
    try {
      const M = matrix.getMatrix();
      const s = Math.max(0, (+srcField.input.value || 1) - 1);
      const t = Math.max(0, (+dstField.input.value || 1) - 1);
      const { steps } = solveMaxFlow(M, s, t);
      sol.render(steps, "Форд — Фалкерсон (Эдмондс — Карп)");
    } catch (e) {
      sol.renderError(e.message);
    }
  });

  btnReset.addEventListener("click", () => {
    matrix.setMatrix(Array.from({ length: matrix.getSize() }, () =>
      Array(matrix.getSize()).fill(0)
    ));
    sol.clear();
  });

  root.appendChild(viewHeader(
    "Форд — Фалкерсон — максимальный поток",
    "Ищем увеличивающие пути поиском в ширину (вариант Эдмондса — Карпа). Диагональ = 0, пустая ячейка = 0 (нет ребра)."
  ));
  root.appendChild(panel("Параметры",
    h("div", { class: "row" }, [
      h("div", { class: "field" }, [h("label", {}, "Число вершин"), sizeInput]),
      srcField.el,
      dstField.el,
    ])
  ));
  root.appendChild(panel("Матрица пропускных способностей c[i][j]",
    matrix.element,
    h("div", { class: "hint" }, "Ориентированный граф: c[i][j] ≠ c[j][i]. 0 или пусто — ребра нет.")
  ));
  root.appendChild(h("div", { class: "row" }, [btnSolve, btnReset]));
  root.appendChild(sol.element);
}
