"use client";

import React, { useEffect, useMemo, useState } from "react";

type Tab =
  | "dailyBrief"
  | "actionItems"
  | "holdings"
  | "bench"
  | "titanScore"
  | "taxLots"
  | "coveredCalls"
  | "performance"
  | "fundProfile"
  | "ruleSet"
  | "settings";

type Sleeve = "Infrastructure" | "BDC / Private Credit" | "Option-Income" | "Credit / CEF" | "Tactical";
type TaConfidence = "Manual" | "Low" | "Medium" | "High";
type BenchRole = "Current Core" | "Challenger" | "Sleeve Benchmark" | "Tactical" | "Watchlist";
type ActionState =
  | "HOLD"
  | "REDUCE MARGIN"
  | "DEFENSIVE ROTATE"
  | "TACTICAL DEPLOY"
  | "CUT REVIEW"
  | "FULL REBALANCE"
  | "BUY"
  | "TRIM"
  | "SELL"
  | "REBALANCE"
  | "COVER"
  | "BUY BACK"
  | "TAX HARVEST"
  | "DAF CANDIDATE";

type Holding = {
  id: string;
  ticker: string;
  name: string;
  sleeve: Sleeve;
  sector: string;
  shares: number;
  cost: number;
  price: number;
  titanRank: number;
  signalScore: number;
  upside: number;
  revisionScore: number;
  momentumScore: number;
  qualityScore: number;
  dispersion: number;
  daysHeld: number;
  above200dma: boolean;
  earningsBeforeExpiry: boolean;
  technicalExtension: number;
  buyZoneLow: number;
  buyZoneHigh: number;
  buyAnchor: number;
  stopLevel: number;
  trimLow: number;
  trimHigh: number;
  taConfidence: TaConfidence;
  taNotes: string;
  notes: string;
};

type BenchCandidate = {
  rank: number;
  ticker: string;
  name: string;
  role: BenchRole;
  sleeveFit: Sleeve;
  sector: string;
  price: number;
  signalScore: number;
  upside: number;
  revisionScore: number;
  momentumScore: number;
  qualityScore: number;
  dispersion: number;
  yieldRate: number;
  discountNav: number;
  coverage: number;
  sixMonthReturn: number;
  discountZ: number;
  liquidityScore: number;
  taxPocket: string;
  buyZoneLow: number;
  buyZoneHigh: number;
  buyAnchor: number;
  stopLevel: number;
  trimLow: number;
  trimHigh: number;
  taConfidence: TaConfidence;
  taNotes: string;
  notes: string;
};

type CoveredCall = {
  id: string;
  ticker: string;
  sharesCovered: number;
  stockPrice: number;
  strike: number;
  dte: number;
  delta: number;
  premiumReceived: number;
  currentMark: number;
  earningsBeforeExpiry: boolean;
  notes: string;
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

type HoldingRow = Holding & {
  marketValue: number;
  weight: number;
  gain: number;
  ltcg: boolean;
  coverEligible: boolean;
  action: ActionState;
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

type IncomeAutoData = {
  ticker: string;
  asOf: string;
  dividendYield: number | null;
  dividendYieldSource: string;
  warnings: string[];
};

type TechnicalAutoData = {
  ticker: string;
  asOf: string;
  price: number | null;
  sma50: number | null;
  sma200: number | null;
  above200dma: boolean | null;
  technicalExtension: number | null;
  sixMonthReturn: number | null;
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

type MarketApiResponse = {
  asOf: string;
  provider: string;
  quotes: Record<string, LiveQuote>;
  market: {
    spy: LiveQuote | null;
    spySma50: number | null;
    spySma200: number | null;
  };
  options?: Record<string, OptionCandidate[]>;
  signal?: Record<string, SignalAutoData>;
  income?: Record<string, IncomeAutoData>;
  technical?: Record<string, TechnicalAutoData>;
  warnings?: string[];
};

const TAB_LABELS: Record<Tab, string> = {
  dailyBrief: "Daily Brief",
  actionItems: "Action Items",
  holdings: "Holdings",
  bench: "Bench",
  titanScore: "TITAN Score",
  taxLots: "Tax / Location",
  coveredCalls: "Call Overlay",
  performance: "Performance",
  fundProfile: "Fund Profile",
  ruleSet: "Rule Set",
  settings: "Settings",
};

const STORAGE_KEYS = {
  holdings: "titanIncomeHoldings.v2",
  bench: "titanIncomeBench.v4",
  calls: "titanIncomeCoveredCalls.v2",
  settings: "titanIncomeSettings.v2",
  liveSettings: "titanIncomeLiveSettings.v2",
};

const DEFAULT_TA_FIELDS = {
  buyZoneLow: 0,
  buyZoneHigh: 0,
  buyAnchor: 0,
  stopLevel: 0,
  trimLow: 0,
  trimHigh: 0,
  taConfidence: "Manual" as TaConfidence,
  taNotes: "",
};

const DEFAULT_INCOME_FIELDS = {
  role: "Challenger" as BenchRole,
  yieldRate: 0,
  discountNav: 0,
  coverage: 1,
  sixMonthReturn: 0,
  discountZ: 0,
  liquidityScore: 75,
  taxPocket: "Case-by-case",
};

const DEFAULT_BENCH: BenchCandidate[] = ([
  { rank: 1, ticker: "EPD", name: "Enterprise Products Partners", role: "Current Core", sleeveFit: "Infrastructure", sector: "Midstream MLP", price: 0, signalScore: 91, upside: 0.075, revisionScore: 92, momentumScore: 74, qualityScore: 94, dispersion: 0.06, yieldRate: 0.07, discountNav: 0, coverage: 1.65, sixMonthReturn: 0.08, discountZ: 0, liquidityScore: 92, taxPocket: "Taxable only", notes: "Core MLP ballast; strong DCF coverage, investment-grade profile, K-1/UBTI makes taxable the preferred pocket." },
  { rank: 2, ticker: "ARCC", name: "Ares Capital", role: "Current Core", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 90, upside: 0.09, revisionScore: 88, momentumScore: 72, qualityScore: 90, dispersion: 0.10, yieldRate: 0.09, discountNav: 0.02, coverage: 1.12, sixMonthReturn: 0.05, discountZ: 0, liquidityScore: 94, taxPocket: "IRA / Roth preferred", notes: "Scale BDC anchor; monitor NAV trend, NII coverage, non-accruals, and premium/discount to NAV." },
  { rank: 3, ticker: "MPLX", name: "MPLX LP", role: "Current Core", sleeveFit: "Infrastructure", sector: "Midstream MLP", price: 0, signalScore: 89, upside: 0.08, revisionScore: 88, momentumScore: 76, qualityScore: 88, dispersion: 0.08, yieldRate: 0.075, discountNav: 0, coverage: 1.55, sixMonthReturn: 0.09, discountZ: 0, liquidityScore: 90, taxPocket: "Taxable only", notes: "Core MLP; attractive yield and coverage, but monitor leverage and Marathon sponsor/control dynamics." },
  { rank: 4, ticker: "MAIN", name: "Main Street Capital", role: "Current Core", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 88, upside: 0.06, revisionScore: 91, momentumScore: 70, qualityScore: 94, dispersion: 0.08, yieldRate: 0.07, discountNav: 0.45, coverage: 1.08, sixMonthReturn: 0.06, discountZ: 0, liquidityScore: 88, taxPocket: "IRA / Roth preferred", notes: "Best-in-class BDC quality; valuation premium is the gating risk, so avoid adding aggressively at extreme NAV premium." },
  { rank: 5, ticker: "BXSL", name: "Blackstone Secured Lending", role: "Challenger", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 87, upside: 0.08, revisionScore: 86, momentumScore: 68, qualityScore: 90, dispersion: 0.10, yieldRate: 0.10, discountNav: 0.03, coverage: 1.10, sixMonthReturn: 0.04, discountZ: 0, liquidityScore: 86, taxPocket: "IRA / Roth preferred", notes: "Serious BDC challenger; first-lien orientation and sponsor quality make it a candidate for replacing weaker BDC exposure." },
  { rank: 6, ticker: "DIVO", name: "Amplify CWP Enhanced Dividend Income ETF", role: "Current Core", sleeveFit: "Option-Income", sector: "Option-Income ETF", price: 0, signalScore: 86, upside: 0.055, revisionScore: 85, momentumScore: 70, qualityScore: 88, dispersion: 0.08, yieldRate: 0.045, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.06, discountZ: 0, liquidityScore: 85, taxPocket: "IRA / Roth preferred", notes: "Preferred option-income core over full overwrite structures; better upside capture profile with selective calls." },
  { rank: 7, ticker: "OBDC", name: "Blue Owl Capital Corporation", role: "Challenger", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 85, upside: 0.10, revisionScore: 82, momentumScore: 66, qualityScore: 86, dispersion: 0.12, yieldRate: 0.10, discountNav: -0.02, coverage: 1.10, sixMonthReturn: 0.03, discountZ: -0.3, liquidityScore: 88, taxPocket: "IRA / Roth preferred", notes: "Large BDC candidate; compare NAV stability and non-accrual trend against ARCC/BXSL/TSLX." },
  { rank: 8, ticker: "TSLX", name: "Sixth Street Specialty Lending", role: "Challenger", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 84, upside: 0.085, revisionScore: 84, momentumScore: 66, qualityScore: 88, dispersion: 0.11, yieldRate: 0.09, discountNav: 0.12, coverage: 1.08, sixMonthReturn: 0.04, discountZ: 0, liquidityScore: 82, taxPocket: "IRA / Roth preferred", notes: "Underwriting-quality BDC challenger; watch valuation premium and portfolio concentration." },
  { rank: 9, ticker: "OKE", name: "ONEOK", role: "Challenger", sleeveFit: "Infrastructure", sector: "Midstream C-Corp", price: 0, signalScore: 83, upside: 0.075, revisionScore: 82, momentumScore: 75, qualityScore: 84, dispersion: 0.10, yieldRate: 0.05, discountNav: 0, coverage: 1.40, sixMonthReturn: 0.07, discountZ: 0, liquidityScore: 93, taxPocket: "Either", notes: "C-corp midstream challenger; useful if avoiding additional K-1 exposure." },
  { rank: 10, ticker: "ET", name: "Energy Transfer LP", role: "Current Core", sleeveFit: "Infrastructure", sector: "Midstream MLP", price: 0, signalScore: 83, upside: 0.08, revisionScore: 82, momentumScore: 74, qualityScore: 80, dispersion: 0.12, yieldRate: 0.08, discountNav: 0, coverage: 1.75, sixMonthReturn: 0.08, discountZ: 0, liquidityScore: 95, taxPocket: "Taxable only", notes: "Higher-yield MLP core; governance/leverage history keeps it below EPD/MPLX despite attractive cash yield." },
  { rank: 11, ticker: "JEPI", name: "JPMorgan Equity Premium Income ETF", role: "Challenger", sleeveFit: "Option-Income", sector: "Option-Income ETF", price: 0, signalScore: 82, upside: 0.04, revisionScore: 82, momentumScore: 68, qualityScore: 86, dispersion: 0.08, yieldRate: 0.075, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.04, discountZ: 0, liquidityScore: 96, taxPocket: "IRA / Roth preferred", notes: "Major option-income challenger; compare downside capture, upside capture, and ordinary-income tax drag versus DIVO/XYLD." },
  { rank: 12, ticker: "PDI", name: "PIMCO Dynamic Income Fund", role: "Current Core", sleeveFit: "Credit / CEF", sector: "Multi-sector Credit CEF", price: 0, signalScore: 82, upside: 0.13, revisionScore: 72, momentumScore: 66, qualityScore: 78, dispersion: 0.18, yieldRate: 0.13, discountNav: -0.02, coverage: 0.95, sixMonthReturn: 0.03, discountZ: -0.5, liquidityScore: 84, taxPocket: "Taxable preferred", notes: "Core PIMCO credit CEF; monitor leverage cost, premium/discount z-score, coverage and UNII." },
  { rank: 13, ticker: "SPYI", name: "NEOS S&P 500 High Income ETF", role: "Challenger", sleeveFit: "Option-Income", sector: "Option-Income ETF", price: 0, signalScore: 81, upside: 0.04, revisionScore: 80, momentumScore: 68, qualityScore: 84, dispersion: 0.09, yieldRate: 0.11, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.05, discountZ: 0, liquidityScore: 78, taxPocket: "IRA / Roth preferred", notes: "High-income option ETF challenger; tax character and upside capture need verification before replacing DIVO/XYLD." },
  { rank: 14, ticker: "PDO", name: "PIMCO Dynamic Income Opportunities Fund", role: "Challenger", sleeveFit: "Credit / CEF", sector: "Multi-sector Credit CEF", price: 0, signalScore: 80, upside: 0.12, revisionScore: 74, momentumScore: 64, qualityScore: 80, dispersion: 0.16, yieldRate: 0.12, discountNav: -0.07, coverage: 1.00, sixMonthReturn: 0.02, discountZ: -1.0, liquidityScore: 76, taxPocket: "Taxable preferred", notes: "PIMCO challenger; discount/premium discipline may make it more attractive than richer PIMCO peers at times." },
  { rank: 15, ticker: "WMB", name: "Williams Companies", role: "Current Core", sleeveFit: "Infrastructure", sector: "Midstream C-Corp", price: 0, signalScore: 80, upside: 0.05, revisionScore: 84, momentumScore: 76, qualityScore: 86, dispersion: 0.08, yieldRate: 0.045, discountNav: 0, coverage: 1.55, sixMonthReturn: 0.08, discountZ: 0, liquidityScore: 96, taxPocket: "Either", notes: "Clean C-corp midstream exposure; lower K-1 complexity and strong infrastructure role." },
  { rank: 16, ticker: "HTGC", name: "Hercules Capital", role: "Current Core", sleeveFit: "BDC / Private Credit", sector: "Venture Lending BDC", price: 0, signalScore: 80, upside: 0.10, revisionScore: 78, momentumScore: 74, qualityScore: 80, dispersion: 0.13, yieldRate: 0.10, discountNav: 0.20, coverage: 1.05, sixMonthReturn: 0.05, discountZ: 0, liquidityScore: 82, taxPocket: "IRA / Roth preferred", notes: "Venture credit BDC; higher cycle sensitivity, so cap position size and watch NAV/non-accruals." },
  { rank: 17, ticker: "PAXS", name: "PIMCO Access Income Fund", role: "Challenger", sleeveFit: "Credit / CEF", sector: "Multi-sector Credit CEF", price: 0, signalScore: 79, upside: 0.12, revisionScore: 74, momentumScore: 64, qualityScore: 78, dispersion: 0.17, yieldRate: 0.12, discountNav: -0.09, coverage: 1.00, sixMonthReturn: 0.02, discountZ: -1.1, liquidityScore: 70, taxPocket: "Taxable preferred", notes: "Discount-sensitive PIMCO challenger; smaller/liquidity profile requires execution discipline." },
  { rank: 18, ticker: "UTG", name: "Reaves Utility Income Fund", role: "Current Core", sleeveFit: "Infrastructure", sector: "Utility / Infrastructure CEF", price: 0, signalScore: 79, upside: 0.08, revisionScore: 82, momentumScore: 62, qualityScore: 84, dispersion: 0.13, yieldRate: 0.08, discountNav: -0.08, coverage: 1.00, sixMonthReturn: 0.02, discountZ: -0.8, liquidityScore: 72, taxPocket: "Taxable preferred", notes: "Infrastructure/utility CEF; evaluate discount z-score and coverage rather than yield alone." },
  { rank: 19, ticker: "CSWC", name: "Capital Southwest", role: "Current Core", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 78, upside: 0.09, revisionScore: 76, momentumScore: 68, qualityScore: 78, dispersion: 0.14, yieldRate: 0.10, discountNav: 0.30, coverage: 1.05, sixMonthReturn: 0.04, discountZ: 0, liquidityScore: 70, taxPocket: "IRA / Roth preferred", notes: "Higher-beta BDC; smaller-cap and premium-to-NAV risk justify smaller target weight." },
  { rank: 20, ticker: "PTY", name: "PIMCO Corporate & Income Opportunity Fund", role: "Current Core", sleeveFit: "Credit / CEF", sector: "Multi-sector Credit CEF", price: 0, signalScore: 78, upside: 0.10, revisionScore: 70, momentumScore: 66, qualityScore: 78, dispersion: 0.20, yieldRate: 0.10, discountNav: 0.05, coverage: 0.95, sixMonthReturn: 0.03, discountZ: 0.3, liquidityScore: 80, taxPocket: "Taxable preferred", notes: "PIMCO credit CEF; sponsor strength but premium/discount discipline is critical." },
  { rank: 21, ticker: "KMI", name: "Kinder Morgan", role: "Challenger", sleeveFit: "Infrastructure", sector: "Midstream C-Corp", price: 0, signalScore: 77, upside: 0.06, revisionScore: 78, momentumScore: 72, qualityScore: 82, dispersion: 0.09, yieldRate: 0.045, discountNav: 0, coverage: 1.60, sixMonthReturn: 0.06, discountZ: 0, liquidityScore: 94, taxPocket: "Either", notes: "C-corp midstream alternative; lower yield than MLPs but simpler tax form." },
  { rank: 22, ticker: "ENB", name: "Enbridge", role: "Challenger", sleeveFit: "Infrastructure", sector: "Midstream C-Corp", price: 0, signalScore: 77, upside: 0.06, revisionScore: 78, momentumScore: 68, qualityScore: 82, dispersion: 0.10, yieldRate: 0.06, discountNav: 0, coverage: 1.45, sixMonthReturn: 0.04, discountZ: 0, liquidityScore: 90, taxPocket: "Taxable / either", notes: "Large pipeline utility-like candidate; FX/withholding and Canadian tax treatment require review." },
  { rank: 23, ticker: "JEPQ", name: "JPMorgan Nasdaq Equity Premium Income ETF", role: "Challenger", sleeveFit: "Option-Income", sector: "Option-Income ETF", price: 0, signalScore: 77, upside: 0.06, revisionScore: 78, momentumScore: 72, qualityScore: 78, dispersion: 0.10, yieldRate: 0.09, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.07, discountZ: 0, liquidityScore: 94, taxPocket: "IRA / Roth preferred", notes: "Higher-growth option sleeve candidate; Nasdaq beta means it is not a direct DIVO/XYLD substitute." },
  { rank: 24, ticker: "ARDC", name: "Ares Dynamic Credit Allocation Fund", role: "Challenger", sleeveFit: "Credit / CEF", sector: "Credit CEF", price: 0, signalScore: 76, upside: 0.10, revisionScore: 72, momentumScore: 62, qualityScore: 78, dispersion: 0.14, yieldRate: 0.10, discountNav: -0.10, coverage: 1.00, sixMonthReturn: 0.01, discountZ: -1.0, liquidityScore: 68, taxPocket: "Taxable preferred", notes: "Ares credit CEF challenger; attractive only if discount and coverage compensate for credit beta." },
  { rank: 25, ticker: "GBDC", name: "Golub Capital BDC", role: "Current Core", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 76, upside: 0.10, revisionScore: 74, momentumScore: 62, qualityScore: 78, dispersion: 0.12, yieldRate: 0.10, discountNav: -0.03, coverage: 1.07, sixMonthReturn: 0.02, discountZ: 0, liquidityScore: 72, taxPocket: "IRA / Roth preferred", notes: "Conservative BDC candidate/core; lower beta but not automatically superior if NAV growth lags." },
  { rank: 26, ticker: "GPIX", name: "Goldman Sachs S&P 500 Core Premium Income ETF", role: "Challenger", sleeveFit: "Option-Income", sector: "Option-Income ETF", price: 0, signalScore: 76, upside: 0.04, revisionScore: 76, momentumScore: 66, qualityScore: 82, dispersion: 0.09, yieldRate: 0.07, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.04, discountZ: 0, liquidityScore: 72, taxPocket: "IRA / Roth preferred", notes: "Option-income challenger; compare AUM/liquidity and upside capture to JEPI/SPYI/DIVO." },
  { rank: 27, ticker: "DSL", name: "DoubleLine Income Solutions Fund", role: "Current Core", sleeveFit: "Credit / CEF", sector: "Credit CEF", price: 0, signalScore: 75, upside: 0.11, revisionScore: 70, momentumScore: 62, qualityScore: 76, dispersion: 0.17, yieldRate: 0.11, discountNav: -0.09, coverage: 0.95, sixMonthReturn: 0.01, discountZ: -0.7, liquidityScore: 74, taxPocket: "Taxable preferred", notes: "Discount-capture credit CEF; distribution coverage and credit quality decide whether it remains core." },
  { rank: 28, ticker: "FSK", name: "FS KKR Capital", role: "Challenger", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 75, upside: 0.12, revisionScore: 70, momentumScore: 60, qualityScore: 72, dispersion: 0.16, yieldRate: 0.12, discountNav: -0.12, coverage: 1.10, sixMonthReturn: 0.01, discountZ: -0.4, liquidityScore: 86, taxPocket: "IRA / Roth preferred", notes: "High-yield discounted BDC; value opportunity only if credit/NAV trend stabilizes." },
  { rank: 29, ticker: "QYLD", name: "Global X Nasdaq 100 Covered Call ETF", role: "Watchlist", sleeveFit: "Option-Income", sector: "Option-Income ETF", price: 0, signalScore: 74, upside: 0.04, revisionScore: 70, momentumScore: 66, qualityScore: 72, dispersion: 0.12, yieldRate: 0.11, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.04, discountZ: 0, liquidityScore: 92, taxPocket: "IRA / Roth preferred", notes: "High distribution but full overwrite risk; likely watchlist unless income objective dominates total return." },
  { rank: 30, ticker: "HYT", name: "BlackRock Corporate High Yield Fund", role: "Challenger", sleeveFit: "Credit / CEF", sector: "High Yield CEF", price: 0, signalScore: 74, upside: 0.09, revisionScore: 70, momentumScore: 62, qualityScore: 76, dispersion: 0.15, yieldRate: 0.09, discountNav: -0.08, coverage: 1.00, sixMonthReturn: 0.02, discountZ: -0.8, liquidityScore: 76, taxPocket: "Taxable preferred", notes: "High-yield CEF candidate; spread regime and discount z-score should drive add/replace decision." },
  { rank: 31, ticker: "HESM", name: "Hess Midstream", role: "Challenger", sleeveFit: "Infrastructure", sector: "Midstream C-Corp", price: 0, signalScore: 73, upside: 0.07, revisionScore: 76, momentumScore: 70, qualityScore: 74, dispersion: 0.12, yieldRate: 0.08, discountNav: 0, coverage: 1.35, sixMonthReturn: 0.04, discountZ: 0, liquidityScore: 72, taxPocket: "Either", notes: "High-yield midstream challenger; sponsor/asset concentration and liquidity require position-size discipline." },
  { rank: 32, ticker: "WES", name: "Western Midstream Partners", role: "Challenger", sleeveFit: "Infrastructure", sector: "Midstream MLP", price: 0, signalScore: 73, upside: 0.08, revisionScore: 74, momentumScore: 70, qualityScore: 74, dispersion: 0.13, yieldRate: 0.09, discountNav: 0, coverage: 1.35, sixMonthReturn: 0.05, discountZ: 0, liquidityScore: 74, taxPocket: "Taxable only", notes: "High-yield MLP challenger; must clear tax complexity and sponsor concentration hurdle." },
  { rank: 33, ticker: "QQQI", name: "NEOS Nasdaq 100 High Income ETF", role: "Challenger", sleeveFit: "Option-Income", sector: "Option-Income ETF", price: 0, signalScore: 73, upside: 0.06, revisionScore: 72, momentumScore: 70, qualityScore: 72, dispersion: 0.12, yieldRate: 0.12, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.06, discountZ: 0, liquidityScore: 70, taxPocket: "IRA / Roth preferred", notes: "High-income Nasdaq option candidate; requires upside-capture and tax-character review." },
  { rank: 34, ticker: "BGT", name: "BlackRock Floating Rate Income Trust", role: "Current Core", sleeveFit: "Credit / CEF", sector: "Floating-Rate Loan CEF", price: 0, signalScore: 73, upside: 0.09, revisionScore: 72, momentumScore: 64, qualityScore: 76, dispersion: 0.14, yieldRate: 0.09, discountNav: -0.07, coverage: 1.00, sixMonthReturn: 0.02, discountZ: -0.5, liquidityScore: 66, taxPocket: "Taxable preferred", notes: "Floating-rate CEF; rate regime and loan-credit quality determine whether it remains core." },
  { rank: 35, ticker: "BGB", name: "Blackstone Strategic Credit Fund", role: "Challenger", sleeveFit: "Credit / CEF", sector: "Credit CEF", price: 0, signalScore: 72, upside: 0.09, revisionScore: 70, momentumScore: 62, qualityScore: 74, dispersion: 0.15, yieldRate: 0.09, discountNav: -0.10, coverage: 1.00, sixMonthReturn: 0.01, discountZ: -0.9, liquidityScore: 64, taxPocket: "Taxable preferred", notes: "Credit CEF challenger; discount depth must compensate for liquidity and leverage-cost risk." },
  { rank: 36, ticker: "BIT", name: "BlackRock Multi-Sector Income Trust", role: "Challenger", sleeveFit: "Credit / CEF", sector: "Multi-sector Credit CEF", price: 0, signalScore: 72, upside: 0.09, revisionScore: 70, momentumScore: 62, qualityScore: 74, dispersion: 0.15, yieldRate: 0.09, discountNav: -0.09, coverage: 1.00, sixMonthReturn: 0.01, discountZ: -0.8, liquidityScore: 66, taxPocket: "Taxable preferred", notes: "Multi-sector credit CEF challenger; use discount z-score and NAV total return to avoid yield trap." },
  { rank: 37, ticker: "AM", name: "Antero Midstream", role: "Watchlist", sleeveFit: "Infrastructure", sector: "Midstream C-Corp", price: 0, signalScore: 72, upside: 0.07, revisionScore: 72, momentumScore: 70, qualityScore: 72, dispersion: 0.13, yieldRate: 0.06, discountNav: 0, coverage: 1.35, sixMonthReturn: 0.05, discountZ: 0, liquidityScore: 76, taxPocket: "Either", notes: "Higher-beta gas midstream; watchlist unless valuation and balance-sheet trend justify add." },
  { rank: 38, ticker: "KBDC", name: "Kayne Anderson BDC", role: "Challenger", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 72, upside: 0.10, revisionScore: 70, momentumScore: 60, qualityScore: 72, dispersion: 0.15, yieldRate: 0.10, discountNav: -0.05, coverage: 1.05, sixMonthReturn: 0.01, discountZ: -0.3, liquidityScore: 55, taxPocket: "IRA / Roth preferred", notes: "Newer/smaller BDC candidate; requires extra scrutiny on liquidity and operating history." },
  { rank: 39, ticker: "XYLD", name: "Global X S&P 500 Covered Call ETF", role: "Current Core", sleeveFit: "Option-Income", sector: "Option-Income ETF", price: 0, signalScore: 71, upside: 0.04, revisionScore: 70, momentumScore: 60, qualityScore: 74, dispersion: 0.12, yieldRate: 0.10, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.03, discountZ: 0, liquidityScore: 90, taxPocket: "IRA / Roth preferred", notes: "Original option-income core; full overwrite can cap upside, so compare against DIVO/JEPI/SPYI." },
  { rank: 40, ticker: "BIPC", name: "Brookfield Infrastructure Corporation", role: "Challenger", sleeveFit: "Infrastructure", sector: "Infrastructure C-Corp", price: 0, signalScore: 71, upside: 0.08, revisionScore: 70, momentumScore: 60, qualityScore: 78, dispersion: 0.15, yieldRate: 0.05, discountNav: 0, coverage: 1.20, sixMonthReturn: 0.00, discountZ: 0, liquidityScore: 70, taxPocket: "Either", notes: "Global infrastructure challenger; balance sheet, rates, and structure complexity require review." },
  { rank: 41, ticker: "GPIQ", name: "Goldman Sachs Nasdaq 100 Core Premium Income ETF", role: "Challenger", sleeveFit: "Option-Income", sector: "Option-Income ETF", price: 0, signalScore: 70, upside: 0.05, revisionScore: 70, momentumScore: 68, qualityScore: 72, dispersion: 0.12, yieldRate: 0.09, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.05, discountZ: 0, liquidityScore: 62, taxPocket: "IRA / Roth preferred", notes: "Nasdaq option-income challenger; liquidity and upside capture must be compared to JEPQ/QQQI." },
  { rank: 42, ticker: "RQI", name: "Cohen & Steers Quality Income Realty Fund", role: "Challenger", sleeveFit: "Credit / CEF", sector: "REIT CEF", price: 0, signalScore: 70, upside: 0.10, revisionScore: 68, momentumScore: 58, qualityScore: 74, dispersion: 0.16, yieldRate: 0.08, discountNav: -0.10, coverage: 1.00, sixMonthReturn: 0.00, discountZ: -0.8, liquidityScore: 76, taxPocket: "Taxable preferred", notes: "REIT CEF diversifier; rate sensitivity makes it a regime-dependent challenger." },
  { rank: 43, ticker: "PCEF", name: "Invesco CEF Income Composite ETF", role: "Sleeve Benchmark", sleeveFit: "Credit / CEF", sector: "CEF ETF / Tactical Proxy", price: 0, signalScore: 70, upside: 0.08, revisionScore: 74, momentumScore: 64, qualityScore: 76, dispersion: 0.12, yieldRate: 0.085, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.02, discountZ: 0, liquidityScore: 88, taxPocket: "Taxable preferred", notes: "CEF benchmark and tactical mean-reversion proxy; not automatically a best core holding." },
  { rank: 44, ticker: "UTF", name: "Cohen & Steers Infrastructure Fund", role: "Challenger", sleeveFit: "Credit / CEF", sector: "Infrastructure CEF", price: 0, signalScore: 70, upside: 0.08, revisionScore: 70, momentumScore: 60, qualityScore: 76, dispersion: 0.14, yieldRate: 0.08, discountNav: -0.08, coverage: 1.00, sixMonthReturn: 0.01, discountZ: -0.7, liquidityScore: 72, taxPocket: "Taxable preferred", notes: "Infrastructure CEF challenger to UTG; compare NAV total return, leverage, and discount." },
  { rank: 45, ticker: "FDUS", name: "Fidus Investment", role: "Watchlist", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 69, upside: 0.10, revisionScore: 68, momentumScore: 58, qualityScore: 70, dispersion: 0.15, yieldRate: 0.11, discountNav: -0.05, coverage: 1.05, sixMonthReturn: 0.00, discountZ: -0.4, liquidityScore: 48, taxPocket: "IRA / Roth preferred", notes: "Smaller BDC watchlist; liquidity and underwriting history need more review before core inclusion." },
  { rank: 46, ticker: "FPF", name: "First Trust Intermediate Duration Preferred & Income Fund", role: "Challenger", sleeveFit: "Credit / CEF", sector: "Preferred CEF", price: 0, signalScore: 69, upside: 0.08, revisionScore: 68, momentumScore: 58, qualityScore: 72, dispersion: 0.14, yieldRate: 0.085, discountNav: -0.09, coverage: 1.00, sixMonthReturn: 0.00, discountZ: -0.7, liquidityScore: 66, taxPocket: "Taxable preferred", notes: "Preferred CEF diversifier; watch duration, financial-sector concentration, and leverage cost." },
  { rank: 47, ticker: "TRIN", name: "Trinity Capital", role: "Watchlist", sleeveFit: "BDC / Private Credit", sector: "Venture Lending BDC", price: 0, signalScore: 68, upside: 0.12, revisionScore: 64, momentumScore: 62, qualityScore: 66, dispersion: 0.18, yieldRate: 0.13, discountNav: -0.08, coverage: 1.00, sixMonthReturn: 0.02, discountZ: -0.4, liquidityScore: 62, taxPocket: "IRA / Roth preferred", notes: "High-yield venture BDC; watchlist unless NAV/non-accrual data justify risk." },
  { rank: 48, ticker: "RNP", name: "Cohen & Steers REIT & Preferred Income Fund", role: "Challenger", sleeveFit: "Credit / CEF", sector: "REIT / Preferred CEF", price: 0, signalScore: 68, upside: 0.08, revisionScore: 66, momentumScore: 56, qualityScore: 72, dispersion: 0.15, yieldRate: 0.08, discountNav: -0.10, coverage: 1.00, sixMonthReturn: -0.01, discountZ: -0.8, liquidityScore: 64, taxPocket: "Taxable preferred", notes: "Hybrid REIT/preferred CEF; useful diversifier if rate regime stabilizes." },
  { rank: 49, ticker: "RYLD", name: "Global X Russell 2000 Covered Call ETF", role: "Watchlist", sleeveFit: "Option-Income", sector: "Option-Income ETF", price: 0, signalScore: 67, upside: 0.06, revisionScore: 64, momentumScore: 60, qualityScore: 66, dispersion: 0.16, yieldRate: 0.12, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.02, discountZ: 0, liquidityScore: 76, taxPocket: "IRA / Roth preferred", notes: "Small-cap overwrite; higher distribution but lower quality and tougher long-term total-return profile." },
  { rank: 50, ticker: "ETV", name: "Eaton Vance Tax-Managed Buy-Write Opportunities Fund", role: "Challenger", sleeveFit: "Option-Income", sector: "Option CEF", price: 0, signalScore: 67, upside: 0.06, revisionScore: 66, momentumScore: 58, qualityScore: 70, dispersion: 0.15, yieldRate: 0.085, discountNav: -0.08, coverage: 1.00, sixMonthReturn: 0.00, discountZ: -0.7, liquidityScore: 70, taxPocket: "Taxable preferred", notes: "Tax-managed option CEF; compare against ETF option-income sleeve for tax and discount behavior." },
  { rank: 51, ticker: "BCSF", name: "Bain Capital Specialty Finance", role: "Watchlist", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 66, upside: 0.11, revisionScore: 64, momentumScore: 56, qualityScore: 66, dispersion: 0.18, yieldRate: 0.11, discountNav: -0.08, coverage: 1.05, sixMonthReturn: 0.00, discountZ: -0.5, liquidityScore: 58, taxPocket: "IRA / Roth preferred", notes: "Discounted BDC watchlist; needs stronger evidence on NAV and credit quality before core role." },
  { rank: 52, ticker: "CGBD", name: "Carlyle Secured Lending", role: "Watchlist", sleeveFit: "BDC / Private Credit", sector: "BDC / Private Credit", price: 0, signalScore: 66, upside: 0.12, revisionScore: 64, momentumScore: 56, qualityScore: 66, dispersion: 0.18, yieldRate: 0.11, discountNav: -0.10, coverage: 1.05, sixMonthReturn: 0.00, discountZ: -0.5, liquidityScore: 55, taxPocket: "IRA / Roth preferred", notes: "High-yield BDC watchlist; require evidence discount is not signaling credit deterioration." },
  { rank: 53, ticker: "JPI", name: "Nuveen Preferred & Income Term Fund", role: "Challenger", sleeveFit: "Credit / CEF", sector: "Preferred CEF", price: 0, signalScore: 66, upside: 0.07, revisionScore: 66, momentumScore: 56, qualityScore: 70, dispersion: 0.14, yieldRate: 0.075, discountNav: -0.08, coverage: 1.00, sixMonthReturn: -0.01, discountZ: -0.7, liquidityScore: 60, taxPocket: "Taxable preferred", notes: "Preferred CEF candidate; rate-sensitive and should be benchmarked against FPF/JPS." },
  { rank: 54, ticker: "BIZD", name: "VanEck BDC Income ETF", role: "Sleeve Benchmark", sleeveFit: "BDC / Private Credit", sector: "BDC ETF / Benchmark", price: 0, signalScore: 65, upside: 0.10, revisionScore: 70, momentumScore: 64, qualityScore: 72, dispersion: 0.16, yieldRate: 0.10, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.02, discountZ: 0, liquidityScore: 86, taxPocket: "IRA / Roth preferred", notes: "BDC sleeve benchmark; use for comparison or broad exposure, not automatically superior to ARCC/BXSL/MAIN." },
  { rank: 55, ticker: "EOS", name: "Eaton Vance Enhanced Equity Income Fund II", role: "Challenger", sleeveFit: "Option-Income", sector: "Option CEF", price: 0, signalScore: 65, upside: 0.06, revisionScore: 64, momentumScore: 58, qualityScore: 68, dispersion: 0.15, yieldRate: 0.08, discountNav: -0.07, coverage: 1.00, sixMonthReturn: 0.00, discountZ: -0.6, liquidityScore: 66, taxPocket: "Taxable preferred", notes: "Option CEF candidate; compare tax-managed distribution and discount behavior against ETV." },
  { rank: 56, ticker: "ECC", name: "Eagle Point Credit Company", role: "Current Core", sleeveFit: "Credit / CEF", sector: "CLO Equity CEF", price: 0, signalScore: 62, upside: 0.16, revisionScore: 55, momentumScore: 58, qualityScore: 58, dispersion: 0.28, yieldRate: 0.17, discountNav: 0.00, coverage: 0.90, sixMonthReturn: 0.00, discountZ: 0, liquidityScore: 64, taxPocket: "Taxable preferred", notes: "High-risk CLO equity income; keep small and consider separate risk bucket versus normal credit CEFs." },
  { rank: 57, ticker: "AGG", name: "iShares Core U.S. Aggregate Bond ETF", role: "Tactical", sleeveFit: "Tactical", sector: "Investment Grade Bonds", price: 0, signalScore: 80, upside: 0.04, revisionScore: 90, momentumScore: 58, qualityScore: 92, dispersion: 0.05, yieldRate: 0.04, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.00, discountZ: 0, liquidityScore: 98, taxPocket: "Tactical sleeve", notes: "Default defensive rotation instrument in the TITAN rulebook; H0 rotates 50% and H1 rotates 25% to AGG." },
  { rank: 58, ticker: "BSV", name: "Vanguard Short-Term Bond ETF", role: "Tactical", sleeveFit: "Tactical", sector: "Short-Term Bonds", price: 0, signalScore: 76, upside: 0.035, revisionScore: 88, momentumScore: 55, qualityScore: 92, dispersion: 0.04, yieldRate: 0.04, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.00, discountZ: 0, liquidityScore: 96, taxPocket: "Tactical sleeve", notes: "Shorter-duration defensive alternative; test against AGG for drawdown mitigation versus recovery participation." },
  { rank: 59, ticker: "SGOV", name: "iShares 0-3 Month Treasury Bond ETF", role: "Tactical", sleeveFit: "Tactical", sector: "T-Bills", price: 0, signalScore: 75, upside: 0.04, revisionScore: 90, momentumScore: 50, qualityScore: 95, dispersion: 0.02, yieldRate: 0.04, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.00, discountZ: 0, liquidityScore: 98, taxPocket: "Tactical sleeve", notes: "Cash-like defensive instrument; useful if rate shock or margin-risk conditions argue for lower duration than AGG." },
  { rank: 60, ticker: "MUB", name: "iShares National Muni Bond ETF", role: "Tactical", sleeveFit: "Tactical", sector: "Municipal Bonds", price: 0, signalScore: 74, upside: 0.035, revisionScore: 88, momentumScore: 52, qualityScore: 90, dispersion: 0.04, yieldRate: 0.035, discountNav: 0, coverage: 1.00, sixMonthReturn: 0.00, discountZ: 0, liquidityScore: 94, taxPocket: "Taxable tactical", notes: "Taxable-account defensive alternative; test after-tax versus AGG if TITAN is implemented in taxable capital." },
] as Omit<BenchCandidate, keyof typeof DEFAULT_TA_FIELDS>[]).map((candidate) => ({
  ...DEFAULT_TA_FIELDS,
  ...candidate,
}));

const RULES = [
  {
    title: "PHR Regime Classification",
    detail:
      "Compute the four-pillar Portfolio Health Regime score: Volatility Regime, Credit/Income Trend, Portfolio Internals, and Cross-Sleeve Breadth. Classify H0/H1/H2/H3/H4 before downstream rules.",
  },
  {
    title: "Dynamic Margin",
    detail:
      "Set target margin from regime: 0% in H0/H1, 25% in H2, 40% in H3, and 50% in H4. Rebalance monthly and recognize financing cost daily.",
  },
  {
    title: "Dynamic Defensive Rotation",
    detail:
      "H0 rotates 50% of the core book to AGG. H1 rotates 25% to AGG. H2-H4 keep 100% core exposure unless hard stops override.",
  },
  {
    title: "Hard Stops",
    detail:
      "VIX >30 caps margin at 5%; VIX >25 with score <70 caps at 10%; MOVE >140 caps at 10%; portfolio drawdown and 3-month return stops can force margin to 0% and defensive rotation.",
  },
  {
    title: "Monthly Execution Protocol",
    detail:
      "Run the 10-step month-end process: data pull, PHR score, regime, hard-stop check, margin target, defensive target, holdings screen, tactical check, rebalance, and decision log.",
  },
  {
    title: "Core Portfolio Construction",
    detail:
      "Maintain infrastructure, BDC/private credit, option-income, and credit/CEF sleeves plus tactical exposure. Bench is prefilled with the 20 primary TITAN positions and replacement candidates.",
  },
  {
    title: "Discount-Capture Rotation",
    detail:
      "For CEF sleeve, track 3-year discount z-score. Bench replaces core when the bench z-score is >1.5σ deeper than held peer and score is ≥70. Trim rich discounts and exit at extreme premium.",
  },
  {
    title: "Distribution-Cut Protocol",
    detail:
      "Any holding with 6-month return < -15% or announced distribution cut is trimmed to 50% of original weight and reviewed for reinstatement after 5-15 trading days.",
  },
  {
    title: "Daily / Monthly Monitoring",
    detail:
      "Evaluate current PHR score, hard-stop status, drawdown from 12-month high, tactical signal, and holding-level cut review. Output one primary action state.",
  },
  {
    title: "Margin & Capital Philosophy",
    detail:
      "Margin is financing, not speculation. Portfolio Margin account required. Dashboard tracks actual margin, target margin, financed notional, financing line, and broker cushion.",
  },
  {
    title: "Tax & Asset Location",
    detail:
      "Route MLPs to taxable; BDCs and ordinary option-income to IRA/Roth when possible; ROC-heavy CEFs to taxable; tactical sleeve to trust/entity if useful.",
  },
  {
    title: "Risk Controls & Limitations",
    detail:
      "All sleeves retain residual credit exposure. Margin amplifies losses. Regime classification can lag gap-down events. Transaction costs and tax effects reduce realized performance.",
  },
];

const blankHolding = (): Holding => ({
  id: crypto.randomUUID(),
  ticker: "",
  name: "",
  sleeve: "Infrastructure",
  sector: "",
  shares: 0,
  cost: 0,
  price: 0,
  titanRank: 999,
  signalScore: 0,
  upside: 0,
  revisionScore: 0,
  momentumScore: 0,
  qualityScore: 0,
  dispersion: 0,
  daysHeld: 0,
  above200dma: false,
  earningsBeforeExpiry: false,
  technicalExtension: 0,
  buyZoneLow: 0,
  buyZoneHigh: 0,
  buyAnchor: 0,
  stopLevel: 0,
  trimLow: 0,
  trimHigh: 0,
  taConfidence: "Manual",
  taNotes: "",
  notes: "",
});

const blankBenchCandidate = (rank: number): BenchCandidate => ({
  rank,
  ticker: "",
  name: "",
  ...DEFAULT_INCOME_FIELDS,
  sleeveFit: "Infrastructure",
  sector: "",
  price: 0,
  signalScore: 0,
  upside: 0,
  revisionScore: 0,
  momentumScore: 0,
  qualityScore: 0,
  dispersion: 0,
  buyZoneLow: 0,
  buyZoneHigh: 0,
  buyAnchor: 0,
  stopLevel: 0,
  trimLow: 0,
  trimHigh: 0,
  taConfidence: "Manual",
  taNotes: "",
  notes: "",
});

const blankCall = (): CoveredCall => ({
  id: crypto.randomUUID(),
  ticker: "",
  sharesCovered: 0,
  stockPrice: 0,
  strike: 0,
  dte: 30,
  delta: 0.15,
  premiumReceived: 0,
  currentMark: 0,
  earningsBeforeExpiry: false,
  notes: "",
});

function normalizeTicker(value: string): string {
  return value.trim().toUpperCase();
}

function displayDateString(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSignedPercentPoints(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatSignedCurrency(value: number): string {
  return `${value >= 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundNumber(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function upsideToScore(upside: number): number {
  return clampNumber((upside / 0.25) * 100, 0, 100);
}

function incomeYieldToScore(yieldOrReturn: number): number {
  const y = clampNumber(yieldOrReturn, 0, 0.25);
  if (y <= 0.04) return clampNumber((y / 0.04) * 55, 0, 55);
  if (y <= 0.10) return 55 + ((y - 0.04) / 0.06) * 40;
  if (y <= 0.14) return 95 - ((y - 0.10) / 0.04) * 15;
  return 60;
}

function dispersionToScore(dispersion: number): number {
  return clampNumber(100 - dispersion * 200, 0, 100);
}

function calculateTechnicalSetupScore(input: {
  price?: number;
  buyZoneLow?: number;
  buyZoneHigh?: number;
  stopLevel?: number;
  trimLow?: number;
  trimHigh?: number;
  taConfidence?: TaConfidence;
  above200dma?: boolean;
  technicalExtension?: number;
}): number {
  const price = positiveNumber(input.price) ?? 0;
  const buyLow = positiveNumber(input.buyZoneLow) ?? 0;
  const buyHigh = positiveNumber(input.buyZoneHigh) ?? 0;
  const stop = positiveNumber(input.stopLevel) ?? 0;
  const trimLow = positiveNumber(input.trimLow) ?? 0;
  const trimHigh = positiveNumber(input.trimHigh) ?? 0;
  let score = 55;

  if (input.above200dma) score += 10;
  if (input.taConfidence === "Medium") score += 8;
  if (input.taConfidence === "High") score += 15;
  if (input.taConfidence === "Low") score += 2;

  if (price > 0 && buyLow > 0 && buyHigh > 0) {
    if (price >= buyLow && price <= buyHigh) score += 25;
    else if (price > buyHigh && (!trimLow || price < trimLow)) score += 10;
    else if (price < buyLow) score += 3;
  }

  if (price > 0 && stop > 0 && price < stop) score -= 35;
  if (price > 0 && trimLow > 0 && price >= trimLow) score -= 10;
  if (price > 0 && trimHigh > 0 && price >= trimHigh) score -= 15;
  if (typeof input.technicalExtension === "number") {
    if (input.technicalExtension >= 0.18) score -= 12;
    else if (input.technicalExtension >= 0.10) score -= 5;
    else if (input.technicalExtension >= -0.05 && input.technicalExtension <= 0.08)
      score += 5;
  }

  return roundNumber(clampNumber(score, 0, 100), 0);
}

function calculateTitanSignalScore(input: {
  upside: number;
  revisionScore: number;
  momentumScore: number;
  qualityScore: number;
  dispersion: number;
  yieldRate?: number;
  discountNav?: number;
  coverage?: number;
  sixMonthReturn?: number;
  discountZ?: number;
  liquidityScore?: number;
  price?: number;
  buyZoneLow?: number;
  buyZoneHigh?: number;
  stopLevel?: number;
  trimLow?: number;
  trimHigh?: number;
  taConfidence?: TaConfidence;
  above200dma?: boolean;
  technicalExtension?: number;
}): number {
  const yieldInput = typeof input.yieldRate === "number" ? input.yieldRate : input.upside;
  const yieldScore = incomeYieldToScore(yieldInput);
  const coverageScore =
    typeof input.coverage === "number" && Number.isFinite(input.coverage)
      ? clampNumber((input.coverage - 0.8) / 0.5 * 100, 0, 100)
      : clampNumber(input.revisionScore, 0, 100);
  const distributionSafetyScore = clampNumber((input.revisionScore * 0.55) + (coverageScore * 0.45), 0, 100);
  const sixMonthScore =
    typeof input.sixMonthReturn === "number" && Number.isFinite(input.sixMonthReturn)
      ? clampNumber(50 + input.sixMonthReturn * 250, 0, 100)
      : clampNumber(input.momentumScore, 0, 100);
  const momentumScore = clampNumber((input.momentumScore * 0.65) + (sixMonthScore * 0.35), 0, 100);
  const qualityScore = clampNumber(input.qualityScore, 0, 100);
  const valuationScore =
    typeof input.discountNav === "number" && input.discountNav < 0
      ? clampNumber(60 + Math.abs(input.discountNav) * 250, 0, 100)
      : typeof input.discountNav === "number" && input.discountNav > 0.2
        ? clampNumber(80 - input.discountNav * 100, 20, 80)
        : dispersionToScore(input.dispersion);
  const zScoreBonus =
    typeof input.discountZ === "number" && input.discountZ <= -1.5
      ? 8
      : typeof input.discountZ === "number" && input.discountZ <= -1.0
        ? 5
        : typeof input.discountZ === "number" && input.discountZ >= 1.0
          ? -5
          : 0;
  const liquidityScore = typeof input.liquidityScore === "number" ? clampNumber(input.liquidityScore, 0, 100) : 75;
  const technicalScore = calculateTechnicalSetupScore(input);
  const score =
    yieldScore * 0.18 +
    distributionSafetyScore * 0.22 +
    momentumScore * 0.14 +
    qualityScore * 0.18 +
    valuationScore * 0.12 +
    liquidityScore * 0.06 +
    technicalScore * 0.1 +
    zScoreBonus;
  return roundNumber(clampNumber(score, 0, 100), 0);
}

function autoTag(active: boolean, label = "AUTO") {
  return active ? (
    <div className="mt-1 text-[10px] font-black tracking-wide text-[#067647]">
      {label}
    </div>
  ) : (
    <div className="mt-1 text-[10px] font-black tracking-wide text-[#667085]">
      MANUAL
    </div>
  );
}

function positiveNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function formatCurrencyTable(value: number | null | undefined): string {
  const n = positiveNumber(value);
  if (!n) return "—";
  const digits = n < 20 ? 2 : n < 100 ? 1 : 0;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatMetric(value: number | null | undefined, digits = 0): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatRatio(value: number | null | undefined, digits = 0): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatSignedRatio(value: number | null | undefined, digits = 1): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  const pct = value * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(digits)}%`;
}

function valueBox(
  main: React.ReactNode,
  sub?: React.ReactNode,
  tone: "neutral" | "positive" | "warning" | "negative" = "neutral",
) {
  return (
    <div className={`readonly-box readonly-${tone}`}>
      <div className="readonly-main">{main}</div>
      {sub ? <div className="readonly-sub">{sub}</div> : null}
    </div>
  );
}

function zoneBox(
  low: number | null | undefined,
  high: number | null | undefined,
  sub?: React.ReactNode,
  tone: "neutral" | "positive" | "warning" | "negative" = "neutral",
) {
  return valueBox(
    `${formatCurrencyTable(low)} – ${formatCurrencyTable(high)}`,
    sub,
    tone,
  );
}

function scoreTone(score: number): "neutral" | "positive" | "warning" | "negative" {
  if (score >= 80) return "positive";
  if (score >= 65) return "neutral";
  if (score >= 50) return "warning";
  return "negative";
}

function scoreLabel(score: number): string {
  if (score >= 80) return "STRONG";
  if (score >= 65) return "WATCH";
  if (score >= 50) return "NEUTRAL";
  return "WEAK";
}

function displayTaFields(
  row: Pick<
    Holding | BenchCandidate,
    | "price"
    | "buyZoneLow"
    | "buyZoneHigh"
    | "buyAnchor"
    | "stopLevel"
    | "trimLow"
    | "trimHigh"
    | "taConfidence"
    | "taNotes"
  >,
  ta?: TechnicalAutoData,
) {
  const price = positiveNumber(row.price) ?? positiveNumber(ta?.price) ?? 0;
  const buyZoneLow =
    positiveNumber(row.buyZoneLow) ?? positiveNumber(ta?.buyZoneLow) ??
    (price ? price * 0.88 : 0);
  const buyZoneHigh =
    positiveNumber(row.buyZoneHigh) ?? positiveNumber(ta?.buyZoneHigh) ??
    (price ? price * 0.97 : 0);
  const buyAnchor =
    positiveNumber(row.buyAnchor) ?? positiveNumber(ta?.buyAnchor) ??
    (price ? price * 0.94 : 0);
  const stopLevel =
    positiveNumber(row.stopLevel) ?? positiveNumber(ta?.stopLevel) ??
    (buyZoneLow ? buyZoneLow * 0.93 : 0);
  const trimLow =
    positiveNumber(row.trimLow) ?? positiveNumber(ta?.trimLow) ??
    (price ? price * 1.1 : 0);
  const trimHigh =
    positiveNumber(row.trimHigh) ?? positiveNumber(ta?.trimHigh) ??
    (price ? price * 1.18 : 0);
  const confidence =
    row.taConfidence && row.taConfidence !== "Manual"
      ? row.taConfidence
      : ta?.confidence ?? (price ? "Low" : "Manual");
  const notes =
    row.taNotes ||
    ta?.notes ||
    (price
      ? "Fallback price-based TA estimate. Verify chips/HVN/ribbon/MACD/RSI directly in TradingView before trading."
      : "Enter ticker and refresh live data to calculate the TA confluence framework.");

  return {
    price,
    buyZoneLow: roundNumber(buyZoneLow, 2),
    buyZoneHigh: roundNumber(buyZoneHigh, 2),
    buyAnchor: roundNumber(buyAnchor, 2),
    stopLevel: roundNumber(stopLevel, 2),
    trimLow: roundNumber(trimLow, 2),
    trimHigh: roundNumber(trimHigh, 2),
    confidence,
    notes,
  };
}

const TITAN_CURRENT_CORE_TICKERS = new Set([
  "MPLX", "EPD", "ET", "WMB", "UTG", "ARCC", "MAIN", "HTGC", "GBDC", "CSWC", "XYLD", "DIVO", "PDI", "PTY", "DSL", "BGT", "ECC",
]);

const TITAN_SLEEVE_BENCHMARK_TICKERS = new Set([
  "PCEF", "BIZD", "AMLP", "HYG", "JNK", "LQD",
]);

const TITAN_TACTICAL_TICKERS = new Set([
  "AGG", "BSV", "SGOV", "MUB", "USFR", "VGIT", "IEF", "MINT", "JPST",
]);

const TITAN_WATCHLIST_TICKERS = new Set([
  "FDUS", "TRIN", "RYLD", "BCSF", "CGBD", "ECC",
]);

function inferBenchRole(tickerInput: string, sleeve: Sleeve): BenchRole {
  const ticker = normalizeTicker(tickerInput);
  if (!ticker) return "Challenger";
  if (TITAN_TACTICAL_TICKERS.has(ticker) || sleeve === "Tactical") return "Tactical";
  if (TITAN_SLEEVE_BENCHMARK_TICKERS.has(ticker)) return "Sleeve Benchmark";
  if (TITAN_CURRENT_CORE_TICKERS.has(ticker)) return "Current Core";
  if (TITAN_WATCHLIST_TICKERS.has(ticker)) return "Watchlist";
  return "Challenger";
}

function titanAssetLocation(tickerInput: string, sleeve: Sleeve): { pocket: string; rationale: string } {
  const ticker = normalizeTicker(tickerInput);
  if (["MPLX", "EPD", "ET"].includes(ticker)) {
    return { pocket: "Taxable only", rationale: "Direct MLP / K-1; avoid IRA UBTI complexity." };
  }
  if (["ARCC", "MAIN", "HTGC", "GBDC", "CSWC", "BXSL", "OBDC", "TSLX", "FSK", "BCSF", "CGBD", "KBDC", "FDUS", "TRIN", "BIZD"].includes(ticker) || sleeve === "BDC / Private Credit") {
    return { pocket: "IRA / Roth preferred", rationale: "BDC income is generally ordinary-income heavy." };
  }
  if (["XYLD", "DIVO", "JEPI", "JEPQ", "SPYI", "QQQI", "GPIX", "GPIQ", "RYLD", "QYLD", "ETV", "EOS"].includes(ticker) || sleeve === "Option-Income") {
    return { pocket: "IRA / Roth preferred", rationale: "Option-income distributions can be ordinary-income heavy." };
  }
  if (["UTG", "PDI", "PTY", "DSL", "BGT", "ECC", "PCEF", "PDO", "PAXS", "ARDC", "HYT", "BIT", "BGB", "FPF", "JPI", "RQI", "UTF"].includes(ticker) || sleeve === "Credit / CEF") {
    return { pocket: "Taxable preferred", rationale: "CEF ROC can defer tax through basis reduction; monitor discounts and coverage." };
  }
  if (ticker === "WMB") {
    return { pocket: "Either", rationale: "C-corp midstream; standard dividend tax profile." };
  }
  if (sleeve === "Tactical") {
    return { pocket: "Trust / entity or portfolio sleeve", rationale: "Used for defensive rotation and tactical mean reversion." };
  }
  return { pocket: "Case-by-case", rationale: "Confirm distribution character and account-level tax constraints." };
}

function actionTone(action: string): string {
  if (["HOLD", "TACTICAL DEPLOY", "BUY", "COVER"].includes(action)) return "text-[#067647]";
  if (["REDUCE MARGIN", "SELL", "BUY BACK", "TAX HARVEST"].includes(action))
    return "text-[#B42318]";
  if (["DEFENSIVE ROTATE", "CUT REVIEW", "FULL REBALANCE", "TRIM", "REBALANCE", "DAF CANDIDATE"].includes(action))
    return "text-[#C9A84C]";
  return "text-[#0D1B2A]";
}

function statusPill(action: string): string {
  if (["HOLD", "TACTICAL DEPLOY", "BUY", "COVER"].includes(action))
    return "bg-green-50 text-green-800 border-green-200";
  if (["REDUCE MARGIN", "SELL", "BUY BACK", "TAX HARVEST"].includes(action))
    return "bg-red-50 text-red-800 border-red-200";
  if (["DEFENSIVE ROTATE", "CUT REVIEW", "FULL REBALANCE", "TRIM", "REBALANCE", "DAF CANDIDATE"].includes(action))
    return "bg-yellow-50 text-yellow-800 border-yellow-200";
  return "bg-slate-50 text-slate-700 border-slate-200";
}

function classifyRegime(phrScore: number, vix: number, move: number) {
  const score = clampNumber(phrScore, 0, 100);
  let regime =
    score < 30
      ? {
          code: "H0",
          label: "Defensive",
          target: 1.0,
          posture: "50% AGG defensive rotation",
          overlay: "Tactical active · protect capital",
        }
      : score < 50
        ? {
            code: "H1",
            label: "Cautious",
            target: 1.0,
            posture: "25% AGG defensive rotation",
            overlay: "Tactical active · partial bond flip",
          }
        : score < 70
          ? {
              code: "H2",
              label: "Neutral",
              target: 1.25,
              posture: "Full core exposure",
              overlay: "Passive · normal posture",
            }
          : score < 90
            ? {
                code: "H3",
                label: "Constructive",
                target: 1.4,
                posture: "Full core + 40% margin target",
                overlay: "Passive · press advantage",
              }
            : {
                code: "H4",
                label: "Aggressive",
                target: 1.5,
                posture: "Full core + 50% margin target",
                overlay: "Passive · maximum deployment",
              };

  if (vix > 30) {
    regime = {
      ...regime,
      target: Math.min(regime.target, 1.05),
      overlay: "Hard stop: VIX >30 · margin cap 5%",
    };
  } else if (vix > 25 && score < 70) {
    regime = {
      ...regime,
      target: Math.min(regime.target, 1.1),
      overlay: "Hard stop: VIX >25 and PHR <70 · margin cap 10%",
    };
  }

  if (move > 140) {
    regime = {
      ...regime,
      target: Math.min(regime.target, 1.1),
      overlay: "Hard stop: MOVE >140 · margin cap 10%",
    };
  }

  return regime;
}

function metricCard(
  label: string,
  value: string,
  sub?: string,
  tone = "text-[#0D1B2A]",
) {
  return (
    <div className="border border-[#E5D8A8] bg-white p-4 shadow-sm">
      <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#C9A84C]">
        {label}
      </div>
      <div className={`mt-3 text-2xl font-black ${tone}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-[#344054]">{sub}</div> : null}
    </div>
  );
}

function parseNumber(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function TitanDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("dailyBrief");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [benchCandidates, setBenchCandidates] =
    useState<BenchCandidate[]>(DEFAULT_BENCH);
  const [openCalls, setOpenCalls] = useState<CoveredCall[]>([]);
  const [optionCandidates, setOptionCandidates] = useState<
    Record<string, OptionCandidate[]>
  >({});
  const [spy, setSpy] = useState(70);
  const [ma50, setMa50] = useState(18);
  const [ma200, setMa200] = useState(110);
  const [cash, setCash] = useState(0);
  const [marginDebt, setMarginDebt] = useState(0);
  const [marginRate, setMarginRate] = useState(5.75);
  const [hydrated, setHydrated] = useState(false);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuote>>({});
  const [signalData, setSignalData] = useState<Record<string, SignalAutoData>>({});
  const [incomeData, setIncomeData] = useState<Record<string, IncomeAutoData>>({});
  const [technicalData, setTechnicalData] = useState<Record<string, TechnicalAutoData>>({});
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState("");
  const [lastLiveRefresh, setLastLiveRefresh] = useState("");
  const [useLiveQuotes, setUseLiveQuotes] = useState(true);
  const [autoRefreshQuotes, setAutoRefreshQuotes] = useState(false);
  const [finnhubApiKey, setFinnhubApiKey] = useState("");

  useEffect(() => {
    try {
      const savedHoldings = localStorage.getItem(STORAGE_KEYS.holdings);
      const savedBench = localStorage.getItem(STORAGE_KEYS.bench);
      const savedCalls = localStorage.getItem(STORAGE_KEYS.calls);
      const savedSettings = localStorage.getItem(STORAGE_KEYS.settings);
      const savedLiveSettings = localStorage.getItem(STORAGE_KEYS.liveSettings);

      if (savedHoldings) setHoldings(JSON.parse(savedHoldings) as Holding[]);
      if (savedBench)
        setBenchCandidates(
          (JSON.parse(savedBench) as Partial<BenchCandidate>[]).map((candidate, index) => {
            const sleeveFit = (candidate.sleeveFit as Sleeve) ?? "Infrastructure";
            const ticker = candidate.ticker ?? "";
            return {
              ...DEFAULT_INCOME_FIELDS,
              ...DEFAULT_TA_FIELDS,
              ...candidate,
              rank: typeof candidate.rank === "number" ? candidate.rank : index + 1,
              role: inferBenchRole(ticker, sleeveFit),
              ticker,
              name: candidate.name ?? "",
              sleeveFit,
              sector: candidate.sector ?? "",
              price: candidate.price ?? 0,
              signalScore: candidate.signalScore ?? 0,
              upside: candidate.upside ?? candidate.yieldRate ?? 0,
              revisionScore: candidate.revisionScore ?? 0,
              momentumScore: candidate.momentumScore ?? 0,
              qualityScore: candidate.qualityScore ?? 0,
              dispersion: candidate.dispersion ?? 0,
              notes: "",
            };
          }) as BenchCandidate[],
        );
      if (savedCalls) setOpenCalls(JSON.parse(savedCalls) as CoveredCall[]);
      if (savedSettings) {
        const s = JSON.parse(savedSettings) as {
          spy?: number;
          ma50?: number;
          ma200?: number;
          cash?: number;
          marginDebt?: number;
          marginRate?: number;
        };
        if (typeof s.spy === "number") setSpy(s.spy);
        if (typeof s.ma50 === "number") setMa50(s.ma50);
        if (typeof s.ma200 === "number") setMa200(s.ma200);
        if (typeof s.cash === "number") setCash(s.cash);
        if (typeof s.marginDebt === "number") setMarginDebt(s.marginDebt);
        if (typeof s.marginRate === "number") setMarginRate(s.marginRate);
      }
      if (savedLiveSettings) {
        const s = JSON.parse(savedLiveSettings) as {
          useLiveQuotes?: boolean;
          autoRefreshQuotes?: boolean;
          finnhubApiKey?: string;
        };
        if (typeof s.useLiveQuotes === "boolean")
          setUseLiveQuotes(s.useLiveQuotes);
        if (typeof s.autoRefreshQuotes === "boolean")
          setAutoRefreshQuotes(s.autoRefreshQuotes);
        if (typeof s.finnhubApiKey === "string")
          setFinnhubApiKey(s.finnhubApiKey);
      }
    } catch {
      // Leave default empty state if browser storage is invalid.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEYS.holdings, JSON.stringify(holdings));
  }, [holdings, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEYS.bench, JSON.stringify(benchCandidates));
  }, [benchCandidates, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEYS.calls, JSON.stringify(openCalls));
  }, [openCalls, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ spy, ma50, ma200, cash, marginDebt, marginRate }),
    );
  }, [cash, hydrated, ma200, ma50, marginDebt, marginRate, spy]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(
      STORAGE_KEYS.liveSettings,
      JSON.stringify({ useLiveQuotes, autoRefreshQuotes, finnhubApiKey }),
    );
  }, [autoRefreshQuotes, finnhubApiKey, hydrated, useLiveQuotes]);

  const quoteSymbols = useMemo(() => {
    const symbols = [
      "SPY",
      "PCEF",
      "HYG",
      "AGG",
      ...holdings.map((h) => h.ticker),
      ...benchCandidates.map((b) => b.ticker),
      ...openCalls.map((c) => c.ticker),
    ]
      .map(normalizeTicker)
      .filter(Boolean);
    return Array.from(new Set(symbols)).slice(0, 80).join(",");
  }, [benchCandidates, holdings, openCalls]);

  const optionSymbols = useMemo(() => {
    const symbols = holdings
      .filter((h) => h.ticker && h.shares > 0)
      .map((h) => normalizeTicker(h.ticker));
    return Array.from(new Set(symbols)).slice(0, 20).join(",");
  }, [holdings]);

  const signalSymbols = useMemo(() => {
    const symbols = [
      ...holdings.map((h) => h.ticker),
      ...benchCandidates.map((b) => b.ticker),
    ]
      .map(normalizeTicker)
      .filter(Boolean);
    return Array.from(new Set(symbols)).slice(0, 60).join(",");
  }, [benchCandidates, holdings]);

  async function refreshLiveMarketData() {
    if (!quoteSymbols) return;
    setLiveLoading(true);
    setLiveError("");
    try {
      const optionQuery = optionSymbols
        ? `&includeOptions=1&optionSymbols=${encodeURIComponent(optionSymbols)}`
        : "";
      const signalQuery = "";
      const incomeQuery = signalSymbols
        ? `&includeIncome=1&incomeSymbols=${encodeURIComponent(signalSymbols)}`
        : "";
      const technicalQuery = signalSymbols
        ? `&includeTechnical=1&technicalSymbols=${encodeURIComponent(signalSymbols)}`
        : "";
      const endpoint = `/api/titan?symbols=${encodeURIComponent(quoteSymbols)}${optionQuery}${signalQuery}${incomeQuery}${technicalQuery}`;
      const response = await fetch(endpoint, {
        cache: "no-store",
        headers: finnhubApiKey.trim()
          ? { "x-finnhub-key": finnhubApiKey.trim() }
          : undefined,
      });
      const raw = await response.text();
      let data: (MarketApiResponse & { error?: string }) | null = null;
      try {
        data = raw ? (JSON.parse(raw) as MarketApiResponse & { error?: string }) : null;
      } catch {
        const preview = raw.slice(0, 180).replace(/\s+/g, " ");
        throw new Error(
          `API returned non-JSON from ${endpoint}. Status ${response.status}. ${preview || "Empty response."}`
        );
      }
      if (!response.ok || !data) {
        throw new Error(data?.error || `Live market data request failed with status ${response.status}.`);
      }
      setLiveQuotes(data.quotes ?? {});
      setSignalData({});
      setTechnicalData(data.technical ?? {});
      setOptionCandidates(data.options ?? {});
      setLastLiveRefresh(data.asOf ?? new Date().toISOString());

      setHoldings((prev) =>
        prev.map((h) => {
          const ticker = normalizeTicker(h.ticker);
          const q = data.quotes?.[ticker];
          const ta = data.technical?.[ticker];
          const next = {
            ...h,
            price: q?.price ? Number(q.price.toFixed(2)) : h.price,

            above200dma: ta?.above200dma ?? h.above200dma,
            technicalExtension: ta?.technicalExtension ?? h.technicalExtension,
            buyZoneLow: ta?.buyZoneLow ?? h.buyZoneLow ?? 0,
            buyZoneHigh: ta?.buyZoneHigh ?? h.buyZoneHigh ?? 0,
            buyAnchor: ta?.buyAnchor ?? h.buyAnchor ?? 0,
            stopLevel: ta?.stopLevel ?? h.stopLevel ?? 0,
            trimLow: ta?.trimLow ?? h.trimLow ?? 0,
            trimHigh: ta?.trimHigh ?? h.trimHigh ?? 0,
            taConfidence: ta?.confidence ?? h.taConfidence ?? "Manual",
            taNotes: ta?.notes ?? h.taNotes ?? "",
          };
          return {
            ...next,
            signalScore: calculateTitanSignalScore(next),
          };
        }),
      );
      setBenchCandidates((prev) =>
        prev.map((b) => {
          const ticker = normalizeTicker(b.ticker);
          const q = data.quotes?.[ticker];
          const ta = data.technical?.[ticker];
          const income = data.income?.[ticker];
          const next = {
            ...b,
            price: q?.price ? Number(q.price.toFixed(2)) : b.price,
            role: inferBenchRole(b.ticker, b.sleeveFit),
            yieldRate: income?.dividendYield ?? b.yieldRate,
            sixMonthReturn: ta?.sixMonthReturn ?? b.sixMonthReturn,

            buyZoneLow: ta?.buyZoneLow ?? b.buyZoneLow ?? 0,
            buyZoneHigh: ta?.buyZoneHigh ?? b.buyZoneHigh ?? 0,
            buyAnchor: ta?.buyAnchor ?? b.buyAnchor ?? 0,
            stopLevel: ta?.stopLevel ?? b.stopLevel ?? 0,
            trimLow: ta?.trimLow ?? b.trimLow ?? 0,
            trimHigh: ta?.trimHigh ?? b.trimHigh ?? 0,
            taConfidence: ta?.confidence ?? b.taConfidence ?? "Manual",
            taNotes: ta?.notes ?? b.taNotes ?? "",
          };
          return {
            ...next,
            signalScore: calculateTitanSignalScore(next),
          };
        }),
      );
      setOpenCalls((prev) =>
        prev.map((c) => {
          const q = data.quotes?.[normalizeTicker(c.ticker)];
          return q?.price
            ? { ...c, stockPrice: Number(q.price.toFixed(2)) }
            : c;
        }),
      );
    } catch (error) {
      setLiveError(
        error instanceof Error ? error.message : "Unknown market-data error.",
      );
    } finally {
      setLiveLoading(false);
    }
  }

  useEffect(() => {
    if (!hydrated || !useLiveQuotes) return;
    void refreshLiveMarketData();
    if (!autoRefreshQuotes) return;
    const id = window.setInterval(() => {
      void refreshLiveMarketData();
    }, 60_000);
    return () => window.clearInterval(id);
    // Intentionally keyed to the symbol list; price-only updates should not recreate the interval.
  }, [
    autoRefreshQuotes,
    finnhubApiKey,
    hydrated,
    optionSymbols,
    quoteSymbols,
    signalSymbols,
    useLiveQuotes,
  ]);

  const snapshot = useMemo(() => {
    const longMarketValue = holdings.reduce(
      (sum, h) => sum + h.shares * h.price,
      0,
    );
    const totalCost = holdings.reduce((sum, h) => sum + h.shares * h.cost, 0);
    const netLiquidationValue = longMarketValue + cash - marginDebt;
    const currentLeverage =
      netLiquidationValue > 0 ? longMarketValue / netLiquidationValue : 0;
    const totalPnl = longMarketValue - totalCost;
    const weightedTitanScore =
      longMarketValue > 0
        ? holdings.reduce(
            (sum, h) => sum + h.signalScore * (h.shares * h.price),
            0,
          ) / longMarketValue
        : 0;
    const weightedUpside =
      longMarketValue > 0
        ? holdings.reduce(
            (sum, h) => sum + h.upside * (h.shares * h.price),
            0,
          ) / longMarketValue
        : 0;
    const coreValue = holdings
      .filter((h) => h.sleeve !== "Tactical")
      .reduce((sum, h) => sum + h.shares * h.price, 0);
    const opportunisticValue = holdings
      .filter((h) => h.sleeve === "Tactical")
      .reduce((sum, h) => sum + h.shares * h.price, 0);
    const coreWeight = longMarketValue > 0 ? coreValue / longMarketValue : 0;
    const opportunisticWeight =
      longMarketValue > 0 ? opportunisticValue / longMarketValue : 0;
    const regime = classifyRegime(spy, ma50, ma200);
    const leverageGap = regime.target - currentLeverage;

    const enrichedHoldings: HoldingRow[] = holdings.map((h) => {
      const marketValue = h.shares * h.price;
      const weight = longMarketValue > 0 ? marketValue / longMarketValue : 0;
      const gain = h.cost > 0 ? h.price / h.cost - 1 : 0;
      const ltcg = h.daysHeld >= 366;
      const priceInBuyZone =
        h.buyZoneLow > 0 &&
        h.buyZoneHigh > 0 &&
        h.price >= h.buyZoneLow &&
        h.price <= h.buyZoneHigh;
      const atTrimZone = h.trimLow > 0 && h.price >= h.trimLow;
      const invalidated = h.stopLevel > 0 && h.price > 0 && h.price < h.stopLevel;
      const coverEligible =
        weight > 0.06 &&
        h.above200dma &&
        !h.earningsBeforeExpiry &&
        (h.technicalExtension >= 0.15 || atTrimZone);
      const trim = weight > 0.075 || (h.trimHigh > 0 && h.price >= h.trimHigh);
      const buy = priceInBuyZone && h.signalScore >= 65 && !invalidated;
      const taxHarvest = gain < -0.08 && h.daysHeld < 366;
      const sell = invalidated || (h.daysHeld >= 366 && h.titanRank > 100);
      const action: ActionState = sell
        ? "SELL"
        : taxHarvest
          ? "TAX HARVEST"
          : trim
            ? "TRIM"
            : coverEligible
              ? "COVER"
              : buy
                ? "BUY"
                : "HOLD";
      return { ...h, marketValue, weight, gain, ltcg, coverEligible, action };
    });

    const sectorWeights = Object.entries(
      enrichedHoldings.reduce<Record<string, number>>((acc, h) => {
        const key = h.sector || "Unclassified";
        acc[key] = (acc[key] ?? 0) + h.marketValue;
        return acc;
      }, {}),
    )
      .map(([sector, value]) => ({
        sector,
        weight: longMarketValue > 0 ? value / longMarketValue : 0,
      }))
      .sort((a, b) => b.weight - a.weight);

    const callAlerts = openCalls.map((c) => {
      const withinFivePercent =
        c.strike > 0 ? c.stockPrice >= c.strike * 0.95 : false;
      const twoTimesLoss =
        c.premiumReceived > 0 ? c.currentMark >= c.premiumReceived * 2 : false;
      const capture =
        c.premiumReceived > 0
          ? (c.premiumReceived - c.currentMark) / c.premiumReceived
          : 0;
      const buyback =
        c.delta >= 0.35 ||
        withinFivePercent ||
        twoTimesLoss ||
        capture >= 0.7 ||
        c.dte <= 7 ||
        c.earningsBeforeExpiry;
      return { ...c, capture, buyback };
    });

    const hardStopActive = regime.overlay.startsWith("Hard stop");
    const cutReviewActive = enrichedHoldings.some(
      (h) => h.gain <= -0.15 || h.momentumScore < 40,
    );
    const firstHoldingAction = enrichedHoldings.find(
      (h) => h.action !== "HOLD",
    )?.action;
    const primaryAction: ActionState =
      holdings.length === 0
        ? "FULL REBALANCE"
        : hardStopActive && currentLeverage > regime.target + 0.03
          ? "REDUCE MARGIN"
          : ["H0", "H1"].includes(regime.code)
            ? "DEFENSIVE ROTATE"
            : cutReviewActive
              ? "CUT REVIEW"
              : Math.abs(leverageGap) > 0.03
                ? "FULL REBALANCE"
                : (firstHoldingAction ??
                  (callAlerts.some((c) => c.buyback) ? "BUY BACK" : "HOLD"));

    return {
      longMarketValue,
      totalCost,
      netLiquidationValue,
      currentLeverage,
      totalPnl,
      weightedTitanScore,
      weightedUpside,
      coreWeight,
      opportunisticWeight,
      coreCount: holdings.filter((h) => h.sleeve !== "Tactical").length,
      opportunisticCount: holdings.filter((h) => h.sleeve === "Tactical")
        .length,
      regime,
      leverageGap,
      primaryAction,
      enrichedHoldings,
      sectorWeights,
      callAlerts,
      annualFinancingCost: marginDebt * (marginRate / 100),
    };
  }, [cash, holdings, ma50, ma200, marginDebt, marginRate, openCalls, spy]);

  const actionItems = useMemo(() => {
    const items: Array<{ action: ActionState; title: string; detail: string }> =
      [];
    if (holdings.length === 0) {
      items.push({
        action: "FULL REBALANCE",
        title: "Build initial TITAN portfolio",
        detail:
          "Portfolio is empty. Use the Bench tab to promote TITAN candidates into Holdings, then enter shares, cost basis, current price, and holding period.",
      });
      return items;
    }
    if (snapshot.primaryAction === "FULL REBALANCE") {
      items.push({
        action: "REBALANCE",
        title: "Leverage gap exceeds 3%",
        detail: `Target ${snapshot.regime.target.toFixed(2)}x vs current ${snapshot.currentLeverage.toFixed(2)}x. Adjust exposure after confirming cash buffer and financing cost.`,
      });
    }
    snapshot.enrichedHoldings
      .filter((h) => h.action !== "HOLD")
      .forEach((h) => {
        items.push({
          action: h.action,
          title: `${h.ticker} — ${h.action}`,
          detail: `${h.name}; weight ${(h.weight * 100).toFixed(1)}%, rank ${h.titanRank}, days held ${h.daysHeld}.`,
        });
      });
    snapshot.enrichedHoldings
      .filter(
        (h) =>
          h.coverEligible &&
          (optionCandidates[normalizeTicker(h.ticker)]?.length ?? 0) > 0,
      )
      .forEach((h) => {
        const top = optionCandidates[normalizeTicker(h.ticker)]?.[0];
        if (top)
          items.push({
            action: "COVER",
            title: `${h.ticker} optional-call candidate`,
            detail: `Finnhub chain candidate: ${top.expiration} $${top.strike.toFixed(2)} call, ${top.dte} DTE, delta ${top.delta === null ? "n/a" : top.delta.toFixed(2)}, mid ${top.mid === null ? "n/a" : formatCurrency(top.mid)}.`,
          });
      });
    snapshot.callAlerts
      .filter((c) => c.buyback)
      .forEach((c) => {
        items.push({
          action: "BUY BACK",
          title: `${c.ticker} call buyback trigger`,
          detail: `Delta ${c.delta.toFixed(2)}, ${c.dte} DTE, capture ${(c.capture * 100).toFixed(0)}%. Buyback-first overlay rule applies.`,
        });
      });
    return items.length
      ? items
      : [
          {
            action: "HOLD" as ActionState,
            title: "No hard rule triggered",
            detail:
              "Maintain current portfolio posture; continue monitoring regime, rankings, tax lots, and optional overlay status.",
          },
        ];
  }, [holdings.length, optionCandidates, snapshot]);

  function updateHolding(
    id: string,
    field: keyof Holding,
    value: string | number | boolean,
  ) {
    setHoldings((prev) =>
      prev.map((h) =>
        h.id === id ? ({ ...h, [field]: value } as Holding) : h,
      ),
    );
  }

  function updateCall(
    id: string,
    field: keyof CoveredCall,
    value: string | number | boolean,
  ) {
    setOpenCalls((prev) =>
      prev.map((c) =>
        c.id === id ? ({ ...c, [field]: value } as CoveredCall) : c,
      ),
    );
  }

  function updateBenchCandidate(
    index: number,
    field: keyof BenchCandidate,
    value: string | number,
  ) {
    setBenchCandidates((prev) =>
      prev.map((b, i) =>
        i === index ? ({ ...b, [field]: value } as BenchCandidate) : b,
      ),
    );
  }

  function addBenchCandidate() {
    const nextRank =
      benchCandidates.reduce(
        (max, b) => Math.max(max, Number(b.rank) || 0),
        0,
      ) + 1;
    setBenchCandidates((prev) => [...prev, blankBenchCandidate(nextRank)]);
  }

  function resetBenchToDefault() {
    if (
      window.confirm(
        "Reset the TITAN Bench to the default 60-position candidate universe? This will overwrite manual bench edits in this browser.",
      )
    ) {
      setBenchCandidates(DEFAULT_BENCH);
    }
  }

  function addOptionCandidateToCalls(candidate: OptionCandidate) {
    setOpenCalls((prev) => [
      ...prev,
      {
        ...blankCall(),
        ticker: candidate.ticker,
        stockPrice: liveQuotes[normalizeTicker(candidate.ticker)]?.price ?? 0,
        strike: candidate.strike,
        dte: candidate.dte,
        delta: candidate.delta ?? 0,
        premiumReceived:
          candidate.mid ??
          candidate.bid ??
          candidate.ask ??
          candidate.last ??
          0,
        currentMark:
          candidate.mid ??
          candidate.bid ??
          candidate.ask ??
          candidate.last ??
          0,
        notes: `Finnhub candidate ${candidate.expiration}; verify bid/ask in brokerage before trade.`,
      },
    ]);
    setActiveTab("coveredCalls");
  }

  function addCandidateToHoldings(candidate: BenchCandidate) {
    const alreadyOwned = holdings.some(
      (h) => h.ticker.toUpperCase() === candidate.ticker.toUpperCase(),
    );
    if (alreadyOwned) return;
    setHoldings((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        ticker: candidate.ticker,
        name: candidate.name,
        sleeve: candidate.sleeveFit,
        sector: candidate.sector,
        shares: 0,
        cost: candidate.price,
        price: candidate.price,
        titanRank: candidate.rank,
        signalScore: candidate.signalScore,
        upside: candidate.upside,
        revisionScore: candidate.revisionScore,
        momentumScore: candidate.momentumScore,
        qualityScore: candidate.qualityScore,
        dispersion: candidate.dispersion,
        daysHeld: 0,
        above200dma: true,
        earningsBeforeExpiry: false,
        technicalExtension: 0,
        buyZoneLow: candidate.buyZoneLow ?? 0,
        buyZoneHigh: candidate.buyZoneHigh ?? 0,
        buyAnchor: candidate.buyAnchor ?? 0,
        stopLevel: candidate.stopLevel ?? 0,
        trimLow: candidate.trimLow ?? 0,
        trimHigh: candidate.trimHigh ?? 0,
        taConfidence: candidate.taConfidence ?? "Manual",
        taNotes: candidate.taNotes ?? "",
        notes: candidate.notes,
      },
    ]);
    setActiveTab("holdings");
  }

  function clearHoldings() {
    if (window.confirm("Clear all TITAN holdings from this browser?")) {
      setHoldings([]);
    }
  }

  const ownedTickers = new Set(holdings.map((h) => h.ticker.toUpperCase()));

  return (
    <main className="min-h-screen bg-[#EEF1F6] text-[#0D1B2A]">
      <style jsx global>{`
        .compact-data-table {
          font-size: 10px;
          line-height: 1.1;
        }
        .compact-data-table th {
          padding: 6px 4px !important;
          font-size: 9px !important;
          line-height: 1.05 !important;
          white-space: nowrap;
        }
        .compact-data-table td {
          padding: 4px !important;
          vertical-align: top;
        }
        .compact-data-table input,
        .compact-data-table select,
        .compact-data-table textarea {
          width: 100% !important;
          min-height: 26px;
          padding: 3px 4px !important;
          font-size: 10px !important;
          line-height: 1.1 !important;
        }
        .compact-data-table .live-label {
          font-size: 8px !important;
          line-height: 1.05 !important;
        }
        .holdings-table {
          min-width: 1040px !important;
        }
        .bench-table {
          min-width: 900px !important;
        }
        .readonly-box {
          min-height: 26px;
          border: 1px solid #E5D8A8;
          background: #F8FAFC;
          padding: 4px 5px;
          white-space: nowrap;
        }
        .readonly-main {
          font-weight: 900;
          color: #0D1B2A;
        }
        .readonly-sub {
          margin-top: 2px;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: #667085;
        }
        .readonly-positive .readonly-sub,
        .readonly-positive .readonly-main {
          color: #067647;
        }
        .readonly-warning .readonly-sub,
        .readonly-warning .readonly-main {
          color: #A17600;
        }
        .readonly-negative .readonly-sub,
        .readonly-negative .readonly-main {
          color: #B42318;
        }
        .ta-detail-row td {
          background: #F8FAFC;
          border-bottom: 1px solid #E5D8A8;
          padding: 0 4px 8px 4px !important;
        }
        .ta-detail-box {
          border: 1px solid #E5D8A8;
          border-left: 4px solid #C9A84C;
          background: #FFFFFF;
          padding: 8px 10px;
        }
        .ta-detail-title {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #0D1B2A;
        }
        .ta-detail-text {
          margin-top: 3px;
          font-size: 11px;
          line-height: 1.35;
          color: #344054;
        }
        .ta-mini-grid {
          margin-top: 7px;
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 6px;
        }
        .ta-mini-item {
          border: 1px solid #EEF1F6;
          background: #F8FAFC;
          padding: 5px;
        }
        .ta-mini-label {
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          color: #667085;
        }
        .ta-mini-value {
          margin-top: 2px;
          font-size: 10px;
          font-weight: 900;
          color: #0D1B2A;
        }
      `}</style>
      <section className="mx-auto max-w-7xl bg-white shadow-sm">
        <header className="border-b-2 border-[#C9A84C] bg-[#0D1B2A] px-8 py-7 text-white">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-4xl font-black uppercase tracking-[0.08em]">
                Tenacity Investments
              </h1>
              <p className="mt-2 text-sm italic tracking-wide text-[#C9A84C]">
                Portfolio Strategies
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold">{displayDateString()}</p>
              <p className="mt-5 text-sm font-black uppercase tracking-wide text-[#C9A84C]">
                Private &amp; Confidential
              </p>
            </div>
          </div>
        </header>

        <div className="px-8 py-8">
          <div className="grid grid-cols-[1fr_280px] gap-8">
            <div>
              <h2 className="text-4xl font-black tracking-tight">
                TITAN Income Strategy Dashboard
              </h2>
              <p className="mt-5 max-w-4xl text-base leading-8 text-[#0D1B2A]">
                Multi-asset income dashboard for the TITAN strategy using PHR regime classification, dynamic margin, defensive rotation, income-sleeve monitoring, candidate bench management, and optional call-overlay management.
              </p>
            </div>
            <div className="flex items-center justify-end">
              <img
                src="/bull-logo.jpg"
                alt="Tenacity bull logo"
                className="max-h-44 w-full object-contain"
              />
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="bg-[#0D1B2A] p-4 text-center text-white">
              <div className="text-[10px] font-black uppercase tracking-widest">
                Annualized Return
              </div>
              <div className="mt-2 text-2xl font-black text-[#C9A84C]">
                12.00%
              </div>
              <div className="text-xs italic">14Y CAGR backtest</div>
            </div>
            <div className="bg-[#0D1B2A] p-4 text-center text-white">
              <div className="text-[10px] font-black uppercase tracking-widest">
                Portfolio
              </div>
              <div className="mt-2 text-2xl font-black text-[#C9A84C]">
                18 + Tactical
              </div>
              <div className="text-xs italic">income universe</div>
            </div>
            <div className="bg-[#0D1B2A] p-4 text-center text-white">
              <div className="text-[10px] font-black uppercase tracking-widest">
                Core / Tactical
              </div>
              <div className="mt-2 text-2xl font-black text-[#C9A84C]">
                4 Sleeves
              </div>
              <div className="text-xs italic">income engines</div>
            </div>
            <div className="bg-[#0D1B2A] p-4 text-center text-white">
              <div className="text-[10px] font-black uppercase tracking-widest">
                Max Leverage
              </div>
              <div className="mt-2 text-2xl font-black text-[#C9A84C]">
                1.50x
              </div>
              <div className="text-xs italic">H4 max target</div>
            </div>
            <div className="bg-[#0D1B2A] p-4 text-center text-white">
              <div className="text-[10px] font-black uppercase tracking-widest">
                Holding Window
              </div>
              <div className="mt-2 text-2xl font-black text-[#C9A84C]">
                Monthly
              </div>
              <div className="text-xs italic">decision cycle</div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
            {metricCard(
              "Net Liq",
              formatCurrency(snapshot.netLiquidationValue),
              "Gross holdings + cash − margin",
            )}
            {metricCard(
              "Total P&L",
              formatSignedCurrency(snapshot.totalPnl),
              "Unrealized portfolio P&L",
              snapshot.totalPnl >= 0 ? "text-[#067647]" : "text-[#B42318]",
            )}
            {metricCard(
              "Holdings",
              `${holdings.length}/20`,
              `${snapshot.coreCount} Core / ${snapshot.opportunisticCount} Tactical`,
            )}
            {metricCard(
              "TITAN Score",
              snapshot.weightedTitanScore.toFixed(1),
              "Weighted income / risk score",
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border border-[#E5D8A8] bg-[#F0EBD8] px-4 py-3 text-sm text-[#344054]">
            <div>
              <strong className="text-[#0D1B2A]">Live data:</strong>{" "}
              {useLiveQuotes ? "Enabled" : "Manual mode"}
              {lastLiveRefresh
                ? ` · Last refresh ${new Date(lastLiveRefresh).toLocaleTimeString("en-US")}`
                : " · Not refreshed yet"}
              {liveError ? (
                <span className="ml-2 font-bold text-[#B42318]">
                  {liveError}
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => void refreshLiveMarketData()}
              disabled={liveLoading || !useLiveQuotes}
              className="bg-[#0D1B2A] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              {liveLoading ? "Refreshing..." : "Refresh Live Data"}
            </button>
          </div>

          <div className="mt-7 flex flex-wrap gap-2">
            {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border px-4 py-3 text-sm ${activeTab === tab ? "border-[#C9A84C] bg-[#C9A84C] text-white" : "border-[#E5D8A8] bg-white text-[#0D1B2A] hover:bg-[#F0EBD8]"}`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-4 max-w-7xl px-0 pb-10">
        <div className="grid gap-4 px-0 md:grid-cols-4">
          {metricCard(
            "Regime",
            `${snapshot.regime.code}`,
            `${snapshot.regime.label} · ${snapshot.regime.posture}`,
          )}
          {metricCard(
            "Target Exposure",
            `${snapshot.regime.target.toFixed(2)}x`,
            "PHR regime framework",
          )}
          {metricCard(
            "Current Leverage",
            `${snapshot.currentLeverage.toFixed(2)}x`,
            `Gap ${snapshot.leverageGap >= 0 ? "+" : ""}${snapshot.leverageGap.toFixed(2)}x`,
          )}
          {metricCard(
            "Primary Action",
            snapshot.primaryAction,
            holdings.length === 0
              ? "Build initial TITAN book"
              : snapshot.primaryAction === "FULL REBALANCE"
                ? "Leverage deviation >3%"
                : "Rule-engine output",
            actionTone(snapshot.primaryAction),
          )}
        </div>

        <div className="mt-4 rounded-none bg-white p-6 shadow-sm">
          {activeTab === "dailyBrief" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <section className="border border-[#E5D8A8] p-5">
                <h3 className="text-xl font-black">Executive readout</h3>
                <p className="mt-2 text-sm leading-6 text-[#344054]">
                  TITAN is in{" "}
                  <strong>
                    {snapshot.regime.code} — {snapshot.regime.label}
                  </strong>
                  . Target leverage is{" "}
                  <strong>{snapshot.regime.target.toFixed(2)}x</strong>, current
                  leverage is{" "}
                  <strong>{snapshot.currentLeverage.toFixed(2)}x</strong>, and
                  the primary action is{" "}
                  <strong className={actionTone(snapshot.primaryAction)}>
                    {snapshot.primaryAction}
                  </strong>
                  .
                </p>
                {holdings.length === 0 ? (
                  <div className="mt-4 border border-[#E5D8A8] bg-[#F0EBD8] p-4 text-sm leading-6 text-[#344054]">
                    The TITAN book has not been started. Use the{" "}
                    <strong>Bench</strong> tab to promote candidates into the
                    Holdings ledger, then edit shares, basis, current price,
                    rank, signal score, and tax/location notes.
                  </div>
                ) : null}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {metricCard(
                    "Core Income",
                    formatPercent(snapshot.coreWeight),
                    "Core income exposure",
                  )}
                  {metricCard(
                    "Tactical",
                    formatPercent(snapshot.opportunisticWeight),
                    "AGG / tactical exposure",
                  )}
                  {metricCard("Cash", formatCurrency(cash), "Liquidity buffer")}
                  {metricCard(
                    "Financing Cost",
                    formatCurrency(snapshot.annualFinancingCost),
                    "Estimated annual drag",
                  )}
                </div>
              </section>
              <section className="border border-[#E5D8A8] p-5">
                <h3 className="text-xl font-black">Immediate commentary</h3>
                <p className="mt-2 text-sm leading-6 text-[#344054]">
                  The dashboard reviews regime, leverage, holdings, bench
                  candidates, rankings, sector caps, tax/location data, optional-call
                  status, and cash needs each session, then outputs one primary
                  action state.
                </p>
                <div className="mt-4 space-y-3">
                  {actionItems.slice(0, 5).map((item, i) => (
                    <div
                      key={`${item.title}-${i}`}
                      className="border-l-4 border-[#C9A84C] bg-[#EEF1F6] p-3"
                    >
                      <div
                        className={`text-sm font-black ${actionTone(item.action)}`}
                      >
                        {item.action} · {item.title}
                      </div>
                      <div className="mt-1 text-sm text-[#344054]">
                        {item.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === "actionItems" && (
            <section>
              <h3 className="text-xl font-black">Action Items</h3>
              <p className="mt-2 text-sm text-[#344054]">
                Rule-engine output based on regime, leverage, holdings, signal
                ranks, tax lots, and optional overlay status.
              </p>
              <div className="mt-4 grid gap-3">
                {actionItems.map((item, i) => (
                  <div
                    key={`${item.title}-${i}`}
                    className="grid gap-3 border border-[#E5D8A8] p-4 md:grid-cols-[140px_1fr]"
                  >
                    <div>
                      <span
                        className={`border px-3 py-2 text-xs font-black ${statusPill(item.action)}`}
                      >
                        {item.action}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-black">{item.title}</h4>
                      <p className="mt-1 text-sm leading-6 text-[#344054]">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "holdings" && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">
                    Holdings Ledger
                  </h3>
                  <p className="mt-2 text-sm text-[#344054]">
                    Streamlined decision view. Editable inputs remain on the left; calculated outputs are locked: live price, buy zone, trim zone, combined 0–100 score, and action state.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setHoldings((prev) => [...prev, blankHolding()])
                    }
                    className="bg-[#C9A84C] px-4 py-2 text-sm font-black text-white"
                  >
                    Add Holding
                  </button>
                  <button
                    type="button"
                    onClick={clearHoldings}
                    className="border border-[#E5D8A8] px-4 py-2 text-sm font-black text-[#0D1B2A]"
                  >
                    Clear
                  </button>
                </div>
              </div>
              {holdings.length === 0 ? (
                <div className="mt-4 border border-[#E5D8A8] bg-[#F0EBD8] p-4 text-sm text-[#344054]">
                  No holdings entered yet. Go to the <strong>Bench</strong> tab
                  and click <strong>Promote</strong> next to a candidate, or use{" "}
                  <strong>Add Holding</strong> above.
                </div>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="compact-data-table holdings-table w-full border-collapse">
                    <thead className="bg-[#0D1B2A] text-white">
                      <tr>
                        {[
                          "Ticker",
                          "Name",
                          "Sleeve",
                          "Sector",
                          "Shares",
                          "Cost",
                          "Days",
                          "Earnings",
                          "Price",
                          "Buy Zone",
                          "Trim Zone",
                          "Score",
                          "Weight",
                          "P&L",
                          "Action",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="p-3 text-left text-xs uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.enrichedHoldings.map((h) => {
                        const ticker = normalizeTicker(h.ticker);
                        const live = liveQuotes[ticker];
                        const ta = technicalData[ticker];
                        const displayTa = displayTaFields(h, ta);
                        const inBuyZone =
                          displayTa.price > 0 &&
                          displayTa.buyZoneLow > 0 &&
                          displayTa.buyZoneHigh > 0 &&
                          displayTa.price >= displayTa.buyZoneLow &&
                          displayTa.price <= displayTa.buyZoneHigh;
                        const inTrimZone =
                          displayTa.price > 0 &&
                          displayTa.trimLow > 0 &&
                          displayTa.price >= displayTa.trimLow;
                        const combinedScore = calculateTitanSignalScore({
                          ...h,
                          price: displayTa.price,
                          buyZoneLow: displayTa.buyZoneLow,
                          buyZoneHigh: displayTa.buyZoneHigh,
                          stopLevel: displayTa.stopLevel,
                          trimLow: displayTa.trimLow,
                          trimHigh: displayTa.trimHigh,
                          taConfidence: displayTa.confidence,
                          above200dma: ta?.above200dma ?? h.above200dma,
                          technicalExtension: ta?.technicalExtension ?? h.technicalExtension,
                        });
                        return (
                          <tr key={h.id} className="border-b border-[#E5D8A8] align-top">
                            <td className="p-2">
                              <input
                                className="w-24 border border-[#E5D8A8] p-2 font-black"
                                value={h.ticker}
                                onChange={(e) =>
                                  updateHolding(
                                    h.id,
                                    "ticker",
                                    e.target.value.toUpperCase(),
                                  )
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                className="w-40 border border-[#E5D8A8] p-2"
                                value={h.name}
                                onChange={(e) =>
                                  updateHolding(h.id, "name", e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <select
                                className="w-40 border border-[#E5D8A8] p-2"
                                value={h.sleeve}
                                onChange={(e) =>
                                  updateHolding(
                                    h.id,
                                    "sleeve",
                                    e.target.value as Sleeve,
                                  )
                                }
                              >
                                <option>Infrastructure</option>
                                <option>BDC / Private Credit</option>
                                <option>Option-Income</option>
                                <option>Credit / CEF</option>
                                <option>Tactical</option>
                              </select>
                            </td>
                            <td className="p-2">
                              <input
                                className="w-32 border border-[#E5D8A8] p-2"
                                value={h.sector}
                                onChange={(e) =>
                                  updateHolding(h.id, "sector", e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                className="w-20 border border-[#E5D8A8] p-2"
                                type="number"
                                value={h.shares}
                                onChange={(e) =>
                                  updateHolding(
                                    h.id,
                                    "shares",
                                    parseNumber(e.target.value),
                                  )
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                className="w-20 border border-[#E5D8A8] p-2"
                                type="number"
                                value={h.cost}
                                onChange={(e) =>
                                  updateHolding(
                                    h.id,
                                    "cost",
                                    parseNumber(e.target.value),
                                  )
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                className="w-16 border border-[#E5D8A8] p-2"
                                type="number"
                                value={h.daysHeld}
                                onChange={(e) =>
                                  updateHolding(
                                    h.id,
                                    "daysHeld",
                                    parseNumber(e.target.value),
                                  )
                                }
                              />
                              {h.ltcg ? (
                                <div className="text-xs font-bold text-[#067647]">LTCG</div>
                              ) : (
                                <div className="text-xs font-bold text-[#B42318]">ST</div>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={h.earningsBeforeExpiry}
                                onChange={(e) =>
                                  updateHolding(
                                    h.id,
                                    "earningsBeforeExpiry",
                                    e.target.checked,
                                  )
                                }
                              />
                            </td>
                            <td className="p-2">
                              {valueBox(
                                formatCurrencyTable(displayTa.price || h.price),
                                live
                                  ? `LIVE ${formatSignedPercentPoints(live.changePercent)}`
                                  : "STORED",
                                live ? "positive" : "neutral",
                              )}
                            </td>
                            <td className="p-2">
                              {zoneBox(
                                displayTa.buyZoneLow,
                                displayTa.buyZoneHigh,
                                inBuyZone ? "IN ZONE" : "AUTO",
                                inBuyZone ? "positive" : "neutral",
                              )}
                            </td>
                            <td className="p-2">
                              {zoneBox(
                                displayTa.trimLow,
                                displayTa.trimHigh,
                                inTrimZone ? "TRIM / REDUCE" : "AUTO",
                                inTrimZone ? "warning" : "neutral",
                              )}
                            </td>
                            <td className="p-2">
                              {valueBox(
                                formatMetric(combinedScore),
                                scoreLabel(combinedScore),
                                scoreTone(combinedScore),
                              )}
                            </td>
                            <td className="p-3 font-bold">
                              {formatPercent(h.weight)}
                            </td>
                            <td
                              className={`p-3 font-bold ${h.gain >= 0 ? "text-[#067647]" : "text-[#B42318]"}`}
                            >
                              {formatPercent(h.gain)}
                            </td>
                            <td className="p-3">
                              <span
                                className={`border px-2 py-1 text-xs font-black ${statusPill(h.action)}`}
                              >
                                {h.action}
                              </span>
                            </td>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setHoldings((prev) =>
                                    prev.filter((x) => x.id !== h.id),
                                  )
                                }
                                className="text-xs font-black text-[#B42318]"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === "bench" && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">
                    Bench / Top Candidate Pool
                  </h3>
                  <p className="mt-2 text-sm text-[#344054]">
                    Expanded TITAN candidate universe. The first 20 ranks are the current Top 20 shortlist. Role and tax location are automatically assigned by ticker/sleeve, yield is pulled from live data when available, and discount/NAV, coverage, six-month return, and z-score are internal score inputs rather than separate editable columns.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={addBenchCandidate}
                    className="bg-[#C9A84C] px-4 py-2 text-sm font-black text-white"
                  >
                    Add Candidate
                  </button>
                  <button
                    type="button"
                    onClick={resetBenchToDefault}
                    className="border border-[#E5D8A8] px-4 py-2 text-sm font-black text-[#0D1B2A]"
                  >
                    Reset Default
                  </button>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="compact-data-table bench-table w-full border-collapse">
                  <thead className="bg-[#0D1B2A] text-white">
                    <tr>
                      {[
                        "Rank",
                        "Ticker",
                        "Role",
                        "Sleeve",
                        "Price",
                        "Yield",
                        "Buy Zone",
                        "Trim Zone",
                        "Score",
                        "Tax",
                        "Status",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-3 text-left text-xs uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {benchCandidates.map((s, index) => {
                      const ticker = normalizeTicker(s.ticker);
                      const owned = ownedTickers.has(ticker);
                      const live = liveQuotes[ticker];
                      const income = incomeData[ticker];
                      const ta = technicalData[ticker];
                      const role = inferBenchRole(s.ticker, s.sleeveFit);
                      const displayYield = income?.dividendYield ?? s.yieldRate;
                      const displayTa = displayTaFields(s, ta);
                      const inBuyZone =
                        displayTa.price > 0 &&
                        displayTa.buyZoneLow > 0 &&
                        displayTa.buyZoneHigh > 0 &&
                        displayTa.price >= displayTa.buyZoneLow &&
                        displayTa.price <= displayTa.buyZoneHigh;
                      const inTrimZone =
                        displayTa.price > 0 &&
                        displayTa.trimLow > 0 &&
                        displayTa.price >= displayTa.trimLow;
                      const combinedScore = calculateTitanSignalScore({
                        ...s,
                        yieldRate: displayYield,
                        sixMonthReturn: ta?.sixMonthReturn ?? s.sixMonthReturn,
                        price: displayTa.price,
                        buyZoneLow: displayTa.buyZoneLow,
                        buyZoneHigh: displayTa.buyZoneHigh,
                        stopLevel: displayTa.stopLevel,
                        trimLow: displayTa.trimLow,
                        trimHigh: displayTa.trimHigh,
                        taConfidence: displayTa.confidence,
                      });
                      const top20 = Number(s.rank) <= 20;
                      const tax = titanAssetLocation(s.ticker, s.sleeveFit).pocket;
                      return (
                        <tr key={`${s.ticker || "bench"}-${index}`} className="border-b border-[#E5D8A8] align-top">
                          <td className="p-2">
                            <input
                              className="w-12 border border-[#E5D8A8] p-2 font-black"
                              type="number"
                              value={s.rank}
                              onChange={(e) =>
                                updateBenchCandidate(index, "rank", parseNumber(e.target.value))
                              }
                            />
                          </td>
                          <td className="p-2">
                            <input
                              className="w-24 border border-[#E5D8A8] p-2 font-black"
                              value={s.ticker}
                              onChange={(e) =>
                                updateBenchCandidate(index, "ticker", e.target.value.toUpperCase())
                              }
                            />
                            <div className="mt-1 text-[10px] font-bold text-[#667085]">{s.name}</div>
                          </td>
                          <td className="p-2">
                            {valueBox(role, "AUTO", role === "Current Core" || role === "Challenger" ? "positive" : role === "Watchlist" ? "warning" : "neutral")}
                          </td>
                          <td className="p-2">
                            <select
                              className="w-40 border border-[#E5D8A8] p-2"
                              value={s.sleeveFit}
                              onChange={(e) => updateBenchCandidate(index, "sleeveFit", e.target.value as Sleeve)}
                            >
                              <option>Infrastructure</option>
                              <option>BDC / Private Credit</option>
                              <option>Option-Income</option>
                              <option>Credit / CEF</option>
                              <option>Tactical</option>
                            </select>
                            <div className="mt-1 text-[10px] text-[#667085]">{s.sector}</div>
                          </td>
                          <td className="p-2">
                            {valueBox(
                              formatCurrencyTable(displayTa.price || s.price),
                              live ? `LIVE ${formatSignedPercentPoints(live.changePercent)}` : "STORED",
                              live ? "positive" : "neutral",
                            )}
                          </td>
                          <td className="p-2">
                            {valueBox(formatRatio(displayYield, 1), income?.dividendYield ? "LIVE" : "MODEL", income?.dividendYield ? "positive" : "neutral")}
                          </td>
                          <td className="p-2">
                            {zoneBox(displayTa.buyZoneLow, displayTa.buyZoneHigh, inBuyZone ? "IN ZONE" : "AUTO", inBuyZone ? "positive" : "neutral")}
                          </td>
                          <td className="p-2">
                            {zoneBox(displayTa.trimLow, displayTa.trimHigh, inTrimZone ? "TRIM / REDUCE" : "AUTO", inTrimZone ? "warning" : "neutral")}
                          </td>
                          <td className="p-2">
                            {valueBox(formatMetric(combinedScore), scoreLabel(combinedScore), scoreTone(combinedScore))}
                          </td>
                          <td className="p-2">
                            {valueBox(tax, "AUTO", "neutral")}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1">
                              <span className={`border px-2 py-1 text-xs font-black ${owned ? statusPill("HOLD") : top20 ? statusPill("BUY") : statusPill("HOLD")}`}>
                                {owned ? "OWNED" : top20 ? "TOP 20" : role.toUpperCase()}
                              </span>
                              {role === "Watchlist" ? <span className="text-[10px] font-bold text-[#B42318]">Watch only</span> : null}
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="flex flex-col gap-2">
                              <button
                                type="button"
                                disabled={owned || !s.ticker || role === "Sleeve Benchmark" || role === "Tactical"}
                                onClick={() => addCandidateToHoldings(s)}
                                className={`px-3 py-2 text-xs font-black ${owned || !s.ticker || role === "Sleeve Benchmark" || role === "Tactical" ? "bg-slate-100 text-slate-400" : "bg-[#C9A84C] text-white"}`}
                              >
                                {owned ? "Added" : "Promote"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setBenchCandidates((prev) => prev.filter((_, i) => i !== index))}
                                className="text-xs font-black text-[#B42318]"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "titanScore" && (
            <section>
              <h3 className="text-xl font-black">TITAN Income Score Engine</h3>
              <p className="mt-2 text-sm text-[#344054]">
                TITAN scoring is an income-risk screen, not a blind yield chase. Final ownership requires yield sustainability, distribution safety, credit trend, discount/valuation discipline, momentum confirmation, liquidity, tax-location fit, and sleeve role.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {metricCard(
                  "Yield / Income",
                  "25%",
                  "Current yield with risk cap",
                )}
                {metricCard("Distribution Safety", "25%", "Cut-risk control")}
                {metricCard("Momentum", "15%", "3m / 6m trend")}
                {metricCard("Quality / Liquidity", "20%", "Coverage / NAV / ADV")}
                {metricCard("Discount / Risk", "5%", "CEF z-score / dispersion")}
                {metricCard("Technical Setup", "10%", "Buy zone / trend")}
                {metricCard("Tax Location", "Rule 11", "Account routing")}
                {metricCard("Bench", "60 names", "Candidate universe")}
              </div>
              <div className="mt-5 border border-[#E5D8A8] bg-[#F0EBD8] p-4 text-sm leading-6 text-[#344054]">
                Current build: the Bench now holds a 60-name TITAN candidate universe and identifies the first 20 ranks as the Top 20 shortlist. Refresh Live Data updates prices and technical inputs where available; manual income-risk inputs such as yield, coverage, discount/NAV, 6-month return, discount z-score, liquidity, and tax pocket roll into one locked 0–100 TITAN Score plus Buy Zone and Trim Zone outputs.
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-sm">
                  <thead className="bg-[#0D1B2A] text-white">
                    <tr>
                      {[
                        "Ticker",
                        "Yield / Income",
                        "Distribution Safety",
                        "Momentum",
                        "Quality / Liquidity",
                        "Discount / Risk",
                        "Optimal Pocket",
                        "TA Buy Zone",
                        "TA Status",
                        "Source Status",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-3 text-left text-xs uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(
                      new Set([
                        ...holdings.map((h) => normalizeTicker(h.ticker)),
                        ...benchCandidates.map((b) => normalizeTicker(b.ticker)),
                      ].filter(Boolean)),
                    )
                      .slice(0, 30)
                      .map((ticker) => {
                        const candidate =
                          benchCandidates.find((b) => normalizeTicker(b.ticker) === ticker) ??
                          holdings.find((h) => normalizeTicker(h.ticker) === ticker);
                        const location = candidate
                          ? titanAssetLocation(candidate.ticker, "sleeve" in candidate ? candidate.sleeve : candidate.sleeveFit)
                          : { pocket: "Manual", rationale: "No candidate record." };
                        return (
                          <tr key={ticker} className="border-b border-[#E5D8A8]">
                            <td className="p-3 font-black">{ticker}</td>
                            <td className="p-3">
                              {candidate ? formatPercent(candidate.upside) : "Manual"}
                            </td>
                            <td className="p-3">
                              {candidate ? `${candidate.revisionScore}/100` : "Manual"}
                            </td>
                            <td className="p-3">
                              {candidate ? `${candidate.momentumScore}/100` : "Manual"}
                            </td>
                            <td className="p-3">
                              {candidate ? `${candidate.qualityScore}/100` : "Manual"}
                            </td>
                            <td className="p-3">
                              {candidate ? formatPercent(candidate.dispersion) : "Manual"}
                            </td>
                            <td className="p-3 text-xs text-[#344054]">
                              <strong>{location.pocket}</strong><br />{location.rationale}
                            </td>
                            <td className="p-3">
                              {technicalData[ticker]?.buyZoneLow && technicalData[ticker]?.buyZoneHigh
                                ? `${formatCurrency(technicalData[ticker].buyZoneLow ?? 0)} – ${formatCurrency(technicalData[ticker].buyZoneHigh ?? 0)}`
                                : "Manual"}
                            </td>
                            <td className="p-3 text-xs text-[#344054]">
                              {technicalData[ticker]
                                ? `${technicalData[ticker].confidence}; ${technicalData[ticker].trendState}; ${technicalData[ticker].macdState}`
                                : "Refresh Live Data to load TA."}
                            </td>
                            <td className="p-3 text-xs text-[#344054]">
                              Manual income score; live refresh updates quotes and technical fields only.
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "taxLots" && (
            <section>
              <h3 className="text-xl font-black">Tax / Asset Location</h3>
              <p className="mt-2 text-sm text-[#344054]">
                TITAN Rule 11 routes each income asset to the most tax-efficient account type where practical: MLPs to taxable, BDCs and option-income funds to IRA/Roth, ROC-heavy CEFs to taxable, and tactical exposure to trust/entity or portfolio-level sleeves.
              </p>
              <div className="mt-4 grid gap-3">
                {snapshot.enrichedHoldings.length === 0 ? (
                  <div className="border border-[#E5D8A8] bg-[#F0EBD8] p-4 text-sm text-[#344054]">
                    No holdings entered yet.
                  </div>
                ) : (
                  snapshot.enrichedHoldings.map((lot) => {
                    const location = titanAssetLocation(lot.ticker, lot.sleeve);
                    return (
                      <div
                        key={lot.id}
                        className="grid gap-3 border border-[#E5D8A8] p-4 md:grid-cols-[120px_180px_1fr_120px]"
                      >
                        <div className="font-black">
                          {lot.ticker}
                          <div className="text-xs font-normal text-[#344054]">
                            {lot.sleeve}
                          </div>
                        </div>
                        <div className="text-sm font-black text-[#0D1B2A]">
                          {location.pocket}
                        </div>
                        <div className="text-sm text-[#344054]">
                          {location.rationale}
                        </div>
                        <div
                          className={
                            lot.gain >= 0 ? "text-[#067647]" : "text-[#B42318]"
                          }
                        >
                          {formatPercent(lot.gain)}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {activeTab === "coveredCalls" && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">Covered Call Overlay</h3>
                  <p className="mt-2 text-sm text-[#344054]">
                    Optional overlay only. TITAN's base rulebook does not require covered calls. Use only on overweight, technically extended positions when assignment would be acceptable or risk-reducing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpenCalls((prev) => [...prev, blankCall()])}
                  className="bg-[#C9A84C] px-4 py-2 text-sm font-black text-white"
                >
                  Add Call
                </button>
              </div>

              <div className="mt-5 border border-[#E5D8A8] bg-[#F0EBD8] p-4">
                <h4 className="font-black text-[#0D1B2A]">
                  Finnhub Sell-Call Candidates
                </h4>
                <p className="mt-2 text-sm leading-6 text-[#344054]">
                  Screen: holding must satisfy TITAN cover eligibility, then the
                  app looks for calls roughly 20–35 DTE, 10–15% OTM, and near
                  0.10–0.20 delta when delta is available. Free option-chain
                  data can be stale; use this as a daily alert, not a trade
                  ticket.
                </p>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[1050px] border-collapse text-sm">
                    <thead className="bg-[#0D1B2A] text-white">
                      <tr>
                        {[
                          "Ticker",
                          "Expiration",
                          "Strike",
                          "DTE",
                          "Delta",
                          "Bid",
                          "Ask",
                          "Mid",
                          "OI",
                          "Volume",
                          "Note",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="p-3 text-left text-xs uppercase tracking-wide"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.enrichedHoldings
                        .filter((h) => h.coverEligible)
                        .flatMap(
                          (h) =>
                            optionCandidates[normalizeTicker(h.ticker)] ?? [],
                        ).length === 0 ? (
                        <tr>
                          <td
                            colSpan={12}
                            className="p-4 text-sm text-[#344054]"
                          >
                            No Finnhub option candidates loaded. Click Refresh
                            Live Data after holdings are entered and cover
                            eligibility is satisfied.
                          </td>
                        </tr>
                      ) : (
                        snapshot.enrichedHoldings
                          .filter((h) => h.coverEligible)
                          .flatMap(
                            (h) =>
                              optionCandidates[normalizeTicker(h.ticker)] ?? [],
                          )
                          .map((o, idx) => (
                            <tr
                              key={`${o.ticker}-${o.expiration}-${o.strike}-${idx}`}
                              className="border-b border-[#E5D8A8]"
                            >
                              <td className="p-3 font-black">{o.ticker}</td>
                              <td className="p-3">{o.expiration}</td>
                              <td className="p-3">
                                {formatCurrency(o.strike)}
                              </td>
                              <td className="p-3">{o.dte}</td>
                              <td className="p-3">
                                {o.delta === null ? "—" : o.delta.toFixed(2)}
                              </td>
                              <td className="p-3">
                                {o.bid === null ? "—" : formatCurrency(o.bid)}
                              </td>
                              <td className="p-3">
                                {o.ask === null ? "—" : formatCurrency(o.ask)}
                              </td>
                              <td className="p-3 font-bold">
                                {o.mid === null ? "—" : formatCurrency(o.mid)}
                              </td>
                              <td className="p-3">{o.openInterest ?? "—"}</td>
                              <td className="p-3">{o.volume ?? "—"}</td>
                              <td className="p-3 text-xs text-[#344054]">
                                {o.note}
                              </td>
                              <td className="p-3">
                                <button
                                  type="button"
                                  onClick={() => addOptionCandidateToCalls(o)}
                                  className="bg-[#C9A84C] px-3 py-2 text-xs font-black text-white"
                                >
                                  Use
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <h4 className="mt-6 font-black text-[#0D1B2A]">
                Open / Manual Covered Calls
              </h4>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-sm">
                  <thead className="bg-[#0D1B2A] text-white">
                    <tr>
                      {[
                        "Ticker",
                        "Shares",
                        "Stock",
                        "Strike",
                        "DTE",
                        "Delta",
                        "Premium",
                        "Mark",
                        "Capture",
                        "Earnings",
                        "Status",
                        "",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-3 text-left text-xs uppercase tracking-wide"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.callAlerts.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-4 text-sm text-[#344054]">
                          No covered calls open.
                        </td>
                      </tr>
                    ) : (
                      snapshot.callAlerts.map((c) => (
                        <tr key={c.id} className="border-b border-[#E5D8A8]">
                          <td className="p-2">
                            <input
                              className="w-24 border border-[#E5D8A8] p-2 font-black"
                              value={c.ticker}
                              onChange={(e) =>
                                updateCall(
                                  c.id,
                                  "ticker",
                                  e.target.value.toUpperCase(),
                                )
                              }
                            />
                          </td>
                          <td className="p-2">
                            <input
                              className="w-24 border border-[#E5D8A8] p-2"
                              type="number"
                              value={c.sharesCovered}
                              onChange={(e) =>
                                updateCall(
                                  c.id,
                                  "sharesCovered",
                                  parseNumber(e.target.value),
                                )
                              }
                            />
                          </td>
                          <td className="p-2">
                            <input
                              className="w-24 border border-[#E5D8A8] p-2"
                              type="number"
                              value={c.stockPrice}
                              onChange={(e) =>
                                updateCall(
                                  c.id,
                                  "stockPrice",
                                  parseNumber(e.target.value),
                                )
                              }
                            />
                          </td>
                          <td className="p-2">
                            <input
                              className="w-24 border border-[#E5D8A8] p-2"
                              type="number"
                              value={c.strike}
                              onChange={(e) =>
                                updateCall(
                                  c.id,
                                  "strike",
                                  parseNumber(e.target.value),
                                )
                              }
                            />
                          </td>
                          <td className="p-2">
                            <input
                              className="w-20 border border-[#E5D8A8] p-2"
                              type="number"
                              value={c.dte}
                              onChange={(e) =>
                                updateCall(
                                  c.id,
                                  "dte",
                                  parseNumber(e.target.value),
                                )
                              }
                            />
                          </td>
                          <td className="p-2">
                            <input
                              className="w-20 border border-[#E5D8A8] p-2"
                              type="number"
                              step="0.01"
                              value={c.delta}
                              onChange={(e) =>
                                updateCall(
                                  c.id,
                                  "delta",
                                  parseNumber(e.target.value),
                                )
                              }
                            />
                          </td>
                          <td className="p-2">
                            <input
                              className="w-24 border border-[#E5D8A8] p-2"
                              type="number"
                              value={c.premiumReceived}
                              onChange={(e) =>
                                updateCall(
                                  c.id,
                                  "premiumReceived",
                                  parseNumber(e.target.value),
                                )
                              }
                            />
                          </td>
                          <td className="p-2">
                            <input
                              className="w-24 border border-[#E5D8A8] p-2"
                              type="number"
                              value={c.currentMark}
                              onChange={(e) =>
                                updateCall(
                                  c.id,
                                  "currentMark",
                                  parseNumber(e.target.value),
                                )
                              }
                            />
                          </td>
                          <td className="p-3">{formatPercent(c.capture)}</td>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={c.earningsBeforeExpiry}
                              onChange={(e) =>
                                updateCall(
                                  c.id,
                                  "earningsBeforeExpiry",
                                  e.target.checked,
                                )
                              }
                            />
                          </td>
                          <td className="p-3">
                            <span
                              className={`border px-2 py-1 text-xs font-black ${statusPill(c.buyback ? "BUY BACK" : "HOLD")}`}
                            >
                              {c.buyback ? "BUY BACK" : "HOLD"}
                            </span>
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              onClick={() =>
                                setOpenCalls((prev) =>
                                  prev.filter((x) => x.id !== c.id),
                                )
                              }
                              className="text-xs font-black text-[#B42318]"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeTab === "performance" && (
            <section>
              <h3 className="text-xl font-black">Performance</h3>
              <p className="mt-2 text-sm text-[#344054]">
                TITAN is rules-based and backtest-supported, but realized results will depend on execution, financing costs, tax location, credit cycles, and distribution durability. This page should compare TITAN against PCEF, the blended income benchmark, 60/40, and passive buy-hold of the same holdings.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {metricCard("Annualized Return", "12.00%", "14Y CAGR backtest")}
                {metricCard("Benchmark", "Blended Income", "PCEF / BIZD / AMLP / XYLD")}
                {metricCard("Yield Model", "9.34%", "effective pre-tax yield")}
                {metricCard("Turnover", "Monthly", "rule-based rebalance")}
              </div>
            </section>
          )}

          {activeTab === "fundProfile" && (
            <section>
              <h3 className="text-xl font-black">Fund Profile</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="border border-[#E5D8A8] p-4">
                  <h4 className="font-black text-[#C9A84C]">Strategy Role</h4>
                  <p className="mt-2 text-sm leading-6 text-[#344054]">
                    Multi-asset income sleeve inside the Tenacity strategy stack. APEX enhances core index ownership; FORGE targets taxable appreciation; TITAN focuses on income, yield compounding, regime-based margin, and defensive rotation.
                  </p>
                </div>
                <div className="border border-[#E5D8A8] p-4">
                  <h4 className="font-black text-[#C9A84C]">Document Links</h4>
                  <div className="mt-2 flex flex-col gap-2 text-sm">
                    <a
                      className="font-bold text-[#1A3A5C] underline"
                      href="/TITAN_Whitepaper.pdf"
                      target="_blank"
                    >
                      TITAN Whitepaper
                    </a>
                    <a
                      className="font-bold text-[#1A3A5C] underline"
                      href="/TITAN_Rule_Set_Quick_Reference.pdf"
                      target="_blank"
                    >
                      TITAN Rule Set Quick Reference
                    </a>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === "ruleSet" && (
            <section>
              <h3 className="text-xl font-black">Rule Set</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {RULES.map((r, idx) => (
                  <div
                    key={r.title}
                    className="border border-[#E5D8A8] bg-white p-4"
                  >
                    <div className="mb-2 inline-block bg-[#0D1B2A] px-2 py-1 text-xs font-black text-[#C9A84C]">
                      R{idx + 1}
                    </div>
                    <h4 className="font-black">{r.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-[#344054]">
                      {r.detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activeTab === "settings" && (
            <section>
              <h3 className="text-xl font-black">Settings</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="border border-[#E5D8A8] bg-[#F0EBD8] p-4 md:col-span-2">
                  <h4 className="font-black text-[#0D1B2A]">
                    Live Market Data
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-[#344054]">
                    Enter a Finnhub API key here for browser-managed live
                    quotes. The key is saved only in this browser's local
                    storage and is sent to this app's server-side{" "}
                    <code>/api/titan</code> route when refreshing quotes and
                    once-daily option-chain candidates. You may still use{" "}
                    <code>FINNHUB_API_KEY</code> in <code>.env.local</code> or
                    Vercel environment variables as a fallback.
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto]">
                    <label className="block">
                      <span className="text-xs font-black uppercase tracking-widest text-[#C9A84C]">
                        Finnhub API Key
                      </span>
                      <input
                        className="mt-2 w-full border border-[#E5D8A8] bg-white p-3 font-mono text-sm"
                        type="password"
                        value={finnhubApiKey}
                        onChange={(e) => setFinnhubApiKey(e.target.value)}
                        placeholder="Paste Finnhub key here"
                        autoComplete="off"
                      />
                    </label>
                    <div className="flex items-end gap-2">
                      <button
                        type="button"
                        onClick={() => setFinnhubApiKey("")}
                        className="border border-[#C9A84C] px-4 py-3 text-xs font-black uppercase tracking-widest text-[#0D1B2A]"
                      >
                        Clear Key
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-5 text-sm">
                    <label className="flex items-center gap-2 font-bold">
                      <input
                        type="checkbox"
                        checked={useLiveQuotes}
                        onChange={(e) => setUseLiveQuotes(e.target.checked)}
                      />{" "}
                      Use live quotes
                    </label>
                    <label className="flex items-center gap-2 font-bold">
                      <input
                        type="checkbox"
                        checked={autoRefreshQuotes}
                        onChange={(e) => setAutoRefreshQuotes(e.target.checked)}
                      />{" "}
                      Auto-refresh every 60 seconds
                    </label>
                    <button
                      type="button"
                      onClick={() => void refreshLiveMarketData()}
                      disabled={liveLoading || !useLiveQuotes}
                      className="bg-[#0D1B2A] px-4 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
                    >
                      Refresh Now
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-[#344054]">
                    API key source:{" "}
                    {finnhubApiKey.trim()
                      ? "Settings tab"
                      : "Server environment fallback"}
                  </div>
                  {lastLiveRefresh ? (
                    <div className="mt-2 text-xs text-[#344054]">
                      Last refresh:{" "}
                      {new Date(lastLiveRefresh).toLocaleString("en-US")}
                    </div>
                  ) : null}
                  {liveError ? (
                    <div className="mt-2 text-xs font-bold text-[#B42318]">
                      {liveError}
                    </div>
                  ) : null}
                </div>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-widest text-[#C9A84C]">
                    PHR Score
                  </span>
                  <input
                    className="mt-2 w-full border border-[#E5D8A8] p-3"
                    type="number"
                    value={spy}
                    onChange={(e) => setSpy(Number(e.target.value))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-widest text-[#C9A84C]">
                    VIX
                  </span>
                  <input
                    className="mt-2 w-full border border-[#E5D8A8] p-3"
                    type="number"
                    value={ma50}
                    onChange={(e) => setMa50(Number(e.target.value))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-widest text-[#C9A84C]">
                    MOVE
                  </span>
                  <input
                    className="mt-2 w-full border border-[#E5D8A8] p-3"
                    type="number"
                    value={ma200}
                    onChange={(e) => setMa200(Number(e.target.value))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-widest text-[#C9A84C]">
                    Cash
                  </span>
                  <input
                    className="mt-2 w-full border border-[#E5D8A8] p-3"
                    type="number"
                    value={cash}
                    onChange={(e) => setCash(Number(e.target.value))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-widest text-[#C9A84C]">
                    Margin Debt
                  </span>
                  <input
                    className="mt-2 w-full border border-[#E5D8A8] p-3"
                    type="number"
                    value={marginDebt}
                    onChange={(e) => setMarginDebt(Number(e.target.value))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-widest text-[#C9A84C]">
                    Margin Rate %
                  </span>
                  <input
                    className="mt-2 w-full border border-[#E5D8A8] p-3"
                    type="number"
                    value={marginRate}
                    onChange={(e) => setMarginRate(Number(e.target.value))}
                  />
                </label>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}
