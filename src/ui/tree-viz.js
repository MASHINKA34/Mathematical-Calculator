import { svg } from "../utils.js";

/**
 * Render branch-and-bound tree.
 *
 *  node = {
 *    id, label,           // label lines (array of strings)
 *    children: [{edgeLabel, node}],
 *    status: "normal" | "optimal" | "pruned"
 *  }
 */
export function renderTree(root) {
  // compute layout with simple tidy-tree approximation.
  const nodeW = 120, nodeH = 48;
  const hGap = 22, vGap = 40;

  // assign x/y
  let nextLeafX = 0;
  function layout(node, depth = 0) {
    node._depth = depth;
    if (!node.children || node.children.length === 0) {
      node._x = nextLeafX;
      nextLeafX += 1;
      return node._x;
    }
    const xs = node.children.map((c) => layout(c.node, depth + 1));
    node._x = (xs[0] + xs[xs.length - 1]) / 2;
    return node._x;
  }
  layout(root);

  // collect all nodes
  const all = [];
  (function walk(n, parent) {
    all.push({ node: n, parent });
    for (const c of n.children ?? []) walk(c.node, { parent: n, edgeLabel: c.edgeLabel });
  })(root, null);

  const maxDepth = Math.max(...all.map(({ node }) => node._depth));
  const width = Math.max(1, nextLeafX) * (nodeW + hGap) + 40;
  const height = (maxDepth + 1) * (nodeH + vGap) + 40;

  const root$ = svg("svg", {
    width, height, viewBox: `0 0 ${width} ${height}`,
  });

  // edges
  for (const { node, parent } of all) {
    if (!parent) continue;
    const parentNode = parent.parent;
    const px = 20 + parentNode._x * (nodeW + hGap) + nodeW / 2;
    const py = 20 + parentNode._depth * (nodeH + vGap) + nodeH;
    const cx = 20 + node._x * (nodeW + hGap) + nodeW / 2;
    const cy = 20 + node._depth * (nodeH + vGap);
    root$.appendChild(svg("path", {
      class: "tree-edge",
      d: `M ${px} ${py} L ${px} ${(py + cy) / 2} L ${cx} ${(py + cy) / 2} L ${cx} ${cy}`,
    }));
    if (parent.edgeLabel) {
      root$.appendChild(svg("text", {
        class: "tree-edge-label",
        x: (px + cx) / 2, y: (py + cy) / 2 - 4,
      }, parent.edgeLabel));
    }
  }

  // nodes
  for (const { node } of all) {
    const x = 20 + node._x * (nodeW + hGap);
    const y = 20 + node._depth * (nodeH + vGap);
    const g = svg("g", { class: "tree-node" + (node.status === "optimal" ? " optimal" : node.status === "pruned" ? " pruned" : "") });
    g.appendChild(svg("rect", { x, y, width: nodeW, height: nodeH, rx: 6 }));
    const lines = node.label;
    lines.forEach((ln, i) => {
      g.appendChild(svg("text", {
        x: x + nodeW / 2,
        y: y + 16 + i * 14,
      }, ln));
    });
    root$.appendChild(g);
  }

  return root$;
}
