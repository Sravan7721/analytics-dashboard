import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

function StatCard({ title, value, color }) {
  return (
    <div style={{ background: "#f8f9fa", border: "1px solid #e0e0e0", borderRadius: 8, padding: "1rem 1.5rem", minWidth: 140 }}>
      <div style={{ fontSize: 13, color: "#666" }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

function AlertBanner({ alerts }) {
  if (alerts.length === 0) return null;
  return (
    <div style={{ margin: "1rem 0" }}>
      {alerts.slice(-3).map((alert, i) => (
        <div key={i} style={{
          background: alert.includes("CRITICAL") ? "#ffebee" : "#fff3e0",
          border: `1px solid ${alert.includes("CRITICAL") ? "#f44336" : "#ff9800"}`,
          borderRadius: 8, padding: "0.75rem 1rem",
          marginBottom: 8, fontSize: 14,
          color: alert.includes("CRITICAL") ? "#c62828" : "#e65100"
        }}>
          {alert}
        </div>
      ))}
    </div>
  );
}

function App() {
  const [metrics, setMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [current, setCurrent] = useState(0);
  const [max, setMax] = useState(0);
  const [avg, setAvg] = useState(0);
  const [predicted, setPredicted] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // WebSocket for live metrics
    const ws = new WebSocket("ws://localhost:8080/ws/metrics");
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const val = data.value;
      setMetrics(prev => {
        const updated = [...prev, { value: val, time: new Date().toLocaleTimeString() }];
        const slice = updated.slice(-20);
        const values = slice.map(m => m.value);
        setCurrent(val);
        setMax(Math.max(...values));
        setAvg(Math.round(values.reduce((a, b) => a + b, 0) / values.length));
        return slice;
      });
    };

    // SSE for alerts and predictions
    const eventSource = new EventSource("http://localhost:8080/api/metrics/alerts");
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.alert) setAlerts(prev => [...prev.slice(-9), data.alert]);
      if (data.predictedValue) setPredicted(data.predictedValue);
    };

    return () => { ws.close(); eventSource.close(); };
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
        <h1 style={{ margin: 0 }}>CPU Analytics Dashboard</h1>
        <span style={{ background: connected ? "#4caf50" : "#f44336", color: "white", padding: "4px 12px", borderRadius: 20, fontSize: 13 }}>
          {connected ? "● Live" : "○ Disconnected"}
        </span>
      </div>

      <AlertBanner alerts={alerts} />

      <div style={{ display: "flex", gap: 16, marginBottom: "2rem" }}>
        <StatCard title="Current" value={current + "%"} color="#8884d8" />
        <StatCard title="Maximum" value={max + "%"} color="#f44336" />
        <StatCard title="Average" value={avg + "%"} color="#4caf50" />
        <StatCard title="Predicted" value={predicted + "%"} color="#ff9800" />
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={metrics}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} unit="%" />
          <Tooltip formatter={(val) => [val + "%", "CPU"]} />
          <Legend />
          <ReferenceLine y={80} stroke="#f44336" strokeDasharray="5 5" label="Alert threshold" />
          <Line type="monotone" dataKey="value" name="CPU Usage" stroke="#8884d8" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>

      {alerts.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Alert History ({alerts.length})</h3>
          <div style={{ maxHeight: 200, overflowY: "auto" }}>
            {alerts.slice().reverse().map((alert, i) => (
              <div key={i} style={{ padding: "0.5rem", borderBottom: "1px solid #eee", fontSize: 13 }}>
                {alert}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;