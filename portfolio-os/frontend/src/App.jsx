import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { GoogleLogin, googleLogout } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import "./App.css";
import {
  addStock,
  analyzePortfolio,
  deleteStock,
  deleteStocks,
  fetchArbitrageSnapshot,
  fetchStockPrice,
  getStocks,
  searchStockSymbols,
} from "./services/api";
import AllocationChart from "./components/AllocationChart";
import Card from "./components/Card";
import Wizard from "./components/Wizard";
import { ASSUMPTION_HINTS } from "./config/assumptionHints";
import { RUNTIME_SETTINGS } from "./config/runtimeSettings";

const RISK_TARGETS = {
  low: { core: 0.4, defensive: 0.3, global: 0.1, hedge: 0.1, cash: 0.1 },
  medium: { core: 0.3, growth: 0.3, global: 0.2, hedge: 0.1, cash: 0.1 },
  high: { growth: 0.5, core: 0.2, global: 0.2, hedge: 0.05, cash: 0.05 },
};

const getLocalDateKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function App({ googleClientConfigured = false }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "portfolio", label: "Portfolio" },
    { id: "arbitrage", label: "Arbitrage" },
    { id: "profile", label: "User Profile" }
  ];

  const todayIso = new Date().toISOString();
  const todayDate = todayIso.slice(0, 10);
  const [form, setForm] = useState({
    stock_symbol: "",
    total_qty: "",
    average_cost_price: "",
    current_market_price: "",
    market: "india",
    transaction_date: todayDate,
    category: "core"
  });

  const [stocks, setStocks] = useState([]);
  const [selectedStockIds, setSelectedStockIds] = useState([]);
  const [expandedGroupKeys, setExpandedGroupKeys] = useState([]);
  const [targetRisk, setTargetRisk] = useState("medium");
  const [result, setResult] = useState(null);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [useSmartCagr, setUseSmartCagr] = useState(true);
  const [manualCagr, setManualCagr] = useState(12);
  const [inflation, setInflation] = useState(6);
  const [stressLevels, setStressLevels] = useState({
    mild: 10,
    recession: 20,
    crash: 30,
  });
  const [activeSection, setActiveSection] = useState("dashboard");
  const [arbitrageThreshold, setArbitrageThreshold] = useState(1);
  const defaultArbitrageAlertFrequencySec = Math.max(5, Math.round(RUNTIME_SETTINGS.arbitrage.refreshIntervalMs / 1000));
  const [arbitrageAlertFrequencySec, setArbitrageAlertFrequencySec] = useState(defaultArbitrageAlertFrequencySec);
  const [arbitrageWatchlist, setArbitrageWatchlist] = useState("");
  const [arbitrage, setArbitrage] = useState(null);
  const [arbitrageLoading, setArbitrageLoading] = useState(false);
  const [arbitrageError, setArbitrageError] = useState("");
  const [arbitrageTrend, setArbitrageTrend] = useState([]);
  const [globalArbAlert, setGlobalArbAlert] = useState(null);
  const [alertsSnoozedUntilMs, setAlertsSnoozedUntilMs] = useState(0);
  const [alertsMutedDate, setAlertsMutedDate] = useState("");
  const [addError, setAddError] = useState("");
  const [portfolioCreatedAt, setPortfolioCreatedAt] = useState(todayIso);

  // "idle" | "loading" | "fetched" | "error"
  const [priceStatus, setPriceStatus] = useState("idle");
  const debounceRef = useRef(null);
  const symbolDebounceRef = useRef(null);
  const audioCtxRef = useRef(null);
  const audioUnlockedRef = useRef(false);
  const seenArbitrageAlertKeysRef = useRef(new Set());
  const [symbolCandidates, setSymbolCandidates] = useState([]);
  const [symbolStatus, setSymbolStatus] = useState("idle");
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [sessionRemainingMs, setSessionRemainingMs] = useState(0);
  const lastSessionRefreshAtRef = useRef(0);
  const [authUser, setAuthUser] = useState(() => {
    const raw = localStorage.getItem("googleAuthUser");
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  const formattedPortfolioDate = new Date(portfolioCreatedAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  const liveTotal = stocks.reduce(
    (sum, stock) => sum + (stock.value_at_market_price ?? stock.value ?? 0),
    0
  );
  const overviewTotal = result ? result.total : liveTotal;
  const assumedCagr = result?.assumptions?.cagr_10y ?? manualCagr;
  const assumedInflation = result?.assumptions?.inflation ?? inflation;
  const realValue5Y = result ? result.real_projection_5y : 0;
  const realValue10Y = result ? result.real_projection_10y : 0;
  const sessionTimeoutMinutes = RUNTIME_SETTINGS.session.inactivityTimeoutMinutes;
  const sessionTimeoutMs = sessionTimeoutMinutes * 60 * 1000;

  const effectiveArbitrageSymbols = useMemo(() => {
    return (arbitrageWatchlist || "")
      .split(",")
      .map((part) => part.trim().toUpperCase().split(".")[0])
      .filter(Boolean)
      .filter((value, index, arr) => arr.indexOf(value) === index);
  }, [arbitrageWatchlist]);

  const effectiveArbitrageWatchlistCsv = useMemo(
    () => effectiveArbitrageSymbols.join(","),
    [effectiveArbitrageSymbols]
  );

  const normalizedOwnerEmail = (authUser?.email || "").trim().toLowerCase();
  const sessionStorageKey = normalizedOwnerEmail ? `sessionExpiresAt:${normalizedOwnerEmail}` : "";
  const sessionMinutesLeft = Math.max(0, Math.floor(sessionRemainingMs / 60000));
  const sessionSecondsLeft = Math.max(0, Math.floor((sessionRemainingMs % 60000) / 1000));
  const sessionCountdownText = `${sessionMinutesLeft}:${String(sessionSecondsLeft).padStart(2, "0")}`;
  const arbitrageRefreshIntervalMs = Math.max(5000, Number(arbitrageAlertFrequencySec || defaultArbitrageAlertFrequencySec) * 1000);
  const alertsMutedForToday = alertsMutedDate === getLocalDateKey();
  const alertsSnoozed = alertsSnoozedUntilMs > Date.now();

  const healthCommentary = useMemo(() => {
    if (!result?.allocation) {
      return "Health score is calculated after allocation analysis is available.";
    }

    const allocation = result.allocation;
    const checks = [
      { bucket: "global", min: 0.1, label: "global diversification" },
      { bucket: "hedge", min: 0.05, label: "hedge allocation" },
      { bucket: "defensive", min: 0.05, label: "defensive cushion" },
      { bucket: "core", min: 0.2, label: "core stability" },
      { bucket: "cash", min: 0.03, label: "cash buffer" },
    ];

    const met = checks
      .filter(({ bucket, min }) => (allocation[bucket] || 0) > min)
      .map(({ label }) => label);
    const missing = checks
      .filter(({ bucket, min }) => (allocation[bucket] || 0) <= min)
      .map(({ label }) => label);

    if (missing.length === 0) {
      return "Strong diversification across core, defensive, global, hedge, and cash checks.";
    }

    const metText = met.length > 0 ? `Met: ${met.slice(0, 2).join(", ")}. ` : "";
    return `${metText}Low score is mainly due to missing ${missing.slice(0, 2).join(" and ")}.`;
  }, [result]);

  const targetRiskCommentary = useMemo(() => {
    const riskKey = (result?.risk || targetRisk || "medium").toLowerCase();
    const target = RISK_TARGETS[riskKey] || RISK_TARGETS.medium;
    const allocation = result?.allocation || {};

    const gaps = Object.entries(target)
      .map(([bucket, pct]) => ({
        bucket,
        gap: (pct - (allocation[bucket] || 0)) * 100,
      }))
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

    const topGaps = gaps
      .filter((item) => Math.abs(item.gap) >= 3)
      .slice(0, 2)
      .map((item) => `${item.bucket} ${item.gap > 0 ? "under" : "over"} by ${Math.abs(item.gap).toFixed(0)}%`)
      .join(", ");

    const base = `${riskKey} targets core ${(target.core || 0) * 100}%, growth ${(target.growth || 0) * 100}%, global ${(target.global || 0) * 100}%, hedge ${(target.hedge || 0) * 100}%, cash ${(target.cash || 0) * 100}%.`;
    return topGaps ? `${base} Biggest gaps: ${topGaps}.` : `${base} Current mix is close to target.`;
  }, [result, targetRisk]);

  const playAlertTone = () => {
    if (!audioUnlockedRef.current) {
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) {
        return;
      }
      if (!audioCtxRef.current) {
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;

      const makeBeep = (offset, frequency) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.15, now + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.24);
      };

      makeBeep(0, 880);
      makeBeep(0.28, 1175);
    } catch {
      // ignore audio issues silently
    }
  };

  const loadStocks = async () => {
    if (!normalizedOwnerEmail) {
      setStocks([]);
      setSelectedStockIds([]);
      return;
    }

    const res = await getStocks(normalizedOwnerEmail);
    setStocks(res.data);
    setSelectedStockIds((currentIds) =>
      currentIds.filter((id) => res.data.some((stock) => stock.id === id))
    );
  };

  useEffect(() => {
    if (!normalizedOwnerEmail) {
      return;
    }
    localStorage.setItem(`portfolioCreatedAt:${normalizedOwnerEmail}`, portfolioCreatedAt);
  }, [portfolioCreatedAt, normalizedOwnerEmail]);

  useEffect(() => {
    if (authUser) {
      localStorage.setItem("googleAuthUser", JSON.stringify(authUser));
    } else {
      localStorage.removeItem("googleAuthUser");
      setSessionRemainingMs(0);
      setAlertsSnoozedUntilMs(0);
      setAlertsMutedDate("");
    }
  }, [authUser]);

  useEffect(() => {
    if (!sessionStorageKey || !normalizedOwnerEmail) {
      return;
    }

    let expiresAt = Number(localStorage.getItem(sessionStorageKey));
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      expiresAt = Date.now() + sessionTimeoutMs;
      localStorage.setItem(sessionStorageKey, String(expiresAt));
    }

    const refreshSession = () => {
      const now = Date.now();
      if (now - lastSessionRefreshAtRef.current < RUNTIME_SETTINGS.session.activityRefreshThrottleMs) {
        return;
      }
      lastSessionRefreshAtRef.current = now;
      expiresAt = now + sessionTimeoutMs;
      localStorage.setItem(sessionStorageKey, String(expiresAt));
      setSessionRemainingMs(sessionTimeoutMs);
    };

    const forceLogout = () => {
      googleLogout();
      localStorage.removeItem(sessionStorageKey);
      setAuthUser(null);
      setSessionRemainingMs(0);
    };

    const tick = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        forceLogout();
        return;
      }
      setSessionRemainingMs(remaining);
    };

    const onStorageChange = (event) => {
      if (event.key === sessionStorageKey && event.newValue) {
        const parsed = Number(event.newValue);
        if (Number.isFinite(parsed)) {
          expiresAt = parsed;
        }
      }
      if (event.key === "googleAuthUser" && !event.newValue) {
        setAuthUser(null);
        setSessionRemainingMs(0);
      }
    };

    tick();

    const intervalId = setInterval(tick, 1000);
    const activityEvents = ["pointerdown", "keydown", "touchstart", "click"];

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, refreshSession, { passive: true });
    }
    window.addEventListener("storage", onStorageChange);

    return () => {
      clearInterval(intervalId);
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, refreshSession);
      }
      window.removeEventListener("storage", onStorageChange);
    };
  }, [normalizedOwnerEmail, sessionStorageKey, sessionTimeoutMs]);

  useEffect(() => {
    if (!normalizedOwnerEmail) {
      return;
    }
    localStorage.setItem(`arbitrageWatchlist:${normalizedOwnerEmail}`, arbitrageWatchlist);
  }, [arbitrageWatchlist, normalizedOwnerEmail]);

  useEffect(() => {
    if (!normalizedOwnerEmail) {
      return;
    }
    localStorage.setItem(
      `arbitrageAlertFrequencySec:${normalizedOwnerEmail}`,
      String(arbitrageAlertFrequencySec)
    );
  }, [arbitrageAlertFrequencySec, normalizedOwnerEmail]);

  useEffect(() => {
    if (!normalizedOwnerEmail) {
      return;
    }
    localStorage.setItem(`arbitrageAlertSnoozedUntil:${normalizedOwnerEmail}`, String(alertsSnoozedUntilMs));
  }, [alertsSnoozedUntilMs, normalizedOwnerEmail]);

  useEffect(() => {
    if (!normalizedOwnerEmail) {
      return;
    }
    localStorage.setItem(`arbitrageAlertMutedDate:${normalizedOwnerEmail}`, alertsMutedDate || "");
  }, [alertsMutedDate, normalizedOwnerEmail]);

  useEffect(() => {
    if (!normalizedOwnerEmail) {
      setStocks([]);
      setSelectedStockIds([]);
      setExpandedGroupKeys([]);
      setResult(null);
      setArbitrageWatchlist("");
      setArbitrageAlertFrequencySec(defaultArbitrageAlertFrequencySec);
      setAlertsSnoozedUntilMs(0);
      setAlertsMutedDate("");
      setPortfolioCreatedAt(todayIso);
      return;
    }

    setArbitrageWatchlist(localStorage.getItem(`arbitrageWatchlist:${normalizedOwnerEmail}`) || "");
    const savedFrequency = Number(localStorage.getItem(`arbitrageAlertFrequencySec:${normalizedOwnerEmail}`));
    setArbitrageAlertFrequencySec(
      Number.isFinite(savedFrequency) && savedFrequency >= 5 ? savedFrequency : defaultArbitrageAlertFrequencySec
    );
    const savedSnooze = Number(localStorage.getItem(`arbitrageAlertSnoozedUntil:${normalizedOwnerEmail}`));
    setAlertsSnoozedUntilMs(Number.isFinite(savedSnooze) ? savedSnooze : 0);
    const savedMutedDate = localStorage.getItem(`arbitrageAlertMutedDate:${normalizedOwnerEmail}`) || "";
    setAlertsMutedDate(savedMutedDate);
    setPortfolioCreatedAt(localStorage.getItem(`portfolioCreatedAt:${normalizedOwnerEmail}`) || todayIso);
    loadStocks();
  }, [normalizedOwnerEmail]);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      clearTimeout(symbolDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      audioUnlockedRef.current = true;
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };

    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

  const loadArbitrage = async () => {
    setArbitrageLoading(true);
    setArbitrageError("");
    try {
      const res = await fetchArbitrageSnapshot(effectiveArbitrageWatchlistCsv, arbitrageThreshold);
      const snapshot = res.data;
      setArbitrage(snapshot);

      const freshAlerts = (snapshot.alerts || []).filter((alert) => {
        const key = `${alert.symbol}:${alert.buy_exchange}:${alert.sell_exchange}:${alert.spread_abs}`;
        return !seenArbitrageAlertKeysRef.current.has(key);
      });

      const canDeliverAlerts = alertsMutedDate !== getLocalDateKey() && Date.now() >= alertsSnoozedUntilMs;
      if (freshAlerts.length > 0 && canDeliverAlerts) {
        for (const alert of freshAlerts) {
          const key = `${alert.symbol}:${alert.buy_exchange}:${alert.sell_exchange}:${alert.spread_abs}`;
          seenArbitrageAlertKeysRef.current.add(key);
        }
        setGlobalArbAlert({
          createdAt: Date.now(),
          items: freshAlerts.slice(0, 3),
          threshold: snapshot.threshold,
        });
        playAlertTone();
      }

      if (seenArbitrageAlertKeysRef.current.size > 800) {
        seenArbitrageAlertKeysRef.current.clear();
      }

      setArbitrageTrend((current) => {
        const next = [
          ...current,
          {
            at: snapshot.updated_at,
            top_symbol: snapshot.top_spread_symbol,
            max_spread: snapshot.max_spread,
            avg_spread: snapshot.avg_spread,
            active_alert_count: snapshot.active_alert_count,
          },
        ];
        return next.slice(-RUNTIME_SETTINGS.arbitrage.trendWindowPoints);
      });
    } catch {
      setArbitrageError("Failed to load arbitrage snapshot");
    } finally {
      setArbitrageLoading(false);
    }
  };

  const snoozeAlerts = (minutes) => {
    const until = Date.now() + minutes * 60 * 1000;
    setAlertsSnoozedUntilMs(until);
    setGlobalArbAlert(null);
  };

  const stopAlertsForToday = () => {
    setAlertsMutedDate(getLocalDateKey());
    setGlobalArbAlert(null);
  };

  const resumeAlerts = () => {
    setAlertsMutedDate("");
    setAlertsSnoozedUntilMs(0);
  };

  useEffect(() => {
    if (activeSection !== "arbitrage") {
      return;
    }

    loadArbitrage();
    const interval = setInterval(loadArbitrage, arbitrageRefreshIntervalMs);
    return () => clearInterval(interval);
  }, [
    effectiveArbitrageWatchlistCsv,
    arbitrageThreshold,
    activeSection,
    arbitrageRefreshIntervalMs,
    alertsMutedDate,
    alertsSnoozedUntilMs,
  ]);

  useEffect(() => {
    if (!globalArbAlert) {
      return;
    }
    const timer = setTimeout(() => setGlobalArbAlert(null), 12000);
    return () => clearTimeout(timer);
  }, [globalArbAlert]);

  const queueSymbolSearch = (query, market) => {
    clearTimeout(symbolDebounceRef.current);

    if (!query || query.trim().length < 2) {
      setSymbolCandidates([]);
      setSymbolStatus("idle");
      return;
    }

    symbolDebounceRef.current = setTimeout(async () => {
      setSymbolStatus("loading");
      try {
        const res = await searchStockSymbols(query, market);
        const candidates = res?.data?.candidates || [];
        setSymbolCandidates(candidates);
        setSymbolStatus(candidates.length ? "resolved" : "empty");
      } catch {
        setSymbolCandidates([]);
        setSymbolStatus("error");
      }
    }, 350);
  };


  const goToSection = (sectionId) => {
    setActiveSection(sectionId);
  };

  const queuePriceFetch = (symbol, market) => {
    clearTimeout(debounceRef.current);
    if (!symbol) {
      setPriceStatus("idle");
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setPriceStatus("loading");
      try {
        const res = await fetchStockPrice(symbol, market);
        const price = Number(res?.data?.price);
        if (!Number.isFinite(price) || price <= 0) {
          throw new Error("Invalid price");
        }
        setForm((prev) => ({
          ...prev,
          current_market_price: String(price),
          average_cost_price: prev.average_cost_price === "" ? String(price) : prev.average_cost_price,
        }));
        setPriceStatus("fetched");
      } catch {
        setPriceStatus("error");
      }
    }, 700);
  };

  const handleSymbolChange = (raw) => {
    const symbol = raw.toUpperCase();
    setForm((prev) => ({ ...prev, stock_symbol: symbol }));
    setPriceStatus("idle");
    queueSymbolSearch(symbol, form.market);

    if (symbol.includes(".")) {
      queuePriceFetch(symbol, form.market);
    }
  };

  const chooseSymbolCandidate = (candidate) => {
    setSelectedSymbols((current) => {
      const exists = current.some((item) => item.symbol === candidate.symbol);
      if (exists) {
        return current.filter((item) => item.symbol !== candidate.symbol);
      }
      return [...current, candidate];
    });

    setForm((prev) => ({ ...prev, stock_symbol: candidate.symbol }));
    setSymbolStatus("resolved");
    setPriceStatus("idle");
    queuePriceFetch(candidate.symbol, form.market);
  };

  const removeSelectedSymbol = (symbol) => {
    setSelectedSymbols((current) => current.filter((item) => item.symbol !== symbol));
  };

  const handleAdd = async () => {
    if (!normalizedOwnerEmail) {
      setAddError("Sign in required.");
      return;
    }

    const rawSymbol = (form.stock_symbol || "").trim();
    const hasExplicitSymbol = rawSymbol.includes(".") || /^[A-Z0-9-]+$/.test(rawSymbol);
    if (!hasExplicitSymbol && selectedSymbols.length === 0) {
      setSymbolStatus("error");
      setAddError("Choose at least one valid ticker before adding.");
      return;
    }

    const symbolsToAdd = selectedSymbols.length > 0
      ? selectedSymbols.map((item) => item.symbol)
      : [rawSymbol.toUpperCase()];

    const failed = [];
    try {
      setAddError("");
      for (const symbol of symbolsToAdd) {
        let marketPrice = Number(form.current_market_price);
        if (!Number.isFinite(marketPrice) || marketPrice <= 0) {
          try {
            const priceRes = await fetchStockPrice(symbol, form.market);
            const fetched = Number(priceRes?.data?.price);
            if (Number.isFinite(fetched) && fetched > 0) {
              marketPrice = fetched;
            }
          } catch {
            marketPrice = 0;
          }
        }

        const avgCostInput = Number(form.average_cost_price);
        const avgCost = Number.isFinite(avgCostInput) && avgCostInput > 0
          ? avgCostInput
          : marketPrice;

        try {
          await addStock({
            ...form,
            owner_email: normalizedOwnerEmail,
            stock_symbol: symbol,
            total_qty: Number(form.total_qty),
            average_cost_price: avgCost,
            current_market_price: marketPrice,
          });
        } catch {
          failed.push(symbol);
        }
      }
      if (failed.length > 0) {
        setAddError(`Some tickers failed to add: ${failed.join(", ")}`);
      }
    } finally {
      await loadStocks();
    }
    if (!portfolioCreatedAt) {
      setPortfolioCreatedAt(todayIso);
    }
    setForm({
      stock_symbol: "",
      total_qty: "",
      average_cost_price: "",
      current_market_price: "",
      market: "india",
      transaction_date: todayDate,
      category: "core"
    });
    setSelectedSymbols([]);
    setSymbolCandidates([]);
    setSymbolStatus("idle");
    setPriceStatus("idle");
  };

  const handleAnalyze = async () => {
    if (!normalizedOwnerEmail) {
      return;
    }

    setAnalyzeLoading(true);
    try {
      const res = await analyzePortfolio({
        risk: targetRisk,
        inflation,
        cagr: useSmartCagr ? undefined : manualCagr,
        mild_drop: stressLevels.mild,
        recession_drop: stressLevels.recession,
        crash_drop: stressLevels.crash,
      }, normalizedOwnerEmail);
      setResult(res.data);
    } catch {
      // keep last successful analysis on transient API failures
    } finally {
      setAnalyzeLoading(false);
    }
  };

  useEffect(() => {
    if (!normalizedOwnerEmail || stocks.length === 0) {
      setResult(null);
      return;
    }

    const timer = setTimeout(() => {
      handleAnalyze();
    }, 250);

    return () => clearTimeout(timer);
  }, [
    normalizedOwnerEmail,
    stocks,
    targetRisk,
    inflation,
    useSmartCagr,
    manualCagr,
    stressLevels.mild,
    stressLevels.recession,
    stressLevels.crash,
  ]);

  const updateStressLevel = (key, value) => {
    setStressLevels((current) => ({ ...current, [key]: Number(value) }));
  };

  const toggleStockSelection = (stockId) => {
    setSelectedStockIds((currentIds) =>
      currentIds.includes(stockId)
        ? currentIds.filter((id) => id !== stockId)
        : [...currentIds, stockId]
    );
  };

  const toggleSelectAllStocks = () => {
    setSelectedStockIds((currentIds) =>
      currentIds.length === stocks.length ? [] : stocks.map((stock) => stock.id)
    );
  };

  const handleDeleteStock = async (stockId) => {
    if (!normalizedOwnerEmail) {
      return;
    }
    await deleteStock(stockId, normalizedOwnerEmail);
    await loadStocks();
  };

  const handleDeleteSelectedStocks = async () => {
    if (selectedStockIds.length === 0) {
      return;
    }

    if (!normalizedOwnerEmail) {
      return;
    }

    await deleteStocks(selectedStockIds, normalizedOwnerEmail);
    setSelectedStockIds([]);
    await loadStocks();
  };

  const groupedStocks = useMemo(() => {
    const grouped = new Map();

    for (const stock of stocks) {
      const key = `${stock.stock_symbol}::${stock.market}`;
      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          stock_symbol: stock.stock_symbol,
          company_name: stock.company_name,
          market: stock.market,
          transactions: [],
          total_qty: 0,
          value_at_cost: 0,
          value_at_market_price: 0,
          categorySet: new Set(),
          portfolio_valuation_date: stock.portfolio_valuation_date,
          latest_transaction_date: stock.transaction_date,
        });
      }

      const g = grouped.get(key);
      g.transactions.push(stock);
      g.total_qty += stock.total_qty;
      g.value_at_cost += stock.value_at_cost;
      g.value_at_market_price += stock.value_at_market_price;
      g.categorySet.add(stock.category);
      g.portfolio_valuation_date =
        stock.portfolio_valuation_date > g.portfolio_valuation_date
          ? stock.portfolio_valuation_date
          : g.portfolio_valuation_date;
      g.latest_transaction_date =
        stock.transaction_date > g.latest_transaction_date
          ? stock.transaction_date
          : g.latest_transaction_date;
    }

    return Array.from(grouped.values())
      .map((g) => {
        const avg_cost_price = g.total_qty > 0 ? g.value_at_cost / g.total_qty : 0;
        const current_market_price = g.total_qty > 0 ? g.value_at_market_price / g.total_qty : 0;
        const profit_loss_actual = g.value_at_market_price - g.value_at_cost;
        const profit_loss_percentage = g.value_at_cost > 0 ? (profit_loss_actual / g.value_at_cost) * 100 : 0;

        return {
          ...g,
          average_cost_price: avg_cost_price,
          current_market_price,
          profit_loss_actual,
          profit_loss_percentage,
          category: g.categorySet.size === 1 ? Array.from(g.categorySet)[0] : "mixed",
          transactions: [...g.transactions].sort((a, b) =>
            (b.transaction_date || "").localeCompare(a.transaction_date || "") || (b.id - a.id)
          ),
        };
      })
      .sort((a, b) => a.stock_symbol.localeCompare(b.stock_symbol));
  }, [stocks]);

  const toggleGroupExpansion = (groupKey) => {
    setExpandedGroupKeys((current) =>
      current.includes(groupKey)
        ? current.filter((k) => k !== groupKey)
        : [...current, groupKey]
    );
  };

  const toggleGroupSelection = (group) => {
    const groupIds = group.transactions.map((txn) => txn.id);
    setSelectedStockIds((currentIds) => {
      const allSelected = groupIds.every((id) => currentIds.includes(id));
      if (allSelected) {
        return currentIds.filter((id) => !groupIds.includes(id));
      }
      return Array.from(new Set([...currentIds, ...groupIds]));
    });
  };

  const handleDeleteGroup = async (group) => {
    if (!normalizedOwnerEmail) {
      return;
    }

    await deleteStocks(group.transactions.map((txn) => txn.id), normalizedOwnerEmail);
    await loadStocks();
  };

  const handleGoogleSuccess = (credentialResponse) => {
    const token = credentialResponse?.credential;
    if (!token) {
      return;
    }
    try {
      const decoded = jwtDecode(token);
      setAuthUser({
        name: decoded?.name || "User",
        email: decoded?.email || "",
        picture: decoded?.picture || "",
      });
    } catch {
      // ignore invalid token decode
    }
  };

  const handleLogout = () => {
    googleLogout();
    if (sessionStorageKey) {
      localStorage.removeItem(sessionStorageKey);
    }
    setSessionRemainingMs(0);
    setAuthUser(null);
  };

  if (!authUser) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <h1 className="app-title">Portfolio OS</h1>
          <p className="card-note">Sign in with Google to access your portfolio and arbitrage dashboard.</p>
          {googleClientConfigured ? (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => {}}
              theme="filled_black"
              size="large"
              shape="pill"
              text="continue_with"
              width="280"
            />
          ) : (
            <p className="arb-error">
              Google SSO is not configured. Set `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="layout-shell">
      <aside className="side-nav">
        <div className="side-nav-brand">Portfolio OS</div>
        <div className="side-nav-user">
          {authUser.picture ? <img src={authUser.picture} alt={authUser.name} /> : null}
          <div>
            <div>{authUser.name}</div>
            <small>{authUser.email}</small>
            <small className="session-timer">
              Auto sign-out (idle): {sessionCountdownText} ({sessionTimeoutMinutes}m)
            </small>
          </div>
        </div>
        <nav className="side-nav-menu" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`side-nav-item ${activeSection === item.id ? "is-active" : ""}`}
              onClick={() => goToSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <button type="button" className="side-nav-item side-nav-logout" onClick={handleLogout}>
          Sign Out
        </button>
      </aside>

      <main className="app-shell">
        <h1 className="app-title">Portfolio OS</h1>

        {activeSection === "dashboard" && (
          <section id="dashboard-section" className="app-section">
            <div className="dashboard-top-grid">
              <Card className="card-overview" title="Portfolio Overview" subtitle="Snapshot of your current portfolio">
                <h2>₹{overviewTotal.toFixed(0)}</h2>
                <p>Health Score: {result ? `${result.health}/10` : (analyzeLoading ? "Calculating..." : "No data")}</p>
                <p className="card-note">{healthCommentary}</p>
                <p>Target Risk: {result ? result.risk : targetRisk}</p>
                <p className="card-note">{targetRiskCommentary}</p>
              </Card>

              <Card className="card-allocation" title="Allocation" subtitle="Category mix of your current portfolio">
                {result ? (
                  <AllocationChart data={result.allocation} />
                ) : (
                  <p className="card-note">{analyzeLoading ? "Calculating allocation..." : "Add instruments to view allocation."}</p>
                )}
              </Card>
            </div>

            <Card className="card-controls" title="Assumptions & Stress Controls" subtitle="Adjust analysis inputs with accessible controls">
              <div className="controls-grid">
                <label className="control-block">
                  <span>Inflation Assumption: {inflation}%</span>
                  <small id={ASSUMPTION_HINTS.inflation.ariaId} className="control-hint">
                    {ASSUMPTION_HINTS.inflation.text}
                  </small>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={inflation}
                    aria-label="Inflation assumption percentage"
                    aria-valuemin={0}
                    aria-valuemax={15}
                    aria-valuenow={inflation}
                    aria-describedby={ASSUMPTION_HINTS.inflation.ariaId}
                    onChange={(e) => setInflation(Number(e.target.value))}
                  />
                </label>

                <label className="control-toggle">
                  <input
                    type="checkbox"
                    checked={useSmartCagr}
                    aria-label="Use sector based CAGR estimation"
                    onChange={(e) => setUseSmartCagr(e.target.checked)}
                  />
                  <span>
                    Use sector-based CAGR from selected instruments (5Y/10Y)
                    <small className="control-hint">
                      {ASSUMPTION_HINTS.smartCagr.text}
                    </small>
                  </span>
                </label>

                <label className="control-block">
                  <span>Manual CAGR Override: {manualCagr}%</span>
                  <small id={ASSUMPTION_HINTS.manualCagr.ariaId} className="control-hint">
                    {ASSUMPTION_HINTS.manualCagr.text}
                  </small>
                  <input
                    type="range"
                    min="4"
                    max="25"
                    step="0.5"
                    value={manualCagr}
                    disabled={useSmartCagr}
                    aria-label="Manual CAGR percentage override"
                    aria-describedby={ASSUMPTION_HINTS.manualCagr.ariaId}
                    aria-valuemin={4}
                    aria-valuemax={25}
                    aria-valuenow={manualCagr}
                    onChange={(e) => setManualCagr(Number(e.target.value))}
                  />
                </label>

                <label className="control-block">
                  <span>Mild Stress Drop: {stressLevels.mild}%</span>
                  <small id={ASSUMPTION_HINTS.mildStress.ariaId} className="control-hint">
                    {ASSUMPTION_HINTS.mildStress.text}
                  </small>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={stressLevels.mild}
                    aria-label="Mild stress drop percentage"
                    aria-describedby={ASSUMPTION_HINTS.mildStress.ariaId}
                    aria-valuemin={5}
                    aria-valuemax={40}
                    aria-valuenow={stressLevels.mild}
                    onChange={(e) => updateStressLevel("mild", e.target.value)}
                  />
                </label>

                <label className="control-block">
                  <span>Recession Drop: {stressLevels.recession}%</span>
                  <small id={ASSUMPTION_HINTS.recessionStress.ariaId} className="control-hint">
                    {ASSUMPTION_HINTS.recessionStress.text}
                  </small>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="1"
                    value={stressLevels.recession}
                    aria-label="Recession stress drop percentage"
                    aria-describedby={ASSUMPTION_HINTS.recessionStress.ariaId}
                    aria-valuemin={10}
                    aria-valuemax={60}
                    aria-valuenow={stressLevels.recession}
                    onChange={(e) => updateStressLevel("recession", e.target.value)}
                  />
                </label>

                <label className="control-block">
                  <span>Crash Drop: {stressLevels.crash}%</span>
                  <small id={ASSUMPTION_HINTS.crashStress.ariaId} className="control-hint">
                    {ASSUMPTION_HINTS.crashStress.text}
                  </small>
                  <input
                    type="range"
                    min="15"
                    max="80"
                    step="1"
                    value={stressLevels.crash}
                    aria-label="Crash stress drop percentage"
                    aria-describedby={ASSUMPTION_HINTS.crashStress.ariaId}
                    aria-valuemin={15}
                    aria-valuemax={80}
                    aria-valuenow={stressLevels.crash}
                    onChange={(e) => updateStressLevel("crash", e.target.value)}
                  />
                </label>
              </div>
            </Card>

            {result && (
              <div className="results-grid">
                <Card className="card-rebalance" title="Rebalance" subtitle="What rebalancing means">
                  <p className="card-note">
                    Rebalancing is the action required to bring your current allocation back to the target risk mix.
                    Positive values mean add more in that bucket; negative values mean trim exposure.
                  </p>
                  <div className="metric-stack">
                    {Object.entries(result.rebalance).map(([k, v]) => (
                      <div key={k}>
                        {k}: ₹{v.toFixed(0)}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="card-projection" title="Projection" subtitle="How projection is calculated">
                  <p className="card-note">
                    Projections use compound annual growth with a nominal CAGR assumption of {assumedCagr}%.
                    Formula: Future Value = Present Value x (1 + r)^n.
                    CAGR source: {result.assumptions.cagr_source === "sector_estimated" ? "sector-weighted estimate" : "manual override"}.
                  </p>
                  <div className="metric-stack">
                    <div>Nominal 5Y: ₹{result.projection_5y.toFixed(0)}</div>
                    <div>Nominal 10Y: ₹{result.projection_10y.toFixed(0)}</div>
                    <div>Inflation-adjusted 5Y ({assumedInflation}%): ₹{realValue5Y.toFixed(0)}</div>
                    <div>Inflation-adjusted 10Y ({assumedInflation}%): ₹{realValue10Y.toFixed(0)}</div>
                    {result.assumptions.cagr_source === "sector_estimated" && (
                      <div>
                        Sector mix used: {Object.entries(result.assumptions.sector_mix)
                          .map(([sector, weight]) => `${sector} ${(weight * 100).toFixed(0)}%`)
                          .join(", ")}
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="card-risk" title="Risk" subtitle="Stress and macro assumptions">
                  <p className="card-note">
                    Risk view applies stress shocks (-10%, -20%, -30%) to estimate downside in mild, recession,
                    and crash markets. Geopolitical and inflation pressures are modeled as scenario assumptions,
                    not as live macro feeds.
                  </p>
                  <div className="metric-stack">
                    <div>Mild (-{result.stress.levels.mild_drop}%): ₹{result.stress.mild.toFixed(0)}</div>
                    <div>Recession (-{result.stress.levels.recession_drop}%): ₹{result.stress.recession.toFixed(0)}</div>
                    <div>Crash (-{result.stress.levels.crash_drop}%): ₹{result.stress.crash.toFixed(0)}</div>
                    <div className="card-note" style={{ marginTop: "10px" }}>Event-based downside scenarios:</div>
                    <div>Pandemic 2020: ₹{result.event_risk.pandemic_2020.toFixed(0)}</div>
                    <div>Bank Meltdown 2007: ₹{result.event_risk.bank_meltdown_2007.toFixed(0)}</div>
                    <div>War 2026: ₹{result.event_risk.war_2026.toFixed(0)}</div>
                  </div>
                </Card>
              </div>
            )}
          </section>
        )}

        {activeSection === "portfolio" && (
          <section id="portfolio-section" className="app-section">
            <Card title="Add Investment">
              <div className="input-row">
                <div className="symbol-input-wrap">
                  <input
                    placeholder="Stock Symbol"
                    value={form.stock_symbol}
                    onChange={(e) => handleSymbolChange(e.target.value)}
                  />
                  {symbolStatus === "loading" && <span className="symbol-hint">Searching symbols…</span>}
                  {symbolStatus === "empty" && <span className="symbol-hint">No symbol match found</span>}
                  {symbolStatus === "error" && <span className="symbol-hint">Symbol lookup failed</span>}
                  {symbolCandidates.length > 0 && (
                    <div className="symbol-dropdown" role="listbox" aria-label="Symbol suggestions">
                      {symbolCandidates.map((candidate) => (
                        <button
                          key={candidate.symbol}
                          type="button"
                          className="symbol-option"
                          onClick={() => chooseSymbolCandidate(candidate)}
                        >
                          <span>
                            <input
                              type="checkbox"
                              checked={selectedSymbols.some((item) => item.symbol === candidate.symbol)}
                              readOnly
                            />
                            {candidate.name}
                          </span>
                          <small>{candidate.symbol} {candidate.exchange ? `(${candidate.exchange})` : ""}</small>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedSymbols.length > 0 && (
                    <div className="symbol-chip-wrap">
                      {selectedSymbols.map((item) => (
                        <button
                          key={item.symbol}
                          type="button"
                          className="symbol-chip"
                          onClick={() => removeSelectedSymbol(item.symbol)}
                        >
                          {item.symbol} x
                        </button>
                      ))}
                    </div>
                  )}
                  {priceStatus === "loading" && <span className="price-badge price-badge--loading">Fetching…</span>}
                  {priceStatus === "fetched" && <span className="price-badge price-badge--ok">Live ●</span>}
                  {priceStatus === "error" && <span className="price-badge price-badge--err">Not found</span>}
                </div>
                <input
                  placeholder="Total Qty"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.total_qty}
                  onChange={(e) => setForm({ ...form, total_qty: e.target.value })}
                />
                <input
                  placeholder="Avg Cost Price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.average_cost_price}
                  onChange={(e) => setForm({ ...form, average_cost_price: e.target.value })}
                />
                <div className="price-input-wrap">
                  <input
                    placeholder="Current Market Price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.current_market_price}
                    onChange={(e) => setForm({ ...form, current_market_price: e.target.value })}
                  />
                  {priceStatus === "fetched" && <span className="auto-filled-hint">auto-filled</span>}
                </div>
                <input
                  type="date"
                  value={form.transaction_date}
                  onChange={(e) => setForm({ ...form, transaction_date: e.target.value })}
                />
                <select
                  value={form.market}
                  onChange={(e) => {
                    const nextMarket = e.target.value;
                    setForm({ ...form, market: nextMarket });
                    queueSymbolSearch(form.stock_symbol, nextMarket);
                    if (form.stock_symbol) {
                      queuePriceFetch(form.stock_symbol, nextMarket);
                    }
                  }}
                >
                  <option value="india">india</option>
                  <option value="us">us</option>
                  <option value="global">global</option>
                </select>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="core">core</option>
                  <option value="growth">growth</option>
                  <option value="defensive">defensive</option>
                  <option value="global">global</option>
                  <option value="hedge">hedge</option>
                  <option value="cash">cash</option>
                </select>

                <button onClick={handleAdd}>Add</button>
                <button onClick={handleAnalyze}>{analyzeLoading ? "Analyzing..." : "Analyze Portfolio"}</button>
              </div>
              {addError && <p className="arb-error">{addError}</p>}
            </Card>

            <Card title="Portfolio" subtitle={`Created on ${formattedPortfolioDate}`}>
              {stocks.length === 0 ? (
                <p>No stocks added yet.</p>
              ) : (
                <div>
                  <div className="stock-toolbar">
                    <label className="toolbar-select-all">
                      <input
                        type="checkbox"
                        checked={selectedStockIds.length === stocks.length}
                        onChange={toggleSelectAllStocks}
                      />
                      Select all
                    </label>

                    <button
                      onClick={handleDeleteSelectedStocks}
                      disabled={selectedStockIds.length === 0}
                    >
                      Delete Selected
                    </button>
                  </div>

                  <div className="portfolio-table-wrap">
                    <table className="portfolio-table">
                      <thead>
                        <tr>
                          <th>Select</th>
                          <th>Stock Symbol</th>
                          <th>Transaction Date</th>
                          <th>Total Qty</th>
                          <th>Avg Cost Price</th>
                          <th>Current Market Price</th>
                          <th>Price Portfolio Valuation Date</th>
                          <th>Value At Cost</th>
                          <th>Value At Market Price</th>
                          <th>Profit/Loss Actual</th>
                          <th>Profit/Loss %</th>
                          <th>Category</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedStocks.map((group) => {
                          const isExpanded = expandedGroupKeys.includes(group.key);
                          const isGroupSelected = group.transactions.every((txn) => selectedStockIds.includes(txn.id));

                          return (
                            <Fragment key={group.key}>
                              <tr key={group.key} className="portfolio-row portfolio-row--group">
                                <td>
                                  <input
                                    type="checkbox"
                                    checked={isGroupSelected}
                                    onChange={() => toggleGroupSelection(group)}
                                  />
                                </td>
                                <td>
                                  <div className="symbol-name-cell">
                                    <button
                                      type="button"
                                      className="expand-btn"
                                      onClick={() => toggleGroupExpansion(group.key)}
                                    >
                                      {isExpanded ? "-" : "+"} {group.stock_symbol}
                                    </button>
                                    <small>{group.company_name || "-"}</small>
                                  </div>
                                </td>
                                <td>{group.latest_transaction_date}</td>
                                <td>{group.total_qty.toFixed(2)}</td>
                                <td>₹{group.average_cost_price.toFixed(2)}</td>
                                <td>₹{group.current_market_price.toFixed(2)}</td>
                                <td>{group.portfolio_valuation_date}</td>
                                <td>₹{group.value_at_cost.toFixed(2)}</td>
                                <td>₹{group.value_at_market_price.toFixed(2)}</td>
                                <td className={group.profit_loss_actual >= 0 ? "pl-positive" : "pl-negative"}>
                                  ₹{group.profit_loss_actual.toFixed(2)}
                                </td>
                                <td className={group.profit_loss_percentage >= 0 ? "pl-positive" : "pl-negative"}>
                                  {group.profit_loss_percentage.toFixed(2)}%
                                </td>
                                <td className="stock-meta">{group.category}</td>
                                <td>
                                  <button onClick={() => handleDeleteGroup(group)}>Delete Group</button>
                                </td>
                              </tr>

                              {isExpanded && (
                                <tr className="portfolio-row-details" key={`${group.key}-details`}>
                                  <td colSpan={13}>
                                    <div className="group-transactions">
                                      <table className="txn-table">
                                        <thead>
                                          <tr>
                                            <th>Stock / Txn Date</th>
                                            <th>Qty</th>
                                            <th>Avg Cost</th>
                                            <th>Current Price</th>
                                            <th>Value @ Cost</th>
                                            <th>Value @ Market</th>
                                            <th>P/L</th>
                                            <th>Category</th>
                                            <th>Action</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {group.transactions.map((txn) => (
                                            <tr key={txn.id}>
                                              <td>
                                                <div className="symbol-name-cell">
                                                  <strong>{txn.stock_symbol}</strong>
                                                  <small>{txn.company_name || "-"}</small>
                                                  <small>{txn.transaction_date}</small>
                                                </div>
                                              </td>
                                              <td>{txn.total_qty.toFixed(2)}</td>
                                              <td>₹{txn.avg_cost_price.toFixed(2)}</td>
                                              <td>₹{txn.current_market_price.toFixed(2)}</td>
                                              <td>₹{txn.value_at_cost.toFixed(2)}</td>
                                              <td>₹{txn.value_at_market_price.toFixed(2)}</td>
                                              <td className={txn.profit_loss_actual >= 0 ? "pl-positive" : "pl-negative"}>
                                                ₹{txn.profit_loss_actual.toFixed(2)}
                                              </td>
                                              <td>{txn.category}</td>
                                              <td>
                                                <button onClick={() => handleDeleteStock(txn.id)}>Remove</button>
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </Card>

            <Wizard
              ownerEmail={normalizedOwnerEmail}
              onPortfolioChanged={loadStocks}
              onRiskChange={setTargetRisk}
            />
          </section>
        )}

        {activeSection === "profile" && (
          <section id="profile-section" className="app-section">
            <Card title="User Profile" subtitle="Local settings and preferences">
              <p>Name: {authUser?.name || "User"}</p>
              <p>Portfolio created: {formattedPortfolioDate}</p>
              <p>Preferred risk profile: {targetRisk}</p>
              <label className="profile-setting-row">
                <span>Arbitrage Alert Frequency</span>
                <select
                  value={arbitrageAlertFrequencySec}
                  onChange={(e) => setArbitrageAlertFrequencySec(Number(e.target.value))}
                >
                  <option value={10}>Every 10 seconds</option>
                  <option value={15}>Every 15 seconds</option>
                  <option value={20}>Every 20 seconds</option>
                  <option value={30}>Every 30 seconds</option>
                  <option value={45}>Every 45 seconds</option>
                  <option value={60}>Every 60 seconds</option>
                </select>
              </label>
              <p className="card-note">This controls how often arbitrage alerts and spread snapshots are refreshed.</p>
            </Card>
          </section>
        )}

        {activeSection === "arbitrage" && (
          <section id="arbitrage-section" className="app-section">
            <Card
              title="Live Exchange Arbitrage Dashboard"
              subtitle={`Tracks NSE vs BSE spread and flags opportunities above your threshold (refresh every ${arbitrageAlertFrequencySec}s)`}
            >
              <div className="arb-controls">
                <label>
                  Watchlist (comma separated)
                  <input
                    value={arbitrageWatchlist}
                    onChange={(e) => setArbitrageWatchlist(e.target.value.toUpperCase())}
                    placeholder="RELIANCE,TCS,INFY"
                  />
                </label>
                <label>
                  Alert Threshold (Rs)
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={arbitrageThreshold}
                    onChange={(e) => setArbitrageThreshold(Number(e.target.value))}
                  />
                </label>
                <button onClick={loadArbitrage} disabled={arbitrageLoading}>
                  {arbitrageLoading ? "Refreshing..." : "Refresh Feed"}
                </button>
              </div>
              <div className="arb-chip-row" aria-label="Monitored symbols">
                {effectiveArbitrageSymbols.map((symbol) => (
                  <span key={symbol} className="arb-chip">{symbol}</span>
                ))}
              </div>
              {(alertsMutedForToday || alertsSnoozed) && (
                <div className="arb-alert-status">
                  <span>
                    {alertsMutedForToday
                      ? "Alerts stopped for today"
                      : `Alerts snoozed until ${new Date(alertsSnoozedUntilMs).toLocaleTimeString()}`}
                  </span>
                  <button type="button" onClick={resumeAlerts}>Resume Alerts</button>
                </div>
              )}
              {arbitrageError && <p className="arb-error">{arbitrageError}</p>}
            </Card>

            <div className="arb-stats-grid">
              <Card title="Stocks Tracked"><h2>{arbitrage?.tracked_count ?? 0}</h2></Card>
              <Card title="Active Alerts"><h2>{arbitrage?.active_alert_count ?? 0}</h2></Card>
              <Card title="Max Spread"><h2>Rs{(arbitrage?.max_spread ?? 0).toFixed(2)}</h2></Card>
              <Card title="Avg Spread"><h2>Rs{(arbitrage?.avg_spread ?? 0).toFixed(2)}</h2></Card>
            </div>

            <Card title="Threshold Violators" subtitle={`Only stocks with spread above Rs${Number(arbitrageThreshold || 0).toFixed(2)}`}>
              <div className="portfolio-table-wrap">
                <table className="portfolio-table">
                  <thead>
                    <tr>
                      <th>Stock</th>
                      <th>NSE</th>
                      <th>BSE</th>
                      <th>Spread (Rs)</th>
                      <th>Spread %</th>
                      <th>Buy</th>
                      <th>Sell</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(arbitrage?.alerts ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={8}>No current threshold violators.</td>
                      </tr>
                    ) : (
                      (arbitrage?.alerts ?? []).map((row) => (
                        <tr key={row.symbol}>
                          <td>
                            <div className="symbol-name-cell">
                              <strong>{row.symbol}</strong>
                              <small>{row.company_name || "-"}</small>
                            </div>
                          </td>
                          <td>Rs{row.nse_price.toFixed(2)}</td>
                          <td>Rs{row.bse_price.toFixed(2)}</td>
                          <td className="pl-negative">Rs{row.spread_abs.toFixed(2)}</td>
                          <td>{row.spread_pct.toFixed(2)}%</td>
                          <td>{row.buy_exchange}</td>
                          <td>{row.sell_exchange}</td>
                          <td>{row.arbitrage_action}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="arb-bottom-grid">
              <Card title="Alert Stream" subtitle="Breaches where absolute NSE/BSE gap exceeds threshold">
                <p className="card-note">
                  Each line shows the spread breach and suggested execution side to capture arbitrage.
                </p>
                {(arbitrage?.alerts ?? []).length === 0 ? (
                  <p className="card-note">No active alerts above threshold.</p>
                ) : (
                  <div className="metric-stack">
                    {(arbitrage?.alerts ?? []).map((alert) => (
                      <div key={`${alert.symbol}-${alert.spread_abs}`}>
                        {alert.symbol} ({alert.company_name || "-"}): Rs{alert.spread_abs.toFixed(2)} ({alert.spread_pct.toFixed(2)}%) | {alert.arbitrage_action}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card
                title="Top Spread Trend"
                subtitle={`Top violator over last ${RUNTIME_SETTINGS.arbitrage.trendWindowPoints} refreshes`}
              >
                <p className="card-note">
                  Tracks which stock led the widest spread on each refresh, along with market-wide max/avg spread.
                </p>
                {arbitrageTrend.length === 0 ? (
                  <p className="card-note">No trend data yet.</p>
                ) : (
                  <div className="metric-stack">
                    {[...arbitrageTrend].reverse().map((point) => (
                      <div key={point.at}>
                        {new Date(point.at).toLocaleTimeString()} | {point.top_symbol || "N/A"}: max Rs{point.max_spread.toFixed(2)}, avg Rs{point.avg_spread.toFixed(2)}, alerts {point.active_alert_count}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </section>
        )}

        {globalArbAlert && (
          <div className="arb-global-alert" role="alert" aria-live="assertive">
            <div className="arb-global-header">
              <strong>Arbitrage Opportunity Alert</strong>
              <div className="arb-global-actions">
                <button type="button" onClick={() => snoozeAlerts(5)}>Snooze 5m</button>
                <button type="button" onClick={() => snoozeAlerts(10)}>Snooze 10m</button>
                <button type="button" onClick={() => snoozeAlerts(30)}>Snooze 30m</button>
                <button type="button" onClick={stopAlertsForToday}>Stop Today</button>
                <button type="button" onClick={() => setGlobalArbAlert(null)}>Dismiss</button>
              </div>
            </div>
            <div className="arb-global-body">
              <div>Threshold: Rs{Number(globalArbAlert.threshold || 0).toFixed(2)}</div>
              {globalArbAlert.items.map((item) => (
                <div key={`${item.symbol}-${item.spread_abs}`}>
                  {item.symbol} ({item.company_name || "-"}): Spread Rs{item.spread_abs.toFixed(2)} ({item.spread_pct.toFixed(2)}%) | {item.arbitrage_action}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}