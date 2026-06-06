import React, { useEffect, useState } from 'react';
import { getCityAnalytics } from '../services/analyticsService';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchDatabaseAnalytics() {
      try {
        const res = await getCityAnalytics();
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error || 'Failed to fetch analytics');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDatabaseAnalytics();
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active||!payload?.length) return null;
    return (
      <div style={{background:'var(--bg-card-hover)',border:'1px solid #222',borderRadius:8,padding:'10px 14px'}}>
        <p style={{color:'var(--text-main)',fontSize:13,fontWeight:600,margin:'0 0 6px'}}>{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{color:p.color||'var(--text-muted)',fontSize:12,margin:'2px 0'}}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  };

  if (loading) return <div style={{...S.page, display:'flex', justifyContent:'center', alignItems:'center', color:'var(--text-muted)'}}>Loading Database Analytics...</div>;
  if (error) return <div style={{...S.page, color:'#ff4444'}}>Error loading analytics: {error}</div>;
  if (!data) return <div style={{...S.page, color:'var(--text-muted)'}}>No analytics data available.</div>;

  return (
    <div style={S.page}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={S.header}>
        <div>
          <p style={S.headerSub}>Data Insights & ML Preparedness</p>
          <h1 style={S.headerTitle}>📊 Amazon DynamoDB Live Analytics</h1>
        </div>
        <div style={S.liveTag}><span style={{color:'#00cc66'}}>●</span> Source: {data?.source || 'Amazon DynamoDB'}</div>
      </div>

      {/* IEEE Figure 1 & Figure 2 */}
      <div style={S.row}>
        <div className="glass-panel" style={S.card}>
          <p style={S.cardTitle}>Figure 1: Accident Reports by Date</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.accident_trends || []}>
              <XAxis dataKey="date" tick={{fill:'var(--text-sub)',fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-sub)',fontSize:12}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="count" name="Accidents" fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel" style={S.card}>
          <p style={S.cardTitle}>Figure 2: Crime Distribution by Area</p>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={data.crime_hotspots || []} dataKey="count" nameKey="location" cx="50%" cy="50%" outerRadius={90} label={e=>`${e.location} (${e.count})`} labelLine={false}>
                {(data.crime_hotspots || []).map((d,i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
              </Pie>
              <Tooltip content={<CustomTooltip/>}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* IEEE Figure 3 & Figure 4 */}
      <div style={S.row}>
        <div className="glass-panel" style={S.card}>
          <p style={S.cardTitle}>Figure 3: Waste Severity Analysis</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.waste_analysis || []} layout="vertical">
              <XAxis type="number" tick={{fill:'var(--text-sub)',fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="severity" tick={{fill:'var(--text-sub)',fontSize:12}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="count" name="Waste Reports" fill="#10b981" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel" style={S.card}>
          <p style={S.cardTitle}>Figure 4: Food Donations by Status</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.food_distribution || []}>
              <XAxis dataKey="status" tick={{fill:'var(--text-sub)',fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-sub)',fontSize:12}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="quantity" name="Donations" radius={[4,4,0,0]}>
                {(data.food_distribution || []).map((entry, index) => {
                  let color = '#f59e0b';
                  if (entry.status === 'Donated') color = '#10b981'; // Green
                  else if (entry.status === 'Accepted') color = '#2563eb'; // Blue
                  else if (entry.status === 'Expired') color = '#ef4444'; // Red
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* IEEE Figure 5 & City Health Index */}
      <div style={S.row}>
        <div className="glass-panel" style={S.card}>
          <p style={S.cardTitle}>Figure 5: Citizen Trust Score Distribution</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.trust_distribution || []}>
              <XAxis dataKey="range" tick={{fill:'var(--text-sub)',fontSize:12}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:'var(--text-sub)',fontSize:12}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="users" name="Users" fill="#8b5cf6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel" style={S.card}>
          <p style={S.cardTitle}>City Health Index by Zone (Formula Based)</p>
          <div style={{display:'flex', flexDirection:'column', gap: 14, overflowY:'auto', maxHeight: 250, paddingRight: 10}}>
            {(data.city_health_zones || []).map((zone, idx) => (
              <div key={idx} style={{background: 'var(--bg-input)', padding: 12, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <div>
                  <h4 style={{margin: '0 0 4px', fontSize: 15, color: 'var(--text-main)'}}>{zone.area}</h4>
                  <p style={{margin: 0, fontSize: 12, color: 'var(--text-sub)'}}>
                    Sft: {zone.safety} · Cln: {zone.cleanliness} · Food: {zone.food} · Emrg: {zone.emergency}
                  </p>
                </div>
                <div style={{
                  background: zone.index >= 80 ? '#10b98122' : zone.index >= 70 ? '#f59e0b22' : '#ef444422',
                  color: zone.index >= 80 ? '#10b981' : zone.index >= 70 ? '#f59e0b' : '#ef4444',
                  padding: '8px 12px', borderRadius: 8, fontWeight: 800, fontSize: 18
                }}>
                  {zone.index}/100
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>



    </div>
  );
}

const S = {
  page:       { padding:28, maxWidth:1200, margin:'0 auto', background:'var(--bg-page)', minHeight:'100vh', fontFamily:'system-ui,sans-serif' },
  header:     { display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 },
  headerSub:  { color:'var(--text-sub)', fontSize:12, textTransform:'uppercase', letterSpacing:'0.1em', margin:0 },
  headerTitle:{ color:'var(--text-main)', fontSize:28, fontWeight:800, letterSpacing:'-0.03em', margin:'4px 0 0' },
  liveTag:    { background:'var(--bg-input)', border:'1px solid #1a1a1a', borderRadius:8, padding:'8px 14px', fontSize:13, color:'var(--text-sub)', display:'flex', alignItems:'center', gap:6 },
  row:        { display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 },
  card:       { background:'var(--bg-card)', borderRadius:14, padding:22, marginBottom:16, border:'1px solid #151515' },
  cardTitle:  { color:'var(--text-main)', fontWeight:700, fontSize:15, margin:'0 0 16px' },
  empty:      { color:'var(--text-sub)', fontSize:14, textAlign:'center', padding:'24px 0' },
  table:      { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th:         { textAlign: 'left', padding: '10px 12px', borderBottom: '2px solid var(--border-main)', color: 'var(--text-sub)', fontWeight: 600 },
  td:         { padding: '12px', borderBottom: '1px solid var(--border-light)', color: 'var(--text-main)' }
};
