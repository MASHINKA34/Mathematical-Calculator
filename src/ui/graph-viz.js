import { svg, INF, fmt } from "../utils.js";

/**
 * Render a graph as SVG.
 *
 *   g = {
 *     n: number of vertices,
 *     edges: [[i, j, w], ...],  // i,j are 0-based
 *     directed: bool,
 *     pos: [{x,y}, ...]  // optional explicit positions (svg units)
 *     activeEdges: [[i,j], ...],    // highlighted (current step)
 *     mstEdges:    [[i,j], ...],    // green (Prim)
 *     pathEdges:   [[i,j], ...],    // yellow (shortest path / TSP route)
 *     edgeLabels:  { "i-j": "custom" }   // override weight label
 *     activeNodes: [i, ...]  // blue
 *     doneNodes:   [i, ...]  // green
 *     labels:      [...]     // node labels (defaults "1".."n")
 *   }
 */
export function renderGraph(g) {
  const n = g.n;
  const labels = g.labels ?? Array.from({ length: n }, (_, i) => String(i + 1));
  const directed = !!g.directed;

  const size = Math.max(340, 60 + n * 40);
  const cx = size / 2, cy = size / 2;
  const r = size / 2 - 36;

  const pos = g.pos ?? Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  });

  const activeSet = edgeSet(g.activeEdges, directed);
  const mstSet = edgeSet(g.mstEdges, directed);
  const pathSet = edgeSet(g.pathEdges, directed);
  const activeNodes = new Set(g.activeNodes ?? []);
  const doneNodes = new Set(g.doneNodes ?? []);

  const root = svg("svg", {
    width: size, height: size, viewBox: `0 0 ${size} ${size}`,
  });

  // arrow marker
  if (directed) {
    const defs = svg("defs");
    defs.appendChild(svg("marker", {
      id: "arrow", viewBox: "0 0 10 10", refX: 10, refY: 5,
      markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse",
    }, [svg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#9aa7b4" })]));
    defs.appendChild(svg("marker", {
      id: "arrow-active", viewBox: "0 0 10 10", refX: 10, refY: 5,
      markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse",
    }, [svg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#6ea8ff" })]));
    defs.appendChild(svg("marker", {
      id: "arrow-path", viewBox: "0 0 10 10", refX: 10, refY: 5,
      markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse",
    }, [svg("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#ffd866" })]));
    root.appendChild(defs);
  }

  // group parallel edges (i->j and j->i when directed)
  const seenPairs = new Set();
  const edges = (g.edges ?? []).filter(([i, j]) => i !== j && i >= 0 && j >= 0 && i < n && j < n);

  for (const e of edges) {
    const [i, j, w] = e;
    const key = directed ? `${i}->${j}` : [i, j].sort().join("-");
    if (!directed && seenPairs.has(key)) continue;
    seenPairs.add(key);

    const p1 = pos[i], p2 = pos[j];
    // for directed: if both i->j and j->i exist, curve them
    const reverseExists = directed && edges.some(([a, b]) => a === j && b === i);

    const p = edgePath(p1, p2, reverseExists);

    const aId = `${Math.min(i, j)}-${Math.max(i, j)}`;
    const isActive = activeSet.has(directed ? `${i}-${j}` : aId);
    const isMst = mstSet.has(aId);
    const isPath = pathSet.has(directed ? `${i}-${j}` : aId);

    let cls = "graph-edge";
    let marker = directed ? "url(#arrow)" : null;
    if (isActive) { cls += " active"; marker = directed ? "url(#arrow-active)" : null; }
    if (isMst) cls += " mst";
    if (isPath) { cls += " path"; marker = directed ? "url(#arrow-path)" : null; }

    const path = svg("path", {
      class: cls, d: p.d,
      "marker-end": marker,
    });
    root.appendChild(path);

    // edge label
    const customKey = `${i}-${j}`;
    const label = g.edgeLabels?.[customKey] ?? (w === undefined || w === INF ? "" : fmt(w));
    if (label !== "") {
      root.appendChild(svg("rect", {
        class: "graph-edge-bg",
        x: p.lx - labelWidth(label) / 2, y: p.ly - 8,
        width: labelWidth(label), height: 14, rx: 3,
        fill: "#0b1016", opacity: 0.75,
      }));
      root.appendChild(svg("text", {
        class: "graph-edge-label" + (isActive || isPath ? " active" : ""),
        x: p.lx, y: p.ly + 3,
      }, label));
    }
  }

  // nodes
  for (let i = 0; i < n; i++) {
    const { x, y } = pos[i];
    const active = activeNodes.has(i);
    const done = doneNodes.has(i);
    const cls = "graph-node" + (active ? " active" : done ? " done" : "");
    root.appendChild(svg("circle", { class: cls, cx: x, cy: y, r: 16 }));
    root.appendChild(svg("text", {
      class: "graph-node-label",
      x, y,
      fill: active ? "#0b1016" : undefined,
    }, labels[i]));
  }

  return root;
}

function edgeSet(list, directed) {
  const s = new Set();
  for (const e of list ?? []) {
    const [i, j] = e;
    if (directed) s.add(`${i}-${j}`);
    else s.add([i, j].sort((a, b) => a - b).join("-"));
  }
  return s;
}

function edgePath(p1, p2, curve) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const dist = Math.hypot(dx, dy);
  const nx = dx / dist, ny = dy / dist;
  const r = 16;
  const sx = p1.x + nx * r, sy = p1.y + ny * r;
  const ex = p2.x - nx * r, ey = p2.y - ny * r;

  if (!curve) {
    const lx = (sx + ex) / 2;
    const ly = (sy + ey) / 2;
    return { d: `M ${sx} ${sy} L ${ex} ${ey}`, lx, ly };
  }
  const mx = (sx + ex) / 2, my = (sy + ey) / 2;
  const px = -ny, py = nx;
  const offset = Math.min(40, dist * 0.22);
  const cx = mx + px * offset, cy = my + py * offset;
  return {
    d: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`,
    lx: mx + px * offset * 0.9,
    ly: my + py * offset * 0.9,
  };
}

function labelWidth(s) {
  return Math.max(14, 7 * s.length + 6);
}
