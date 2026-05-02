import { useState, useEffect } from "react";
import { fetchBulkDeals } from "../services/bulkDeals";
import Button from "./ui/Button";
import DatePicker from "./ui/DatePicker";
import Input from "./ui/Input";

const getLastTradingDate = () => {
    const today = new Date();
    // Simple check: if Sunday (0), go to Friday (-2); if Saturday (6), go to Friday (-1)
    if (today.getDay() === 0) today.setDate(today.getDate() - 2);
    else if (today.getDay() === 6) today.setDate(today.getDate() - 1);
    return today.toISOString().split("T")[0];
};

const formatForApi = (dateStr) => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-");
    if (!y || !m || !d) return dateStr;
    return `${d}-${m}-${y}`;
};

const bulkDealsHeaderMapping = {
    deal_id: "Deal ID",
    symbol: "Stock",
    company_name: "Company",
    bulk_block_flag: "Type",
    client_code: "Client Code",
    client_name: "Client",
    deal_date: "Date",
    quantity: "Quantity",
    price_per_unit: "Price",
    total_value: "Value (Cr)",
    percentage_shareholding: "% Holding",
    deal_status: "Status"
};

const getHeaderLabel = (fieldName) => {
    return bulkDealsHeaderMapping[fieldName] || fieldName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export default function BulkDeals() {
    const [fromDate, setFromDate] = useState(getLastTradingDate());
    const [toDate, setToDate] = useState(getLastTradingDate());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [data, setData] = useState([]);
    const [warnings, setWarnings] = useState([]);
    const [fetched, setFetched] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await fetchData();
    };

    const fetchData = async () => {
        setLoading(true);
        setError("");
        setData([]);
        setWarnings([]);
        try {
            const res = await fetchBulkDeals(formatForApi(fromDate), formatForApi(toDate));
            setData(res.data.data || []);
            setWarnings(res.data.errors || []);
            setFetched(true);
        } catch (err) {
            setError(err?.response?.data?.error || err.message);
            setFetched(true);
        } finally {
            setLoading(false);
        }
    };

    // Auto-fetch on mount for last trading date
    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div style={{ padding: '22px', border: '1px solid var(--border-subtle)', borderRadius: '12px', background: 'var(--glass-bg)', boxShadow: 'var(--shadow-card)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '22px', color: 'var(--text-primary)' }}>Bulk & Block Deals Extractor</h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '6px', color: 'var(--text-primary)' }}>From Date</label>
                    <DatePicker
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '6px', color: 'var(--text-primary)' }}>To Date</label>
                    <DatePicker
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        required
                    />
                </div>
                <Button type="submit" disabled={loading}>
                    {loading ? "Loading..." : "Fetch Deals"}
                </Button>
            </form>
            
            {error && <div style={{ color: '#f87171', marginBottom: '16px' }}>{error}</div>}
            
            {warnings.length > 0 && (
                <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                    <b style={{ color: 'var(--text-primary)' }}>Warnings:</b>
                    <ul style={{ listStyle: 'disc', marginLeft: '20px', marginTop: '8px' }}>
                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            )}
            
            {data.length > 0 && (
                <div style={{ overflowX: 'auto', maxHeight: '500px', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                    <table className="portfolio-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'rgba(255, 255, 255, 0.05)', position: 'sticky', top: 0, zIndex: 10 }}>
                            <tr>
                                {Object.keys(data[0]).map((k) => (
                                    <th key={k} style={{ padding: '10px 8px', color: '#ffffff', textAlign: 'left', whiteSpace: 'nowrap', fontSize: '0.875rem', fontWeight: '600' }}>{getHeaderLabel(k)}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, i) => (
                                <tr key={i}>
                                    {Object.values(row).map((v, j) => (
                                        <td key={j} style={{ padding: '10px 8px', color: '#ffffff', whiteSpace: 'nowrap', fontSize: '0.875rem' }}>{String(v)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {fetched && data.length === 0 && !error && <p style={{ color: 'var(--text-secondary)', marginTop: '16px' }}>No deals found for the selected date range.</p>}
        </div>
    );
}
