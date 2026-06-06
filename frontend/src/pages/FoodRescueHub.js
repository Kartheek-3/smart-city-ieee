import React, { useState, useEffect } from 'react';
import { Utensils, MapIcon, HeartHandshake, AlertCircle, BarChart3, Clock, Users, TrendingUp } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from '../utils/ThemeContext';
import LocationInput from '../components/LocationInput';
import S3ImageUpload from '../components/S3ImageUpload';
import { dbPut, dbScan, dbUpdate, TABLES } from '../services/dynamoService';

// Fix leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const TABS = [
  { id: 'heatmap',   label: 'Food Map',    icon: '🗺️' },
  { id: 'donate',    label: 'Donate',      icon: '🍱' },
  { id: 'volunteer', label: 'Volunteer',   icon: '🤝' },
  { id: 'analytics', label: 'Analytics',   icon: '📊' },
];

export default function FoodRescueHub({ userData }) {
  const { dark } = useTheme();
  const [activeTab, setActiveTab] = useState('heatmap');
  const [donations, setDonations] = useState([]);
  const [form, setForm] = useState({ food_type: '', quantity: '', expiry_time: '', location: '' });
  const [imageKey, setImageKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
      const fetchDonations = async () => {
      try {
        const items = await dbScan(TABLES.FOOD);
        const formatted = items.map(d => {
          const expiryDate = d.expiry_time ? new Date(d.expiry_time) : new Date();
          let currentStatus = d.status;
          if (currentStatus !== 'delivered' && Date.now() > expiryDate.getTime()) {
            currentStatus = 'expired';
          }
          return {
            id: d.donationId || d.donation_id, // Fallback just in case
            ...d,
            expiry: expiryDate,
            status: currentStatus
          };
        });
        setDonations(formatted);
      } catch (err) {
        console.error("Failed to fetch donations:", err);
      }
    };
    fetchDonations();
    const interval = setInterval(fetchDonations, 10000);
    return () => clearInterval(interval);
  }, []);

  const stats = {
    total: donations.length,
    available: donations.filter(d => d.status === 'available').length,
    pending: donations.filter(d => d.status === 'pending').length,
    delivered: donations.filter(d => d.status === 'delivered').length,
  };

  const handleDonate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const mockCoords = [17.44 + (Math.random() * 0.05), 78.38 + (Math.random() * 0.05)];
      const expiryDate = new Date();
      const [hours, minutes] = form.expiry_time.split(':');
      expiryDate.setHours(hours, minutes, 0);

      const id = `FOOD-${Date.now()}`;
      const timestamp = new Date().toISOString();
      await dbPut(TABLES.FOOD, {
        donationId: id,
        donor_id: userData?.uid || 'anonymous',
        food_type: form.food_type,
        quantity: parseInt(form.quantity),
        expiry_time: expiryDate.toISOString(),
        location: form.location,
        image_key: imageKey,
        status: 'available',
        coords: mockCoords,
        createdAt: timestamp
      });
      setForm({ food_type: '', quantity: '', expiry_time: '', location: '' });
      setImageKey(null);
      setActiveTab('heatmap');
    } catch (err) {
      console.error(err);
      alert('Failed to register donation.');
    }
    setSubmitting(false);
  };

  const updateStatus = async (id, timestamp, newStatus) => {
    try {
      await dbUpdate(TABLES.FOOD, { donationId: id, createdAt: timestamp }, 'SET #status = :s', { ':s': newStatus }, { '#status': 'status' });
    } catch (err) { console.error(err); }
  };

  const getMarkerIcon = (status) => {
    const color = status === 'available' ? '#10b981' : status === 'pending' ? '#f59e0b' : '#ef4444';
    return L.divIcon({
      className: 'custom-icon',
      html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px ${color}44;"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  const statusColor = { available: '#10b981', pending: '#f59e0b', expiring: '#ef4444', delivered: '#2563eb', expired: '#6b7280' };
  const statusLabel = { available: 'Available', pending: 'Pickup Pending', expiring: 'Expiring', delivered: 'Delivered', expired: 'Expired' };

  return (
    <div style={S.page} className="page-enter">
      {/* Header */}
      <div style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.headerOrb}>
            <Utensils size={26} color="#fff" />
          </div>
          <div>
            <h1 style={S.title}>Food Rescue & Distribution</h1>
            <p style={S.subtitle}>Connect surplus food with NGOs and volunteers instantly</p>
          </div>
        </div>
        <div style={S.headerStats}>
          {[
            { label: 'Available', val: stats.available, color: '#10b981' },
            { label: 'In Transit', val: stats.pending, color: '#f59e0b' },
            { label: 'Delivered', val: stats.delivered, color: '#2563eb' },
          ].map(s => (
            <div key={s.label} style={S.miniStat}>
              <span style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.val}</span>
              <span style={{ fontSize: 11, color: 'var(--text-sub)', fontWeight: 500 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={S.tabBar}>
        {TABS.map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...S.tabBtn,
              background: activeTab === tab.id ? 'var(--brand-primary)' : 'var(--bg-card)',
              color: activeTab === tab.id ? '#fff' : 'var(--text-muted)',
              border: activeTab === tab.id ? 'none' : '1px solid var(--border-main)',
              boxShadow: activeTab === tab.id ? '0 4px 12px rgba(37,99,235,0.25)' : 'var(--shadow-sm)',
            }}>
            <span style={{ fontSize: 16 }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ animation: 'fadeUp 0.3s ease' }} key={activeTab}>

        {activeTab === 'heatmap' && (
          <div style={S.mapCard}>
            <div style={S.mapLegend}>
              <span style={S.legendDot('#10b981')}/> Available
              <span style={S.legendDot('#f59e0b')}/> Pending
              <span style={S.legendDot('#ef4444')}/> Expiring
            </div>
            <div style={{ height: '480px', borderRadius: '0 0 16px 16px', overflow: 'hidden' }}>
              <MapContainer center={[17.45, 78.38]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {donations.map(d => d.coords && (
                  <Marker key={d.id} position={d.coords} icon={getMarkerIcon(d.status)}>
                    <Popup>
                      <strong>{d.food_type}</strong> ({d.quantity} servings)<br/>
                      Status: {d.status}<br/>
                      Expires in: {Math.max(0, Math.round((d.expiry - Date.now())/60000))} mins
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        )}

        {activeTab === 'donate' && (
          <div style={S.formCard}>
            <div style={S.formHeader}>
              <h2 style={S.formTitle}>Register Food Donation</h2>
              <p style={{ color: 'var(--text-sub)', fontSize: 13, margin: 0 }}>Fill in the details below to broadcast your donation to nearby NGOs</p>
            </div>
            <form onSubmit={handleDonate} style={S.form}>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Food Type *</label>
                  <input type="text" placeholder="e.g. Rice Meals, Sandwiches" required style={S.input} 
                    value={form.food_type} onChange={e => setForm({...form, food_type: e.target.value})} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Quantity (Servings) *</label>
                  <input type="number" placeholder="e.g. 50" required style={S.input} 
                    value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
                </div>
              </div>
              <div style={S.formGrid}>
                <div style={S.field}>
                  <label style={S.label}>Expiry Time *</label>
                  <input type="time" required style={S.input} 
                    value={form.expiry_time} onChange={e => setForm({...form, expiry_time: e.target.value})} />
                </div>
                <div style={S.field}>
                  <label style={S.label}>Pickup Location *</label>
                  <LocationInput placeholder="e.g. KPHB Colony, Hyderabad" required style={S.input} 
                    value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                </div>
              </div>
              <S3ImageUpload category="food" onUploadComplete={setImageKey} />
              <button type="submit" disabled={submitting} style={{
                ...S.submitBtn,
                opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? '⏳ Broadcasting...' : '📡 Broadcast Donation to NGOs'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'volunteer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {donations.length === 0 && (
              <div style={S.emptyState}>
                <span style={{ fontSize: 48 }}>🍽️</span>
                <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 12 }}>No donations yet. Be the first to contribute!</p>
              </div>
            )}
            {donations.map(d => (
              <div key={d.id} style={S.volunteerCard}>
                <div style={{ display: 'flex', gap: 14, flex: 1 }}>
                  <div style={{ ...S.foodIcon, background: `${statusColor[d.status] || '#2563eb'}12` }}>
                    <span style={{ fontSize: 24 }}>🍲</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>{d.food_type}</h3>
                      <span style={{ ...S.statusBadge, background: `${statusColor[d.status] || '#2563eb'}14`, color: statusColor[d.status] || '#2563eb' }}>
                        {statusLabel[d.status] || d.status}
                      </span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
                      📍 {d.location} &nbsp;·&nbsp; 🍽️ {d.quantity} servings &nbsp;·&nbsp; ⏰ {d.expiry.toLocaleTimeString()}
                    </p>
                    {d.status === 'expiring' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                        <AlertCircle size={13} color="#ef4444" />
                        <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 12 }}>URGENT — Expiring Soon</span>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  {d.status === 'expired' ? (
                     <span style={{ color: '#6b7280', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>❌ Expired</span>
                  ) : d.status === 'available' || d.status === 'expiring' ? (
                    <button onClick={() => updateStatus(d.id, d.timestamp, 'pending')} style={S.actionBtn}>
                      🚚 Accept Pickup
                    </button>
                  ) : d.status === 'pending' ? (
                    <button onClick={() => updateStatus(d.id, d.timestamp, 'delivered')} style={{ ...S.actionBtn, background: 'var(--gradient-success, linear-gradient(135deg,#10b981,#059669))' }}>
                      ✅ Mark Delivered
                    </button>
                  ) : (
                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>✓ Delivered</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div style={S.analyticsGrid}>
            {[
              { icon: '🍱', label: 'Total Donations', val: stats.total, color: '#2563eb', desc: 'All time donations registered' },
              { icon: '✅', label: 'Delivered', val: stats.delivered, color: '#10b981', desc: 'Successfully delivered' },
              { icon: '🚚', label: 'In Transit', val: stats.pending, color: '#f59e0b', desc: 'Being picked up now' },
              { icon: '📡', label: 'Available', val: stats.available, color: '#8b5cf6', desc: 'Waiting for pickup' },
            ].map(s => (
              <div key={s.label} style={S.analyticsCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ ...S.analyticsIcon, background: `${s.color}12` }}>
                    <span style={{ fontSize: 22 }}>{s.icon}</span>
                  </div>
                  <span style={{ fontSize: 32, fontWeight: 800, color: s.color }}>{s.val}</span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginTop: 16 }}>{s.label}</p>
                <p style={{ fontSize: 12, color: 'var(--text-sub)', margin: 0 }}>{s.desc}</p>
                <div style={{ height: 3, background: `linear-gradient(90deg, ${s.color}, transparent)`, borderRadius: 2, marginTop: 14 }} />
              </div>
            ))}
            <div style={{ ...S.analyticsCard, gridColumn: '1 / -1', background: 'linear-gradient(135deg, rgba(37,99,235,0.04), rgba(124,58,237,0.04))', border: '1px solid rgba(37,99,235,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <TrendingUp size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: 15, color: 'var(--brand-primary)' }}>🤖 AI Demand Prediction</h3>
              </div>
              <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: 15, margin: '4px 0' }}>High Demand Tomorrow: Madhapur Zone</p>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>Based on upcoming event schedules and historical donation patterns. Consider deploying additional volunteers.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  page: { padding: 28, maxWidth: 1200, margin: '0 auto', minHeight: '100vh' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  headerOrb: { width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(16,185,129,0.3)', flexShrink: 0 },
  title: { fontSize: 26, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { color: 'var(--text-sub)', fontSize: 14, margin: '4px 0 0', fontWeight: 500 },
  headerStats: { display: 'flex', gap: 20 },
  miniStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },

  tabBar: { display: 'flex', gap: 10, marginBottom: 24 },
  tabBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' },

  mapCard: { background: 'var(--bg-card)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-main)', boxShadow: 'var(--shadow-md)' },
  mapLegend: { display: 'flex', gap: 20, padding: '12px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', alignItems: 'center', borderBottom: '1px solid var(--border-light)' },
  legendDot: (color) => ({ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color, marginRight: 6, marginLeft: 16, boxShadow: `0 0 6px ${color}44` }),

  formCard: { background: 'var(--bg-card)', borderRadius: 16, padding: 28, border: '1px solid var(--border-main)', maxWidth: 700, boxShadow: 'var(--shadow-sm)' },
  formHeader: { marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-light)' },
  formTitle: { fontSize: 20, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 4px' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' },
  input: { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1px solid var(--border-main)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: 14 },
  submitBtn: { padding: '14px 24px', background: 'var(--gradient-brand, linear-gradient(135deg,#2563eb,#7c3aed))', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, boxShadow: '0 4px 16px rgba(37,99,235,0.3)', marginTop: 8, letterSpacing: '0.01em' },

  emptyState: { textAlign: 'center', padding: '60px 20px', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-main)' },
  volunteerCard: { background: 'var(--bg-card)', padding: 20, borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, border: '1px solid var(--border-main)', transition: 'all 0.2s', boxShadow: 'var(--shadow-sm)' },
  foodIcon: { width: 52, height: 52, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statusBadge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, whiteSpace: 'nowrap' },
  actionBtn: { background: 'var(--gradient-brand, linear-gradient(135deg,#2563eb,#7c3aed))', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 12px rgba(37,99,235,0.2)', whiteSpace: 'nowrap' },

  analyticsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 },
  analyticsCard: { background: 'var(--bg-card)', padding: 22, borderRadius: 16, border: '1px solid var(--border-main)', boxShadow: 'var(--shadow-sm)' },
  analyticsIcon: { width: 46, height: 46, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
};
