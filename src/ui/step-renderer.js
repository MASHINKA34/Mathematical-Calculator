import { h, fmt, INF, INF_SYMBOL, copyToClipboard } from "../utils.js";
import { renderGraph } from "./graph-viz.js";
import { renderTree } from "./tree-viz.js";

/**
 * Step shape (all fields optional except title):
 *   {
 *     title:   "Шаг N: ...",
 *     text:    "...",              // multiline, monospace, inline <span class="hi/ok/err/dim">
 *     matrix:  { data, rowLabels?, colLabels?, highlight?: {rows?, cols?, cells?: [[i,j],...]}, zeros?: bool },
 *     table:   { head: [...], rows: [[...], ...], highlight?: {row?, col?, cell?:[r,c]} },
 *     graph:   { n, edges:[[i,j,w,opt]], directed?, pos?, activeEdges?, mstEdges?, pathEdges?, activeNodes?, doneNodes? },
 *     tree:    { root: node }, // for branch-and-bound
 *     final:   bool
 *   }
 */

export function createSolutionPanel() {
  const wrap = h("div", { class: "solution-wrap empty" }, "Решение появится здесь после нажатия «Решить».");
  let lastSteps = [];
  let lastTitle = "Решение";

  function render(steps, title = "Решение") {
    lastSteps = steps;
    lastTitle = title;
    wrap.className = "solution-wrap";
    wrap.innerHTML = "";

    const header = h("div", { class: "solution-header" }, [
      h("h3", {}, title),
      h("div", { class: "solution-actions" }, [
        h("button", {
          class: "btn ghost",
          onClick: () => {
            copyToClipboard(stepsToText(lastSteps, lastTitle)).then(() => {
              flashButton(header.querySelector("button"));
            });
          },
        }, "📋 Копировать"),
      ]),
    ]);
    wrap.appendChild(header);

    for (const step of steps) {
      wrap.appendChild(renderStep(step));
    }
  }

  function renderError(message) {
    wrap.className = "solution-wrap";
    wrap.innerHTML = "";
    wrap.appendChild(h("div", { class: "alert" }, message));
  }

  function renderInfo(message) {
    wrap.className = "solution-wrap empty";
    wrap.innerHTML = "";
    wrap.appendChild(h("div", {}, message));
  }

  function clear() {
    wrap.className = "solution-wrap empty";
    wrap.innerHTML = "";
    wrap.appendChild(document.createTextNode("Решение появится здесь после нажатия «Решить»."));
  }

  return { element: wrap, render, renderError, renderInfo, clear };
}

function flashButton(btn) {
  if (!btn) return;
  const old = btn.textContent;
  btn.textContent = "✓ Скопировано";
  setTimeout(() => { btn.textContent = old; }, 1200);
}

function renderStep(step) {
  const div = h("div", { class: "step" + (step.final ? " step-final" : "") });
  if (step.title) div.appendChild(h("div", { class: "step-title" }, step.title));
  if (step.text) {
    const t = h("div", { class: "step-text" });
    t.innerHTML = step.text; // text comes from our code (safe), may include <span class>
    div.appendChild(t);
  }
  if (step.matrix) div.appendChild(renderMatrix(step.matrix));
  if (step.table) div.appendChild(renderTable(step.table));
  if (step.graph) {
    const box = h("div", { class: "graph-box" });
    box.appendChild(renderGraph(step.graph));
    div.appendChild(box);
  }
  if (step.tree) {
    const box = h("div", { class: "tree-wrap" });
    box.appendChild(renderTree(step.tree));
    div.appendChild(box);
  }
  return div;
}

function renderMatrix({ data, rowLabels, colLabels, highlight = {}, emphasizeZeros = false }) {
  const n = data.length;
  const m = data[0]?.length ?? 0;
  const hlRows = new Set(highlight.rows ?? []);
  const hlCols = new Set(highlight.cols ?? []);
  const hlCells = new Set((highlight.cells ?? []).map(([r, c]) => `${r},${c}`));

  const rLab = rowLabels ?? Array.from({ length: n }, (_, i) => String(i + 1));
  const cLab = colLabels ?? Array.from({ length: m }, (_, i) => String(i + 1));

  const tbl = h("table");
  const hrow = h("tr");
  hrow.appendChild(h("th", { class: "top" }, ""));
  for (let j = 0; j < m; j++) hrow.appendChild(h("th", { class: "top" }, cLab[j]));
  tbl.appendChild(hrow);
  for (let i = 0; i < n; i++) {
    const tr = h("tr");
    tr.appendChild(h("th", { class: "left" }, rLab[i]));
    for (let j = 0; j < m; j++) {
      const v = data[i][j];
      let cls = "cell";
      if (v === INF) cls += " inf";
      if (emphasizeZeros && v === 0) cls += " zero";
      if (hlCells.has(`${i},${j}`)) cls += " hl";
      else if (hlRows.has(i)) cls += " hl-row";
      else if (hlCols.has(j)) cls += " hl-col";
      tr.appendChild(h("td", { class: cls }, fmt(v)));
    }
    tbl.appendChild(tr);
  }
  return h("div", { class: "matrix-display" }, [tbl]);
}

function renderTable({ head, rows, highlight = {} }) {
  const tbl = h("table", { class: "data-table" });
  const hrow = h("tr");
  for (const h0 of head) hrow.appendChild(h("th", {}, h0));
  tbl.appendChild(hrow);
  rows.forEach((row, r) => {
    const tr = h("tr");
    row.forEach((cell, c) => {
      let cls = "";
      if (highlight.row === r) cls = "hl";
      if (highlight.col === c) cls = "hl";
      if (highlight.cell && highlight.cell[0] === r && highlight.cell[1] === c) cls = "hl";
      if (highlight.fixedRows && highlight.fixedRows.includes(r)) cls = "fixed";
      tr.appendChild(h("td", { class: cls }, cell));
    });
    tbl.appendChild(tr);
  });
  return tbl;
}

/* ---------- plain-text export ---------- */

export function stepsToText(steps, title = "Решение") {
  const out = [];
  out.push(title);
  out.push("=".repeat(Math.max(12, title.length)));
  out.push("");
  for (const s of steps) {
    if (s.title) out.push(s.title);
    if (s.text) out.push(stripHtml(s.text));
    if (s.matrix) out.push(matrixToText(s.matrix));
    if (s.table) out.push(tableToText(s.table));
    out.push("");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function stripHtml(s) {
  return String(s).replace(/<[^>]+>/g, "");
}

function matrixToText({ data, rowLabels, colLabels }) {
  const n = data.length;
  const m = data[0]?.length ?? 0;
  const rLab = rowLabels ?? Array.from({ length: n }, (_, i) => String(i + 1));
  const cLab = colLabels ?? Array.from({ length: m }, (_, i) => String(i + 1));
  const cells = [];
  for (let i = 0; i <= n; i++) cells.push([]);
  cells[0].push("");
  for (let j = 0; j < m; j++) cells[0].push(cLab[j]);
  for (let i = 0; i < n; i++) {
    cells[i + 1].push(rLab[i]);
    for (let j = 0; j < m; j++) cells[i + 1].push(data[i][j] === INF ? INF_SYMBOL : fmt(data[i][j]));
  }
  const widths = [];
  for (let c = 0; c < cells[0].length; c++) {
    let w = 0;
    for (let r = 0; r < cells.length; r++) w = Math.max(w, cells[r][c].length);
    widths.push(w);
  }
  return cells
    .map((row, rIdx) => {
      const parts = row.map((x, c) => x.padStart(widths[c]));
      if (rIdx === 0) return "  " + parts.slice(1).join("  ");
      return parts[0] + " [ " + parts.slice(1).join("  ") + " ]";
    })
    .join("\n");
}

function tableToText({ head, rows }) {
  const all = [head, ...rows.map((r) => r.map((x) => String(x)))];
  const widths = [];
  for (let c = 0; c < head.length; c++) {
    let w = 0;
    for (const r of all) w = Math.max(w, String(r[c] ?? "").length);
    widths.push(w);
  }
  const pad = (r) => "| " + r.map((x, i) => String(x ?? "").padEnd(widths[i])).join(" | ") + " |";
  const sep = "|" + widths.map((w) => "-".repeat(w + 2)).join("|") + "|";
  return [pad(head), sep, ...rows.map(pad)].join("\n");
}
