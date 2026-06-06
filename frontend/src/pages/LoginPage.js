import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser, loginWithGoogle, resetPassword, setupRecaptcha, sendPhoneOtp, verifyPhoneOtp } from '../services/authService';
import { useTranslation } from 'react-i18next';

import CityCanvas from '../components/CityCanvas';

export default function LoginPage() {
  const { t } = useTranslation();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMsg, setResetMsg] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const [loginMethod, setLoginMethod] = useState('email'); // 'email' | 'phone'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confResult, setConfResult] = useState(null);

  // Pre-initialize reCAPTCHA to prevent auth/invalid-app-credential
  useEffect(() => {
    if (loginMethod === 'phone' && !window.recaptchaVerifier) {
      try {
        setupRecaptcha('recaptcha-container');
      } catch (err) {
        console.warn('Recaptcha init warning:', err);
      }
    }
  }, [loginMethod]);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try { 
      const res = await loginUser(email, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.error || 'Invalid email or password. Please try again.');
      }
    }
    catch(err) { setError(err.message || 'Invalid email or password. Please try again.'); }
    setLoading(false);
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      let appVerifier = window.recaptchaVerifier;
      if (!appVerifier) {
        appVerifier = setupRecaptcha('recaptcha-container');
      }
      const result = await sendPhoneOtp(phone, appVerifier);
      setConfResult(result);
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to send OTP.');
    }
    setLoading(false);
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      await verifyPhoneOtp(confResult, otp);
      navigate('/');
    } catch (err) {
      setError('Invalid OTP. Please try again.');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setLoading(true); setError('');
    try { await loginWithGoogle(); navigate('/'); }
    catch { setError('Google sign-in failed.'); }
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault(); setResetLoading(true); setResetErr(''); setResetMsg('');
    try {
      await resetPassword(resetEmail);
      setResetMsg('Password reset email sent! Check your inbox.');
    } catch (err) {
      setResetErr(err.message || 'Failed to send reset email.');
    }
    setResetLoading(false);
  };

  return (
    <div className="auth-page" style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideTag{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:translateX(0)}}
        @keyframes cityGlow{0%,100%{text-shadow:0 0 20px rgba(68,136,255,0.3)}50%{text-shadow:0 0 40px rgba(68,136,255,0.7),0 0 80px rgba(68,136,255,0.2)}}
        @keyframes pulse2{0%,100%{opacity:0.7;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box;margin:0;padding:0}
        .auth-page {
          --bg-page: #000510;
          --bg-card: rgba(10, 17, 34, 0.6);
          --bg-card-hover: rgba(20, 27, 44, 0.8);
          --bg-input: rgba(0, 5, 16, 0.6);
          --border-main: rgba(68, 136, 255, 0.15);
          --border-light: rgba(68, 136, 255, 0.08);
          --text-main: #ffffff;
          --text-sub: rgba(140, 160, 220, 0.7);
          --text-muted: rgba(140, 160, 220, 0.5);
        }
        .sc-input{width:100%;padding:14px 16px;background:var(--bg-input);border:1px solid var(--border-main);border-radius:12px;color:var(--text-main);font-family:'DM Sans',sans-serif;font-size:15px;outline:none;transition:all 0.25s ease;display:block}
        .sc-input::placeholder{color:var(--text-sub)}
        .sc-input:focus{border-color:rgba(68,136,255,0.6);background:var(--bg-card-hover);box-shadow:0 0 0 3px rgba(68,136,255,0.1),inset 0 1px 0 rgba(68,136,255,0.1)}
        .sc-submit{width:100%;padding:15px;background:linear-gradient(135deg,#1a5fe8,#0d40b0);border:none;border-radius:12px;color:#fff;font-family:'Syne',sans-serif;font-size:16px;font-weight:700;letter-spacing:0.02em;cursor:pointer;transition:all 0.3s ease;box-shadow:0 4px 24px rgba(26,95,232,0.35);position:relative;overflow:hidden}
        .sc-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 32px rgba(26,95,232,0.55)}
        .sc-submit::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.12) 0%,transparent 60%);pointer-events:none}
        .sc-google{width:100%;padding:13px;background:var(--bg-input);border:1px solid var(--border-main);border-radius:12px;color:var(--text-main);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.25s ease;display:flex;align-items:center;justify-content:center;gap:10px}
        .sc-google:hover{background:var(--bg-card-hover);border-color:var(--border-main);transform:translateY(-1px)}
        .sc-show-pass{position:absolute;right:14px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(140,160,220,0.4);cursor:pointer;font-size:12px;padding:4px 6px;border-radius:6px;font-family:'DM Sans',sans-serif;transition:color 0.2s}
        .sc-show-pass:hover{color:rgba(140,160,220,0.8)}
        .stat-chip:hover{background:rgba(68,136,255,0.12)!important;border-color:rgba(68,136,255,0.35)!important}
      `}</style>

      <CityCanvas />
      <div style={S.vignette}/>

      {/* Left branding */}
      <div style={S.left}>
        <div style={{animation:'fadeUp 0.6s ease'}}>
          <div style={S.logoMark}>🏙️</div>
          <h1 style={S.brandName}>SmartCity</h1>
          <p style={S.brandSub}>Urban Intelligence Platform</p>
        </div>
        <div style={S.taglines}>
          {['Real-time city monitoring','AI-powered issue resolution','Community-first governance'].map((t,i)=>(
            <div key={t} style={{...S.tagline, animationDelay:`${i*0.15+0.5}s`}}>
              <span style={S.tagDot}/><span>{t}</span>
            </div>
          ))}
        </div>
        <div style={S.cityStats}>
          {[['2.4M','Citizens Connected'],['98.2%','System Uptime'],['<90s','Avg Response']].map(([v,l])=>(
            <div key={l} style={S.cityStat}>
              <span style={S.csVal}>{v}</span>
              <span style={S.csLabel}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div style={S.right}>
        <div style={S.card}>
          <div style={S.cardGlow}/>
          <div style={S.cardHeader}>
            <div style={S.cardLogo}><span style={{fontSize:22}}>🏙️</span></div>
            <div>
              <h2 style={S.cardTitle}>{t('login.welcome_back', 'Welcome back')}</h2>
              <p style={S.cardSub}>{t('login.sign_in_sub', 'Sign in to your city dashboard')}</p>
            </div>
          </div>

          <div style={S.chips}>
            {[['14','Features'],['AI','Powered'],['Live','Data']].map(([v,l])=>(
              <div key={l} className="stat-chip" style={S.chip}>
                <span style={S.chipVal}>{v}</span>
                <span style={S.chipLabel}>{l}</span>
              </div>
            ))}
          </div>

          <div style={S.methodToggle}>
            <button 
              type="button" 
              style={{...S.methodBtn, background: loginMethod === 'email' ? 'rgba(68,136,255,0.15)' : 'transparent', color: loginMethod === 'email' ? '#e8eeff' : 'rgba(140,160,220,0.5)'}}
              onClick={() => { setLoginMethod('email'); setError(''); }}
            >
              ✉ Email
            </button>
            <button 
              type="button" 
              style={{...S.methodBtn, background: loginMethod === 'phone' ? 'rgba(68,136,255,0.15)' : 'transparent', color: loginMethod === 'phone' ? '#e8eeff' : 'rgba(140,160,220,0.5)'}}
              onClick={() => { setLoginMethod('phone'); setError(''); }}
            >
              📱 Phone
            </button>
          </div>

          {loginMethod === 'email' ? (
            <form onSubmit={handleLogin}>
              <div style={S.field}>
                <label style={S.lbl}>{t('login.email_label', 'Email address')}</label>
                <input className="sc-input" type="email" value={email}
                  onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required/>
              </div>
              <div style={S.field}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <label style={S.lbl}>{t('login.password_label', 'Password')}</label>
                  <span style={S.forgot} onClick={() => { setShowReset(true); setResetEmail(email); setResetMsg(''); setResetErr(''); }}>{t('login.forgot_password', 'Forgot password?')}</span>
                </div>
                <div style={{position:'relative'}}>
                  <input className="sc-input" type={showPass?'text':'password'} value={password}
                    onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required style={{paddingRight:54}}/>
                  <button type="button" className="sc-show-pass" onClick={()=>setShowPass(s=>!s)}>
                    {showPass?'Hide':'Show'}
                  </button>
                </div>
              </div>
              {error && <div style={S.err}>⚠ {error}</div>}
              <button type="submit" className="sc-submit" disabled={loading}>
                {loading
                  ? <span style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                      <span style={{width:15,height:15,border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid #fff',borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}}/>
                      Signing in…
                    </span>
                  : t('login.sign_in_btn', 'Sign In →')}
              </button>
            </form>
          ) : (
            <div>
              {!otpSent ? (
                <form onSubmit={handlePhoneSubmit}>
                  <div style={S.field}>
                    <label style={S.lbl}>{t('login.phone_label', 'Phone Number')}</label>
                    <input className="sc-input" type="tel" value={phone}
                      onChange={e=>setPhone(e.target.value)} placeholder="+1 555 555 5555" required/>
                  </div>
                  
                  {/* VISIBLE RECAPTCHA CONTAINER */}
                  <div id="recaptcha-container" style={{marginBottom: 16, display: 'flex', justifyContent: 'center'}}></div>

                  {error && <div style={S.err}>⚠ {error}</div>}
                  <button type="submit" className="sc-submit" disabled={loading}>
                    {loading ? 'Sending...' : t('login.send_otp', 'Send OTP →')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit}>
                  <div style={S.field}>
                    <label style={S.lbl}>Enter 6-digit OTP sent to {phone}</label>
                    <input className="sc-input" type="text" value={otp}
                      onChange={e=>setOtp(e.target.value)} placeholder="123456" required maxLength="6"/>
                  </div>
                  {error && <div style={S.err}>⚠ {error}</div>}
                  <button type="submit" className="sc-submit" disabled={loading}>
                    {loading ? 'Verifying...' : t('login.verify_otp', 'Verify & Sign In →')}
                  </button>
                  <button type="button" onClick={() => setOtpSent(false)} style={{background:'none',border:'none',color:'rgba(140,160,220,0.6)',fontSize:13,width:'100%',marginTop:12,cursor:'pointer'}}>
                    {t('login.change_phone', 'Change Phone Number')}
                  </button>
                </form>
              )}
            </div>
          )}

          <div style={S.div}>
            <div style={S.divLine}/><span style={S.divTxt}>or continue with</span><div style={S.divLine}/>
          </div>

          <button className="sc-google" onClick={handleGoogle} disabled={loading}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {t('login.continue_google', 'Continue with Google')}
          </button>

          <p style={S.footer}>{t('login.no_account', 'No account?')} <Link to="/register" style={S.footerLink}>{t('login.create_one', 'Create one →')}</Link></p>

          <div style={S.live}>
            <span style={S.liveDot}/>
            <span style={S.liveTxt}>{t('login.system_status', 'System operational · Amazon Cognito secured')}</span>
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showReset && (
        <div style={S.overlay} onClick={() => setShowReset(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
              <h3 style={{color:'#e8eeff',fontFamily:"'Syne',sans-serif",fontSize:18,fontWeight:700,margin:0}}>🔑 Reset Password</h3>
              <button onClick={() => setShowReset(false)} style={{background:'none',border:'none',color:'rgba(140,160,220,0.5)',fontSize:20,cursor:'pointer'}}>✕</button>
            </div>
            <p style={{color:'rgba(140,160,220,0.5)',fontSize:13,marginBottom:20}}>Enter your email address and we'll send you a link to reset your password.</p>
            <form onSubmit={handleReset}>
              <input className="sc-input" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                placeholder="you@example.com" required style={{marginBottom:14}} />
              {resetMsg && <div style={{background:'rgba(0,204,102,0.08)',border:'1px solid rgba(0,204,102,0.2)',color:'#00cc66',fontSize:13,padding:'10px 14px',borderRadius:10,marginBottom:14}}>✓ {resetMsg}</div>}
              {resetErr && <div style={S.err}>⚠ {resetErr}</div>}
              <button type="submit" className="sc-submit" disabled={resetLoading}>
                {resetLoading ? 'Sending...' : 'Send Reset Link →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page:{display:'flex',minHeight:'100vh',position:'relative',overflow:'hidden',fontFamily:"'DM Sans',sans-serif",background:'var(--bg-page)'},
  vignette:{position:'absolute',inset:0,background:'radial-gradient(ellipse at center, transparent 10%, var(--bg-page) 90%)',pointerEvents:'none',zIndex:1},
  left:{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'60px',position:'relative',zIndex:2},
  logoMark:{fontSize:50,display:'block',marginBottom:14,filter:'drop-shadow(0 0 24px rgba(68,136,255,0.6))'},
  brandName:{fontFamily:"'Syne',sans-serif",fontSize:54,fontWeight:800,color:'var(--text-main)',letterSpacing:'-0.04em',lineHeight:1,animation:'cityGlow 3s ease-in-out infinite'},
  brandSub:{color:'var(--text-sub)',fontSize:15,marginTop:10,letterSpacing:'0.06em',textTransform:'uppercase',fontWeight:400},
  taglines:{display:'flex',flexDirection:'column',gap:14,margin:'40px 0'},
  tagline:{display:'flex',alignItems:'center',gap:12,color:'var(--text-muted)',fontSize:15,opacity:0,animation:'slideTag 0.5s ease forwards'},
  tagDot:{width:6,height:6,borderRadius:'50%',background:'#4488ff',boxShadow:'0 0 8px rgba(68,136,255,0.9)',flexShrink:0},
  cityStats:{display:'flex',gap:36},
  cityStat:{display:'flex',flexDirection:'column',gap:4},
  csVal:{fontFamily:"'Syne',sans-serif",color:'#4488ff',fontSize:26,fontWeight:800,textShadow:'0 0 20px rgba(68,136,255,0.5)'},
  csLabel:{color:'var(--text-sub)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.08em'},
  right:{display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 60px 40px 20px',position:'relative',zIndex:2},
  card:{width:440,background:'var(--bg-card)',border:'1px solid var(--border-main)',borderRadius:28,padding:'40px 40px 32px',boxShadow:'0 24px 48px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',animation:'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',position:'relative',overflow:'hidden',zIndex:3},
  cardGlow:{position:'absolute',top:0,left:'20%',right:'20%',height:1,background:'linear-gradient(90deg,transparent,rgba(68,136,255,0.5),transparent)',pointerEvents:'none'},
  cardHeader:{display:'flex',alignItems:'center',gap:14,marginBottom:20},
  cardLogo:{width:48,height:48,background:'linear-gradient(135deg,rgba(68,136,255,0.18),rgba(68,136,255,0.05))',border:'1px solid rgba(68,136,255,0.2)',borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  cardTitle:{fontFamily:"'Syne',sans-serif",color:'var(--text-main)',fontSize:20,fontWeight:700,letterSpacing:'-0.02em'},
  cardSub:{color:'var(--text-sub)',fontSize:13,marginTop:2},
  chips:{display:'flex',gap:8},
  chip:{flex:1,padding:'8px 0',background:'rgba(68,136,255,0.06)',border:'1px solid rgba(68,136,255,0.14)',borderRadius:10,display:'flex',flexDirection:'column',alignItems:'center',gap:2,cursor:'default',transition:'all 0.2s'},
  chipVal:{fontFamily:"'Syne',sans-serif",color:'var(--brand-primary)',fontSize:15,fontWeight:800},
  chipLabel:{color:'rgba(140,160,220,0.45)',fontSize:9,textTransform:'uppercase',letterSpacing:'0.1em'},
  methodToggle:{display:'flex',background:'var(--bg-input)',borderRadius:12,padding:4,marginBottom:20,marginTop:20},
  methodBtn:{flex:1,padding:'10px 0',border:'none',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.2s'},
  field:{marginBottom:16},
  lbl:{display:'block',color:'var(--text-sub)',fontSize:11,fontWeight:500,letterSpacing:'0.04em',textTransform:'uppercase',marginBottom:8},
  forgot:{color:'rgba(68,136,255,0.55)',fontSize:12,cursor:'pointer'},
  err:{background:'rgba(255,68,68,0.07)',border:'1px solid rgba(255,68,68,0.2)',color:'#ff9999',fontSize:13,padding:'10px 14px',borderRadius:10,marginBottom:14,display:'flex',alignItems:'center',gap:8},
  div:{display:'flex',alignItems:'center',gap:12,margin:'20px 0'},
  divLine:{flex:1,height:1,background:'rgba(68,136,255,0.1)'},
  divTxt:{color:'rgba(140,160,220,0.3)',fontSize:11,whiteSpace:'nowrap',letterSpacing:'0.05em'},
  footer:{color:'rgba(140,160,220,0.38)',fontSize:13,textAlign:'center',marginTop:20},
  footerLink:{color:'var(--brand-primary)',fontWeight:700,textDecoration:'none'},
  live:{display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginTop:14},
  liveDot:{width:8,height:8,borderRadius:'50%',background:'#00cc66',boxShadow:'0 0 12px rgba(0,204,102,0.4)',animation:'pulse2 2s ease-in-out infinite',display:'inline-block'},
  liveTxt:{color:'rgba(140,160,220,0.28)',fontSize:11},
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999},
  modal:{background:'var(--bg-card)',border:'1px solid var(--border-main)',borderRadius:20,padding:'28px',width:'100%',maxWidth:420,boxShadow:'0 32px 64px var(--shadow-lg)'},
};
