import { h } from "../../utils.js";

export function viewHeader(title, desc) {
  return h("div", { class: "view-header" }, [
    h("h1", { class: "view-title" }, title),
    desc ? h("p", { class: "view-desc" }, desc) : null,
  ]);
}

export function panel(title, ...children) {
  return h("div", { class: "panel" }, [
    h("h3", {}, title),
    ...children.flat(),
  ]);
}

export function sizeControl({ label = "Размер n", value, min, max, onChange }) {
  const input = h("input", { type: "number", value, min, max });
  input.addEventListener("input", () => {
    const v = Math.max(min, Math.min(max, +input.value || min));
    onChange(v);
  });
  return h("div", { class: "field" }, [
    h("label", {}, label),
    input,
  ]);
}

export function numberField({ label, value, min, max, step = 1, onChange }) {
  const input = h("input", { type: "number", value, min, max, step });
  input.addEventListener("input", () => onChange(Number(input.value)));
  return { el: h("div", { class: "field" }, [h("label", {}, label), input]), input };
}

export function textField({ label, value = "", placeholder = "", onChange }) {
  const input = h("input", { type: "text", value, placeholder });
  if (onChange) input.addEventListener("input", () => onChange(input.value));
  return { el: h("div", { class: "field" }, [h("label", {}, label), input]), input };
}
