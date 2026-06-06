import React, { useState, useEffect } from 'react';
import { getLeaderboard, getCommunityMissions } from '../services/engagementService';
import { getUserData } from '../services/authService';
import { Users, Target, Trophy, Medal, UserCircle } from 'lucide-react';

export default function CommunityPage({ user }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [missions, setMissions] = useState([]);
  const [myProfile, setMyProfile] = useState(null);

  useEffect(() => {
    async function loadData() {
      const lb = await getLeaderboard();
      setLeaderboard(lb);
      setMissions(getCommunityMissions());
      
      if (user?.uid) {
        const profile = await getUserData(user.uid);
        setMyProfile(profile);
      }
    }
    loadData();
  }, [user]);

  return (
    <div style={S.page}>
      <style>{`
        @keyframes fillBar { from { width: 0; } }
      `}</style>
      
      <div style={S.header}>
        <div>
          <span style={{display:'block', marginBottom:10}}><Users size={42} color="#1a73e8" /></span>
          <h1 style={S.title}>Community Intelligence</h1>
          <p style={S.subtitle}>Trust Scores, Badges, and Civic Leaderboards</p>
        </div>
      </div>

      <div style={S.grid2}>
        {/* Left Column: My Profile & Missions */}
        <div style={{display:'flex', flexDirection:'column', gap:24}}>
          
          <div className="glass-panel" style={S.card}>
            <h2 style={{...S.cardTitle, display:'flex', alignItems:'center', gap:8}}><UserCircle size={22} color="#1a73e8" /> My Civic Profile</h2>
            {myProfile ? (
              <div>
                <div style={{display:'flex', alignItems:'center', gap:16, marginBottom:20}}>
                  <div style={{width:60, height:60, borderRadius:'50%', background:'var(--brand-primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, fontWeight:800}}>
                    {myProfile.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{margin:0, fontSize:20, color:'var(--text-main)'}}>{myProfile.name}</h3>
                    <p style={{margin:0, color:'var(--text-sub)', fontSize:14}}>{myProfile.email}</p>
                  </div>
                </div>

                <div style={{display:'flex', gap:10, marginBottom:20}}>
                  <div style={{...S.statBox, flex:1, borderColor: myProfile.trustScore >= 80 ? '#00cc66' : myProfile.trustScore >= 50 ? '#ffcc00' : '#ff4444'}}>
                    <span style={{fontSize:12, color:'var(--text-sub)'}}>Trust Score</span>
                    <span style={{fontSize:24, fontWeight:800, color: myProfile.trustScore >= 80 ? '#00cc66' : myProfile.trustScore >= 50 ? '#ffcc00' : '#ff4444'}}>{myProfile.trustScore}/100</span>
                  </div>
                  <div style={{...S.statBox, flex:1}}>
                    <span style={{fontSize:12, color:'var(--text-sub)'}}>Civic Points</span>
                    <span style={{fontSize:24, fontWeight:800, color:'var(--brand-primary)'}}>{myProfile.civicPoints || 0}</span>
                  </div>
                </div>

                <div>
                  <span style={{fontSize:12, color:'var(--text-sub)', fontWeight:700, textTransform:'uppercase'}}>My Badges</span>
                  <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
                    {(myProfile.badges || []).map(b => (
                      <span key={b} style={S.badge}><Medal size={14} style={{marginRight: 4}}/> {b}</span>
                    ))}
                    {(!myProfile.badges || myProfile.badges.length === 0) && <span style={{color:'var(--text-sub)', fontSize:13}}>No badges yet. Complete missions to earn them!</span>}
                  </div>
                </div>
              </div>
            ) : <p style={{color:'var(--text-sub)'}}>Loading profile...</p>}
          </div>

          <div className="glass-panel" style={S.card}>
            <h2 style={{...S.cardTitle, display:'flex', alignItems:'center', gap:8}}><Target size={22} color="#ff4444" /> Active Missions</h2>
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              {missions.map(m => (
                <div key={m.id} style={{background:'var(--bg-input)', padding:16, borderRadius:12, border:'1px solid var(--border-main)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:8}}>
                    <b style={{color:'var(--text-main)'}}>{m.title}</b>
                    <span style={{color:'#ffcc00', fontWeight:800, fontSize:13}}>+{m.reward} pts</span>
                  </div>
                  <p style={{fontSize:13, color:'var(--text-sub)', margin:'0 0 12px'}}>{m.description}</p>
                  
                  <div style={{background:'var(--bg-card)', height:6, borderRadius:3, overflow:'hidden'}}>
                    <div style={{height:'100%', width:`${(m.progress/m.target)*100}%`, background:'var(--brand-primary)', animation:'fillBar 1s ease'}}/>
                  </div>
                  <div style={{display:'flex', justifyContent:'flex-end', marginTop:4}}>
                    <span style={{fontSize:11, color:'var(--text-muted)'}}>{m.progress} / {m.target}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: Leaderboard */}
        <div className="glass-panel" style={S.card}>
          <h2 style={{...S.cardTitle, display:'flex', alignItems:'center', gap:8}}><Trophy size={22} color="#ffcc00" /> City Leaderboard</h2>
          <p style={{fontSize:13, color:'var(--text-sub)', margin:'-10px 0 20px'}}>Top citizens making a difference.</p>
          
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {leaderboard.map((lb, idx) => (
              <div key={lb.id} style={{
                display:'flex', alignItems:'center', padding:16, borderRadius:12,
                background: idx === 0 ? 'rgba(255, 204, 0, 0.1)' : idx === 1 ? 'rgba(170, 170, 170, 0.1)' : idx === 2 ? 'rgba(205, 127, 50, 0.1)' : 'var(--bg-input)',
                border: `1px solid ${idx === 0 ? '#ffcc00' : idx === 1 ? '#aaaaaa' : idx === 2 ? '#cd7f32' : 'var(--border-main)'}`
              }}>
                <span style={{width:30, fontSize:20, fontWeight:800, color: idx===0?'#ffcc00':idx===1?'#aaa':idx===2?'#cd7f32':'var(--text-sub)'}}>
                  #{idx + 1}
                </span>
                
                <div style={{flex:1, marginLeft:10}}>
                  <p style={{margin:0, fontWeight:700, color:'var(--text-main)'}}>{lb.name}</p>
                  <div style={{display:'flex', gap:6, marginTop:4}}>
                    {(lb.badges || []).slice(0, 2).map(b => (
                      <span key={b} style={{fontSize:10, background:'var(--bg-card)', padding:'2px 6px', borderRadius:4, border:'1px solid var(--border-light)', display:'flex', alignItems:'center', gap:4}}><Medal size={10} color="#ffcc00"/> {b}</span>
                    ))}
                  </div>
                </div>

                <div style={{textAlign:'right'}}>
                  <span style={{display:'block', fontSize:18, fontWeight:800, color:'var(--brand-primary)'}}>{lb.civicPoints || 0}</span>
                  <span style={{fontSize:11, color:'var(--text-sub)'}}>pts</span>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && <p style={{color:'var(--text-sub)'}}>No data available.</p>}
          </div>
        </div>

      </div>
    </div>
  );
}

const S = {
  page: { padding: '30px', maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, sans-serif' },
  header: { marginBottom: 30 },
  title: { fontSize: 28, fontWeight: 800, color: 'var(--text-main)', margin: 0, letterSpacing: '-0.02em' },
  subtitle: { fontSize: 14, color: 'var(--text-sub)', margin: '4px 0 0' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 24 },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border-main)', borderRadius: 16, padding: 24 },
  cardTitle: { fontSize: 18, fontWeight: 700, color: 'var(--text-main)', margin: '0 0 20px' },
  statBox: { background: 'var(--bg-input)', padding: 16, borderRadius: 12, border: '1px solid var(--border-main)', display: 'flex', flexDirection: 'column', gap: 4 },
  badge: { background: '#ffcc0022', color: '#ffcc00', border: '1px solid #ffcc0044', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }
};
