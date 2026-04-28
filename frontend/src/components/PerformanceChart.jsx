import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchHistory } from "../services/api";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts";

const PERIODS = [
    { label: "1Y", value: "1y" },
    { label: "2Y", value: "2y" },
    { label: "3Y", value: "3y" },
    { label: "5Y", value: "5y" },
    { label: "Max", value: "max" },
];

export default function PerformanceChart({ symbol, onClose }) {
    const [period, setPeriod] = useState("5y");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        if (!symbol) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetchHistory(symbol, period);
            setData(res?.data?.history || []);
        } catch (err) {
            setError(
                err?.response?.data?.detail ||
                    `Could not load history for ${symbol}`
            );
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [symbol, period]);

    useEffect(() => {
        load();
    }, [load]);

    // Handle ESC key
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    const stats = useMemo(() => {
        if (data.length < 2) return null;
        const first = data[0].price;
        const last = data[data.length - 1].price;
        const change = last - first;
        const changePct = (change / first) * 100;
        const high = Math.max(...data.map((d) => d.price));
        const low = Math.min(...data.map((d) => d.price));

        // Annualised CAGR
        const dateFirst = new Date(data[0].date);
        const dateLast = new Date(data[data.length - 1].date);
        const years =
            (dateLast - dateFirst) / (365.25 * 24 * 60 * 60 * 1000);
        const cagr =
            years > 0
                ? (Math.pow(last / first, 1 / years) - 1) * 100
                : changePct;

        return {
            first: first.toFixed(2),
            last: last.toFixed(2),
            change: change.toFixed(2),
            changePct: changePct.toFixed(2),
            high: high.toFixed(2),
            low: low.toFixed(2),
            cagr: cagr.toFixed(2),
            positive: change >= 0,
        };
    }, [data]);

    // Thin the data for rendering (max 250 points)
    const chartData = useMemo(() => {
        if (data.length <= 250) return data;
        const step = Math.ceil(data.length / 250);
        return data.filter((_, i) => i % step === 0 || i === data.length - 1);
    }, [data]);

    const gradientColor = stats?.positive ? "#34d399" : "#f87171";

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    className="modal-close-btn"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ✕
                </button>

                <h4>
                    {symbol}
                    <span>Historical Performance</span>
                </h4>

                <div className="period-selector">
                    {PERIODS.map((p) => (
                        <button
                            key={p.value}
                            className={period === p.value ? "active" : ""}
                            onClick={() => setPeriod(p.value)}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {loading && (
                    <div className="chart-loading">
                        <span className="button-spinner" aria-hidden="true" />
                        Loading price history…
                    </div>
                )}

                {error && <p className="arb-error">{error}</p>}

                {!loading && !error && chartData.length > 0 && (
                    <>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient
                                        id="perf-grad"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor={gradientColor}
                                            stopOpacity={0.35}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor={gradientColor}
                                            stopOpacity={0.02}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    stroke="rgba(255,255,255,0.06)"
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={50}
                                />
                                <YAxis
                                    domain={["auto", "auto"]}
                                    tick={{ fill: "#9ca3af", fontSize: 11 }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={60}
                                    tickFormatter={(v) =>
                                        v >= 1000
                                            ? `${(v / 1000).toFixed(1)}k`
                                            : v.toFixed(0)
                                    }
                                />
                                <Tooltip
                                    contentStyle={{
                                        background: "rgba(15,15,20,0.95)",
                                        border: "1px solid rgba(168,85,247,0.3)",
                                        borderRadius: "10px",
                                        color: "#e5e7eb",
                                        fontSize: "0.85rem",
                                    }}
                                    formatter={(val) => [
                                        val.toFixed(2),
                                        "Price",
                                    ]}
                                    labelStyle={{ color: "#9ca3af" }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="price"
                                    stroke={gradientColor}
                                    strokeWidth={2}
                                    fill="url(#perf-grad)"
                                    dot={false}
                                    animationDuration={600}
                                />
                            </AreaChart>
                        </ResponsiveContainer>

                        {stats && (
                            <div className="chart-stats-row">
                                <div className="chart-stat">
                                    <div className="chart-stat-label">
                                        Start Price
                                    </div>
                                    <div className="chart-stat-value">
                                        {stats.first}
                                    </div>
                                </div>
                                <div className="chart-stat">
                                    <div className="chart-stat-label">
                                        Current Price
                                    </div>
                                    <div className="chart-stat-value">
                                        {stats.last}
                                    </div>
                                </div>
                                <div className="chart-stat">
                                    <div className="chart-stat-label">
                                        Return
                                    </div>
                                    <div
                                        className={`chart-stat-value ${stats.positive ? "positive" : "negative"}`}
                                    >
                                        {stats.positive ? "+" : ""}
                                        {stats.changePct}%
                                    </div>
                                </div>
                                <div className="chart-stat">
                                    <div className="chart-stat-label">
                                        CAGR
                                    </div>
                                    <div
                                        className={`chart-stat-value ${stats.positive ? "positive" : "negative"}`}
                                    >
                                        {stats.positive ? "+" : ""}
                                        {stats.cagr}%
                                    </div>
                                </div>
                                <div className="chart-stat">
                                    <div className="chart-stat-label">High</div>
                                    <div className="chart-stat-value">
                                        {stats.high}
                                    </div>
                                </div>
                                <div className="chart-stat">
                                    <div className="chart-stat-label">Low</div>
                                    <div className="chart-stat-value">
                                        {stats.low}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {!loading && !error && chartData.length === 0 && (
                    <p className="card-note">
                        No historical data available for this period.
                    </p>
                )}
            </div>
        </div>
    );
}
