import React, { useState } from 'react';
import { predictTraffic } from '../services/mlService';

export default function TrafficPrediction() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [params, setParams] = useState({
    hour: 17,
    day: 2,
    temp: 25,
    rain: 0,
    clouds: 20
  });

  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    const res = await predictTraffic(params);
    if (res.error) {
      setError(res.error);
    } else {
      setResult(res);
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setParams({ ...params, [e.target.name]: Number(e.target.value) });
  };

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <p style={S.headerSub}>Machine Learning Operations</p>
          <h1 style={S.headerTitle}>🚦 AI Traffic Predictor</h1>
        </div>
        <div style={S.liveTag}><span style={{color:'#00cc66'}}>●</span> Model Connected</div>
      </div>

      <div style={S.content}>
        <div className="glass-panel" style={S.card}>
          <h2 style={S.cardTitle}>Input Environmental Parameters</h2>
          <p style={{color:'var(--text-sub)', marginBottom:20, fontSize:14}}>
            Adjust the conditions below to simulate a 24-hour sequence and predict traffic volume.
          </p>

          <div style={S.grid}>
            <div style={S.inputGroup}>
              <label style={S.label}>Time of Day ({params.hour}:00)</label>
              <input type="range" name="hour" min="0" max="23" value={params.hour} onChange={handleChange} style={S.range} />
            </div>
            
            <div style={S.inputGroup}>
              <label style={S.label}>Day of Week (0=Mon, 6=Sun)</label>
              <input type="range" name="day" min="0" max="6" value={params.day} onChange={handleChange} style={S.range} />
            </div>

            <div style={S.inputGroup}>
              <label style={S.label}>Temperature (°C)</label>
              <input type="range" name="temp" min="-10" max="45" value={params.temp} onChange={handleChange} style={S.range} />
              <span style={S.val}>{params.temp}°C</span>
            </div>

            <div style={S.inputGroup}>
              <label style={S.label}>Rainfall (mm/h)</label>
              <input type="range" name="rain" min="0" max="50" value={params.rain} onChange={handleChange} style={S.range} />
              <span style={S.val}>{params.rain} mm</span>
            </div>
          </div>

          <button onClick={handlePredict} disabled={loading} className="action-btn-hover" style={S.button}>
            {loading ? 'Running AI Model...' : 'Run Prediction'}
          </button>
        </div>

        <div className="glass-panel" style={S.card}>
          <h2 style={S.cardTitle}>Prediction Output</h2>
          
          {error && <div style={{...S.alert, backgroundColor: 'var(--danger-bg)', color: 'var(--danger-text)'}}>{error}</div>}
          
          {!result && !error && (
            <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'70%', color:'var(--text-muted)'}}>
              Awaiting parameters...
            </div>
          )}

          {result && !error && (
            <div style={S.resultBox}>
              <p style={{fontSize: 14, color: 'var(--text-sub)', textTransform:'uppercase', letterSpacing:1}}>Predicted Traffic Volume</p>
              <h1 style={{fontSize: 48, color: 'var(--brand-primary)', margin: '10px 0'}}>{result.traffic_volume.toLocaleString()} <span style={{fontSize: 20, color:'var(--text-muted)'}}>vehicles/hr</span></h1>
              
              <div style={S.metaBox}>
                <p><strong>AI Source:</strong> {result.source}</p>
                <p><strong>Timestamp:</strong> {new Date(result.timestamp).toLocaleString()}</p>
                <p><strong>Model Architecture:</strong> Multi-Head Attention Transformer</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  page: { padding: 40, animation: 'fadeUp 0.4s ease' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 },
  headerSub: { color: 'var(--brand-primary)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 },
  headerTitle: { fontSize: 32, fontWeight: 800, color: 'var(--text-main)' },
  liveTag: { background: 'rgba(0,204,102,0.1)', border: '1px solid rgba(0,204,102,0.2)', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, color: '#00cc66', display: 'flex', gap: 6, alignItems: 'center' },
  content: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30 },
  card: { padding: 30, display: 'flex', flexDirection: 'column' },
  cardTitle: { fontSize: 20, marginBottom: 15, color: 'var(--text-main)' },
  grid: { display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 30 },
  inputGroup: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-main)' },
  range: { width: '100%', cursor: 'pointer', accentColor: 'var(--brand-primary)' },
  val: { fontSize: 12, color: 'var(--brand-primary)', alignSelf: 'flex-end', fontWeight: 'bold' },
  button: { background: 'var(--gradient-brand)', color: '#fff', border: 'none', padding: '15px 0', borderRadius: 'var(--radius-md)', fontSize: 16, cursor: 'pointer', marginTop: 'auto' },
  alert: { padding: 15, borderRadius: 8, marginTop: 20 },
  resultBox: { textAlign: 'center', marginTop: 20, animation: 'fadeUp 0.3s ease' },
  metaBox: { marginTop: 30, padding: 20, background: 'var(--bg-input)', borderRadius: 12, textAlign: 'left', fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.8 }
};
