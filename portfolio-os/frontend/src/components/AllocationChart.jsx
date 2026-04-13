import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AA336A", "#8884d8"];

export default function AllocationChart({ data }) {
    const chartData = Object.entries(data).map(([key, value]) => ({
        name: key,
        value: Math.round(value * 100)
    }));

    const renderPieLabel = ({ name, value }) => `${name}: ${value}%`;

    return (
        <div className="allocation-chart-block">
            <div className="allocation-chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            dataKey="value"
                            nameKey="name"
                            outerRadius="78%"
                            label={renderPieLabel}
                            labelLine={false}
                        >
                            {chartData.map((_, index) => (
                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip formatter={(val) => `${val}%`} />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="allocation-legend" aria-label="Allocation legend">
                {chartData.map((item, index) => (
                    <div key={item.name} className="allocation-legend-item">
                        <span
                            className="allocation-legend-swatch"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            aria-hidden="true"
                        />
                        <span className="allocation-legend-label">{item.name}</span>
                        <span className="allocation-legend-value">{item.value}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
}