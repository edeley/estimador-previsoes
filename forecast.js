"use strict";

const EPSILON = 1e-6;
const DEFAULT_HALF_LIFE_DAYS = 14;
const DEFAULT_SAMPLE_PRIOR = 20;

function assertProbability(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(`${name} must be a finite number between 0 and 1`);
  }
}

function clampProbability(value) {
  return Math.min(1 - EPSILON, Math.max(EPSILON, value));
}

function logit(probability) {
  const p = clampProbability(probability);
  return Math.log(p / (1 - p));
}

function sigmoid(value) {
  if (value >= 0) {
    const exp = Math.exp(-value);
    return 1 / (1 + exp);
  }
  const exp = Math.exp(value);
  return exp / (1 + exp);
}

function parseTimestamp(value, name) {
  const timestamp = value instanceof Date
    ? value.getTime()
    : typeof value === "number"
      ? value
      : Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new TypeError(`${name} must be a valid date or timestamp`);
  }
  return timestamp;
}

function forecastBinaryEvent({
  marketProbability,
  priorProbability = marketProbability,
  marketWeight = 0.7,
  signals = [],
  halfLifeDays = DEFAULT_HALF_LIFE_DAYS,
  samplePrior = DEFAULT_SAMPLE_PRIOR,
  asOf = Date.now()
} = {}) {
  assertProbability(marketProbability, "marketProbability");
  assertProbability(priorProbability, "priorProbability");
  assertProbability(marketWeight, "marketWeight");
  if (!Array.isArray(signals)) throw new TypeError("signals must be an array");
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) throw new TypeError("halfLifeDays must be greater than 0");
  if (!Number.isFinite(samplePrior) || samplePrior < 0) throw new TypeError("samplePrior must be at least 0");

  const referenceTime = parseTimestamp(asOf, "asOf");
  const baselineLogOdds = marketWeight * logit(marketProbability) + (1 - marketWeight) * logit(priorProbability);
  let totalAdjustment = 0;
  const evidence = [];

  signals.forEach((signal, index) => {
    if (!signal || typeof signal !== "object") throw new TypeError(`signals[${index}] must be an object`);
    assertProbability(signal.probability, `signals[${index}].probability`);
    const reliability = signal.reliability === undefined ? 0.5 : signal.reliability;
    const weight = signal.weight === undefined ? 1 : signal.weight;
    const sampleSize = signal.sampleSize === undefined ? 0 : signal.sampleSize;
    assertProbability(reliability, `signals[${index}].reliability`);
    if (!Number.isFinite(weight) || weight < 0) throw new TypeError(`signals[${index}].weight must be at least 0`);
    if (!Number.isFinite(sampleSize) || sampleSize < 0) throw new TypeError(`signals[${index}].sampleSize must be at least 0`);

    const updatedAt = signal.updatedAt === undefined ? referenceTime : parseTimestamp(signal.updatedAt, `signals[${index}].updatedAt`);
    const ageDays = Math.max(0, (referenceTime - updatedAt) / 86_400_000);
    const recencyFactor = Math.pow(0.5, ageDays / halfLifeDays);
    const sampleFactor = samplePrior === 0 ? (sampleSize > 0 ? 1 : 0) : sampleSize / (sampleSize + samplePrior);
    const effectiveWeight = weight * reliability * sampleFactor * recencyFactor;
    const adjustment = effectiveWeight * (logit(signal.probability) - baselineLogOdds);
    totalAdjustment += adjustment;
    evidence.push({
      name: typeof signal.name === "string" ? signal.name : `Signal ${index + 1}`,
      probability: signal.probability,
      effectiveWeight,
      ageDays,
      sampleFactor,
      recencyFactor,
      adjustment
    });
  });

  const predictedProbability = sigmoid(baselineLogOdds + totalAdjustment);
  return {
    predictedProbability,
    marketProbability,
    edge: predictedProbability - marketProbability,
    edgePercentagePoints: (predictedProbability - marketProbability) * 100,
    baselineProbability: sigmoid(baselineLogOdds),
    evidence
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { forecastBinaryEvent };
}