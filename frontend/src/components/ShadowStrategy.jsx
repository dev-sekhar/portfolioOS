import { useState, useEffect } from "react";
import { autoFetchShadowStrategy, optimizeShadowWeights } from "../services/api";
import Button from "./ui/Button";
import Input from "./ui/Input";
import InfoBox from "./ui/InfoBox";
import Table from "./ui/Table";

const headerMapping = {
    strategy: "Strategy",
    stock: "Stock",
    investors: "Investors",
    investors_list: "Investors",
    sellers_list: "Sellers",
    yf_symbol: "YF Symbol",
    review_date: "Review Date",
    review_action: "Action",
    total_signal: "Total Signal (%)"
};

const getHeaderLabel = (fieldName) => {
    return headerMapping[fieldName] || fieldName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default function ShadowStrategy({ onCopyStock, moderateLimit, highRiskLimit, signalThreshold = 20, investorWatchlist = "", onAddInvestorToWatchlist }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [data, setData] = useState(null);
    const [fetchedAt, setFetchedAt] = useState(null);
    const [filterText, setFilterText] = useState("");
    const [optimizedWeights, setOptimizedWeights] = useState(null);
    const [optimizingWeights, setOptimizingWeights] = useState(false);
    const [optimizeError, setOptimizeError] = useState("");

    const handleAutoFetch = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await autoFetchShadowStrategy(moderateLimit, highRiskLimit);
            setData(res.data);
            setFetchedAt(new Date().toLocaleString());
        } catch (err) {
            setError(err?.response?.data?.detail || "Auto-fetch failed. Please try manual upload.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        handleAutoFetch();
    }, []);

    const activeWatchlist = (investorWatchlist || "").split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

    const applyWatchlistFilter = (item) => {
        if (!activeWatchlist.length) return true;
        const inv = (item.investors_list || "").toLowerCase();
        const sel = (item.sellers_list || "").toLowerCase();
        return activeWatchlist.some(w => inv.includes(w) || sel.includes(w));
    };

    const handleOptimizeWeights = async () => {
        setOptimizingWeights(true);
        setOptimizeError("");
        try {
            // Combine moderate and high risk items and filter by watchlist
            const allItems = [
                ...(data.moderate || []),
                ...(data.high_risk || [])
            ].filter(applyWatchlistFilter);
            const res = await optimizeShadowWeights(allItems, signalThreshold);
            setOptimizedWeights(res.data);
        } catch (err) {
            setOptimizeError(err?.response?.data?.detail || "Failed to optimize weights.");
        } finally {
            setOptimizingWeights(false);
        }
    };

    const renderTable = (title, items, columns = null, rowFilter = null) => {
        if (!items || items.length === 0) return null;
        
        const baseItems = rowFilter ? items.filter(rowFilter) : items;
        const filteredItems = baseItems.filter(item => {
            if (!filterText) return true;
            const term = filterText.toLowerCase();
            return Object.values(item).some(val => 
                String(val).toLowerCase().includes(term)
            );
        });

        if (filteredItems.length === 0) {
            return <p style={{ color: "var(--text-tertiary)", marginTop: '16px' }}>No matches found in {title}.</p>;
        }

        const visibleColumns = columns || Object.keys(items[0]);
        return (
            <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>{title} ({filteredItems.length})</h3>
                <Table 
                    data={filteredItems}
                    columns={[
                        ...(onCopyStock ? [{ key: "actions", label: "Actions" }] : []),
                        ...visibleColumns.map(c => ({ key: c, label: getHeaderLabel(c) }))
                    ]}
                    renderRow={(row, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            {onCopyStock && (
                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                    <Button 
                                        variant="outline" 
                                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                        onClick={() => {
                                            const symbolToCopy = row.yf_symbol || row.stock;
                                            if (symbolToCopy) {
                                                onCopyStock(symbolToCopy);
                                            }
                                        }}
                                    >
                                        Copy
                                    </Button>
                                </td>
                            )}
                            {visibleColumns.map((c) => {
                                if ((c === 'investors_list' || c === 'sellers_list') && onAddInvestorToWatchlist) {
                                    const listStr = String(row[c] || '');
                                    const names = listStr.split(',').map(s => s.trim()).filter(Boolean);
                                    return (
                                        <td key={c} style={{ padding: '8px', whiteSpace: 'normal', wordBreak: 'break-word', color: 'var(--text-primary)', fontSize: '0.875rem' }}>
                                            {names.length === 0 ? '-' : names.map((name, idx) => (
                                                <span key={idx}>
                                                    <span 
                                                        style={{ cursor: 'pointer', color: 'var(--text-primary)', textDecoration: 'underline', textDecorationStyle: 'dotted' }} 
                                                        onClick={() => onAddInvestorToWatchlist(name)}
                                                    >
                                                        {name}
                                                    </span>
                                                    {idx < names.length - 1 ? ', ' : ''}
                                                </span>
                                            ))}
                                        </td>
                                    );
                                }
                                return (
                                    <td key={c} style={{ 
                                        padding: '8px', 
                                        color: 'var(--text-primary)', 
                                        whiteSpace: (c === 'sellers_list' || c === 'investors_list') ? 'normal' : 'nowrap',
                                        wordBreak: (c === 'sellers_list' || c === 'investors_list') ? 'break-word' : 'normal',
                                        fontSize: '0.875rem'
                                    }}>
                                        {typeof row[c] === 'number' ? row[c].toFixed(2) : String(row[c] || '-')}
                                    </td>
                                );
                            })}
                        </tr>
                    )}
                />
            </div>
        );
    };

    return (
        <div style={{ padding: '22px', border: '1px solid var(--border-subtle)', borderRadius: '12px', background: 'var(--glass-bg)', boxShadow: 'var(--shadow-card)', maxWidth: '100%' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '22px', color: 'var(--text-primary)' }}>Shadow Portfolio Strategy</h2>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Button onClick={handleAutoFetch} disabled={loading} variant="outline">
                    {loading ? "Fetching..." : "Fetch Data"}
                </Button>
            </div>

            {fetchedAt && <p style={{ color: 'var(--text-tertiary)', fontSize: '0.825rem', marginBottom: '16px' }}>Data fetched: {fetchedAt}</p>}

            {error && <div style={{ color: '#f87171', marginBottom: '16px' }}>{error}</div>}

            {data && (
                <div>
                    <InfoBox title="Strategy Overview" variant="highlight" style={{ marginBottom: '24px' }}>
                        <div style={{ display: 'grid', gap: '12px' }}>
                            <div>
                                <p style={{ marginTop: 0, marginBottom: '4px' }}>Moderate Cash Allocation: <strong style={{ color: 'var(--text-primary)' }}>{data.cash_moderate}%</strong></p>
                                <small style={{ color: 'var(--text-tertiary)' }}>Recommended cash reserve for moderate-risk strategy, balancing growth with stability</small>
                            </div>
                            <div>
                                <p style={{ marginTop: 0, marginBottom: '4px' }}>High Risk Cash Allocation: <strong style={{ color: 'var(--text-primary)' }}>{data.cash_high}%</strong></p>
                                <small style={{ color: 'var(--text-tertiary)' }}>More aggressive cash allocation for high-risk strategy, allowing greater market exposure</small>
                            </div>
                        </div>
                    </InfoBox>

                    <div style={{ marginBottom: '16px' }}>
                        <Input 
                            type="text" 
                            placeholder="Filter stocks by symbol, investor, etc..." 
                            value={filterText} 
                            onChange={(e) => setFilterText(e.target.value)} 
                            style={{ width: '100%', maxWidth: '400px', color: 'var(--text-primary)', background: 'var(--bg-surface-elevated)' }}
                        />
                    </div>

                    <InfoBox title="How Shadow Portfolio Works" variant="default" style={{ marginBottom: '20px' }}>
                        We look at what top investors in India are buying. If multiple big investors are buying a stock, it shows they believe in it. We take these top picks, remove any stocks they are currently selling, and create a balanced portfolio for you.
                    </InfoBox>

                    {renderTable(
                        "Tracked Investors & Stocks",
                        [
                            ...data.moderate.map((row) => ({ ...row, strategy: "Moderate" })),
                            ...data.high_risk.map((row) => ({ ...row, strategy: "High Risk" }))
                        ]
                        .map(row => {
                            // Compute a better signal if total_signal is missing
                            const invCount = (row.investors_list || "").split(',').filter(Boolean).length;
                            const selCount = (row.sellers_list || "").split(',').filter(Boolean).length;
                            const computed = row.total_signal || (invCount * 15 - selCount * 10);
                            return { ...row, total_signal: computed };
                        })
                        .filter(applyWatchlistFilter)
                        .sort((a, b) => (Number(b.total_signal) || 0) - (Number(a.total_signal) || 0)),
                        [
                            "strategy",
                            "stock",
                            "total_signal",
                            "investors_list",
                            "sellers_list"
                        ],
                        (row) => row.strategy === "High Risk" || Number(row.investors) > 2
                    )}
                    <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-surface-hover)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Optimize Portfolio Weights</strong>
                            <Button 
                                onClick={handleOptimizeWeights} 
                                disabled={optimizingWeights || !data}
                                variant="outline"
                                style={{ padding: '6px 12px', fontSize: '0.875rem' }}
                            >
                                {optimizingWeights ? "Optimizing..." : "Generate Weights"}
                            </Button>
                        </div>
                        <p style={{ margin: '0 0 12px 0', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                            Filters stocks with Total Signal % ≥ {signalThreshold}
                        </p>
                        {optimizeError && <p style={{ color: '#f87171', fontSize: '0.875rem', margin: '8px 0' }}>{optimizeError}</p>}
                    </div>

                    {optimizedWeights && (
                        <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '8px' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Optimized Portfolio ({optimizedWeights.stock_count} stocks)</strong>
                            <p style={{ margin: '4px 0 12px 0', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                                Allocated weight: {optimizedWeights.total_weight}% | Cash: {optimizedWeights.cash_allocation}%
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                                {optimizedWeights.portfolio_weights.map((item, idx) => (
                                    <div key={idx} style={{ padding: '12px', background: 'var(--bg-surface-elevated)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <strong style={{ color: '#10b981', fontSize: '0.95rem' }}>{item.stock}</strong>
                                            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1rem' }}>{item.optimized_weight_pct}%</span>
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'grid', gap: '3px' }}>
                                            <div>Investors: {item.investors}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Review cadence</strong>
                        <p style={{ margin: '8px 0 0', color: 'var(--text-tertiary)' }}>
                            Lowest regular review frequency is every 12 months (Annual rebalance).
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
