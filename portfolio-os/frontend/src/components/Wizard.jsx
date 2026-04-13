import { useState } from "react";
import { addStock, buildPortfolio, fetchStockPrice } from "../services/api";

export default function Wizard({ ownerEmail, onPortfolioChanged, onRiskChange }) {
    const [amount, setAmount] = useState("");
    const [risk, setRisk] = useState("medium");
    const [locale, setLocale] = useState("india");
    const [result, setResult] = useState(null);
    const [isBuilding, setIsBuilding] = useState(false);
    const [buildError, setBuildError] = useState("");
    const [isAddingAll, setIsAddingAll] = useState(false);
    const [addingBucket, setAddingBucket] = useState("");
    const [addSummary, setAddSummary] = useState("");

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

    const addSingleAllocation = async (bucket, symbol, allocationAmount) => {
        if (!ownerEmail) {
            throw new Error("Sign in required");
        }

        const priceRes = await fetchStockPrice(symbol, locale);
        const livePrice = Number(priceRes?.data?.price);
        if (!Number.isFinite(livePrice) || livePrice <= 0) {
            throw new Error(`No live price for ${symbol}`);
        }

        const qty = allocationAmount / livePrice;
        if (!Number.isFinite(qty) || qty <= 0) {
            throw new Error(`Invalid quantity for ${symbol}`);
        }

        const today = new Date().toISOString().slice(0, 10);
        await addStock({
            owner_email: ownerEmail,
            stock_symbol: symbol,
            total_qty: Number(qty.toFixed(6)),
            average_cost_price: livePrice,
            current_market_price: livePrice,
            market: locale,
            category: bucket,
            transaction_date: today,
        });
    };

    const addBucketAllocations = async (bucket, bucketAmount, suggestions) => {
        const symbols = normalizedSuggestions(suggestions);
        if (symbols.length === 0) {
            return { attempted: 0, added: 0, failed: 0 };
        }

        const perSymbolAllocation = Number(bucketAmount) / symbols.length;
        let added = 0;
        let failed = 0;

        for (const symbol of symbols) {
            try {
                await addSingleAllocation(bucket, symbol, perSymbolAllocation);
                added += 1;
            } catch {
                failed += 1;
            }
        }

        return { attempted: symbols.length, added, failed };
    };

    const build = async () => {
        if (!amount || Number(amount) <= 0 || isBuilding) {
            return;
        }

        setBuildError("");
        setIsBuilding(true);
        try {
            const res = await buildPortfolio(amount, risk, locale);
            setResult(res.data);
            onRiskChange?.(risk);
        } catch {
            setBuildError("Could not generate portfolio right now. Please try again.");
        } finally {
            setIsBuilding(false);
        }
    };

    const addSuggestionToPortfolio = async (bucket, suggestion, bucketAmount, suggestionCount) => {
        if (!ownerEmail) {
            return;
        }

        setAddSummary("");
        try {
            const allocationAmount = Number(bucketAmount) / Math.max(1, Number(suggestionCount) || 1);
            await addSingleAllocation(bucket, suggestion, allocationAmount);
            setAddSummary(`Added ${suggestion} with allocated amount Rs${allocationAmount.toFixed(2)}.`);
            onRiskChange?.(risk);
            onPortfolioChanged?.();
        } catch {
            setAddSummary(`Could not add ${suggestion}. Live quote may be unavailable.`);
        }
    };

    const addFullPortfolio = async () => {
        if (!ownerEmail || !result || isAddingAll) {
            return;
        }

        setAddSummary("");
        setIsAddingAll(true);
        let attempted = 0;
        let added = 0;
        let failed = 0;

        try {
            for (const bucket of result.buckets || []) {
                const counts = await addBucketAllocations(bucket.bucket, bucket.amount, bucket.suggestions);
                attempted += counts.attempted;
                added += counts.added;
                failed += counts.failed;
            }
            setAddSummary(`Added ${added}/${attempted} instruments to portfolio${failed > 0 ? ` (${failed} failed)` : ""}.`);
            onRiskChange?.(risk);
            onPortfolioChanged?.();
        } finally {
            setIsAddingAll(false);
        }
    };

    const addBucket = async (item) => {
        if (!ownerEmail || addingBucket) {
            return;
        }

        setAddSummary("");
        setAddingBucket(item.bucket);
        try {
            const counts = await addBucketAllocations(item.bucket, item.amount, item.suggestions);
            setAddSummary(`Bucket ${item.bucket}: added ${counts.added}/${counts.attempted}${counts.failed > 0 ? ` (${counts.failed} failed)` : ""}.`);
            onRiskChange?.(risk);
            onPortfolioChanged?.();
        } finally {
            setAddingBucket("");
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
                        Suggested {result.risk} risk allocation for ₹{Number(result.amount).toFixed(0)} in the {result.locale} market
                    </div>
                    <div className="wizard-bulk-actions">
                        <button onClick={addFullPortfolio} disabled={isAddingAll || !!addingBucket}>
                            {isAddingAll ? "Adding Full Portfolio..." : "Add Full Portfolio"}
                        </button>
                    </div>
                    {addSummary && <p className="card-note">{addSummary}</p>}

                    {result.buckets.map((item) => (
                        <div key={item.bucket} className="wizard-bucket-card">
                            <div className="wizard-bucket-header">
                                <strong>{item.bucket}</strong>: ₹{item.amount.toFixed(0)}
                                <button
                                    onClick={() => addBucket(item)}
                                    disabled={isAddingAll || !!addingBucket || item.suggestions.length === 0}
                                >
                                    {addingBucket === item.bucket ? "Adding Bucket..." : "Add Bucket"}
                                </button>
                            </div>
                            <div className="wizard-bucket-suggestions">
                                Suggested instruments:
                                <div className="wizard-suggestion-actions">
                                    {item.suggestions.length > 0 ? (
                                        item.suggestions.map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                onClick={() => addSuggestionToPortfolio(item.bucket, suggestion, item.amount, item.suggestions.length)}
                                                disabled={isAddingAll || !!addingBucket}
                                            >
                                                Add {suggestion}
                                            </button>
                                        ))
                                    ) : (
                                        <span className="wizard-empty-suggestions">No live symbols found for this bucket right now.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}