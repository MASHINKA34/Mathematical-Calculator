// Shared utilities.

export const INF = Infinity;
export const INF_SYMBOL = "∞";

export function fmt(x) {
  if (x === INF || x === Infinity) return INF_SYMBOL;
  if (x === -Infinity) return "-" + INF_SYMBOL;
  if (typeof x !== "number" || Number.isNaN(x)) return "—";
  if (Number.isInteger(x)) return String(x);
  return String(Math.round(x * 1000) / 1000);
}

export function parseCell(raw) {
  const s = String(raw ?? "").trim();
  if (s === "" || s === "-" || s === INF_SYMBOL || s.toLowerCase() === "inf") return INF;
  const n = Number(s.replace(",", "."));
  return Number.isNaN(n) ? INF : n;
}

export function cloneMatrix(M) {
  return M.map((row) => row.slice());
}

export function range(n) {
  return Array.from({ length: n }, (_, i) => i);
}

// build symmetric matrix from upper triangle edges (for examples)
export function symMatrix(n, edges) {
  const M = Array.from({ length: n }, () => Array(n).fill(INF));
  for (let i = 0; i < n; i++) M[i][i] = INF;
  for (const [i, j, w] of edges) {
    M[i][j] = w;
    M[j][i] = w;
  }
  return M;
}

export function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
    else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === "dataset") Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    if (typeof c === "string" || typeof c === "number") el.appendChild(document.createTextNode(String(c)));
    else el.appendChild(c);
  }
  return el;
}

export function svg(tag, attrs = {}, children = []) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.setAttribute("class", v);
    else el.setAttribute(k, v);
  }
  const kids = Array.isArray(children) ? children : [children];
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    if (typeof c === "string" || typeof c === "number") el.appendChild(document.createTextNode(String(c)));
    else el.appendChild(c);
  }
  return el;
}

export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand("copy"); } catch {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

export function minBy(arr, fn) {
  let best = null, bestVal = Infinity;
  for (const x of arr) {
    const v = fn(x);
    if (v < bestVal) { bestVal = v; best = x; }
  }
  return best;
}
