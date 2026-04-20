import { useMemo, useState } from "react";
import { addStock, buildPortfolio, fetchStockPrice } from "../services/api";

export default function Wizard({ ownerEmail, onPortfolioChanged, onRiskChange }) {
    const [amount, setAmount] = useState("");
    const [risk, setRisk] = useState("medium");
    const [locale, setLocale] = useState("india");
    const [result, setResult] = useState(null);
    const [isBuilding, setIsBuilding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [buildError, setBuildError] = useState("");
    const [submitSummary, setSubmitSummary] = useState("");
    const [draftRows, setDraftRows] = useState([]);

    const normalizedSuggestions = (suggestions) => {
        const seen = new Set();
        const next = [];
        for (const raw of suggestions || []) {
            const symbol = String(raw || "").trim().toUpperCase();
            if (!symbol || seen.has(symbol)) {
                continue;
            }
            seen.add(symbol);
            next.push(symbol);
        }
        return next;
    };

    const buildDraftRows = async (payload) => {
        const rows = [];

        for (const bucket of payload?.buckets || []) {
            const symbols = normalizedSuggestions(bucket.suggestions);
            if (symbols.length === 0) {
                continue;
            }

            const perSymbolBudget = Number(bucket.amount) / symbols.length;
            for (const symbol of symbols) {
                try {
                    const priceRes = await fetchStockPrice(symbol, locale);
                    const livePrice = Number(priceRes?.data?.price);
                    if (!Number.isFinite(livePrice) || livePrice <= 0) {
                        continue;
                    }

                    const qty = Math.floor(perSymbolBudget / livePrice);
                    if (!Number.isFinite(qty) || qty <= 0) {
                        continue;
                    }

                    rows.push({
                        id: `${bucket.bucket}-${symbol}`,
                        bucket: bucket.bucket,
                        symbol,
                        market: locale,
                        unitPrice: livePrice,
                        qty,
                    });
                } catch {
                    // Skip rows where live price is unavailable.
                    continue;
                }
            }
        }

        return rows;
    };

    const draftInvestedAmount = useMemo(
        () => draftRows.reduce((sum, row) => sum + row.qty * row.unitPrice, 0),
        [draftRows]
    );

    const targetAmount = Number(result?.amount || 0);

    const updateQty = (id, nextQty) => {
        setDraftRows((current) =>
            current.map((row) => {
                if (row.id !== id) {
                    return row;
                }
                const qty = Math.max(1, Math.floor(Number(nextQty) || 1));
                return { ...row, qty };
            })
        );
    };

    const removeDraftRow = (id) => {
        setDraftRows((current) => current.filter((row) => row.id !== id));
    };

    const build = async () => {
        if (!amount || Number(amount) <= 0 || isBuilding) {
            return;
        }

        const requestId = `build-${Date.now()}`;
        const startedAt = performance.now();
        console.info("[Wizard.build] start", {
            requestId,
            amount: Number(amount),
            risk,
            locale,
        });

        setBuildError("");
        setSubmitSummary("");
        setIsBuilding(true);
        try {
            const res = await buildPortfolio(amount, risk, locale);
            const elapsedMs = Math.round(performance.now() - startedAt);
            const bucketCount = Array.isArray(res?.data?.buckets) ? res.data.buckets.length : 0;
            const suggestionCount = (res?.data?.buckets || []).reduce(
                (acc, item) => acc + (Array.isArray(item?.suggestions) ? item.suggestions.length : 0),
                0
            );
            console.info("[Wizard.build] success", {
                requestId,
                elapsedMs,
                bucketCount,
                suggestionCount,
            });

            const payload = res.data;
            const draft = await buildDraftRows(payload);

            setResult(payload);
            setDraftRows(draft);
            onRiskChange?.(risk);

            if (draft.length === 0) {
                setBuildError("Generated suggestions had no tradable live prices. Try a different locale or risk profile.");
            }
        } catch (error) {
            const elapsedMs = Math.round(performance.now() - startedAt);
            console.error("[Wizard.build] error", {
                requestId,
                elapsedMs,
                message: error?.message || "unknown error",
                status: error?.response?.status,
                detail: error?.response?.data,
            });
            setBuildError("Could not generate portfolio right now. Please try again.");
            setDraftRows([]);
        } finally {
            setIsBuilding(false);
        }
    };

    const submitDraft = async () => {
        if (!ownerEmail || draftRows.length === 0 || isSubmitting) {
            return;
        }

        setSubmitSummary("");
        setIsSubmitting(true);
        let added = 0;
        let failed = 0;
        const today = new Date().toISOString().slice(0, 10);

        try {
            for (const row of draftRows) {
                try {
                    await addStock({
                        owner_email: ownerEmail,
                        stock_symbol: row.symbol,
                        total_qty: row.qty,
                        average_cost_price: row.unitPrice,
                        current_market_price: row.unitPrice,
                        market: row.market,
                        category: row.bucket,
                        transaction_date: today,
                    });
                    added += 1;
                } catch {
                    failed += 1;
                }
            }

            setSubmitSummary(`Submitted ${added}/${draftRows.length} instruments${failed > 0 ? ` (${failed} failed)` : ""}.`);
            onPortfolioChanged?.();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="wizard-section">
            <h3>Build Portfolio</h3>

            <div className="wizard-controls">
                <input
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />

                <select value={risk} onChange={(e) => setRisk(e.target.value)}>
                    <option value="low">low</option>
                    <option value="medium">medium</option>
                    <option value="high">high</option>
                </select>

                <select value={locale} onChange={(e) => setLocale(e.target.value)}>
                    <option value="india">india</option>
                    <option value="us">us</option>
                    <option value="global">global</option>
                </select>

                <button onClick={build} disabled={isBuilding || !amount || Number(amount) <= 0} aria-busy={isBuilding}>
                    {isBuilding ? (
                        <span className="button-progress-wrap">
                            <span className="button-spinner" aria-hidden="true" />
                            Generating
                        </span>
                    ) : (
                        "Generate"
                    )}
                </button>
            </div>

            {buildError && <p className="arb-error">{buildError}</p>}

            {result && (
                <div className="wizard-results">
                    <div className="wizard-summary">
                        Suggested {result.risk} risk allocation for Rs{Number(result.amount).toFixed(0)} in the {result.locale} market
                    </div>

                    <div className="card-note wizard-methodology">
                        <strong>Generation Logic:</strong> This portfolio is split using a risk-adjusted model targeting 
                        specific buckets: <em>Core</em> (stability), <em>Growth</em> (appreciation), 
                        <em>Global</em> (diversification), <em>Hedge</em> (protection), and <em>Cash</em> (liquidity). 
                        If certain buckets are missing (e.g. only Core and Cash appear), it indicates that either the 
                        investment amount was too small for meaningful diversification in that category, 
                        or no high-liquidity instruments were found for that bucket in the selected market.
                    </div>

                    <div className="card-note" style={{ marginBottom: "10px" }}>
                        Review quantities before submit. Total invested: Rs{draftInvestedAmount.toFixed(2)} / Target Rs{targetAmount.toFixed(2)}
                    </div>

                    {draftRows.length === 0 ? (
                        <p className="card-note">No draft rows available to submit.</p>
                    ) : (
                        <div className="portfolio-table-wrap">
                            <table className="portfolio-table">
                                <thead>
                                    <tr>
                                        <th>Bucket</th>
                                        <th>Symbol</th>
                                        <th>Unit Price</th>
                                        <th>Total Qty</th>
                                        <th>Line Amount</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {draftRows.map((row) => (
                                        <tr key={row.id}>
                                            <td>{row.bucket}</td>
                                            <td>{row.symbol}</td>
                                            <td>Rs{row.unitPrice.toFixed(2)}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={row.qty}
                                                    onChange={(e) => updateQty(row.id, e.target.value)}
                                                />
                                            </td>
                                            <td>Rs{(row.qty * row.unitPrice).toFixed(2)}</td>
                                            <td>
                                                <button type="button" onClick={() => removeDraftRow(row.id)}>Remove</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="wizard-bulk-actions" style={{ marginTop: "12px" }}>
                        <button onClick={submitDraft} disabled={isSubmitting || draftRows.length === 0}>
                            {isSubmitting ? "Submitting..." : "Submit to Portfolio"}
                        </button>
                    </div>
                    {submitSummary && <p className="card-note">{submitSummary}</p>}
                </div>
            )}
        </div>
    );
}
