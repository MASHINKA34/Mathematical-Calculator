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
 *     emptyValue: value to use for blank non-diagonal cells (default INF)
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

  // Координаты ячейки, которую нужно сфокусировать после следующего render()
  let pendingFocus = null;
  // Флаг: пропустить ближайший change-event (уже обработали вручную в Enter-handler)
  let skipNextChange = false;

  function mkEmpty(n) {
    const M = Array.from({ length: n }, () => Array(n).fill(INF));
    if (state.diagonal === "zero") for (let i = 0; i < n; i++) M[i][i] = 0;
    return M;
  }
  state.M = mkEmpty(state.n);

  const wrap = h("div", { class: "matrix-wrap" });
  const container = h("div", {}, [wrap]);

  function commitCell(I, J, rawValue) {
    const isDiag = I === J;
    const raw = rawValue.trim();
    let vv = parseCell(raw);
    if (vv === INF && raw === "" && !isDiag) vv = state.emptyValue;
    state.M[I][J] = vv;
    if (state.symmetric && I !== J) state.M[J][I] = vv;
  }

  function render() {
    wrap.innerHTML = "";
    const table = h("table", { class: "matrix-input" });

    // Header row
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
          if (skipNextChange) { skipNextChange = false; return; }
          commitCell(i, j, e.target.value);
          render();
          opts.onChange?.(state.M);
        });

        input.addEventListener("keydown", (e) => {
          const I = +e.target.dataset.i;
          const J = +e.target.dataset.j;
          let ni = I, nj = J;

          if (e.key === "Tab") return;

          if (e.key === "ArrowRight") {
            nj = Math.min(state.n - 1, J + 1);
          } else if (e.key === "ArrowLeft") {
            nj = Math.max(0, J - 1);
          } else if (e.key === "ArrowDown") {
            ni = Math.min(state.n - 1, I + 1);
          } else if (e.key === "ArrowUp") {
            ni = Math.max(0, I - 1);
          } else if (e.key === "Enter") {
            // Вычисляем следующую ячейку: вправо, затем перенос строки, пропускаем диагональ
            let nextI = I, nextJ = J + 1;
            if (nextJ >= state.n) { nextI = I + 1; nextJ = 0; }
            if (nextI >= state.n) { nextI = 0; nextJ = 0; }
            if (nextI === nextJ && state.diagonal !== "free") {
              nextJ++;
              if (nextJ >= state.n) { nextI++; nextJ = 0; }
              if (nextI >= state.n) { nextI = 0; nextJ = 0; }
            }

            // Коммитим текущую ячейку вручную и перерисовываем,
            // чтобы не зависеть от blur/change (render() уничтожит DOM раньше чем blur успеет)
            commitCell(I, J, e.target.value);
            skipNextChange = true; // blur после render вызовет change — игнорируем его
            pendingFocus = { fi: nextI, fj: nextJ };
            render();
            opts.onChange?.(state.M);
            e.preventDefault();
            return;
          } else {
            return;
          }

          // Стрелки: DOM не пересоздаётся, ищем в текущей таблице
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

    // Фокусируем ячейку, запрошенную до перерисовки (например, после Enter)
    if (pendingFocus !== null) {
      const { fi, fj } = pendingFocus;
      pendingFocus = null;
      const target = table.querySelector(`input[data-i="${fi}"][data-j="${fj}"]`);
      target?.focus();
      target?.select();
    }
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

  function getMatrix() {
    // Подставляем emptyValue вместо INF для незаполненных не-диагональных ячеек
    return state.M.map((row, i) =>
      row.map((v, j) => (i !== j && v === INF ? state.emptyValue : v))
    );
  }

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
