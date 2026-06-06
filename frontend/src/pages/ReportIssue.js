import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportIssue } from '../services/issueService';
import { classifyIssue, getSentiment } from '../utils/nlpClassifier';
import { detectFakeReportWithAI } from '../services/sagemaker';
import { logSecurityEvent } from '../services/authService';
import LocationInput from '../components/LocationInput';
import { AlertTriangle, Send, CheckCircle, BrainCircuit } from 'lucide-react';

export default function ReportIssue({ userData }) {
  const [form, setForm] = useState({ title: '', description: '', location: '', category: '', urgency: 'medium' });
  const [imageKey, setImageKey] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [nlpResult, setNlpResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", form.category || 'misc');

    try {
      const res = await fetch("http://localhost:5000/api/storage/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setImageKey(data.image_key);
      } else {
        alert("Upload failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    }
    setUploadingImage(false);
  };

  const handleChange = e => {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    if (e.target.name === 'description' && e.target.value.length > 10) {
      const result = classifyIssue(e.target.value);
      const sentiment = getSentiment(e.target.value);
      setNlpResult({ ...result, sentiment });
      if (!form.category) setForm(f => ({ ...f, category: result.category }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Step 8: Fake Report Detection
      const fakeCheck = await detectFakeReportWithAI(form.title, form.description, form.location);
      if (fakeCheck.isFake) {
        alert('Report flagged as suspicious: ' + fakeCheck.reason);
        if (userData?.uid) {
          await logSecurityEvent('fake_report_blocked', userData.uid, {
            title: form.title, reason: fakeCheck.reason
          });
          fetch(`http://127.0.0.1:5000/api/trust/fake`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userData.uid })
          }).catch(err => console.warn('Backend fake report trigger failed', err));
        }
        setLoading(false);
        return;
      }

      await reportIssue({
        ...form,
        category: form.category || nlpResult?.category || 'convenience',
        reportedBy: userData?.name || 'Anonymous',
        userId: userData?.uid || null,
        nlpClassification: nlpResult || null,
        image_key: imageKey || null
      });
      setSuccess(true);
      setTimeout(() => navigate('/issues'), 2000);
    } catch (err) {
      console.error(err);
      alert('Failed to submit: ' + err.message);
    }
    setLoading(false);
  };

  if (success) return (
    <div style={styles.successBox}>
      <div style={styles.successOrb}>
        <CheckCircle size={40} color="#fff" />
      </div>
      <h2 style={{ color: '#10b981', fontSize: 22, fontWeight: 800, marginTop: 16 }}>Issue Reported Successfully!</h2>
      <p style={{ color: 'var(--text-sub)', fontSize: 14 }}>Redirecting to issues list...</p>
    </div>
  );

  const urgencyConfig = {
    low:      { bg: '#10b981', label: '🟢 Low' },
    medium:   { bg: '#2563eb', label: '🔵 Medium' },
    high:     { bg: '#f59e0b', label: '🟠 High' },
    critical: { bg: '#ef4444', label: '🔴 Critical' }
  };

  return (
    <div style={styles.page} className="page-enter">
      <div style={styles.container} className="glass-panel">
        {/* Header */}
        <div style={styles.headerRow}>
          <div style={styles.headerOrb}>
            <AlertTriangle size={24} color="#fff" />
          </div>
          <div>
            <h2 style={styles.title}>Report a City Issue</h2>
            <p style={styles.subtitle}>AI will automatically classify and prioritize your report</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>Issue Title *</label>
            <input name="title" value={form.title} onChange={handleChange} required
              placeholder="Short description of the issue" style={styles.input} />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Description *</label>
            <textarea name="description" value={form.description} onChange={handleChange} required
              placeholder="Describe the issue in detail... (AI will auto-classify as you type)"
              rows={4} style={{ ...styles.input, resize: 'vertical', lineHeight: 1.6 }} />
          </div>

          {/* NLP Result Card */}
          {nlpResult && (
            <div style={styles.nlpCard}>
              <div style={styles.nlpHeader}>
                <BrainCircuit size={16} color="#2563eb" />
                <span style={styles.nlpTitle}>AI Classification</span>
                <span style={styles.nlpBadge}>Live Analysis</span>
              </div>
              <div style={styles.nlpGrid}>
                <div style={styles.nlpItem}>
                  <span style={styles.nlpLabel}>Category</span>
                  <span style={styles.nlpValue}>📁 {nlpResult.category}</span>
                </div>
                <div style={styles.nlpItem}>
                  <span style={styles.nlpLabel}>Urgency</span>
                  <span style={{ ...styles.nlpValue, color: nlpResult.urgency === 'critical' ? '#ef4444' : '#f59e0b' }}>⚠️ {nlpResult.urgency}</span>
                </div>
                <div style={styles.nlpItem}>
                  <span style={styles.nlpLabel}>Sentiment</span>
                  <span style={styles.nlpValue}>💬 {nlpResult.sentiment}</span>
                </div>
                <div style={styles.nlpItem}>
                  <span style={styles.nlpLabel}>Confidence</span>
                  <span style={styles.nlpValue}>📊 {nlpResult.confidence}%</span>
                </div>
              </div>
            </div>
          )}

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Location *</label>
              <LocationInput value={form.location} onChange={handleChange} required
                placeholder="e.g. Area 3, MG Road" style={styles.input} />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Category</label>
              <select name="category" value={form.category || nlpResult?.category || ''} onChange={handleChange} style={styles.input}>
                <option value="">Auto-detect</option>
                <option value="safety">🛡️ Safety</option>
                <option value="pollution">💨 Pollution</option>
                <option value="traffic">🚗 Traffic</option>
                <option value="waste">🗑️ Waste</option>
                <option value="convenience">🏗️ Convenience</option>
              </select>
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Evidence (Image)</label>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{...styles.input, padding: '12px'}} />
            {uploadingImage && <span style={{ color: '#2563eb', fontSize: 12 }}>Uploading to Amazon S3...</span>}
            {imageKey && <span style={{ color: '#10b981', fontSize: 12 }}>✓ Uploaded securely to S3</span>}
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Urgency Level</label>
            <div style={styles.urgencyRow}>
              {Object.entries(urgencyConfig).map(([key, cfg]) => {
                const active = form.urgency === key;
                return (
                  <button key={key} type="button"
                    onClick={() => setForm(f => ({ ...f, urgency: key }))}
                    style={{ 
                      ...styles.urgencyBtn, 
                      background: active ? cfg.bg : 'var(--bg-input)', 
                      borderColor: active ? cfg.bg : 'var(--border-main)',
                      color: active ? '#ffffff' : 'var(--text-muted)',
                      boxShadow: active ? `0 4px 12px ${cfg.bg}33` : 'none',
                      transform: active ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button type="submit" disabled={loading} style={{
            ...styles.submitBtn,
            opacity: loading ? 0.7 : 1,
          }}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span style={{ width: 18, height: 18, border: '2px solid #fff4', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'inline-block' }} />
                Analyzing & Submitting...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Send size={16} /> Submit Report
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page:       { background: 'var(--bg-page)', minHeight: '100vh', padding: 28 },
  container:  { maxWidth: 720, margin: '0 auto', background: 'var(--bg-card)', borderRadius: 20, padding: 32, border: '1px solid var(--border-main)', boxShadow: 'var(--shadow-md, 0 4px 16px rgba(0,0,0,0.06))' },
  headerRow:  { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid var(--border-light)' },
  headerOrb:  { width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(245,158,11,0.3)', flexShrink: 0 },
  title:      { color: 'var(--text-main)', fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 },
  subtitle:   { color: 'var(--text-sub)', fontSize: 13, margin: '4px 0 0', fontWeight: 500 },
  field:      { marginBottom: 18 },
  label:      { display: 'block', color: 'var(--text-muted)', fontSize: 13, marginBottom: 7, fontWeight: 600 },
  input:      { width: '100%', padding: '12px 14px', background: 'var(--bg-input)', border: '1px solid var(--border-main)', borderRadius: 10, color: 'var(--text-main)', fontSize: 14, display: 'block', boxSizing: 'border-box' },
  row:        { display: 'flex', gap: 16 },
  nlpCard:    { background: 'linear-gradient(135deg, rgba(37,99,235,0.04), rgba(124,58,237,0.04))', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 14, padding: 18, marginBottom: 18 },
  nlpHeader:  { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  nlpTitle:   { color: 'var(--brand-primary)', fontWeight: 700, fontSize: 14, flex: 1 },
  nlpBadge:   { fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(37,99,235,0.1)', color: 'var(--brand-primary)' },
  nlpGrid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  nlpItem:    { background: 'var(--bg-card)', borderRadius: 10, padding: '10px 14px', border: '1px solid var(--border-light)' },
  nlpLabel:   { display: 'block', color: 'var(--text-sub)', fontSize: 11, marginBottom: 4, fontWeight: 600 },
  nlpValue:   { color: 'var(--text-main)', fontWeight: 700, fontSize: 14 },
  submitBtn:  { width: '100%', padding: 15, background: 'var(--gradient-brand, linear-gradient(135deg,#2563eb,#7c3aed))', border: 'none', borderRadius: 12, color: '#ffffff', fontSize: 15, fontWeight: 700, marginTop: 8, boxShadow: '0 4px 18px rgba(37,99,235,0.25)', cursor: 'pointer' },
  successBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: 4, background: 'var(--bg-page)' },
  successOrb: { width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(16,185,129,0.3)' },
  urgencyRow: { display: 'flex', gap: 10 },
  urgencyBtn: { flex: 1, padding: '11px', border: '1.5px solid', borderRadius: 10, fontSize: 13, fontWeight: 600, textTransform: 'capitalize', cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)' },
};
