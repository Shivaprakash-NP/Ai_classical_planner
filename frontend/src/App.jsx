import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line, Bar } from 'react-chartjs-2';
import { Activity, Zap, Play, Battery, BatteryCharging, AlertTriangle, CheckCircle2 } from 'lucide-react';
import TreeChart from './TreeChart';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);
ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.font.family = "'Inter', sans-serif";

const API_URL = 'http://127.0.0.1:8000/api';

function App() {
  const [devices, setDevices] = useState([]);
  const [batteries, setBatteries] = useState({});
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    axios.get(`${API_URL}/config`).then((res) => {
      setDevices(res.data.devices);
      const initB = {};
      res.data.devices.forEach((d, i) => { initB[i] = d.battery; });
      setBatteries(initB);
    }).catch(console.error);
  }, []);

  const handleRun = async () => {
    setLoading(true);
    try {
      const initialState = devices.map((_, i) => batteries[i]);
      const res = await axios.post(`${API_URL}/plan`, { initial_state: initialState });
      setResults(res.data);
      setTimeout(() => document.getElementById('dashboard-view').scrollIntoView({ behavior: 'smooth' }), 300);
    } catch (err) {
      alert("Backend Error: " + err.message);
    }
    setLoading(false);
  };

  const getBatteryChart = (cd) => ({
    labels: cd.actions,
    datasets: cd.devices.map(d => ({
      label: d.name, data: d.data, borderColor: d.color, backgroundColor: d.color,
      tension: 0.4, borderWidth: 3,
      pointRadius: d.data.map((val, i) => i > 0 && val > d.data[i-1] ? 8 : 4),
      pointHoverRadius: 10,
      fill: 'origin',
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, d.color + '40');
        gradient.addColorStop(1, 'transparent');
        return gradient;
      }
    }))
  });

  const getFailureChart = (cd) => ({
    labels: cd.p_values.map(p => p.toFixed(2)),
    datasets: [{
      label: 'Expected Utility', data: cd.eus,
      borderColor: '#f43f5e', backgroundColor: 'rgba(244, 63, 94, 0.2)',
      fill: true, tension: 0.4, borderWidth: 4, pointRadius: 6, pointBackgroundColor: '#fff'
    }]
  });

  const chartOpts = (extra = {}) => ({
    maintainAspectRatio: false,
    plugins: { 
      legend: { labels: { font: { size: 14, family: 'Inter' }, usePointStyle: true, boxWidth: 8 } },
      tooltip: { backgroundColor: 'rgba(15,17,26,0.9)', titleFont: {size: 14}, bodyFont: {size: 13}, padding: 12, cornerRadius: 8, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
    },
    scales: {
      y: { ticks: { font: { size: 13 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { ticks: { font: { size: 13 } }, grid: { display: false } },
    },
    ...extra
  });

  const getBatteryColor = (level, threshold) => {
    if (level < threshold) return 'var(--red)';
    if (level < threshold + 15) return 'var(--yellow)';
    return 'var(--emerald)';
  };

  return (
    <div className="container">
      <div className="bg-glow"></div>
      <div className="bg-glow-right"></div>
      
      <header className="header">
        <h1>⚡ EnergyAI Core</h1>
        <p>Intelligent Multidevice Coordination & Decision Networks</p>
      </header>

      {/* Configuration Grid */}
      <div className="grid grid-cols-4" style={{marginBottom: '4rem'}}>
        {devices.map((d, i) => {
          const val = batteries[i] ?? d.battery;
          const color = getBatteryColor(val, d.safe_threshold);
          return (
            <div key={d.name} className="glass card fade-in" style={{animationDelay: `${i * 0.1}s`}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center'}}>
                <strong style={{color: '#fff', fontSize: '1.05rem', fontFamily: 'Outfit'}}>{d.name}</strong>
                <span style={{fontSize:'0.7rem', fontWeight:800, padding:'4px 10px', background: 'rgba(255,255,255,0.08)', borderRadius:'12px', color: d.priority === 'High' ? 'var(--red)' : d.priority === 'Medium' ? 'var(--yellow)' : 'var(--emerald)', textTransform: 'uppercase'}}>{d.priority} PRIORITY</span>
              </div>
              
              <div style={{display: 'flex', alignItems: 'baseline', gap: '8px'}}>
                <span className="metric-value" style={{color: color}}>{Math.round(val)}</span>
                <span style={{fontSize:'1.2rem', color:'#94a3b8', fontWeight: 600}}>%</span>
                {val < d.safe_threshold && <AlertTriangle size={18} color="var(--red)" style={{marginLeft: 'auto'}}/>}
              </div>

              <input 
                type="range" min="0" max="100" 
                value={val} 
                onChange={(e) => setBatteries({...batteries, [i]: parseFloat(e.target.value)})} 
                style={{accentColor: color}}
              />
              
              <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize:'0.85rem', color:'#94a3b8', fontWeight: 500}}>
                <span style={{color:'var(--emerald)', display: 'flex', alignItems: 'center', gap: '4px'}}><Zap size={14}/> +{d.charge_rate}/st</span>
                <span style={{color:'var(--red)', display: 'flex', alignItems: 'center', gap: '4px'}}><Activity size={14}/> -{d.consumption}/st</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{textAlign: 'center', margin: '4rem 0'}}>
        <button className="btn" onClick={handleRun} disabled={loading}>
          {loading ? <div className="loader"></div> : <Play size={22} />}
          {loading ? "Synthesizing Network..." : "Generate Optimal Plan"}
        </button>
      </div>

      {results && (
        <div id="dashboard-view" className="fade-in">
          {/* Analytics Overview */}
          <div className="grid grid-cols-4" style={{marginBottom: '2rem'}}>
            {[
              { label: 'Expected Utility', val: results.best_eu, color: 'var(--primary)' },
              { label: 'Deficit Penalty Cost', val: results.metrics.total_cost, color: 'var(--red)' },
              { label: 'Priority Returns', val: results.metrics.total_reward, color: 'var(--emerald)' },
              { label: 'Prob. of Success', val: (results.metrics.p_success * 100).toFixed(1) + '%', color: '#fff' },
            ].map((k, i) => (
              <div key={k.label} className="glass card" style={{textAlign:'center', padding: '2rem 1.5rem', animationDelay: `${i*0.1}s`}}>
                <h3 style={{fontSize:'0.85rem', color:'#94a3b8', fontWeight: 600, letterSpacing:'1px', textTransform:'uppercase', marginBottom:'0.8rem'}}>{k.label}</h3>
                <div className="metric-value" style={{color: k.color, fontSize: '2.4rem'}}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* Schedule + Battery Trajectory */}
          <div className="grid" style={{gridTemplateColumns: '1fr 2.5fr', marginBottom: '2rem', gap:'1.5rem'}}>
            <div className="glass card" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              <h2 style={{fontFamily: 'Outfit', fontSize: '1.5rem', marginBottom: '1rem', color: '#fff'}}>Optimal Path</h2>
              <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
                {results.optimal_schedule.map((step) => (
                  <div key={step.step} className="glass" style={{padding:'1.2rem', borderRadius:'14px', borderLeft: '4px solid var(--primary)'}}>
                    <div style={{color:'var(--primary)', fontWeight:800, fontSize:'0.75rem', letterSpacing:'1.5px', textTransform: 'uppercase', marginBottom: '8px'}}>STEP {step.step}</div>
                    <div style={{fontSize:'1.1rem', fontWeight:600, color:'#fff', display:'flex', alignItems:'center', gap:'10px'}}>
                      <BatteryCharging size={22} color="var(--emerald)"/> {step.charge === "None" ? "Idle" : step.charge}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="glass card" style={{padding: '2rem'}}>
              <h2 style={{fontFamily: 'Outfit', fontSize: '1.5rem', marginBottom: '1.5rem', color: '#fff'}}>Live Battery Trajectory</h2>
              <div className="chart-container" style={{height: '400px'}}>
                <Line data={getBatteryChart(results.chart_data.battery_levels)} options={chartOpts()} />
              </div>
            </div>
          </div>

          {/* Bottom Analytics */}
          <div className="grid grid-cols-2" style={{marginBottom: '2rem'}}>
            <div className="glass card" style={{padding: '2rem'}}>
              <h2 style={{fontFamily: 'Outfit', fontSize: '1.5rem', marginBottom: '1.5rem', color: '#fff'}}>Plan Expected Utility (Top 5)</h2>
              <div className="chart-container" style={{height:'320px'}}>
                <Bar 
                  data={{labels: results.chart_data.top5.labels, datasets: [{label:'EU', data: results.chart_data.top5.eus, backgroundColor: ['var(--primary)', 'var(--accent)', 'var(--yellow)', '#f97316', 'var(--secondary)'], borderRadius: 8}]}}
                  options={chartOpts({ plugins:{legend:{display:false}}, scales: { x:{grid:{display:false}, ticks:{font:{size:11, family: 'Inter'}}}}})}
                />
              </div>
            </div>
            <div className="glass card" style={{padding: '2rem'}}>
              <h2 style={{fontFamily: 'Outfit', fontSize: '1.5rem', marginBottom: '1.5rem', color: '#fff'}}>Risk Assessment Curve</h2>
              <div className="chart-container" style={{height:'320px'}}>
                <Line data={getFailureChart(results.chart_data.failure_risk)}
                  options={chartOpts({ plugins:{legend:{display:false}}, scales: { x:{title:{display:true, text:'Step Success Probability P(s)', color:'#94a3b8', font:{size:13}}, grid:{display:false}}}})} />
              </div>
            </div>
          </div>

          {/* Interactive Tree */}
          <div className="glass card" style={{padding: '3rem', marginBottom: '2rem'}}>
            <div style={{textAlign:'center', marginBottom: '3rem'}}>
              <h2 style={{fontFamily: 'Outfit', fontSize: '2.2rem', color: '#fff', marginBottom: '0.5rem'}}>State-Space Simulation</h2>
              <p style={{color:'#94a3b8', fontSize:'1rem'}}>Hover over nodes and edges to inspect the Decision Network's path analysis and intermediate metrics.</p>
            </div>
            <TreeChart treeData={results.chart_data.tree_json} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
