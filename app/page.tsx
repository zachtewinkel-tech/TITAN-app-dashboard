"use client";

import React, { useEffect, useMemo, useState } from "react";

type Tab =
  | "dailyBrief"
  | "actionItems"
  | "holdings"
  | "bench"
  | "tradeLog"
  | "titanScore"
  | "taxLots"
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

type TradeType =
  | "deposit"
  | "withdrawal"
  | "dividend"
  | "interest_expense"
  | "fee"
  | "buy_stock"
  | "sell_stock";

type Trade = {
  id: string;
  createdAt: string;
  date: string;
  type: TradeType;
  ticker: string;
  amount: number;
  shares: number;
  price: number;
  notes: string;
};

type TradeFormState = {
  date: string;
  type: TradeType;
  ticker: string;
  amount: string;
  shares: string;
  price: string;
  notes: string;
};

type TradeStats = {
  cashImpact: number;
  deposits: number;
  withdrawals: number;
  dividends: number;
  interestExpense: number;
  fees: number;
  buyCost: number;
  sellProceeds: number;
  realizedStockPnl: number;
  stockTradeCount: number;
};

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
  purchaseDate: string;
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
  tradeLog: "Trade Log",
  titanScore: "TITAN Score",
  taxLots: "Tax / Location",
  performance: "Performance",
  fundProfile: "Fund Profile",
  ruleSet: "Rule Set",
  settings: "Settings",
};

const STORAGE_KEYS = {
  holdings: "titanIncomeHoldings.v4",
  trades: "titanIncomeTrades.v1",
  bench: "titanIncomeBench.v5",
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

const DEFAULT_TRADE_FORM: TradeFormState = {
  date: new Date().toISOString().slice(0, 10),
  type: "buy_stock",
  ticker: "",
  amount: "",
  shares: "",
  price: "",
  notes: "",
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
  purchaseDate: "",
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

function daysHeldFromPurchaseDate(purchaseDate?: string): number | null {
  if (!purchaseDate) return null;
  const start = new Date(`${purchaseDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const today = new Date();
  const diff = today.getTime() - start.getTime();
  if (diff < 0) return 0;
  return Math.floor(diff / 86_400_000);
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

function calculateTitanScoreComponents(input: Parameters<typeof calculateTitanSignalScore>[0]) {
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
  const total = calculateTitanSignalScore(input);
  return {
    yieldScore: roundNumber(yieldScore, 0),
    distributionSafetyScore: roundNumber(distributionSafetyScore, 0),
    momentumScore: roundNumber(momentumScore, 0),
    qualityScore: roundNumber(qualityScore, 0),
    valuationScore: roundNumber(valuationScore + zScoreBonus, 0),
    liquidityScore: roundNumber(liquidityScore, 0),
    technicalScore: roundNumber(technicalScore, 0),
    total,
  };
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
  if (score >= 78) return "positive";
  if (score >= 68) return "neutral";
  if (score >= 58) return "warning";
  return "negative";
}

function scoreLabel(score: number): string {
  if (score >= 78) return "STRONG";
  if (score >= 68) return "QUALIFIED";
  if (score >= 58) return "WATCH";
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function tradeDollarAmount(trade: Trade): number {
  if (trade.amount > 0) return trade.amount;
  if (trade.shares > 0 && trade.price > 0) return trade.shares * trade.price;
  return 0;
}

function buildTradeStats(trades: Trade[]): TradeStats {
  const positions = new Map<string, { shares: number; costBasis: number }>();
  const stats: TradeStats = {
    cashImpact: 0,
    deposits: 0,
    withdrawals: 0,
    dividends: 0,
    interestExpense: 0,
    fees: 0,
    buyCost: 0,
    sellProceeds: 0,
    realizedStockPnl: 0,
    stockTradeCount: 0,
  };

  trades
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .forEach((trade) => {
      const ticker = normalizeTicker(trade.ticker);
      const amount = tradeDollarAmount(trade);
      if (trade.type === "deposit") {
        stats.deposits += amount;
        stats.cashImpact += amount;
        return;
      }
      if (trade.type === "withdrawal") {
        stats.withdrawals += amount;
        stats.cashImpact -= amount;
        return;
      }
      if (trade.type === "dividend") {
        stats.dividends += amount;
        stats.cashImpact += amount;
        return;
      }
      if (trade.type === "interest_expense") {
        stats.interestExpense += amount;
        stats.cashImpact -= amount;
        return;
      }
      if (trade.type === "fee") {
        stats.fees += amount;
        stats.cashImpact -= amount;
        return;
      }
      if (!ticker || trade.shares <= 0) return;
      const current = positions.get(ticker) ?? { shares: 0, costBasis: 0 };
      if (trade.type === "buy_stock") {
        const cost = amount;
        current.shares += trade.shares;
        current.costBasis += cost;
        stats.buyCost += cost;
        stats.cashImpact -= cost;
        stats.stockTradeCount += 1;
        positions.set(ticker, current);
        return;
      }
      if (trade.type === "sell_stock") {
        const soldShares = Math.min(trade.shares, current.shares);
        const avgCost = current.shares > 0 ? current.costBasis / current.shares : 0;
        const costRemoved = avgCost * soldShares;
        const proceeds = amount;
        current.shares = Math.max(0, current.shares - soldShares);
        current.costBasis = Math.max(0, current.costBasis - costRemoved);
        stats.sellProceeds += proceeds;
        stats.cashImpact += proceeds;
        stats.realizedStockPnl += proceeds - costRemoved;
        stats.stockTradeCount += 1;
        positions.set(ticker, current);
      }
    });

  return stats;
}

function deriveHoldingsFromTrades(
  trades: Trade[],
  benchCandidates: BenchCandidate[],
  liveQuotes: Record<string, LiveQuote>,
  incomeData: Record<string, IncomeAutoData>,
  technicalData: Record<string, TechnicalAutoData>,
): Holding[] {
  const lots = new Map<string, { shares: number; costBasis: number; firstDate: string }>();
  trades
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
    .forEach((trade) => {
      const ticker = normalizeTicker(trade.ticker);
      if (!ticker || trade.shares <= 0) return;
      const amount = tradeDollarAmount(trade);
      const current = lots.get(ticker) ?? { shares: 0, costBasis: 0, firstDate: trade.date || todayIso() };
      if (trade.type === "buy_stock") {
        current.shares += trade.shares;
        current.costBasis += amount;
        if (!current.firstDate || trade.date < current.firstDate) current.firstDate = trade.date;
        lots.set(ticker, current);
        return;
      }
      if (trade.type === "sell_stock") {
        const soldShares = Math.min(trade.shares, current.shares);
        const avgCost = current.shares > 0 ? current.costBasis / current.shares : 0;
        current.shares = Math.max(0, current.shares - soldShares);
        current.costBasis = Math.max(0, current.costBasis - avgCost * soldShares);
        lots.set(ticker, current);
      }
    });

  return Array.from(lots.entries())
    .filter(([, lot]) => lot.shares > 0.000001)
    .map(([ticker, lot]) => {
      const match =
        benchCandidates.find((b) => normalizeTicker(b.ticker) === ticker) ??
        DEFAULT_BENCH.find((b) => normalizeTicker(b.ticker) === ticker);
      const sleeve = match?.sleeveFit ?? "Infrastructure";
      const sector = match?.sector ?? sleeve;
      const avgCost = lot.shares > 0 ? lot.costBasis / lot.shares : 0;
      const quotePrice = liveQuotes[ticker]?.price ?? null;
      const price = quotePrice ?? match?.price ?? avgCost;
      const ta = technicalData[ticker];
      const displayTa = match ? displayTaFields(match, ta) : {
        price,
        buyZoneLow: price > 0 ? price * 0.88 : 0,
        buyZoneHigh: price > 0 ? price * 0.97 : 0,
        buyAnchor: price,
        stopLevel: price > 0 ? price * 0.82 : 0,
        trimLow: price > 0 ? price * 1.1 : 0,
        trimHigh: price > 0 ? price * 1.18 : 0,
        confidence: "Manual" as TaConfidence,
      };
      const yieldRate = incomeData[ticker]?.dividendYield ?? match?.yieldRate ?? match?.upside ?? 0;
      const scoreInput = {
        ...(match ?? blankBenchCandidate(999)),
        yieldRate,
        sixMonthReturn: ta?.sixMonthReturn ?? match?.sixMonthReturn ?? 0,
        price: displayTa.price || price,
        buyZoneLow: displayTa.buyZoneLow,
        buyZoneHigh: displayTa.buyZoneHigh,
        stopLevel: displayTa.stopLevel,
        trimLow: displayTa.trimLow,
        trimHigh: displayTa.trimHigh,
        taConfidence: displayTa.confidence,
        above200dma: ta?.above200dma ?? true,
        technicalExtension: ta?.technicalExtension ?? 0,
      };

      return {
        id: `trade-ledger-${ticker}`,
        ticker,
        name: match?.name ?? ticker,
        sleeve,
        sector,
        shares: roundNumber(lot.shares, 4),
        cost: roundNumber(avgCost, 4),
        price: roundNumber(price, 4),
        titanRank: match?.rank ?? 999,
        signalScore: calculateTitanSignalScore(scoreInput),
        upside: yieldRate,
        revisionScore: match?.revisionScore ?? 50,
        momentumScore: match?.momentumScore ?? 50,
        qualityScore: match?.qualityScore ?? 50,
        dispersion: match?.dispersion ?? 0.2,
        daysHeld: daysHeldFromPurchaseDate(lot.firstDate) ?? 0,
        purchaseDate: lot.firstDate,
        above200dma: ta?.above200dma ?? true,
        earningsBeforeExpiry: false,
        technicalExtension: ta?.technicalExtension ?? 0,
        buyZoneLow: displayTa.buyZoneLow,
        buyZoneHigh: displayTa.buyZoneHigh,
        buyAnchor: displayTa.buyAnchor,
        stopLevel: displayTa.stopLevel,
        trimLow: displayTa.trimLow,
        trimHigh: displayTa.trimHigh,
        taConfidence: displayTa.confidence,
        taNotes: ta?.notes ?? "Trade-log derived holding.",
        notes: "Derived from Trade Log.",
      };
    })
    .sort((a, b) => b.shares * b.price - a.shares * a.price);
}

export default function TitanDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("dailyBrief");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [tradeForm, setTradeForm] = useState<TradeFormState>({
    ...DEFAULT_TRADE_FORM,
    date: todayIso(),
  });
  const [benchCandidates, setBenchCandidates] =
    useState<BenchCandidate[]>(DEFAULT_BENCH);
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
      const savedTrades = localStorage.getItem(STORAGE_KEYS.trades);
      const savedBench = localStorage.getItem(STORAGE_KEYS.bench);
      const savedSettings = localStorage.getItem(STORAGE_KEYS.settings);
      const savedLiveSettings = localStorage.getItem(STORAGE_KEYS.liveSettings);

      if (savedHoldings) setHoldings(JSON.parse(savedHoldings) as Holding[]);
      if (savedTrades) setTrades(JSON.parse(savedTrades) as Trade[]);
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
    localStorage.setItem(STORAGE_KEYS.trades, JSON.stringify(trades));
  }, [hydrated, trades]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEYS.bench, JSON.stringify(benchCandidates));
  }, [benchCandidates, hydrated]);

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

  useEffect(() => {
    if (!hydrated) return;
    setHoldings(deriveHoldingsFromTrades(trades, benchCandidates, liveQuotes, incomeData, technicalData));
  }, [benchCandidates, hydrated, incomeData, liveQuotes, technicalData, trades]);

  const quoteSymbols = useMemo(() => {
    const symbols = [
      "SPY",
      "PCEF",
      "HYG",
      "AGG",
      ...holdings.map((h) => h.ticker),
      ...trades.map((t) => t.ticker),
      ...benchCandidates.map((b) => b.ticker),
    ]
      .map(normalizeTicker)
      .filter(Boolean);
    return Array.from(new Set(symbols)).slice(0, 80).join(",");
  }, [benchCandidates, holdings, trades]);


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
      const optionQuery = "";
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
      const daysHeld = daysHeldFromPurchaseDate(h.purchaseDate) ?? h.daysHeld ?? 0;
      const ltcg = daysHeld >= 366;
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
      const taxHarvest = gain < -0.08 && daysHeld < 366;
      const sell = invalidated || (daysHeld >= 366 && h.titanRank > 100);
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
      return { ...h, daysHeld, marketValue, weight, gain, ltcg, coverEligible, action };
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
                : (firstHoldingAction ?? "HOLD");

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
      annualFinancingCost: marginDebt * (marginRate / 100),
    };
  }, [cash, holdings, ma50, ma200, marginDebt, marginRate, spy]);

  const actionItems = useMemo(() => {
    const items: Array<{ action: ActionState; title: string; detail: string }> =
      [];
    if (holdings.length === 0) {
      items.push({
        action: "FULL REBALANCE",
        title: "Build initial TITAN portfolio",
        detail:
          "Portfolio is empty. Add buy trades in the Trade Log; Holdings are now generated from executed trades rather than Bench promotions.",
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
    return items.length
      ? items
      : [
          {
            action: "HOLD" as ActionState,
            title: "No hard rule triggered",
            detail:
              "Maintain current portfolio posture; continue monitoring regime, rankings, tax lots, income safety, and trade-ledger performance.",
          },
        ];
  }, [holdings.length, snapshot]);

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

  function updateHoldingTicker(id: string, value: string) {
    const ticker = normalizeTicker(value);
    const match =
      benchCandidates.find((b) => normalizeTicker(b.ticker) === ticker) ??
      DEFAULT_BENCH.find((b) => normalizeTicker(b.ticker) === ticker);
    setHoldings((prev) =>
      prev.map((h) =>
        h.id === id
          ? ({
              ...h,
              ticker,
              name: match && (!h.name || h.name === h.ticker) ? match.name : h.name,
              sleeve: match?.sleeveFit ?? h.sleeve,
              sector: match?.sector ?? h.sector,
              titanRank: match?.rank ?? h.titanRank,
              signalScore: match?.signalScore ?? h.signalScore,
              upside: match?.upside ?? h.upside,
              revisionScore: match?.revisionScore ?? h.revisionScore,
              momentumScore: match?.momentumScore ?? h.momentumScore,
              qualityScore: match?.qualityScore ?? h.qualityScore,
              dispersion: match?.dispersion ?? h.dispersion,
            } as Holding)
          : h,
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


  function prefillTradeFromCandidate(candidate: BenchCandidate) {
    const ticker = normalizeTicker(candidate.ticker);
    const live = liveQuotes[ticker];
    const price = live?.price ?? candidate.price ?? 0;
    setTradeForm((prev) => ({
      ...prev,
      date: todayIso(),
      type: "buy_stock",
      ticker,
      price: price > 0 ? String(roundNumber(price, 2)) : "",
      shares: "",
      amount: "",
      notes: `Initial TITAN buy candidate: ${candidate.name}`,
    }));
    setActiveTab("tradeLog");
  }

  function addTrade() {
    const ticker = normalizeTicker(tradeForm.ticker);
    const shares = parseNumber(tradeForm.shares);
    const price = parseNumber(tradeForm.price);
    const typedAmount = parseNumber(tradeForm.amount);
    const amount = typedAmount > 0 ? typedAmount : shares > 0 && price > 0 ? shares * price : 0;
    if (["buy_stock", "sell_stock", "dividend"].includes(tradeForm.type) && !ticker) {
      window.alert("Ticker is required for stock trades and ticker-level dividends.");
      return;
    }
    if (["buy_stock", "sell_stock"].includes(tradeForm.type) && (shares <= 0 || price <= 0)) {
      window.alert("Shares and price are required for stock trades.");
      return;
    }
    if (!["buy_stock", "sell_stock"].includes(tradeForm.type) && amount <= 0) {
      window.alert("Amount is required for cash, dividend, fee, and interest entries.");
      return;
    }
    setTrades((prev) => [
      {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        date: tradeForm.date || todayIso(),
        type: tradeForm.type,
        ticker,
        amount: roundNumber(amount, 2),
        shares: roundNumber(shares, 4),
        price: roundNumber(price, 4),
        notes: tradeForm.notes.trim(),
      },
      ...prev,
    ]);
    setTradeForm({ ...DEFAULT_TRADE_FORM, date: todayIso() });
  }

  function deleteTrade(id: string) {
    setTrades((prev) => prev.filter((trade) => trade.id !== id));
  }

  function clearTrades() {
    if (window.confirm("Clear all TITAN trade-log entries from this browser? Holdings generated from trades will also clear.")) {
      setTrades([]);
    }
  }

  const ownedTickers = new Set(holdings.map((h) => h.ticker.toUpperCase()));

  const scoredBenchCandidates = useMemo(() => {
    return benchCandidates
      .map((s, index) => {
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
        const scoreInput = {
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
          above200dma: ta?.above200dma ?? undefined,
          technicalExtension: ta?.technicalExtension ?? undefined,
        };
        const components = calculateTitanScoreComponents(scoreInput);
        const tax = titanAssetLocation(s.ticker, s.sleeveFit).pocket;
        return {
          s,
          index,
          ticker,
          owned,
          live,
          income,
          ta,
          role,
          displayYield,
          displayTa,
          inBuyZone,
          inTrimZone,
          combinedScore: components.total,
          components,
          tax,
        };
      })
      .sort((a, b) => b.combinedScore - a.combinedScore || a.s.rank - b.s.rank);
  }, [benchCandidates, holdings, incomeData, liveQuotes, technicalData]);

  const tradeStats = useMemo(() => buildTradeStats(trades), [trades]);

  const ledgerCash = cash + tradeStats.cashImpact;
  const ledgerNetLiquidationValue = snapshot.longMarketValue + ledgerCash - marginDebt;
  const ledgerNetContributions = tradeStats.deposits - tradeStats.withdrawals;
  const ledgerTotalPnl =
    ledgerNetLiquidationValue + tradeStats.withdrawals - tradeStats.deposits;
  const ledgerTotalReturn =
    ledgerNetContributions > 0 ? ledgerTotalPnl / ledgerNetContributions : 0;

  const forwardPerformance = useMemo(() => {
    const estimatedAnnualIncome = holdings.reduce((sum, h) => {
      const ticker = normalizeTicker(h.ticker);
      const benchMatch = benchCandidates.find((b) => normalizeTicker(b.ticker) === ticker);
      const yieldRate = incomeData[ticker]?.dividendYield ?? benchMatch?.yieldRate ?? h.upside ?? 0;
      const price = liveQuotes[ticker]?.price ?? h.price;
      return sum + h.shares * price * yieldRate;
    }, 0);
    const financingCost = marginDebt * (marginRate / 100);
    const netIncome = estimatedAnnualIncome + tradeStats.dividends - financingCost - tradeStats.interestExpense - tradeStats.fees;
    const totalReturn = snapshot.totalCost > 0 ? snapshot.totalPnl / snapshot.totalCost : 0;
    const currentYield = snapshot.longMarketValue > 0 ? estimatedAnnualIncome / snapshot.longMarketValue : 0;
    return { estimatedAnnualIncome, financingCost, netIncome, totalReturn, currentYield };
  }, [benchCandidates, holdings, incomeData, liveQuotes, marginDebt, marginRate, snapshot.longMarketValue, snapshot.totalCost, snapshot.totalPnl, tradeStats.dividends, tradeStats.fees, tradeStats.interestExpense]);

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
                Multi-asset income dashboard for the TITAN strategy using PHR regime classification, dynamic margin, defensive rotation, income-sleeve monitoring, candidate bench management, trade-log holdings, and forward P&L management.
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
                  candidates, rankings, sector caps, tax/location data, trade-log
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
                ranks, tax lots, trade log, and forward performance status.
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
                  <h3 className="text-xl font-black">Holdings Ledger</h3>
                  <p className="mt-2 text-sm text-[#344054]">
                    Holdings are generated from the Trade Log. Add buy and sell entries on the Trade Log tab; this ledger then calculates open shares, average cost, purchase date, live value, weight, P&amp;L, score, and action state.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("tradeLog")}
                  className="bg-[#C9A84C] px-4 py-2 text-sm font-black text-white"
                >
                  Add Trade
                </button>
              </div>

              {snapshot.enrichedHoldings.length === 0 ? (
                <div className="mt-4 border border-[#E5D8A8] bg-[#F0EBD8] p-4 text-sm text-[#344054]">
                  No live holdings yet. Add a <strong>Buy Stock</strong> trade in the Trade Log to create the first TITAN holding.
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
                          "Avg Cost",
                          "Date Purchased",
                          "Price",
                          "Buy Zone",
                          "Trim Zone",
                          "Score",
                          "Weight",
                          "P&L",
                          "Action",
                        ].map((h) => (
                          <th key={h} className="p-3 text-left text-xs uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.enrichedHoldings.map((h) => {
                        const ticker = normalizeTicker(h.ticker);
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
                        const pnl = h.marketValue - h.shares * h.cost;
                        return (
                          <tr key={h.id} className="border-b border-[#E5D8A8] align-top">
                            <td className="p-2 font-black">{h.ticker}</td>
                            <td className="p-2">
                              <div className="font-bold">{h.name}</div>
                              <div className="text-[10px] text-[#667085]">Trade-log derived</div>
                            </td>
                            <td className="p-2">{valueBox(h.sleeve, undefined, "neutral")}</td>
                            <td className="p-2">{valueBox(h.sector, undefined, "neutral")}</td>
                            <td className="p-2 font-bold">{h.shares.toLocaleString()}</td>
                            <td className="p-2">{formatCurrencyTable(h.cost)}</td>
                            <td className="p-2">
                              {valueBox(h.purchaseDate || "—", h.ltcg ? "LTCG" : `${h.daysHeld} days`, h.ltcg ? "positive" : "warning")}
                            </td>
                            <td className="p-2">{valueBox(formatCurrencyTable(displayTa.price || h.price), undefined, "positive")}</td>
                            <td className="p-2">{zoneBox(displayTa.buyZoneLow, displayTa.buyZoneHigh, inBuyZone ? "IN ZONE" : undefined, inBuyZone ? "positive" : "neutral")}</td>
                            <td className="p-2">{zoneBox(displayTa.trimLow, displayTa.trimHigh, inTrimZone ? "TRIM / REDUCE" : undefined, inTrimZone ? "warning" : "neutral")}</td>
                            <td className="p-2">{valueBox(formatMetric(combinedScore), scoreLabel(combinedScore), scoreTone(combinedScore))}</td>
                            <td className="p-2">{formatPercent(h.weight)}</td>
                            <td className={`p-2 font-black ${pnl >= 0 ? "text-[#067647]" : "text-[#B42318]"}`}>{formatSignedCurrency(pnl)}</td>
                            <td className="p-2"><span className={`border px-2 py-1 text-xs font-black ${statusPill(h.action)}`}>{h.action}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {activeTab === "tradeLog" && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">Trade Log</h3>
                  <p className="mt-2 text-sm text-[#344054]">
                    This is now the source of truth for TITAN holdings and forward performance. Buy and sell stock trades rebuild the Holdings Ledger automatically. Deposits, withdrawals, dividends, margin interest, and fees feed the Performance tab.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={clearTrades}
                  className="border border-[#E5D8A8] px-4 py-2 text-sm font-black text-[#B42318]"
                >
                  Clear Log
                </button>
              </div>

              <div className="mt-4 grid gap-3 border border-[#E5D8A8] bg-[#F8FAFC] p-4 md:grid-cols-8">
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Date</span>
                  <input className="mt-1 w-full border border-[#E5D8A8] p-2 text-sm" type="date" value={tradeForm.date} onChange={(e) => setTradeForm((prev) => ({ ...prev, date: e.target.value }))} />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Type</span>
                  <select className="mt-1 w-full border border-[#E5D8A8] p-2 text-sm" value={tradeForm.type} onChange={(e) => setTradeForm((prev) => ({ ...prev, type: e.target.value as TradeType }))}>
                    <option value="buy_stock">Buy Stock</option>
                    <option value="sell_stock">Sell Stock</option>
                    <option value="dividend">Dividend / Distribution</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="interest_expense">Margin Interest</option>
                    <option value="fee">Fee / Expense</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Ticker</span>
                  <input className="mt-1 w-full border border-[#E5D8A8] p-2 text-sm font-black uppercase" value={tradeForm.ticker} onChange={(e) => setTradeForm((prev) => ({ ...prev, ticker: e.target.value.toUpperCase() }))} placeholder="EPD" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Shares</span>
                  <input className="mt-1 w-full border border-[#E5D8A8] p-2 text-sm" type="number" value={tradeForm.shares} onChange={(e) => setTradeForm((prev) => ({ ...prev, shares: e.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Price</span>
                  <input className="mt-1 w-full border border-[#E5D8A8] p-2 text-sm" type="number" value={tradeForm.price} onChange={(e) => setTradeForm((prev) => ({ ...prev, price: e.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Amount</span>
                  <input className="mt-1 w-full border border-[#E5D8A8] p-2 text-sm" type="number" value={tradeForm.amount} onChange={(e) => setTradeForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="auto if sh × px" />
                </label>
                <div className="flex items-end">
                  <button type="button" onClick={addTrade} className="w-full bg-[#C9A84C] px-4 py-2 text-sm font-black text-white">
                    Add Entry
                  </button>
                </div>
                <label className="block md:col-span-8">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C9A84C]">Notes</span>
                  <input className="mt-1 w-full border border-[#E5D8A8] p-2 text-sm" value={tradeForm.notes} onChange={(e) => setTradeForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Optional rationale, account, lot note, or allocation comment" />
                </label>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {metricCard("Deposits", formatCurrency(tradeStats.deposits), "capital added")}
                {metricCard("Withdrawals", formatCurrency(tradeStats.withdrawals), "capital removed")}
                {metricCard("Dividends", formatCurrency(tradeStats.dividends), "cash distributions logged")}
                {metricCard("Realized P&L", formatSignedCurrency(tradeStats.realizedStockPnl), "from sell trades", tradeStats.realizedStockPnl >= 0 ? "text-[#067647]" : "text-[#B42318]")}
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="compact-data-table w-full border-collapse">
                  <thead className="bg-[#0D1B2A] text-white">
                    <tr>
                      {["Date", "Type", "Ticker", "Shares", "Price", "Amount", "Notes", ""].map((h) => (
                        <th key={h} className="p-3 text-left text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trades.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-4 text-sm text-[#344054]">
                          No trades logged yet. Add a buy trade to create the first holding.
                        </td>
                      </tr>
                    ) : (
                      trades
                        .slice()
                        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
                        .map((trade) => (
                          <tr key={trade.id} className="border-b border-[#E5D8A8]">
                            <td className="p-2 font-bold">{trade.date}</td>
                            <td className="p-2">{trade.type.replaceAll("_", " ").toUpperCase()}</td>
                            <td className="p-2 font-black">{trade.ticker || "—"}</td>
                            <td className="p-2">{trade.shares ? trade.shares.toLocaleString() : "—"}</td>
                            <td className="p-2">{trade.price ? formatCurrencyTable(trade.price) : "—"}</td>
                            <td className="p-2 font-bold">{formatCurrency(tradeDollarAmount(trade))}</td>
                            <td className="p-2 text-xs text-[#344054]">{trade.notes || "—"}</td>
                            <td className="p-2">
                              <button type="button" onClick={() => deleteTrade(trade.id)} className="text-xs font-black text-[#B42318]">
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

          {activeTab === "bench" && (
            <section>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black">
                    Bench / Top Candidate Pool
                  </h3>
                  <p className="mt-2 text-sm text-[#344054]">
                    Expanded TITAN candidate universe. Rows are automatically sorted by TITAN Score; the top 20 are the current shortlist. Role, sleeve, tax location, yield, price, buy zone, and trim zone are locked outputs; valuation, coverage, six-month return, and z-score remain internal score inputs.
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
                    {scoredBenchCandidates.map((row, sortedIndex) => {
                      const {
                        s,
                        index,
                        owned,
                        live,
                        role,
                        displayYield,
                        displayTa,
                        inBuyZone,
                        inTrimZone,
                        combinedScore,
                        tax,
                      } = row;
                      const top20 = sortedIndex < 20;
                      return (
                        <tr key={`${s.ticker || "bench"}-${index}`} className="border-b border-[#E5D8A8] align-top">
                          <td className="p-2">
                            {valueBox(sortedIndex + 1, undefined, top20 ? "positive" : "neutral")}
                          </td>
                          <td className="p-2">
                            <input
                              className="w-32 border border-[#E5D8A8] p-2 font-black"
                              value={s.ticker}
                              onChange={(e) =>
                                updateBenchCandidate(index, "ticker", e.target.value.toUpperCase())
                              }
                            />
                            <div className="mt-1 text-[10px] font-bold text-[#667085]">{s.name}</div>
                          </td>
                          <td className="p-2">
                            {valueBox(role, undefined, role === "Current Core" || role === "Challenger" ? "positive" : role === "Watchlist" ? "warning" : "neutral")}
                          </td>
                          <td className="p-2">
                            {valueBox(s.sleeveFit, s.sector, "neutral")}
                          </td>
                          <td className="p-2">
                            {valueBox(
                              formatCurrencyTable(displayTa.price || s.price),
                              live ? formatSignedPercentPoints(live.changePercent) : undefined,
                              live ? "positive" : "neutral",
                            )}
                          </td>
                          <td className="p-2">
                            {valueBox(formatRatio(displayYield, 1), undefined, "neutral")}
                          </td>
                          <td className="p-2">
                            {zoneBox(displayTa.buyZoneLow, displayTa.buyZoneHigh, inBuyZone ? "IN ZONE" : undefined, inBuyZone ? "positive" : "neutral")}
                          </td>
                          <td className="p-2">
                            {zoneBox(displayTa.trimLow, displayTa.trimHigh, inTrimZone ? "TRIM / REDUCE" : undefined, inTrimZone ? "warning" : "neutral")}
                          </td>
                          <td className="p-2">
                            {valueBox(formatMetric(combinedScore), scoreLabel(combinedScore), scoreTone(combinedScore))}
                          </td>
                          <td className="p-2">
                            {valueBox(tax, undefined, "neutral")}
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
                                onClick={() => prefillTradeFromCandidate(s)}
                                className={`px-3 py-2 text-xs font-black ${owned || !s.ticker || role === "Sleeve Benchmark" || role === "Tactical" ? "bg-slate-100 text-slate-400" : "bg-[#C9A84C] text-white"}`}
                              >
                                {owned ? "Owned" : "Log Buy"}
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
                This tab now pulls directly from the full Bench universe. Refresh Live Data updates the prices, yield where available, technical inputs, and the resulting 0–100 score. The scoring label was recalibrated so high-quality 70s are marked QUALIFIED rather than incorrectly reading like weak watchlist names.
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                {metricCard("Yield / Income", "18%", "current yield with risk cap")}
                {metricCard("Distribution Safety", "22%", "coverage + revision quality")}
                {metricCard("Momentum", "14%", "3m / 6m trend")}
                {metricCard("Quality", "18%", "NAV / balance sheet / durability")}
                {metricCard("Valuation", "12%", "discount/NAV, z-score, dispersion")}
                {metricCard("Liquidity", "6%", "execution capacity")}
                {metricCard("Technical Setup", "10%", "buy zone / trim zone / trend")}
                {metricCard("Bench", `${scoredBenchCandidates.length} names`, "sorted by total score")}
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="compact-data-table w-full border-collapse">
                  <thead className="bg-[#0D1B2A] text-white">
                    <tr>
                      {[
                        "Rank",
                        "Ticker",
                        "Role",
                        "Sleeve",
                        "Yield",
                        "Safety",
                        "Momentum",
                        "Quality",
                        "Valuation",
                        "TA",
                        "Total",
                        "Tax",
                        "Status",
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
                    {scoredBenchCandidates.map((row, sortedIndex) => {
                      const top20 = sortedIndex < 20;
                      return (
                        <tr key={`score-${row.s.ticker}-${row.index}`} className="border-b border-[#E5D8A8]">
                          <td className="p-2 font-black">{sortedIndex + 1}</td>
                          <td className="p-2 font-black">
                            {row.s.ticker}
                            <div className="text-[10px] font-normal text-[#667085]">{row.s.name}</div>
                          </td>
                          <td className="p-2">{valueBox(row.role, undefined, row.role === "Watchlist" ? "warning" : "neutral")}</td>
                          <td className="p-2">{valueBox(row.s.sleeveFit, row.s.sector, "neutral")}</td>
                          <td className="p-2">{valueBox(formatRatio(row.displayYield, 1), `${row.components.yieldScore}/100`, "neutral")}</td>
                          <td className="p-2">{valueBox(`${row.components.distributionSafetyScore}/100`, undefined, scoreTone(row.components.distributionSafetyScore))}</td>
                          <td className="p-2">{valueBox(`${row.components.momentumScore}/100`, undefined, scoreTone(row.components.momentumScore))}</td>
                          <td className="p-2">{valueBox(`${row.components.qualityScore}/100`, undefined, scoreTone(row.components.qualityScore))}</td>
                          <td className="p-2">{valueBox(`${row.components.valuationScore}/100`, undefined, scoreTone(row.components.valuationScore))}</td>
                          <td className="p-2">{valueBox(`${row.components.technicalScore}/100`, row.ta ? row.ta.trendState : undefined, scoreTone(row.components.technicalScore))}</td>
                          <td className="p-2">{valueBox(formatMetric(row.combinedScore), scoreLabel(row.combinedScore), scoreTone(row.combinedScore))}</td>
                          <td className="p-2">{valueBox(row.tax, undefined, "neutral")}</td>
                          <td className="p-2">
                            <span className={`border px-2 py-1 text-xs font-black ${top20 ? statusPill("BUY") : statusPill("HOLD")}`}>
                              {top20 ? "TOP 20" : "BENCH"}
                            </span>
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

          {activeTab === "performance" && (
            <section>
              <h3 className="text-xl font-black">Performance</h3>
              <p className="mt-2 text-sm text-[#344054]">
                Forward performance is now tied to the Trade Log. Deposits, withdrawals, buys, sells, dividends, margin interest, and fees feed the live P&amp;L view. Backtest metrics remain reference-only and are shown at the bottom.
              </p>

              <h4 className="mt-5 font-black text-[#0D1B2A]">Live Ledger Performance</h4>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                {metricCard("Market Value", formatCurrency(snapshot.longMarketValue), "open holdings")}
                {metricCard("Ledger Cash", formatCurrency(ledgerCash), "manual cash + trade cash flow")}
                {metricCard("Net Liq", formatCurrency(ledgerNetLiquidationValue), "market value + cash - margin")}
                {metricCard("Net Contributions", formatCurrency(ledgerNetContributions), "deposits less withdrawals")}
                {metricCard("Total P&L", formatSignedCurrency(ledgerTotalPnl), formatPercent(ledgerTotalReturn), ledgerTotalPnl >= 0 ? "text-[#067647]" : "text-[#B42318]")}
                {metricCard("Unrealized P&L", formatSignedCurrency(snapshot.totalPnl), formatPercent(forwardPerformance.totalReturn), snapshot.totalPnl >= 0 ? "text-[#067647]" : "text-[#B42318]")}
                {metricCard("Realized P&L", formatSignedCurrency(tradeStats.realizedStockPnl), "sell trades", tradeStats.realizedStockPnl >= 0 ? "text-[#067647]" : "text-[#B42318]")}
                {metricCard("Dividends", formatCurrency(tradeStats.dividends), "logged distributions")}
                {metricCard("Current Yield", formatPercent(forwardPerformance.currentYield), "gross annualized yield estimate")}
                {metricCard("Gross Income", formatCurrency(forwardPerformance.estimatedAnnualIncome), "annualized forward income")}
                {metricCard("Margin Cost", formatCurrency(forwardPerformance.financingCost + tradeStats.interestExpense), "annualized + logged interest")}
                {metricCard("Net Income", formatCurrency(forwardPerformance.netIncome), "income less financing/fees")}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {metricCard("Buy Cost", formatCurrency(tradeStats.buyCost), `${tradeStats.stockTradeCount} stock trades`)}
                {metricCard("Sell Proceeds", formatCurrency(tradeStats.sellProceeds), "cash from sales")}
                {metricCard("Fees", formatCurrency(tradeStats.fees), "logged expenses")}
                {metricCard("Cash Impact", formatSignedCurrency(tradeStats.cashImpact), "net trade-log cash flow", tradeStats.cashImpact >= 0 ? "text-[#067647]" : "text-[#B42318]")}
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="compact-data-table w-full border-collapse">
                  <thead className="bg-[#0D1B2A] text-white">
                    <tr>
                      {["Ticker", "Shares", "Avg Cost", "Price", "Market Value", "Weight", "Unrealized P&L", "Return", "Income", "Action"].map((h) => (
                        <th key={h} className="p-3 text-left text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.enrichedHoldings.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-4 text-sm text-[#344054]">
                          No live holdings entered yet. Add buy trades in the Trade Log to start forward performance tracking.
                        </td>
                      </tr>
                    ) : (
                      snapshot.enrichedHoldings
                        .slice()
                        .sort((a, b) => b.marketValue - a.marketValue)
                        .map((h) => {
                          const ticker = normalizeTicker(h.ticker);
                          const benchMatch = benchCandidates.find((b) => normalizeTicker(b.ticker) === ticker);
                          const yieldRate = incomeData[ticker]?.dividendYield ?? benchMatch?.yieldRate ?? h.upside ?? 0;
                          const annualIncome = h.marketValue * yieldRate;
                          const pnl = h.marketValue - h.shares * h.cost;
                          return (
                            <tr key={`perf-${h.id}`} className="border-b border-[#E5D8A8]">
                              <td className="p-2 font-black">{h.ticker}</td>
                              <td className="p-2">{h.shares.toLocaleString()}</td>
                              <td className="p-2">{formatCurrencyTable(h.cost)}</td>
                              <td className="p-2">{formatCurrencyTable(h.price)}</td>
                              <td className="p-2 font-bold">{formatCurrency(h.marketValue)}</td>
                              <td className="p-2">{formatPercent(h.weight)}</td>
                              <td className={`p-2 font-bold ${pnl >= 0 ? "text-[#067647]" : "text-[#B42318]"}`}>{formatSignedCurrency(pnl)}</td>
                              <td className={`p-2 font-bold ${h.gain >= 0 ? "text-[#067647]" : "text-[#B42318]"}`}>{formatPercent(h.gain)}</td>
                              <td className="p-2">{formatCurrency(annualIncome)}</td>
                              <td className="p-2"><span className={`border px-2 py-1 text-xs font-black ${statusPill(h.action)}`}>{h.action}</span></td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              <h4 className="mt-6 font-black text-[#0D1B2A]">Backtest Reference</h4>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
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
