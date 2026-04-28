import { useState, useEffect } from "react";
import { generateShadowStrategy, autoFetchShadowStrategy } from "../services/api";
import Button from "./ui/Button";

export default function ShadowStrategy() {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [data, setData] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError("");
        try {
            const res = await generateShadowStrategy(file);
            setData(res.data);
        } catch (err) {
            setError(err?.response?.data?.detail || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAutoFetch = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await autoFetchShadowStrategy();
            setData(res.data);
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
            <div className="mb-8">
                <h3 className="text-lg font-semibold mb-2" style={{ marginTop: '20px', marginBottom: '10px' }}>{title}</h3>
                <div className="overflow-x-auto border rounded shadow-inner max-h-96" style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #ddd', borderRadius: '4px' }}>
                    <table className="min-w-full text-sm text-left" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                        <thead className="bg-gray-100 sticky top-0" style={{ background: '#f7fafc', position: 'sticky', top: 0 }}>
                            <tr>
                                {columns.map((c) => <th key={c} style={{ padding: '8px', borderBottom: '2px solid #e2e8f0', fontWeight: '600' }}>{c}</th>)}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {items.map((row, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    {columns.map((c) => (
                                        <td key={c} style={{ padding: '8px' }}>
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
        <div style={{ padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', maxWidth: '100%', margin: '20px auto' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>Shadow Portfolio Strategy</h2>
            <p style={{ marginBottom: '16px', color: '#4a5568' }}>Upload your Trendlyne Superstar Portfolios CSV to generate a moderate and high-risk shadow strategy based on trusted investor transactions.</p>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                    <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '4px' }}>Trendlyne CSV</label>
                    <input 
                        type="file" 
                        accept=".csv"
                        onChange={handleFileChange} 
                        style={{ display: 'block' }}
                    />
                </div>
                <Button onClick={handleUpload} disabled={!file || loading}>
                    {loading ? "Processing..." : "Generate Strategy"}
                </Button>
                <div style={{ paddingLeft: '24px', borderLeft: '1px solid #e2e8f0' }}>
                    <Button onClick={handleAutoFetch} disabled={loading} variant="outline">
                        {loading ? "Fetching..." : "Auto-Fetch from Server"}
                    </Button>
                </div>
            </div>

            {error && <div style={{ color: '#e53e3e', marginBottom: '16px' }}>{error}</div>}

            {data && (
                <div>
                    <div style={{ marginBottom: '16px', padding: '16px', background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '4px', color: '#2b6cb0' }}>
                        <strong>Strategy Overview</strong>
                        <p>Moderate Cash Allocation: {data.cash_moderate}%</p>
                        <p>High Risk Cash Allocation: {data.cash_high}%</p>
                    </div>

                    {renderTable("Moderate Strategy", data.moderate)}
                    {renderTable("High Risk Strategy", data.high_risk)}
                    {renderTable("Review Schedule", data.review_schedule)}
                </div>
            )}
        </div>
    );
}
