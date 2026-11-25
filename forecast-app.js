"use strict";

const form = document.getElementById("forecastForm");
const signalsElement = document.getElementById("signals");
const errorElement = document.getElementById("error");
const marketWeightInput = document.getElementById("marketWeight");

function createField(label, name, value, options = {}) {
  const field = document.createElement("label");
  field.className = `field${options.className ? ` ${options.className}` : ""}`;
  const caption = document.createElement("span");
  caption.textContent = label;
  const input = document.createElement("input");
  input.name = name;
  input.type = options.type || "number";
  input.value = value;
  input.min = options.min ?? "0";
  input.max = options.max ?? "100";
  input.step = options.step || "0.1";
  input.required = true;
  input.setAttribute("aria-label", label);
  field.append(caption, input);
  return field;
}

function addSignal() {
  const card = document.createElement("div");
  card.className = "signal-card";
  card.append(
    createField("Nome", "name", `Sinal ${signalsElement.children.length + 1}`, { type: "text" }),
    createField("Previsão (%)", "probability", "60"),
    createField("Amostra", "sampleSize", "50", { min: "0", max: "1000000", step: "1" }),
    createField("Confiabilidade (%)", "reliability", "65", { className: "reliability-field" }),
    createField("Idade do sinal (dias)", "ageDays", "0", { className: "age-field", min: "0", max: "36500", step: "1" })
  );
  const remove = document.createElement("button");
  remove.className = "remove-signal";
  remove.type = "button";
  remove.textContent = "×";
  remove.setAttribute("aria-label", "Remover sinal");
  remove.addEventListener("click", () => card.remove());
  card.append(remove);
  signalsElement.append(card);
}

function percentInput(id) {
  const value = Number(document.getElementById(id).value);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    const label = document.getElementById(id).closest("label").querySelector("span").textContent;
    throw new RangeError(`${label}: informe um valor entre 0 e 100.`);
  }
  return value / 100;
}

function collectSignals() {
  return [...signalsElement.querySelectorAll(".signal-card")].map((card, index) => {
    const get = (name) => card.querySelector(`[name="${name}"]`).value.trim();
    const probability = Number(get("probability"));
    const reliability = Number(get("reliability"));
    const sampleSize = Number(get("sampleSize"));
    const ageDays = Number(get("ageDays"));
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) throw new RangeError(`A previsão do Sinal ${index + 1} deve estar entre 0 e 100%.`);
    if (!Number.isFinite(reliability) || reliability < 0 || reliability > 100) throw new RangeError(`A confiabilidade do Sinal ${index + 1} deve estar entre 0 e 100%.`);
    if (!Number.isFinite(sampleSize) || sampleSize < 0) throw new RangeError(`A amostra do Sinal ${index + 1} deve ser zero ou maior.`);
    if (!Number.isFinite(ageDays) || ageDays < 0) throw new RangeError(`A idade do Sinal ${index + 1} deve ser zero ou maior.`);
    return {
      name: get("name") || `Sinal ${index + 1}`,
      probability: probability / 100,
      reliability: reliability / 100,
      sampleSize,
      updatedAt: new Date(Date.now() - ageDays * 86_400_000)
    };
  });
}

function formatPercent(value, includeSign = false) {
  const formatted = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(Math.abs(value));
  const sign = includeSign ? (value > 0 ? "+" : value < 0 ? "−" : "") : "";
  return `${sign}${formatted}%`;
}

function renderEvidence(evidence) {
  const list = document.getElementById("evidenceList");
  list.replaceChildren();
  if (!evidence.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum sinal foi incluído; o resultado usa mercado e taxa-base.";
    list.append(empty);
    return;
  }
  evidence.forEach((item) => {
    const row = document.createElement("div");
    row.className = "evidence-row";
    const name = document.createElement("span");
    name.textContent = `${item.name} · peso efetivo ${Math.round(item.effectiveWeight * 100)}%`;
    const adjustment = document.createElement("strong");
    adjustment.textContent = `${item.adjustment > 0 ? "+" : ""}${item.adjustment.toFixed(2)} log-odds`;
    adjustment.className = item.adjustment > 0.001 ? "positive" : item.adjustment < -0.001 ? "negative" : "neutral";
    row.append(name, adjustment);
    list.append(row);
  });
}

function calculate() {
  errorElement.hidden = true;
  const result = forecastBinaryEvent({
    marketProbability: percentInput("marketProbability"),
    priorProbability: percentInput("priorProbability"),
    marketWeight: Number(marketWeightInput.value) / 100,
    signals: collectSignals()
  });
  document.getElementById("resultEvent").textContent = document.getElementById("eventName").value.trim() || "Seu evento";
  document.getElementById("predictedProbability").textContent = formatPercent(result.predictedProbability * 100);
  document.getElementById("marketResult").textContent = formatPercent(result.marketProbability * 100);
  document.getElementById("edgeResult").textContent = formatPercent(result.edgePercentagePoints, true);
  document.getElementById("baselineResult").textContent = formatPercent(result.baselineProbability * 100);
  document.getElementById("probabilityBar").style.width = `${result.predictedProbability * 100}%`;
  renderEvidence(result.evidence);
}

document.getElementById("addSignal").addEventListener("click", addSignal);
marketWeightInput.addEventListener("input", () => {
  document.getElementById("marketWeightOutput").value = `${marketWeightInput.value}%`;
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    calculate();
  } catch (error) {
    errorElement.textContent = error.message;
    errorElement.hidden = false;
  }
});

addSignal();
calculate();