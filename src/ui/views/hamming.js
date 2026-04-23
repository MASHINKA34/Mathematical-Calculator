import { h } from "../../utils.js";
import { createSolutionPanel } from "../step-renderer.js";
import { hammingEncode, hammingDecode } from "../../algorithms/hamming.js";
import { viewHeader, panel, textField } from "./common.js";

export function renderHammingView(root) {
  const sol = createSolutionPanel();

  const alphaField = textField({ label: "α (сообщение, двоичная строка)", value: "101110111", placeholder: "например 101110111" });
  const btnEncode = h("button", { class: "btn primary" }, "Закодировать");

  const betaField = textField({ label: "β' (полученный код)", value: "", placeholder: "например 1010011010111" });
  const btnDecode = h("button", { class: "btn primary" }, "Декодировать");

  const btnExample = h("button", { class: "btn" }, "Загрузить пример");
  const btnReset = h("button", { class: "btn ghost" }, "Сбросить");

  btnEncode.addEventListener("click", () => {
    try {
      const alpha = alphaField.input.value.trim();
      const { steps, beta } = hammingEncode(alpha);
      sol.render(steps, `Код Хемминга: кодирование (α = ${alpha})`);
      betaField.input.value = beta;
    } catch (e) {
      sol.renderError(e.message);
    }
  });

  btnDecode.addEventListener("click", () => {
    try {
      const beta = betaField.input.value.trim();
      const { steps } = hammingDecode(beta);
      sol.render(steps, `Код Хемминга: декодирование (β' = ${beta})`);
    } catch (e) {
      sol.renderError(e.message);
    }
  });

  btnExample.addEventListener("click", () => {
    alphaField.input.value = "101110111";
    betaField.input.value = "1010011010111";
    sol.clear();
  });

  btnReset.addEventListener("click", () => {
    alphaField.input.value = "";
    betaField.input.value = "";
    sol.clear();
  });

  root.appendChild(viewHeader(
    "Коды Хемминга",
    "Систематический код с контрольными разрядами в позициях 2^k. Исправляет одиночную ошибку."
  ));

  root.appendChild(panel("Кодирование",
    h("div", { class: "row" }, [alphaField.el, btnEncode]),
  ));

  root.appendChild(panel("Декодирование (обнаружение и исправление ошибки)",
    h("div", { class: "row" }, [betaField.el, btnDecode]),
    h("div", { class: "hint" }, "Чтобы проверить исправление — закодируйте, поменяйте один бит в β и нажмите «Декодировать».")
  ));

  root.appendChild(h("div", { class: "row" }, [btnExample, btnReset]));
  root.appendChild(sol.element);
}
