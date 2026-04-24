import { h, fmt, INF, INF_SYMBOL, parseCell } from "../utils.js";

/**
 * Dynamic matrix input.
 *
 *   opts:
 *     size: initial n
 *     minSize, maxSize
 *     symmetric: if true, editing M[i][j] also sets M[j][i]
 *     directed: whether to hide the "symmetric" treatment (used for flow)
 *     defaultValue: prefill value
 *     diagonal: "inf" (∞, not editable) | "zero" | "free"
 *     labels: override header labels (array length n)
 *     onChange(M)
 */
export function createMatrixInput(opts = {}) {
  const state = {
    n: opts.size ?? 5,
    minSize: opts.minSize ?? 2,
    maxSize: opts.maxSize ?? 10,
    symmetric: opts.symmetric ?? false,
    diagonal: opts.diagonal ?? "inf",
    labels: opts.labels ?? null,
    emptyValue: opts.emptyValue ?? INF,
    M: null,
  };

  function mkEmpty(n) {
    const M = Array.from({ length: n }, () => Array(n).fill(INF));
    if (state.diagonal === "zero") for (let i = 0; i < n; i++) M[i][i] = 0;
    return M;
  }
  state.M = mkEmpty(state.n);

  const wrap = h("div", { class: "matrix-wrap" });
  const container = h("div", {}, [wrap]);

  function render() {
    wrap.innerHTML = "";
    const table = h("table", { class: "matrix-input" });
    // header row
    const thead = h("thead");
    const hrow = h("tr");
    hrow.appendChild(h("th", {}, ""));
    for (let j = 0; j < state.n; j++) {
      hrow.appendChild(h("th", {}, state.labels ? state.labels[j] : String(j + 1)));
    }
    thead.appendChild(hrow);
    table.appendChild(thead);

    const tbody = h("tbody");
    for (let i = 0; i < state.n; i++) {
      const tr = h("tr");
      tr.appendChild(h("th", {}, state.labels ? state.labels[i] : String(i + 1)));
      for (let j = 0; j < state.n; j++) {
        const isDiag = i === j;
        const td = h("td", { class: isDiag ? "diag" : "" });
        const v = state.M[i][j];
        const diagReadonly = isDiag && state.diagonal !== "free";
        const input = h("input", {
          type: "text",
          value: v === INF ? (isDiag && state.diagonal === "inf" ? INF_SYMBOL : "") : fmt(v),
          readonly: diagReadonly ? true : null,
          tabindex: diagReadonly ? -1 : 0,
          inputmode: diagReadonly ? null : "numeric",
          enterkeyhint: diagReadonly ? null : "next",
          dataset: { i, j },
        });
        input.addEventListener("change", (e) => {
          const raw = e.target.value.trim();
          let vv = parseCell(raw);
          if (vv === INF && raw === "" && !isDiag) vv = state.emptyValue;
          state.M[i][j] = vv;
          if (state.symmetric && i !== j) state.M[j][i] = vv;
          render();
          opts.onChange?.(state.M);
        });
        input.addEventListener("keydown", (e) => {
          const { i: ci, j: cj } = e.target.dataset;
          const I = +ci, J = +cj;
          let ni = I, nj = J;
          if (e.key === "Tab") return;
          if (e.key === "ArrowRight") nj = Math.min(state.n - 1, J + 1);
          else if (e.key === "ArrowLeft") nj = Math.max(0, J - 1);
          else if (e.key === "ArrowDown") ni = Math.min(state.n - 1, I + 1);
          else if (e.key === "ArrowUp") ni = Math.max(0, I - 1);
          else if (e.key === "Enter") {
            // Следующая ячейка вправо, затем перенос строки; пропускаем диагональ
            let nextI = I, nextJ = J + 1;
            if (nextJ >= state.n) { nextI = I + 1; nextJ = 0; }
            if (nextI >= state.n) { nextI = 0; nextJ = 0; }
            if (nextI === nextJ && state.diagonal !== "free") {
              nextJ++;
              if (nextJ >= state.n) { nextI++; nextJ = 0; }
              if (nextI >= state.n) { nextI = 0; nextJ = 0; }
            }
            ni = nextI; nj = nextJ;
          }
          else return;
          e.preventDefault();
          const next = table.querySelector(`input[data-i="${ni}"][data-j="${nj}"]`);
          next?.focus();
          next?.select();
        });
        td.appendChild(input);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    wrap.appendChild(table);
  }

  function setSize(n) {
    n = Math.max(state.minSize, Math.min(state.maxSize, n | 0));
    if (n === state.n) return;
    const old = state.M;
    const next = mkEmpty(n);
    for (let i = 0; i < Math.min(n, old.length); i++)
      for (let j = 0; j < Math.min(n, old.length); j++)
        next[i][j] = old[i][j];
    state.M = next;
    state.n = n;
    render();
    opts.onChange?.(state.M);
  }

  function setMatrix(M) {
    state.n = M.length;
    state.M = M.map((row) => row.slice());
    render();
    opts.onChange?.(state.M);
  }

  function setLabels(labels) {
    state.labels = labels;
    render();
  }

  function getMatrix() { return state.M.map((r) => r.slice()); }
  function getSize() { return state.n; }

  render();

  return {
    element: container,
    setSize,
    setMatrix,
    setLabels,
    getMatrix,
    getSize,
  };
}
