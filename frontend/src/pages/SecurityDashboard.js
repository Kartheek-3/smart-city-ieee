import React, { useState, useEffect } from 'react';
import { ShieldAlert, ShieldCheck, UserX, Activity, AlertTriangle } from 'lucide-react';
import { useTheme } from '../utils/ThemeContext';

function StatCard({ title, value, icon }) {
  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid var(--border-light)' }}>
      <div style={{ padding: '12px', background: 'var(--bg-input)', borderRadius: '10px' }}>{icon}</div>
      <div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-sub)', fontWeight: 600, textTransform: 'uppercase' }}>{title}</p>
        <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: 800, color: 'var(--text-main)' }}>{value}</p>
      </div>
    </div>
  );
}

export default function SecurityDashboard({ userData }) {
  const { dark } = useTheme();
  
  // ML Model State
  const [mlInput, setMlInput] = useState({
    trust_score: 20,
    reports_submitted: 45,
    valid_reports: 5,
    fake_reports: 20,
    confirmations: 1,
    account_age_days: 15
  });
  const [mlResult, setMlResult] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [metrics, setMetrics] = useState({
    topTrusted: [
      { id: 1, name: 'Alice M.', score: 95 },
      { id: 2, name: 'Bob T.', score: 88 },
      { id: 3, name: 'Charlie W.', score: 82 }
    ],
    suspicious: [
      { id: 4, name: 'Dave K.', score: 15, reason: 'Repeated spam' },
      { id: 5, name: 'Eve R.', score: 18, reason: 'Low trust score' }
    ],
    blocked: 12,
    fakeTrend: 5
  });

  // Mock fetching from BigQuery/Firestore
  useEffect(() => {
    // e.g. const res = await firebase.functions().httpsCallable('getSecurityAnalytics')();
  }, []);

  const runXGBoostAnalysis = async () => {
    setMlLoading(true);
    setMlResult(null);
    try {
      const res = await fetch('http://localhost:5000/api/ml/detect-fake-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlInput)
      });
      const data = await res.json();
      setMlResult(data);
    } catch (err) {
      console.error(err);
      setMlResult({ error: "Failed to connect to ML API" });
    }
    setMlLoading(false);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-main)' }}>
      <header style={{ marginBottom: '32px', borderBottom: '1px solid var(--border-light)', paddingBottom: '16px' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '28px', color: 'var(--brand-primary)' }}>
          <ShieldCheck size={32} />
          Security & Trust Analytics
        </h1>
        <p style={{ color: 'var(--text-sub)', marginTop: '8px' }}>
          Monitor community trust scores, fake reports, and automated security flags.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <StatCard title="Suspicious Users Flagged" value={metrics.suspicious.length} icon={<AlertTriangle color="#ff8800" />} />
        <StatCard title="Blocked Accounts" value={metrics.blocked} icon={<UserX color="#ff4444" />} />
        <StatCard title="Recent Fake Reports" value={metrics.fakeTrend} icon={<ShieldAlert color="#ff8800" />} />
        <StatCard title="System Health" value="Stable" icon={<Activity color="#00cc66" />} />
      </div>

      {/* XGBoost Interactive Section */}
      <div className="glass-panel" style={{ ...cardStyle, marginBottom: '32px', borderLeft: '4px solid var(--brand-primary)' }}>
        <h3 style={{...headerStyle, display:'flex', alignItems:'center', gap:10}}>
          <Activity size={20} color="var(--brand-primary)"/> 
          XGBoost Fake Report Detection (AI Model)
        </h3>
        <p style={{ color: 'var(--text-sub)', fontSize: '14px', marginBottom: '20px' }}>
          Test the SageMaker-trained XGBClassifier on citizen profiles to detect potentially fake or spam reports in real-time.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {Object.keys(mlInput).map((key) => (
            <div key={key}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-sub)', textTransform: 'capitalize', marginBottom: '4px' }}>
                {key.replace(/_/g, ' ')}
              </label>
              <input 
                type="number" 
                value={mlInput[key]}
                onChange={(e) => setMlInput({...mlInput, [key]: Number(e.target.value)})}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-light)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button 
            onClick={runXGBoostAnalysis}
            disabled={mlLoading}
            style={{ padding: '10px 20px', background: 'var(--brand-primary)', color: '#fff', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            {mlLoading ? 'Analyzing...' : 'Run AI Analysis'}
          </button>

          {mlResult && !mlResult.error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', borderRadius: '8px', background: mlResult.is_fake ? 'rgba(255,68,68,0.1)' : 'rgba(0,204,102,0.1)' }}>
              {mlResult.is_fake ? <ShieldAlert color="#ff4444" /> : <ShieldCheck color="#00cc66" />}
              <div>
                <strong style={{ color: mlResult.is_fake ? '#ff4444' : '#00cc66' }}>
                  {mlResult.is_fake ? 'FAKE REPORT DETECTED' : 'VALID REPORT'}
                </strong>
                <span style={{ marginLeft: '12px', fontSize: '14px', color: 'var(--text-sub)' }}>
                  Probability: {mlResult.fake_probability}% ({mlResult.source})
                </span>
              </div>
            </div>
          )}
          {mlResult && mlResult.error && (
            <div style={{ color: '#ff4444', fontSize: '14px' }}>{mlResult.error}</div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={cardStyle}>
          <h3 style={headerStyle}>Top Trusted Users</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {metrics.topTrusted.map(u => (
              <li key={u.id} style={listItemStyle}>
                <span>{u.name}</span>
                <span style={{ fontWeight: 'bold', color: 'var(--brand-primary)' }}>{u.score} pts</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="glass-panel" style={cardStyle}>
          <h3 style={headerStyle}>Suspicious & Flagged</h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {metrics.suspicious.map(u => (
              <li key={u.id} style={listItemStyle}>
                <div>
                  <strong>{u.name}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.reason}</div>
                </div>
                <span style={{ fontWeight: 'bold', color: '#ff4444' }}>{u.score} pts</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

const cardStyle = {
  padding: '20px',
};

const headerStyle = {
  marginBottom: '16px',
  fontSize: '18px',
  color: 'var(--text-main)',
  borderBottom: '1px solid var(--border-light)',
  paddingBottom: '8px'
};

const listItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '12px 0',
  borderBottom: '1px solid var(--border-light)',
  alignItems: 'center'
};
