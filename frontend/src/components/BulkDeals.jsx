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

export default function BulkDeals() {
    const [fromDate, setFromDate] = useState(getLastTradingDate());
    const [toDate, setToDate] = useState(getLastTradingDate());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [data, setData] = useState([]);
    const [warnings, setWarnings] = useState([]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setData([]);
        setWarnings([]);
        try {
            const res = await fetchBulkDeals(formatForApi(fromDate), formatForApi(toDate));
            setData(res.data.data || []);
            setWarnings(res.data.errors || []);
        } catch (err) {
            setError(err?.response?.data?.error || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 border rounded bg-white max-w-3xl mx-auto mt-8 shadow-sm">
            <h2 className="text-xl font-bold mb-4">Bulk & Block Deals Extractor</h2>
            <form onSubmit={handleSubmit} className="flex gap-4 mb-4 flex-wrap items-end">
                <div>
                    <label className="block text-sm font-medium mb-1">From Date</label>
                    <DatePicker
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">To Date</label>
                    <DatePicker
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        required
                    />
                </div>
                <Button type="submit" isLoading={loading} disabled={loading}>
                    {loading ? "Loading..." : "Fetch Deals"}
                </Button>
            </form>
            
            {error && <div className="text-red-600 mb-2">{error}</div>}
            
            {warnings.length > 0 && (
                <div className="text-yellow-700 mb-4 p-3 bg-yellow-50 rounded border border-yellow-200">
                    <b>Warnings:</b>
                    <ul className="list-disc ml-6 mt-1">
                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </div>
            )}
            
            {data.length > 0 && (
                <div className="overflow-x-auto max-h-96 border rounded shadow-inner">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                {Object.keys(data[0]).map((k) => (
                                    <th key={k} className="px-3 py-2 border-b font-semibold text-gray-700 whitespace-nowrap">{k}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {data.map((row, i) => (
                                <tr key={i} className="hover:bg-gray-50 bg-white">
                                    {Object.values(row).map((v, j) => (
                                        <td key={j} className="px-3 py-2 whitespace-nowrap">{String(v)}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
