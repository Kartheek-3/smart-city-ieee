import React, { useState, useEffect, useRef } from 'react';
import { askSmartCityBot } from '../services/sagemaker';
import { subscribeToIssues } from '../services/issueService';
import { subscribeToWasteReports, subscribeToActiveRoutes } from '../services/wasteService';
import { subscribeToCrimes, subscribeToAccidents } from '../services/safetyService';

export default function GlobalChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLog, setChatLog] = useState([
    { sender: 'ai', text: 'Hello! I am the Smart City Civic Assistant, powered by Amazon SageMaker. I am analyzing live city data. How can I help you today?' }
  ]);
  const [loading, setLoading] = useState(false);
  
  // Massive Live Data Context for Vertex AI
  const [cityContext, setCityContext] = useState({
    issues: { open: 0, critical: 0 },
    wasteReports: 0,
    wasteRoutes: 0,
    safety: { activeIncidents: 0 }
  });

  const chatEndRef = useRef(null);

  useEffect(() => {
    const unsubIssues = subscribeToIssues(issues => {
      setCityContext(prev => ({
        ...prev,
        issues: {
          open: issues.filter(i => i.status === 'open').length,
          critical: issues.filter(i => i.urgency === 'critical').length
        }
      }));
    });

    const unsubWaste = subscribeToWasteReports(reports => {
      setCityContext(prev => ({ ...prev, wasteReports: reports.filter(r => r.status === 'open').length }));
    });
    const unsubRoutes = subscribeToActiveRoutes(routes => {
      setCityContext(prev => ({ ...prev, wasteRoutes: routes.length }));
    });
    const unsubCrimes = subscribeToCrimes(crimes => {
      setCityContext(prev => ({ 
        ...prev, 
        safety: { ...prev.safety, activeIncidents: (prev.safety.activeIncidents || 0) + crimes.length } 
      }));
    });

    return () => {
      unsubIssues();
      unsubWaste();
      unsubRoutes();
      unsubCrimes();
    };
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatLog, isOpen]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const msg = chatInput.trim();
    setChatInput('');
    setChatLog(prev => [...prev, { sender: 'user', text: msg }]);
    setLoading(true);

    try {
      // Dynamically fetch ALL live website data (Analytics) to feed the AI
      const { getCityAnalytics } = require('../services/analyticsService');
      const analyticsResult = await getCityAnalytics();
      const liveData = analyticsResult.success ? analyticsResult.data : {};

      // Merge realtime subscriptions with full DB analytics
      const fullContext = {
        ...cityContext,
        analytics: liveData
      };

      // Call our Amazon SageMaker service, passing in the massively aggregated data context
      const res = await askSmartCityBot(msg, fullContext);
      setChatLog(prev => [...prev, { sender: 'ai', text: res.text }]);
    } catch (err) {
      console.error(err);
      setChatLog(prev => [...prev, { sender: 'ai', text: 'Error connecting to knowledge base.' }]);
    }
    
    setLoading(false);
  };

  return (
    <div style={S.container}>
      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseChat { 0% { box-shadow: 0 0 0 0 rgba(68,136,255,0.7); } 70% { box-shadow: 0 0 0 10px rgba(68,136,255,0); } 100% { box-shadow: 0 0 0 0 rgba(68,136,255,0); } }
        .chat-scroll::-webkit-scrollbar { width: 6px; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
      `}</style>

      {/* Chat Window */}
      {isOpen && (
        <div style={S.chatWindow}>
          <div style={S.header}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <span style={{fontSize:20}}>🧠</span>
              <div>
                <p style={S.headerTitle}>Civic Assistant</p>
                <p style={S.headerSub}>Powered by Amazon SageMaker</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={S.closeBtn}>✕</button>
          </div>

          <div className="chat-scroll" style={S.messageArea}>
            {chatLog.map((msg, i) => (
              <div key={i} style={{...S.msgBubble, ...(msg.sender === 'ai' ? S.msgAi : S.msgUser)}}>
                {msg.text}
              </div>
            ))}
            {loading && (
              <div style={{...S.msgBubble, ...S.msgAi, fontStyle:'italic', color:'var(--text-sub)'}}>
                Thinking...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={S.inputArea}>
            <input 
              style={S.input} 
              placeholder="Ask about city services..." 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" style={S.sendBtn} disabled={loading || !chatInput.trim()}>
              ➤
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button */}
      <button 
        style={{...S.fab, animation: !isOpen ? 'pulseChat 2s infinite' : 'none'}}
        onClick={() => setIsOpen(!isOpen)}
        title="Ask Civic Assistant"
      >
        {isOpen ? '✕' : '💬'}
      </button>
    </div>
  );
}

const S = {
  container: { position: 'fixed', bottom: 24, right: 24, zIndex: 99999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 },
  fab: { 
    width: 60, height: 60, borderRadius: '50%', background: 'var(--brand-primary)', border: 'none', 
    color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)', transition: 'transform 0.2s',
  },
  chatWindow: { 
    width: 350, height: 500, background: 'var(--bg-card)', border: '1px solid var(--border-main)', 
    borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.8)', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  },
  header: { 
    padding: '12px 16px', background: 'var(--bg-card-hover)', borderBottom: '1px solid var(--border-main)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
  },
  headerTitle: { margin: 0, color: 'var(--text-main)', fontSize: 15, fontWeight: 700 },
  headerSub: { margin: '2px 0 0', color: 'var(--brand-primary)', fontSize: 11, fontWeight: 600 },
  closeBtn: { background: 'transparent', border: 'none', color: 'var(--text-sub)', fontSize: 16, cursor: 'pointer' },
  messageArea: { flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, background: 'var(--bg-page)' },
  msgBubble: { padding: '10px 14px', borderRadius: 14, fontSize: 14, lineHeight: 1.4, maxWidth: '85%', wordBreak: 'break-word' },
  msgAi: { background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-main)', borderBottomLeftRadius: 4, alignSelf: 'flex-start' },
  msgUser: { background: 'var(--brand-primary)', color: '#fff', borderBottomRightRadius: 4, alignSelf: 'flex-end' },
  inputArea: { display: 'flex', padding: 12, background: 'var(--bg-card-hover)', borderTop: '1px solid var(--border-main)', gap: 8 },
  input: { flex: 1, padding: '10px 14px', borderRadius: 20, border: '1px solid var(--border-main)', background: 'var(--bg-input)', color: 'var(--text-main)', fontSize: 14, outline: 'none' },
  sendBtn: { background: 'var(--brand-primary)', color: '#fff', border: 'none', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, transition: 'opacity 0.2s' },
};
