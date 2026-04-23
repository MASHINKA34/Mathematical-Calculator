import { renderTspNnView } from "./ui/views/tsp-nn.js";
import { renderTspBnbView } from "./ui/views/tsp-bnb.js";
import { renderDijkstraView } from "./ui/views/dijkstra.js";
import { renderPrimView } from "./ui/views/prim.js";
import { renderFordFulkersonView } from "./ui/views/ford-fulkerson.js";
import { renderHammingView } from "./ui/views/hamming.js";

const views = {
  "tsp-nn": renderTspNnView,
  "tsp-bnb": renderTspBnbView,
  "dijkstra": renderDijkstraView,
  "prim": renderPrimView,
  "ford-fulkerson": renderFordFulkersonView,
  "hamming": renderHammingView,
};

const root = document.getElementById("view-root");
const navButtons = document.querySelectorAll(".nav-btn");

function switchView(name) {
  root.innerHTML = "";
  const render = views[name];
  if (!render) {
    root.textContent = "Калькулятор не найден";
    return;
  }
  navButtons.forEach((b) => {
    b.classList.toggle("active", b.dataset.view === name);
  });
  render(root);
  // persist selection
  try { localStorage.setItem("calc-view", name); } catch {}
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

// initial view: last used or first
let initial = "tsp-nn";
try {
  const saved = localStorage.getItem("calc-view");
  if (saved && views[saved]) initial = saved;
} catch {}
switchView(initial);
