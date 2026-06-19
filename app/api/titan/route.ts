import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type FinnhubQuote = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  o?: number;
  pc?: number;
  t?: number;
};

type FinnhubCandle = {
  c?: number[];
  h?: number[];
  l?: number[];
  o?: number[];
  v?: number[];
  t?: number[];
  s?: string;
};

type FinnhubPriceTarget = {
  targetHigh?: number;
  targetLow?: number;
  targetMean?: number;
  targetMedian?: number;
  lastUpdated?: string;
};

type FinnhubRecommendation = {
  period?: string;
  strongBuy?: number;
  buy?: number;
  hold?: number;
  sell?: number;
  strongSell?: number;
};

type FinnhubMetric = {
  metric?: Record<string, unknown>;
};

type LiveQuote = {
  ticker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  asOf: string;
  source: string;
};

type OptionCandidate = {
  ticker: string;
  expiration: string;
  strike: number;
  dte: number;
  delta: number | null;
  bid: number | null;
  ask: number | null;
  last: number | null;
  mid: number | null;
  impliedVolatility: number | null;
  openInterest: number | null;
  volume: number | null;
  score: number;
  note: string;
};

type SignalAutoData = {
  ticker: string;
  asOf: string;
  price: number | null;
  targetHigh: number | null;
  targetLow: number | null;
  targetMean: number | null;
  targetMedian: number | null;
  targetLastUpdated: string | null;
  upside: number | null;
  upsideSource: "Finnhub price target" | "Manual";
  recommendationScore: number | null;
  recommendationTrend: string;
  momentumScore: number | null;
  momentum1m: number | null;
  momentum3m: number | null;
  momentum6m: number | null;
  momentum12m: number | null;
  qualityScore: number | null;
  qualityNotes: string;
  dispersion: number | null;
  dispersionSource: "Finnhub target range" | "Manual";
  warnings: string[];
};

type TaConfidence = "Manual" | "Low" | "Medium" | "High";

type TechnicalAutoData = {
  ticker: string;
  asOf: string;
  price: number | null;
  sma50: number | null;
  sma200: number | null;
  above200dma: boolean | null;
  technicalExtension: number | null;
  hvn: number | null;
  support: number | null;
  resistance: number | null;
  buyZoneLow: number | null;
  buyZoneHigh: number | null;
  buyAnchor: number | null;
  stopLevel: number | null;
  trimLow: number | null;
  trimHigh: number | null;
  rsi14: number | null;
  macdState: string;
  trendState: string;
  confidence: TaConfidence;
  notes: string;
  warnings: string[];
};

type AnyRecord = Record<string, unknown>;

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function normalizeTicker(input: string): string {
  return input.trim().toUpperCase();
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number | null, digits = 2): number | null {
  if (value === null) return null;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function daysToExpiration(expiration: string): number {
  const expiry = new Date(`${expiration}T16:00:00-04:00`).getTime();
  if (!Number.isFinite(expiry)) return 0;
  const now = Date.now();
  return Math.max(0, Math.ceil((expiry - now) / (24 * 60 * 60 * 1000)));
}

function getNumberFromKeys(record: AnyRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = finiteNumber(record[key]);
    if (value !== null) return value;
  }
  return null;
}

function getStringFromKeys(record: AnyRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function fetchFinnhubJson<T>(path: string, token: string): Promise<T> {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(
    `${FINNHUB_BASE}${path}${separator}token=${encodeURIComponent(token)}`,
    {
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `Finnhub request failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as T;
}

async function fetchQuote(symbol: string, token: string): Promise<LiveQuote> {
  const q = await fetchFinnhubJson<FinnhubQuote>(
    `/quote?symbol=${encodeURIComponent(symbol)}`,
    token,
  );
  const price = finiteNumber(q.c);
  const asOf = q.t
    ? new Date(q.t * 1000).toISOString()
    : new Date().toISOString();

  return {
    ticker: symbol,
    price: round(price),
    change: round(finiteNumber(q.d)),
    changePercent: round(finiteNumber(q.dp)),
    previousClose: round(finiteNumber(q.pc)),
    asOf,
    source: "Finnhub",
  };
}

async function fetchDailyCloses(
  symbol: string,
  token: string,
  lookbackDays = 430,
): Promise<number[]> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - lookbackDays * 24 * 60 * 60;
  const candle = await fetchFinnhubJson<FinnhubCandle>(
    `/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}`,
    token,
  );

  const closes = Array.isArray(candle.c)
    ? candle.c.filter((x) => Number.isFinite(x))
    : [];
  if (candle.s !== "ok" || closes.length === 0) return [];
  return closes;
}

async function fetchSma(
  symbol: string,
  token: string,
): Promise<{ sma50: number | null; sma200: number | null }> {
  const closes = await fetchDailyCloses(symbol, token, 370);
  if (closes.length === 0) {
    return { sma50: null, sma200: null };
  }

  return {
    sma50: round(average(closes.slice(-50))),
    sma200: round(average(closes.slice(-200))),
  };
}

function returnFromCloses(closes: number[], tradingDays: number): number | null {
  if (closes.length <= tradingDays) return null;
  const latest = closes[closes.length - 1];
  const base = closes[closes.length - 1 - tradingDays];
  if (!Number.isFinite(latest) || !Number.isFinite(base) || base <= 0) return null;
  return latest / base - 1;
}

async function fetchMomentumSignal(
  symbol: string,
  token: string,
): Promise<{
  momentumScore: number | null;
  momentum1m: number | null;
  momentum3m: number | null;
  momentum6m: number | null;
  momentum12m: number | null;
}> {
  const closes = await fetchDailyCloses(symbol, token, 430);
  if (closes.length < 65) {
    return {
      momentumScore: null,
      momentum1m: null,
      momentum3m: null,
      momentum6m: null,
      momentum12m: null,
    };
  }

  const r1m = returnFromCloses(closes, 21);
  const r3m = returnFromCloses(closes, 63);
  const r6m = returnFromCloses(closes, 126);
  const r12m = returnFromCloses(closes, 252);

  const weighted =
    (r1m ?? 0) * 0.25 +
    (r3m ?? 0) * 0.35 +
    (r6m ?? 0) * 0.25 +
    (r12m ?? 0) * 0.15;

  // Converts weighted trailing return into an intuitive 0–100 score.
  // +30% blended momentum ~= 100, flat ~= 50, -30% ~= 0.
  const score = clamp(50 + weighted * 165, 0, 100);

  return {
    momentumScore: round(score, 0),
    momentum1m: round(r1m, 4),
    momentum3m: round(r3m, 4),
    momentum6m: round(r6m, 4),
    momentum12m: round(r12m, 4),
  };
}

function recommendationScore(trend: FinnhubRecommendation[]): {
  score: number | null;
  label: string;
} {
  const latest = Array.isArray(trend) ? trend[0] : undefined;
  if (!latest) return { score: null, label: "Unavailable" };

  const strongBuy = finiteNumber(latest.strongBuy) ?? 0;
  const buy = finiteNumber(latest.buy) ?? 0;
  const hold = finiteNumber(latest.hold) ?? 0;
  const sell = finiteNumber(latest.sell) ?? 0;
  const strongSell = finiteNumber(latest.strongSell) ?? 0;
  const total = strongBuy + buy + hold + sell + strongSell;
  if (total <= 0) return { score: null, label: "Unavailable" };

  const raw =
    (strongBuy * 100 + buy * 80 + hold * 50 + sell * 20 + strongSell * 0) /
    total;
  const bullishMix = (strongBuy + buy) / total;
  const bearishMix = (sell + strongSell) / total;
  const score = clamp(raw + bullishMix * 5 - bearishMix * 10, 0, 100);
  return {
    score: round(score, 0),
    label: `${latest.period ?? "latest"}: ${strongBuy} strong buy / ${buy} buy / ${hold} hold / ${sell + strongSell} sell`,
  };
}

function firstMetric(metric: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = finiteNumber(metric[key]);
    if (value !== null) return value;
  }
  return null;
}

async function fetchQualityScore(symbol: string, token: string): Promise<{
  qualityScore: number | null;
  qualityNotes: string;
}> {
  const payload = await fetchFinnhubJson<FinnhubMetric>(
    `/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all`,
    token,
  );
  const metric = payload.metric ?? {};

  const grossMargin = firstMetric(metric, [
    "grossMarginTTM",
    "grossMargin5Y",
    "grossMarginAnnual",
  ]);
  const operatingMargin = firstMetric(metric, [
    "operatingMarginTTM",
    "operatingMargin5Y",
    "operatingMarginAnnual",
  ]);
  const netMargin = firstMetric(metric, [
    "netProfitMarginTTM",
    "netProfitMargin5Y",
    "netProfitMarginAnnual",
  ]);
  const roe = firstMetric(metric, ["roeTTM", "roe5Y", "roeAnnual"]);
  const currentRatio = firstMetric(metric, [
    "currentRatioAnnual",
    "currentRatioQuarterly",
  ]);
  const debtEquity = firstMetric(metric, [
    "totalDebt/totalEquityAnnual",
    "totalDebt/totalEquityQuarterly",
    "debtToEquityAnnual",
    "debtToEquityQuarterly",
  ]);

  const parts: number[] = [];
  if (grossMargin !== null) parts.push(clamp(grossMargin * 1.2, 0, 100));
  if (operatingMargin !== null) parts.push(clamp(50 + operatingMargin * 1.5, 0, 100));
  if (netMargin !== null) parts.push(clamp(50 + netMargin * 1.5, 0, 100));
  if (roe !== null) parts.push(clamp(50 + roe, 0, 100));
  if (currentRatio !== null) parts.push(clamp(currentRatio * 35, 0, 100));
  if (debtEquity !== null) parts.push(clamp(100 - debtEquity * 0.35, 0, 100));

  if (parts.length === 0) return { qualityScore: null, qualityNotes: "Unavailable" };

  return {
    qualityScore: round(average(parts), 0),
    qualityNotes: `Proxy from margins, ROE, liquidity and leverage metrics where Finnhub provides them. Inputs used: ${parts.length}.`,
  };
}

async function fetchSignalAutoData(
  symbol: string,
  token: string,
  price: number | null,
): Promise<SignalAutoData> {
  const warnings: string[] = [];
  const asOf = new Date().toISOString();

  let targetHigh: number | null = null;
  let targetLow: number | null = null;
  let targetMean: number | null = null;
  let targetMedian: number | null = null;
  let targetLastUpdated: string | null = null;
  let upside: number | null = null;
  let dispersion: number | null = null;

  try {
    const target = await fetchFinnhubJson<FinnhubPriceTarget>(
      `/stock/price-target?symbol=${encodeURIComponent(symbol)}`,
      token,
    );
    targetHigh = round(finiteNumber(target.targetHigh));
    targetLow = round(finiteNumber(target.targetLow));
    targetMean = round(finiteNumber(target.targetMean));
    targetMedian = round(finiteNumber(target.targetMedian));
    targetLastUpdated =
      typeof target.lastUpdated === "string" ? target.lastUpdated : null;

    const targetAnchor = targetMedian ?? targetMean;
    if (price && price > 0 && targetAnchor && targetAnchor > 0) {
      upside = round(targetAnchor / price - 1, 4);
    }
    if (targetHigh && targetLow && targetMean && targetMean > 0) {
      dispersion = round((targetHigh - targetLow) / targetMean, 4);
    }
  } catch (error) {
    warnings.push(
      `price target unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  let recommendation = { score: null as number | null, label: "Unavailable" };
  try {
    const rec = await fetchFinnhubJson<FinnhubRecommendation[]>(
      `/stock/recommendation?symbol=${encodeURIComponent(symbol)}`,
      token,
    );
    recommendation = recommendationScore(rec);
  } catch (error) {
    warnings.push(
      `recommendation trend unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  let momentum = {
    momentumScore: null as number | null,
    momentum1m: null as number | null,
    momentum3m: null as number | null,
    momentum6m: null as number | null,
    momentum12m: null as number | null,
  };
  try {
    momentum = await fetchMomentumSignal(symbol, token);
  } catch (error) {
    warnings.push(
      `momentum unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  let quality = { qualityScore: null as number | null, qualityNotes: "Unavailable" };
  try {
    quality = await fetchQualityScore(symbol, token);
  } catch (error) {
    warnings.push(
      `quality metrics unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  return {
    ticker: symbol,
    asOf,
    price,
    targetHigh,
    targetLow,
    targetMean,
    targetMedian,
    targetLastUpdated,
    upside,
    upsideSource: upside === null ? "Manual" : "Finnhub price target",
    recommendationScore: recommendation.score,
    recommendationTrend: recommendation.label,
    momentumScore: momentum.momentumScore,
    momentum1m: momentum.momentum1m,
    momentum3m: momentum.momentum3m,
    momentum6m: momentum.momentum6m,
    momentum12m: momentum.momentum12m,
    qualityScore: quality.qualityScore,
    qualityNotes: quality.qualityNotes,
    dispersion,
    dispersionSource: dispersion === null ? "Manual" : "Finnhub target range",
    warnings,
  };
}


type DailyCandle = {
  close: number;
  high: number;
  low: number;
  volume: number;
  time: number;
};

async function fetchDailyCandles(
  symbol: string,
  token: string,
  lookbackDays = 430,
): Promise<DailyCandle[]> {
  const now = Math.floor(Date.now() / 1000);
  const from = now - lookbackDays * 24 * 60 * 60;
  const candle = await fetchFinnhubJson<FinnhubCandle>(
    `/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${now}`,
    token,
  );

  const closes = Array.isArray(candle.c) ? candle.c : [];
  if (candle.s !== "ok" || closes.length === 0) return [];
  const highs = Array.isArray(candle.h) ? candle.h : [];
  const lows = Array.isArray(candle.l) ? candle.l : [];
  const volumes = Array.isArray(candle.v) ? candle.v : [];
  const times = Array.isArray(candle.t) ? candle.t : [];

  return closes
    .map((close, index) => ({
      close,
      high: highs[index] ?? close,
      low: lows[index] ?? close,
      volume: volumes[index] ?? 0,
      time: times[index] ?? 0,
    }))
    .filter(
      (x) =>
        Number.isFinite(x.close) &&
        Number.isFinite(x.high) &&
        Number.isFinite(x.low),
    );
}

function lastN<T>(items: T[], n: number): T[] {
  return items.slice(Math.max(0, items.length - n));
}

function nearestSupportBelow(price: number, levels: number[]): number | null {
  const candidates = levels
    .filter((level) => Number.isFinite(level) && level > 0 && level <= price * 1.03 && level >= price * 0.65)
    .sort((a, b) => b - a);
  return candidates[0] ?? null;
}

function nearestResistanceAbove(price: number, levels: number[]): number | null {
  const candidates = levels
    .filter((level) => Number.isFinite(level) && level > 0 && level >= price * 0.98 && level <= price * 1.8)
    .sort((a, b) => a - b);
  return candidates[0] ?? null;
}

function estimateVolumeProfileHvn(candles: DailyCandle[]): number | null {
  const sample = lastN(candles, 252);
  if (sample.length < 40) return null;
  const lows = sample.map((x) => x.low);
  const highs = sample.map((x) => x.high);
  const minPrice = Math.min(...lows);
  const maxPrice = Math.max(...highs);
  if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || maxPrice <= minPrice) return null;

  const bins = 24;
  const step = (maxPrice - minPrice) / bins;
  const volumes = Array.from({ length: bins }, () => 0);
  for (const candle of sample) {
    const idx = clamp(Math.floor((candle.close - minPrice) / step), 0, bins - 1);
    volumes[idx] += candle.volume || 1;
  }
  let bestIndex = 0;
  for (let i = 1; i < volumes.length; i += 1) {
    if (volumes[i] > volumes[bestIndex]) bestIndex = i;
  }
  return minPrice + step * (bestIndex + 0.5);
}

function computeRsi(closes: number[], period = 14): number | null {
  if (closes.length <= period) return null;
  let gains = 0;
  let losses = 0;
  const sample = closes.slice(-(period + 1));
  for (let i = 1; i < sample.length; i += 1) {
    const change = sample[i] - sample[i - 1];
    if (change >= 0) gains += change;
    else losses -= change;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values[0];
  for (const value of values) {
    prev = value * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function macdLabel(closes: number[]): string {
  if (closes.length < 35) return "MACD unavailable";
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macd = closes.map((_, i) => ema12[i] - ema26[i]);
  const signal = ema(macd, 9);
  const latest = macd[macd.length - 1] - signal[signal.length - 1];
  const prior = macd[macd.length - 2] - signal[signal.length - 2];
  if (latest > 0 && latest > prior) return "MACD bullish / improving";
  if (latest > 0) return "MACD bullish / fading";
  if (latest < 0 && latest > prior) return "MACD bearish but improving";
  return "MACD bearish / weakening";
}

function fallbackTechnicalAutoData(
  symbol: string,
  price: number | null,
  reason: string,
  warnings: string[] = [],
): TechnicalAutoData {
  const asOf = new Date().toISOString();
  const latestPrice = price && price > 0 ? price : null;

  if (!latestPrice) {
    return {
      ticker: symbol,
      asOf,
      price: null,
      sma50: null,
      sma200: null,
      above200dma: null,
      technicalExtension: null,
      hvn: null,
      support: null,
      resistance: null,
      buyZoneLow: null,
      buyZoneHigh: null,
      buyAnchor: null,
      stopLevel: null,
      trimLow: null,
      trimHigh: null,
      rsi14: null,
      macdState: "Unavailable",
      trendState: "No live price available",
      confidence: "Low",
      notes: `Manual TA required. ${reason}`,
      warnings,
    };
  }

  const anchor = latestPrice * 0.94;
  const buyZoneLow = latestPrice * 0.88;
  const buyZoneHigh = latestPrice * 0.97;
  const stopLevel = buyZoneLow * 0.93;
  const trimLow = latestPrice * 1.1;
  const trimHigh = latestPrice * 1.18;

  return {
    ticker: symbol,
    asOf,
    price: round(latestPrice),
    sma50: null,
    sma200: null,
    above200dma: null,
    technicalExtension: null,
    hvn: null,
    support: round(buyZoneLow),
    resistance: round(trimLow),
    buyZoneLow: round(buyZoneLow),
    buyZoneHigh: round(buyZoneHigh),
    buyAnchor: round(anchor),
    stopLevel: round(stopLevel),
    trimLow: round(trimLow),
    trimHigh: round(trimHigh),
    rsi14: null,
    macdState: "Fallback / verify in TradingView",
    trendState: "Fallback price-based framework",
    confidence: "Low",
    notes:
      `Fallback TA because ${reason}. Buy zone is a starter estimate based on current price; verify chips/HVN/ribbon/MACD/RSI directly in TradingView before trading.`,
    warnings,
  };
}

async function fetchTechnicalAutoData(
  symbol: string,
  token: string,
  price: number | null,
): Promise<TechnicalAutoData> {
  const asOf = new Date().toISOString();
  const warnings: string[] = [];
  let candles: DailyCandle[] = [];
  try {
    candles = await fetchDailyCandles(symbol, token, 430);
  } catch (error) {
    warnings.push(
      `candle history unavailable: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  const closes = candles.map((x) => x.close).filter(Number.isFinite);
  const latestPrice = price ?? closes[closes.length - 1] ?? null;
  if (!latestPrice || latestPrice <= 0 || closes.length < 60) {
    return fallbackTechnicalAutoData(
      symbol,
      latestPrice,
      closes.length < 60
        ? "Finnhub returned insufficient candle history"
        : "no current price was available",
      warnings,
    );
  }

  const sma50 = average(closes.slice(-50));
  const sma200 = average(closes.slice(-200));
  const sample = lastN(candles, 252);
  const recent = lastN(candles, 63);
  const hvn = estimateVolumeProfileHvn(candles);
  const swingLow = Math.min(...recent.map((x) => x.low));
  const swingHigh = Math.max(...recent.map((x) => x.high));
  const yearHigh = Math.max(...sample.map((x) => x.high));
  const rsi14 = computeRsi(closes, 14);
  const macdState = macdLabel(closes);
  const above200dma = sma200 !== null ? latestPrice > sma200 : null;
  const technicalExtension = sma200 && sma200 > 0 ? latestPrice / sma200 - 1 : null;
  const uptrend = Boolean(sma50 && sma200 && latestPrice > sma50 && sma50 > sma200);
  const downtrend = Boolean(sma50 && sma200 && latestPrice < sma50 && sma50 < sma200);
  const trendState = uptrend
    ? "Uptrend / pullback-buy framework"
    : downtrend
      ? "Downtrend / wait for base confirmation"
      : "Mixed trend / range framework";

  const support = nearestSupportBelow(
    latestPrice,
    [hvn ?? 0, sma50 ?? 0, sma200 ?? 0, swingLow].filter((x) => x > 0),
  );
  const resistance = nearestResistanceAbove(
    latestPrice,
    [swingHigh, yearHigh, latestPrice * 1.12, latestPrice * 1.2].filter((x) => x > 0),
  );

  const anchorInputs = [support ?? 0, hvn ?? 0, sma50 ?? 0, sma200 ?? 0].filter(
    (x) => x > 0 && x >= latestPrice * 0.65 && x <= latestPrice * 1.05,
  );
  const buyAnchor = anchorInputs.length > 0 ? average(anchorInputs) : support ?? latestPrice * 0.92;
  const zoneWidth = uptrend ? 0.04 : downtrend ? 0.075 : 0.055;
  const buyZoneLow = buyAnchor ? buyAnchor * (1 - zoneWidth) : null;
  const buyZoneHigh = buyAnchor ? Math.min(buyAnchor * (1 + zoneWidth), latestPrice * 1.02) : null;
  const stopLevel = buyZoneLow ? buyZoneLow * 0.93 : null;
  const trimLow = resistance ? Math.max(resistance * 0.97, latestPrice * 1.1) : latestPrice * 1.12;
  const trimHigh = resistance ? Math.max(resistance * 1.04, latestPrice * 1.18) : latestPrice * 1.2;

  let confluence = 0;
  if (hvn && buyAnchor && Math.abs(hvn / buyAnchor - 1) <= 0.08) confluence += 1;
  if (sma50 && buyAnchor && Math.abs(sma50 / buyAnchor - 1) <= 0.08) confluence += 1;
  if (sma200 && buyAnchor && Math.abs(sma200 / buyAnchor - 1) <= 0.1) confluence += 1;
  if (rsi14 !== null && rsi14 >= 35 && rsi14 <= 60) confluence += 1;
  if (macdState.includes("improving") || macdState.includes("bullish")) confluence += 1;

  const confidence: TaConfidence = confluence >= 4 ? "High" : confluence >= 2 ? "Medium" : "Low";
  const notes = [
    hvn ? `HVN proxy ${round(hvn)}` : "HVN unavailable",
    sma50 ? `50DMA ${round(sma50)}` : "50DMA unavailable",
    sma200 ? `200DMA ${round(sma200)}` : "200DMA unavailable",
    rsi14 ? `RSI14 ${round(rsi14, 1)}` : "RSI unavailable",
    macdState,
  ].join("; ");

  return {
    ticker: symbol,
    asOf,
    price: round(latestPrice),
    sma50: round(sma50),
    sma200: round(sma200),
    above200dma,
    technicalExtension: round(technicalExtension, 4),
    hvn: round(hvn),
    support: round(support),
    resistance: round(resistance),
    buyZoneLow: round(buyZoneLow),
    buyZoneHigh: round(buyZoneHigh),
    buyAnchor: round(buyAnchor),
    stopLevel: round(stopLevel),
    trimLow: round(trimLow),
    trimHigh: round(trimHigh),
    rsi14: round(rsi14, 1),
    macdState,
    trendState,
    confidence,
    notes,
    warnings,
  };
}

function extractCallsFromFinnhubChain(
  payload: unknown,
): Array<AnyRecord & { expirationDate?: string }> {
  const results: Array<AnyRecord & { expirationDate?: string }> = [];
  const root = payload as AnyRecord;
  const expirations = Array.isArray(root.data) ? root.data : [];

  for (const expirationBlock of expirations) {
    if (!expirationBlock || typeof expirationBlock !== "object") continue;
    const block = expirationBlock as AnyRecord;
    const expirationDate = getStringFromKeys(block, [
      "expirationDate",
      "expiration",
      "date",
    ]);
    const options = block.options;

    if (options && typeof options === "object") {
      const opt = options as AnyRecord;
      const calls = (
        Array.isArray(opt.CALL)
          ? opt.CALL
          : Array.isArray(opt.call)
            ? opt.call
            : Array.isArray(opt.calls)
              ? opt.calls
              : []
      ) as unknown[];
      for (const call of calls) {
        if (call && typeof call === "object")
          results.push({ ...(call as AnyRecord), expirationDate });
      }
    }

    const directCalls = (
      Array.isArray(block.CALL)
        ? block.CALL
        : Array.isArray(block.call)
          ? block.call
          : Array.isArray(block.calls)
            ? block.calls
            : []
    ) as unknown[];
    for (const call of directCalls) {
      if (call && typeof call === "object")
        results.push({ ...(call as AnyRecord), expirationDate });
    }
  }

  return results;
}

async function fetchCoveredCallCandidates(
  symbol: string,
  token: string,
  stockPrice: number | null,
): Promise<OptionCandidate[]> {
  if (!stockPrice || stockPrice <= 0) return [];

  const chain = await fetchFinnhubJson<unknown>(
    `/stock/option-chain?symbol=${encodeURIComponent(symbol)}`,
    token,
  );
  const calls = extractCallsFromFinnhubChain(chain);
  const candidates: OptionCandidate[] = [];

  for (const call of calls) {
    const expiration = getStringFromKeys(call, [
      "expirationDate",
      "expiration",
      "date",
    ]);
    const strike = getNumberFromKeys(call, ["strike", "strikePrice"]);
    if (!expiration || strike === null || strike <= 0) continue;

    const dte = daysToExpiration(expiration);
    const otm = strike / stockPrice - 1;
    const rawDelta = getNumberFromKeys(call, ["delta"]);
    const delta = rawDelta === null ? null : Math.abs(rawDelta);
    const bid = getNumberFromKeys(call, ["bid", "bidPrice"]);
    const ask = getNumberFromKeys(call, ["ask", "askPrice"]);
    const last = getNumberFromKeys(call, [
      "last",
      "lastPrice",
      "lastTradePrice",
    ]);
    const mid =
      bid !== null && ask !== null && ask >= bid ? (bid + ask) / 2 : null;
    const impliedVolatility = getNumberFromKeys(call, [
      "impliedVolatility",
      "iv",
    ]);
    const openInterest = getNumberFromKeys(call, ["openInterest", "oi"]);
    const volume = getNumberFromKeys(call, ["volume"]);

    const dteOk = dte >= 20 && dte <= 35;
    const strikeOk = otm >= 0.1 && otm <= 0.15;
    const deltaOk = delta === null || (delta >= 0.1 && delta <= 0.2);
    if (!dteOk || !strikeOk || !deltaOk) continue;

    const deltaPenalty = delta === null ? 0.05 : Math.abs(delta - 0.15);
    const dtePenalty = Math.abs(dte - 30) / 100;
    const otmPenalty = Math.abs(otm - 0.125);
    const liquidityBoost =
      Math.min((openInterest ?? 0) / 10000, 0.05) +
      Math.min((volume ?? 0) / 5000, 0.03);
    const score = 1 - deltaPenalty - dtePenalty - otmPenalty + liquidityBoost;

    candidates.push({
      ticker: symbol,
      expiration,
      strike: round(strike) ?? strike,
      dte,
      delta: delta === null ? null : round(delta, 3),
      bid: round(bid),
      ask: round(ask),
      last: round(last),
      mid: round(mid),
      impliedVolatility:
        impliedVolatility === null ? null : round(impliedVolatility, 4),
      openInterest: openInterest === null ? null : Math.round(openInterest),
      volume: volume === null ? null : Math.round(volume),
      score,
      note:
        delta === null
          ? "Delta unavailable; filtered by TITAN DTE and 10–15% OTM only."
          : "Matches TITAN optional-overlay 20–35 DTE / 0.10–0.20 delta / 10–15% OTM screen.",
    });
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, 5);
}

export async function GET(request: Request) {
  const requestKey = request.headers.get("x-finnhub-key")?.trim();
  const token = requestKey || process.env.FINNHUB_API_KEY;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Missing Finnhub API key. Enter one in the Settings tab, or add FINNHUB_API_KEY to .env.local / Vercel environment variables.",
      },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const requestedSymbols = (url.searchParams.get("symbols") ?? "SPY,PCEF,HYG,AGG,BIZD,AMLP,XYLD")
    .split(",")
    .map(normalizeTicker)
    .filter(Boolean);
  const includeOptions =
    url.searchParams.get("includeOptions") === "1" ||
    url.searchParams.get("includeOptions") === "true";
  const requestedOptionSymbols = (url.searchParams.get("optionSymbols") ?? "")
    .split(",")
    .map(normalizeTicker)
    .filter(Boolean);
  const includeSignal =
    url.searchParams.get("includeSignal") === "1" ||
    url.searchParams.get("includeSignal") === "true";
  const requestedSignalSymbols = (url.searchParams.get("signalSymbols") ?? "")
    .split(",")
    .map(normalizeTicker)
    .filter(Boolean);
  const includeTechnical =
    url.searchParams.get("includeTechnical") === "1" ||
    url.searchParams.get("includeTechnical") === "true";
  const requestedTechnicalSymbols = (url.searchParams.get("technicalSymbols") ?? "")
    .split(",")
    .map(normalizeTicker)
    .filter(Boolean);

  const symbols = Array.from(new Set(["SPY", ...requestedSymbols])).slice(
    0,
    60,
  );
  const asOf = new Date().toISOString();
  const warnings: string[] = [];

  const quotePairs = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const quote = await fetchQuote(symbol, token);
        return [symbol, quote] as const;
      } catch (error) {
        warnings.push(
          `${symbol}: ${error instanceof Error ? error.message : "quote unavailable"}`,
        );
        return [
          symbol,
          {
            ticker: symbol,
            price: null,
            change: null,
            changePercent: null,
            previousClose: null,
            asOf,
            source: "Unavailable",
          } satisfies LiveQuote,
        ] as const;
      }
    }),
  );

  const quotes = Object.fromEntries(quotePairs) as Record<string, LiveQuote>;

  let spySma50: number | null = null;
  let spySma200: number | null = null;
  try {
    const sma = await fetchSma("SPY", token);
    spySma50 = sma.sma50;
    spySma200 = sma.sma200;
  } catch (error) {
    warnings.push(
      `SPY SMA: ${error instanceof Error ? error.message : "moving averages unavailable"}`,
    );
  }

  const options: Record<string, OptionCandidate[]> = {};
  if (includeOptions && requestedOptionSymbols.length > 0) {
    const optionSymbols = Array.from(new Set(requestedOptionSymbols)).slice(
      0,
      20,
    );
    await Promise.all(
      optionSymbols.map(async (symbol) => {
        try {
          options[symbol] = await fetchCoveredCallCandidates(
            symbol,
            token,
            quotes[symbol]?.price ?? null,
          );
        } catch (error) {
          warnings.push(
            `${symbol} options: ${error instanceof Error ? error.message : "option chain unavailable"}`,
          );
          options[symbol] = [];
        }
      }),
    );
  }

  const signal: Record<string, SignalAutoData> = {};
  if (includeSignal && requestedSignalSymbols.length > 0) {
    const signalSymbols = Array.from(new Set(requestedSignalSymbols)).slice(
      0,
      30,
    );
    await Promise.all(
      signalSymbols.map(async (symbol) => {
        try {
          signal[symbol] = await fetchSignalAutoData(
            symbol,
            token,
            quotes[symbol]?.price ?? null,
          );
        } catch (error) {
          warnings.push(
            `${symbol} signal: ${error instanceof Error ? error.message : "signal data unavailable"}`,
          );
          signal[symbol] = {
            ticker: symbol,
            asOf,
            price: quotes[symbol]?.price ?? null,
            targetHigh: null,
            targetLow: null,
            targetMean: null,
            targetMedian: null,
            targetLastUpdated: null,
            upside: null,
            upsideSource: "Manual",
            recommendationScore: null,
            recommendationTrend: "Unavailable",
            momentumScore: null,
            momentum1m: null,
            momentum3m: null,
            momentum6m: null,
            momentum12m: null,
            qualityScore: null,
            qualityNotes: "Unavailable",
            dispersion: null,
            dispersionSource: "Manual",
            warnings: [
              error instanceof Error ? error.message : "signal data unavailable",
            ],
          };
        }
      }),
    );
  }

  const technical: Record<string, TechnicalAutoData> = {};
  if (includeTechnical && requestedTechnicalSymbols.length > 0) {
    const technicalSymbols = Array.from(new Set(requestedTechnicalSymbols)).slice(
      0,
      30,
    );
    await Promise.all(
      technicalSymbols.map(async (symbol) => {
        try {
          technical[symbol] = await fetchTechnicalAutoData(
            symbol,
            token,
            quotes[symbol]?.price ?? null,
          );
        } catch (error) {
          warnings.push(
            `${symbol} technical: ${error instanceof Error ? error.message : "technical data unavailable"}`,
          );
          technical[symbol] = fallbackTechnicalAutoData(
            symbol,
            quotes[symbol]?.price ?? null,
            error instanceof Error ? error.message : "technical data unavailable",
            [error instanceof Error ? error.message : "technical data unavailable"],
          );
        }
      }),
    );
  }

  return NextResponse.json({
    asOf,
    provider: requestKey ? "Finnhub / Settings key" : "Finnhub / Server env",
    quotes,
    market: {
      spy: quotes.SPY ?? null,
      spySma50,
      spySma200,
    },
    options,
    signal,
    technical,
    warnings,
  });
}
