/**
 * Hamming code (systematic, interleaved with control bits at positions 2^k).
 * Input alpha is a binary string (9 bits by convention but we support any length m).
 */

export function hammingEncode(alpha) {
  const m = alpha.length;
  if (m === 0) throw new Error("Пустое сообщение.");
  if (!/^[01]+$/.test(alpha)) throw new Error("Сообщение должно состоять из 0 и 1.");

  const steps = [];
  steps.push({
    title: "Постановка",
    text:
      `Дано: α = <span class="hi">${alpha}</span>, m = ${m} (длина исходного сообщения).\n` +
      `Требуется построить код Хемминга β, исправляющий одиночную ошибку.`,
  });

  // Step 1: find k
  let k = 0;
  const kLines = [];
  for (let kk = 1; kk < 32; kk++) {
    const ok = (1 << kk) >= kk + m + 1;
    kLines.push(`  k=${kk}: 2^${kk} = ${1 << kk}  ${ok ? "≥" : "<"}  k + m + 1 = ${kk + m + 1}  ${ok ? "— ДА" : "— нет"}`);
    if (ok) { k = kk; break; }
  }
  const l = m + k;

  steps.push({
    title: "Шаг 1: определяем число контрольных разрядов k",
    text:
      `Подбираем минимальное k, при котором 2^k ≥ k + m + 1:\n` +
      kLines.join("\n") +
      `\n\nВыбираем <span class="hi">k = ${k}</span>.\n` +
      `Общая длина кода: l = m + k = ${m} + ${k} = <span class="hi">${l}</span>.`,
  });

  // Step 2: V table (binary representations of positions 1..l)
  const V = [];
  for (let r = 0; r < k; r++) V.push([]);
  for (let i = 1; i <= l; i++) {
    for (let r = 0; r < k; r++) {
      V[r].push((i >> r) & 1);
    }
  }
  steps.push({
    title: "Шаг 2: таблица двоичных представлений",
    text: `Записываем двоичные представления чисел 1..${l} (младший бит — V₀):`,
    table: {
      head: ["i", ...Array.from({ length: l }, (_, i) => String(i + 1))],
      rows: V.map((row, r) => [`V${sub(r)}`, ...row.map(String)]),
    },
  });

  // Step 3: L sets and control/info positions
  const L = V.map((row) => row.map((v, idx) => v === 1 ? idx + 1 : null).filter(Boolean));
  const controlPositions = Array.from({ length: k }, (_, r) => 1 << r);
  const infoPositions = [];
  for (let i = 1; i <= l; i++) if (!controlPositions.includes(i)) infoPositions.push(i);

  steps.push({
    title: "Шаг 3: множества L и распределение разрядов",
    text:
      L.map((set, r) => `  L${sub(r)} = { i : V${sub(r)} = 1 } = { ${set.join(", ")} }`).join("\n") +
      `\n\nКонтрольные разряды (позиции-степени двойки): ` +
      controlPositions.map((p) => `b${sub(p)}`).join(", ") +
      `\nИнформационные разряды: ` +
      infoPositions.map((p, i) => `b${sub(p)} = a${sub(i + 1)}`).join(", "),
  });

  // Step 4: place information bits
  const b = Array(l + 1).fill(null); // 1-indexed
  infoPositions.forEach((p, i) => { b[p] = Number(alpha[i]); });
  steps.push({
    title: "Шаг 4: расставляем информационные символы",
    text: infoPositions.map((p, i) => `  b${sub(p)} = a${sub(i + 1)} = ${alpha[i]}`).join("\n"),
  });

  // Step 5: compute control bits via XOR on L_r \ {2^r}
  const controlLines = [];
  for (let r = 0; r < k; r++) {
    const pos = 1 << r;
    const members = L[r].filter((x) => x !== pos);
    const bitsWithIndices = members.map((idx) => ({ idx, bit: b[idx] }));
    const xorVal = bitsWithIndices.reduce((acc, { bit }) => acc ^ bit, 0);
    b[pos] = xorVal;
    controlLines.push(
      `  b${sub(pos)} = ` +
      bitsWithIndices.map(({ idx }) => `b${sub(idx)}`).join(" ⊕ ") +
      ` = ` +
      bitsWithIndices.map(({ bit }) => String(bit)).join("⊕") +
      ` = <span class="ok">${xorVal}</span>`
    );
  }
  steps.push({
    title: "Шаг 5: вычисляем контрольные разряды (XOR)",
    text: controlLines.join("\n"),
  });

  // Final code
  const beta = b.slice(1).join("");
  steps.push({
    title: "Шаг 6: итоговый код",
    final: true,
    text:
      `β = b${sub(1)} b${sub(2)} … b${sub(l)} = <span class="ok">${beta}</span>\n\n` +
      Array.from({ length: l }, (_, i) => {
        const pos = i + 1;
        const isCtrl = controlPositions.includes(pos);
        return `  b${sub(pos)} = ${beta[i]}` + (isCtrl ? ` <span class="dim">(контрольный)</span>` : "");
      }).join("\n"),
  });

  return { steps, beta, k, l, V, L, controlPositions, infoPositions };
}

export function hammingDecode(betaPrime, m) {
  if (!/^[01]+$/.test(betaPrime)) throw new Error("Сообщение должно состоять из 0 и 1.");
  const l = betaPrime.length;

  // determine k
  let k = 0;
  while ((1 << k) < l + 1) k++;
  if ((1 << k) !== nextPow(l + 1) && (1 << k) < l + 1) throw new Error("Некорректная длина β.");
  // check: l = m + k
  if (m !== undefined && m !== null && l !== m + k) {
    // try to adjust k based on l alone
    // here we just trust l
  }

  const steps = [];
  steps.push({
    title: "Декодирование",
    text: `Получено β' = <span class="hi">${betaPrime}</span> (l = ${l}).\nЧисло контрольных разрядов k = ${k}.`,
  });

  const V = [];
  for (let r = 0; r < k; r++) V.push([]);
  for (let i = 1; i <= l; i++) for (let r = 0; r < k; r++) V[r].push((i >> r) & 1);

  // compute syndrome t' = V_{k-1} ... V_0
  const synLines = [];
  const syndromeBits = [];
  for (let r = 0; r < k; r++) {
    const L = [];
    for (let i = 1; i <= l; i++) if (((i >> r) & 1) === 1) L.push(i);
    const bits = L.map((idx) => Number(betaPrime[idx - 1]));
    const v = bits.reduce((a, b) => a ^ b, 0);
    syndromeBits.push(v);
    synLines.push(
      `  V${sub(r)}' = ⊕ { b'${sub("j")} : j ∈ L${sub(r)} } = ` +
      L.map((idx) => `b'${sub(idx)}`).join("⊕") +
      ` = ${bits.join("⊕")} = <span class="${v === 0 ? "ok" : "hi"}">${v}</span>`
    );
  }
  steps.push({
    title: "Вычисляем синдром",
    text: synLines.join("\n"),
  });

  const tPrime = syndromeBits.reduceRight((acc, b) => acc * 2 + b, 0);

  if (tPrime === 0) {
    // no error
    const controlPositions = Array.from({ length: k }, (_, r) => 1 << r);
    const infoPositions = [];
    for (let i = 1; i <= l; i++) if (!controlPositions.includes(i)) infoPositions.push(i);
    const alpha = infoPositions.map((p) => betaPrime[p - 1]).join("");
    steps.push({
      title: "Результат",
      final: true,
      text:
        `<span class="ok">Синдром t' = 0 — ошибок не обнаружено.</span>\n` +
        `Восстановленное сообщение: α = <span class="ok">${alpha}</span>`,
    });
    return { steps, alpha, errorPosition: 0 };
  }

  // error at position tPrime
  const corrected = betaPrime.split("");
  corrected[tPrime - 1] = corrected[tPrime - 1] === "0" ? "1" : "0";
  const betaCorr = corrected.join("");

  const controlPositions = Array.from({ length: k }, (_, r) => 1 << r);
  const infoPositions = [];
  for (let i = 1; i <= l; i++) if (!controlPositions.includes(i)) infoPositions.push(i);
  const alpha = infoPositions.map((p) => betaCorr[p - 1]).join("");

  steps.push({
    title: "Ошибка обнаружена",
    text:
      `t' = V${sub(k - 1)}'…V${sub(0)}' = ${syndromeBits.slice().reverse().join("")}₂ = <span class="err">${tPrime}</span>\n` +
      `Ошибка в разряде <span class="err">b${sub(tPrime)}</span>. Инвертируем его.`,
  });
  steps.push({
    title: "Результат",
    final: true,
    text:
      `Исправленный код: β = <span class="ok">${betaCorr}</span>\n` +
      `Восстановленное сообщение: α = <span class="ok">${alpha}</span>`,
  });

  return { steps, alpha, errorPosition: tPrime };
}

function sub(n) {
  const d = String(n);
  const map = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
  return d.split("").map((c) => map[c] ?? c).join("");
}

function nextPow(x) {
  let p = 1;
  while (p < x) p <<= 1;
  return p;
}
