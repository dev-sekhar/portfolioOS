import { useState, useEffect } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { fetchEodPerformance } from "../services/api";
import Card from "./Card";
import Input from "./ui/Input";
import Button from "./ui/Button";

export default function EodChart({ ownerEmail }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Default to last 7 days
    const getDefaultStartDate = () => {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return d.toISOString().split("T")[0];
    };
    
    const [startDate, setStartDate] = useState(getDefaultStartDate());
    const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

    const loadData = async () => {
        if (!ownerEmail) return;
        setLoading(true);
        try {
            const res = await fetchEodPerformance(ownerEmail, startDate, endDate);
            setData(res.data || []);
        } catch (error) {
            console.error("Failed to load EOD performance", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [ownerEmail]);

    return (
        <Card title="EOD Portfolio Performance" subtitle="Daily end-of-day portfolio valuation">
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px", alignItems: "flex-end" }}>
                <label>
                    <span style={{ fontSize: "12px", display: "block" }}>Start Date</span>
                    <Input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                    />
                </label>
                <label>
                    <span style={{ fontSize: "12px", display: "block" }}>End Date</span>
                    <Input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                    />
                </label>
                <Button onClick={loadData} disabled={loading}>
                    {loading ? "Loading..." : "Refresh Chart"}
                </Button>
            </div>
            
            <div style={{ width: "100%", height: 300, minHeight: "300px", minWidth: "0" }}>
                {data.length === 0 ? (
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "var(--text-tertiary)" }}>
                        {loading ? "Loading chart data..." : "No data available for the selected period"}
                    </div>
                ) : (
                    <ResponsiveContainer width="99.9%" height={300}>
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3182CE" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#3182CE" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12, fill: "var(--text-secondary)" }} 
                                tickFormatter={(val) => val.slice(5)} 
                            />
                            <YAxis 
                                domain={['auto', 'auto']} 
                                tick={{ fontSize: 12, fill: "var(--text-secondary)" }} 
                                tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} 
                            />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                            <Tooltip 
                                formatter={(value) => [`₹${value.toLocaleString()}`, "Value"]}
                                contentStyle={{ 
                                    backgroundColor: 'var(--bg-surface-elevated)', 
                                    borderColor: 'var(--border-subtle)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)'
                                }}
                                itemStyle={{ color: 'var(--text-primary)' }}
                                labelStyle={{ color: 'var(--text-secondary)' }}
                            />
                            <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#3182CE" 
                                fillOpacity={1} 
                                fill="url(#colorValue)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </Card>
    );
}
