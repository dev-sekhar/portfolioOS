import { useState, useEffect } from "react";
import { autoFetchShadowStrategy } from "../services/api";
import Button from "./ui/Button";

const headerMapping = {
    stock: "Stock",
    investors: "Investors",
    total_signal_pct: "Total Signal %",
    est_signal_value_cr: "Est. Signal Value (Cr)",
    investors_list: "Investors",
    sellers_list: "Sellers",
    appears_in_sell_list: "In Sell List",
    score: "Score",
    raw_weight_pct: "Raw Weight %",
    yf_symbol: "YF Symbol",
    target_weight: "Target Weight",
    review_date: "Review Date",
    review_action: "Action"
};

const getHeaderLabel = (fieldName) => {
    return headerMapping[fieldName] || fieldName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default function ShadowStrategy() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [data, setData] = useState(null);
    const [fetchedAt, setFetchedAt] = useState(null);

    const handleAutoFetch = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await autoFetchShadowStrategy();
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

    const renderTable = (title, items) => {
        if (!items || items.length === 0) return null;
        const columns = Object.keys(items[0]);
        return (
            <div style={{ marginTop: '24px', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>{title}</h3>
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }} className="portfolio-table">
                        <thead style={{ background: 'rgba(255, 255, 255, 0.05)', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                {columns.map((c) => <th key={c} style={{ padding: '8px', color: '#ffffff' }}>{getHeaderLabel(c)}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((row, i) => (
                                <tr key={i}>
                                    {columns.map((c) => (
                                        <td key={c} style={{ padding: '8px', color: '#ffffff' }}>
                                            {typeof row[c] === 'number' ? row[c].toFixed(2) : String(row[c] || '-')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: '22px', border: '1px solid var(--border-subtle)', borderRadius: '12px', background: 'var(--glass-bg)', boxShadow: 'var(--shadow-card)', maxWidth: '100%' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '22px', color: 'var(--text-primary)' }}>Shadow Portfolio Strategy</h2>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Button onClick={handleAutoFetch} disabled={loading} variant="outline">
                    {loading ? "Fetching..." : "Auto-Fetch from Server"}
                </Button>
                <Button onClick={handleUpload} disabled={!data || loading}>
                    {loading ? "Generating..." : "Generate Strategy"}
                </Button>
            </div>

            {fetchedAt && <p style={{ color: 'var(--text-tertiary)', fontSize: '0.825rem', marginBottom: '16px' }}>Data fetched: {fetchedAt}</p>}

            {error && <div style={{ color: '#f87171', marginBottom: '16px' }}>{error}</div>}

            {data && (
                <div>
                    <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(20, 184, 166, 0.1)', border: '1px solid rgba(20, 184, 166, 0.3)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>Strategy Overview</strong>
                        <div style={{ marginTop: '12px', display: 'grid', gap: '12px' }}>
                            <div>
                                <p style={{ marginTop: 0, marginBottom: '4px' }}>Moderate Cash Allocation: <strong style={{ color: 'var(--text-primary)' }}>{data.cash_moderate}%</strong></p>
                                <small style={{ color: 'var(--text-tertiary)' }}>Recommended cash reserve for moderate-risk strategy, balancing growth with stability</small>
                            </div>
                            <div>
                                <p style={{ marginTop: 0, marginBottom: '4px' }}>High Risk Cash Allocation: <strong style={{ color: 'var(--text-primary)' }}>{data.cash_high}%</strong></p>
                                <small style={{ color: 'var(--text-tertiary)' }}>More aggressive cash allocation for high-risk strategy, allowing greater market exposure</small>
                            </div>
                        </div>
                    </div>

                    {renderTable("Moderate Strategy", data.moderate)}
                    {renderTable("High Risk Strategy", data.high_risk)}
                    {renderTable("Review Schedule", data.review_schedule)}
                </div>
            )}
        </div>
    );
}
