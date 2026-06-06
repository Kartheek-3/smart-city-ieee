import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CityCanvas from '../components/CityCanvas';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { 
  ShieldAlert, Trash2, BrainCircuit, Utensils, 
  Map as MapIcon, Users, LineChart, Link as LinkIcon,
  MapPin, Zap, CheckCircle2, ChevronRight, Sparkles
} from 'lucide-react';

// ── Animated Counter ──────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const start = Date.now();
        const tick = () => {
          const elapsed = Date.now() - start;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// ── Floating Particle ──────────────────────────────────────────
function FloatingParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 6 + 2,
    x: Math.random() * 100,
    delay: Math.random() * 8,
    duration: Math.random() * 10 + 8,
    opacity: Math.random() * 0.4 + 0.1,
  }));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 1 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: `rgba(139,92,246,${p.opacity})`,
          left: `${p.x}%`,
          bottom: '-20px',
          animation: `floatUp ${p.duration}s ${p.delay}s infinite ease-in-out`,
          boxShadow: `0 0 ${p.size * 2}px rgba(139,92,246,0.3)`,
        }} />
      ))}
    </div>
  );
}

const FEATURES = [
  { icon: <ShieldAlert size={28}/>, title: 'Public Safety', desc: 'Real-time incident reporting and emergency response coordination across the city.', color: '#ef4444', delay: '0s' },
  { icon: <Trash2 size={28}/>, title: 'Waste Management', desc: 'Smart collection routes, overflow alerts and recycling zone management.', color: '#10b981', delay: '0.1s' },
  { icon: <BrainCircuit size={28}/>, title: 'AI Civic Hub', desc: 'Machine-learning powered issue prioritization and citizen demand forecasting.', color: '#3b82f6', delay: '0.2s' },
  { icon: <Utensils size={28}/>, title: 'Food Rescue', desc: 'Connect surplus food from restaurants and events to communities in need.', color: '#f59e0b', delay: '0.3s' },
  { icon: <MapIcon size={28}/>, title: 'Live Map', desc: 'Interactive city-wide heat map of all active issues and resource deployments.', color: '#8b5cf6', delay: '0.4s' },
  { icon: <Users size={28}/>, title: 'Community Hub', desc: 'Crowdsource solutions, vote on city proposals and engage with neighbours.', color: '#06b6d4', delay: '0.5s' },
  { icon: <LineChart size={28}/>, title: 'Analytics', desc: 'Deep-dive dashboards with trend analysis for city administrators.', color: '#eab308', delay: '0.6s' },
  { icon: <LinkIcon size={28}/>, title: 'Blockchain Audit', desc: 'Immutable on-chain record for every verified report ensuring full transparency.', color: '#ec4899', delay: '0.7s' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Report an Issue', desc: 'Citizens snap a photo, drop a pin on the map and submit — takes 30 seconds.', icon: <MapPin size={32}/> },
  { step: '02', title: 'AI Prioritises', desc: 'Our AI scores urgency based on type, location density and historical data.', icon: <BrainCircuit size={32}/> },
  { step: '03', title: 'City Acts Fast', desc: 'Officials get notified instantly. Response time drops from weeks to hours.', icon: <Zap size={32}/> },
  { step: '04', title: 'Community Tracks', desc: 'Everyone follows progress live. Resolved issues are logged on-chain forever.', icon: <CheckCircle2 size={32}/> },
];

export default function LandingPage() {
  const { t } = useTranslation();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing-root" style={S.root}>
      <style>{`
        /* Enforce Dark Theme on Landing Page */
        .landing-root {
          --bg-page: #09090b;
          --bg-card: rgba(24, 24, 27, 0.7);
          --bg-card-hover: rgba(39, 39, 42, 0.9);
          --bg-input: rgba(255, 255, 255, 0.05);
          --border-main: rgba(255, 255, 255, 0.1);
          --border-light: rgba(255, 255, 255, 0.05);
          --text-main: #f8fafc;
          --text-muted: #cbd5e1;
          --text-sub: #94a3b8;
        }

        @keyframes floatUp{0%{transform:translateY(0) scale(1);opacity:0}10%{opacity:1}90%{opacity:0.6}100%{transform:translateY(-100vh) scale(0.5);opacity:0}}
        @keyframes fadeInUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
        @keyframes heroGlow{0%,100%{text-shadow:0 0 40px rgba(139,92,246,0.4),0 0 80px rgba(59,130,246,0.1)}50%{text-shadow:0 0 80px rgba(139,92,246,0.8),0 0 160px rgba(59,130,246,0.3)}}
        @keyframes pulseBorder{0%,100%{border-color:rgba(139,92,246,0.2)}50%{border-color:rgba(139,92,246,0.6)}}
        
        .feature-card{transition:all 0.3s cubic-bezier(0.4,0,0.2,1);cursor:default}
        .feature-card:hover{transform:translateY(-8px) scale(1.02)!important;border-color:rgba(139,92,246,0.4)!important;box-shadow:var(--shadow-lg),0 0 32px rgba(139,92,246,0.15)!important}
        
        .step-card{transition:all 0.3s ease}
        .step-card:hover{transform:scale(1.03)}
        
        .nav-link{color:var(--text-muted);font-size:14px;font-weight:600;text-decoration:none;transition:color 0.2s;padding:6px 12px;border-radius:8px}
        .nav-link:hover{color:var(--text-main);background:var(--bg-card-hover)}
        
        .cta-btn{display:inline-flex;align-items:center;gap:10px;padding:16px 32px;background:var(--gradient-brand);border:none;border-radius:14px;color:#fff;font-family:var(--font-body);font-size:16px;font-weight:700;cursor:pointer;transition:all 0.3s ease;box-shadow:0 8px 24px rgba(59,130,246,0.3);text-decoration:none}
        .cta-btn:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(59,130,246,0.5)}
        
        .cta-btn-outline{display:inline-flex;align-items:center;gap:10px;padding:16px 32px;background:var(--bg-input);border:1px solid var(--border-main);border-radius:14px;color:var(--text-main);font-family:var(--font-body);font-size:16px;font-weight:600;cursor:pointer;transition:all 0.3s ease;text-decoration:none}
        .cta-btn-outline:hover{background:var(--bg-card-hover);transform:translateY(-2px)}
      `}</style>

      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <section style={S.hero}>
        <CityCanvas />
        <div style={S.heroVignette} />
        <FloatingParticles />

        {/* Navbar */}
        <nav style={{...S.nav, background: scrollY > 50 ? 'rgba(9,9,11,0.85)' : 'transparent', boxShadow: scrollY > 50 ? '0 4px 30px rgba(0,0,0,0.5)' : 'none' }}>
          <div style={S.navLogo}>
            <Sparkles size={24} color="#8b5cf6" />
            <span style={S.navBrand}>SmartCity</span>
          </div>
          <div style={S.navLinks}>
            <a href="#features" className="nav-link">{t('nav.features', 'Features')}</a>
            <a href="#how" className="nav-link">{t('nav.how_it_works', 'How it Works')}</a>
            <a href="#stats" className="nav-link">{t('nav.impact', 'Impact')}</a>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <LanguageSwitcher />
            <Link to="/login" className="cta-btn-outline" style={{ padding: '10px 22px', fontSize: 14 }}>{t('nav.sign_in', 'Sign In')}</Link>
            <Link to="/register" className="cta-btn" style={{ padding: '10px 24px', fontSize: 14 }}>{t('nav.get_started', 'Get Started')} <ChevronRight size={16}/></Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div style={S.heroContent}>
          <div style={{ animation: 'fadeInUp 0.8s ease both', animationDelay: '0.2s' }}>
            <div style={S.heroBadge}>
              <span style={S.heroBadgeDot} />
              <span>{t('landing.hero_badge', 'Live across 47 cities · 2.4M citizens connected')}</span>
            </div>
          </div>
          <h1 style={S.heroTitle}>
            <span style={{ display: 'block', animation: 'fadeInUp 0.8s ease both', animationDelay: '0.35s' }}>
              {t('landing.hero_title_1', 'The City That')}
            </span>
            <span style={{ display: 'block', animation: 'heroGlow 4s ease-in-out infinite, fadeInUp 0.8s ease both', animationDelay: '0.5s', background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {t('landing.hero_title_2', 'Listens & Acts')}
            </span>
          </h1>
          <p style={{ ...S.heroSub, animation: 'fadeInUp 0.8s ease both', animationDelay: '0.65s' }}>
            {t('landing.hero_sub', 'SmartCity connects citizens, AI, and city officials to resolve urban issues faster than ever — powered by real-time data, blockchain transparency, and community intelligence.')}
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', animation: 'fadeInUp 0.8s ease both', animationDelay: '0.8s' }}>
            <Link to="/register" className="cta-btn">
              <Zap size={18}/> {t('landing.start_free', 'Start for Free')}
            </Link>
            <Link to="/login" className="cta-btn-outline">
              <MapIcon size={18}/> {t('landing.explore_map', 'Explore Map')}
            </Link>
          </div>

          {/* Mini stats row */}
          <div className="glass-panel" style={{ ...S.heroStats, animation: 'fadeInUp 0.8s ease both', animationDelay: '1s' }}>
            {[['14+', 'Modules'], ['99.9%', 'Uptime'], ['<90s', 'Response'], ['4.9/5', 'Rating']].map(([v, l]) => (
              <div key={l} style={S.heroStat}>
                <span style={S.heroStatVal}>{v}</span>
                <span style={S.heroStatLabel}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ─────────────────────────────────────── */}
      <section id="stats" style={S.statsSection}>
        <div style={S.statsBg} />
        <div style={S.sectionInner}>
          <div style={S.statsGrid}>
            {[
              { value: 2400000, suffix: '+', label: 'Citizens Connected', icon: <Users size={32}/>, color: '#3b82f6' },
              { value: 47, suffix: '', label: 'Cities Active', icon: <MapIcon size={32}/>, color: '#10b981' },
              { value: 98, suffix: '%', label: 'Resolution Rate', icon: <CheckCircle2 size={32}/>, color: '#f59e0b' },
              { value: 89, suffix: 's', label: 'Avg Response Time', icon: <Zap size={32}/>, color: '#8b5cf6' },
            ].map((s, i) => (
              <div key={s.label} className="glass-panel" style={{ ...S.statCard, animationDelay: `${i * 0.15}s` }}>
                <div style={{ ...S.statIcon, color: s.color, background: `${s.color}15` }}>{s.icon}</div>
                <div style={{ ...S.statVal, color: s.color }}>
                  <AnimatedCounter target={s.value} suffix={s.suffix} />
                </div>
                <div style={S.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ─────────────────────────────────── */}
      <section id="features" style={S.section}>
        <div style={S.sectionInner}>
          <div style={S.sectionHeader}>
            <div style={S.sectionBadge}><Sparkles size={14}/> Core Features</div>
            <h2 style={S.sectionTitle}>{t('landing.features_title', 'Everything a Smart City Needs')}</h2>
            <p style={S.sectionSub}>{t('landing.features_sub', 'From AI-powered issue detection to blockchain audit trails — every tool your city needs, in one unified platform.')}</p>
          </div>
          <div style={S.featuresGrid}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className="glass-panel feature-card" style={{
                ...S.featureCard,
                animationDelay: f.delay,
                animation: `fadeInUp 0.6s ease both`,
              }}>
                <div style={{ ...S.featureIcon, color: f.color, background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                  {f.icon}
                </div>
                <h3 style={S.featureTitle}>{f.title}</h3>
                <p style={S.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how" style={{ ...S.section, background: 'var(--bg-card)' }}>
        <div style={S.sectionInner}>
          <div style={S.sectionHeader}>
            <div style={S.sectionBadge}><Zap size={14}/> Workflow</div>
            <h2 style={S.sectionTitle}>{t('landing.process_title', 'How SmartCity Works')}</h2>
            <p style={S.sectionSub}>{t('landing.process_sub', 'From problem to resolution in four simple steps.')}</p>
          </div>
          <div style={S.howGrid}>
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="glass-panel step-card" style={S.stepCard}>
                <div style={S.stepNumber}>{step.step}</div>
                <div style={S.stepIconWrap}><span style={{ color: 'var(--brand-primary)' }}>{step.icon}</span></div>
                <h3 style={S.stepTitle}>{step.title}</h3>
                <p style={S.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CITY VISUAL BANNER ───────────────────────────────── */}
      <section style={S.bannerSection}>
        <div className="glass-panel" style={{ position: 'relative', height: 300, overflow: 'hidden', padding: 0 }}>
          <CityCanvas />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(9,9,11,0.95) 0%, rgba(9,9,11,0.6) 50%, rgba(9,9,11,0.95) 100%)', zIndex: 2 }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--brand-primary)', fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>Join the Movement</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, color: 'var(--text-main)', marginBottom: 12, letterSpacing: '-0.03em' }}>
                {t('landing.banner_title', 'Build a Smarter City Together')}
              </h2>
              <p style={{ color: 'var(--text-sub)', fontSize: 16, marginBottom: 32 }}>
                {t('landing.banner_sub', 'Every report you submit makes your city better for everyone.')}
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <Link to="/register" className="cta-btn">Get Started Free <ChevronRight size={18}/></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer style={S.footer}>
        <div style={S.footerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Sparkles size={24} color="#8b5cf6" />
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-main)', fontWeight: 800, fontSize: 20 }}>SmartCity</span>
          </div>
          <p style={{ color: 'var(--text-sub)', fontSize: 14 }}>Urban Intelligence Platform · Making cities work for people</p>
          <div style={{ display: 'flex', gap: 8, marginTop: 24, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px rgba(16,185,129,0.8)', animation: 'pulseBorder 2s infinite' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }}>All systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const S = {
  root: { minHeight: '100vh', background: 'var(--bg-page)', color: 'var(--text-main)', overflowX: 'hidden' },

  hero: { position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  heroVignette: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, var(--bg-page) 100%)', pointerEvents: 'none', zIndex: 1 },
  nav: { position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 40px', transition: 'all 0.3s', backdropFilter: 'blur(20px)' },
  navLogo: { display: 'flex', alignItems: 'center', gap: 10 },
  navBrand: { fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' },
  navLinks: { display: 'flex', gap: 8 },
  heroContent: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 40px 60px', position: 'relative', zIndex: 2 },
  heroBadge: { display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 24px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 100, color: '#a78bfa', fontSize: 14, fontWeight: 600, marginBottom: 32, animation: 'pulseBorder 3s infinite' },
  heroBadgeDot: { width: 8, height: 8, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px rgba(16,185,129,0.8)', flexShrink: 0 },
  heroTitle: { fontFamily: 'var(--font-display)', fontSize: 84, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.04em', marginBottom: 24, maxWidth: 900 },
  heroSub: { color: 'var(--text-sub)', fontSize: 20, lineHeight: 1.6, maxWidth: 680, marginBottom: 40 },
  heroStats: { display: 'flex', gap: 40, marginTop: 60, padding: '24px 48px', borderRadius: 'var(--radius-xl)' },
  heroStat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 },
  heroStatVal: { fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--brand-primary)' },
  heroStatLabel: { color: 'var(--text-sub)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' },

  statsSection: { position: 'relative', padding: '100px 40px', background: 'var(--bg-page)' },
  statsBg: { position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 100%, rgba(139,92,246,0.08) 0%, transparent 60%)', pointerEvents: 'none' },
  sectionInner: { maxWidth: 1200, margin: '0 auto' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24 },
  statCard: { padding: '32px 24px', textAlign: 'center', animation: 'fadeInUp 0.6s ease both', border: '1px solid var(--border-light)' },
  statIcon: { width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' },
  statVal: { fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 800, lineHeight: 1.2 },
  statLabel: { color: 'var(--text-sub)', fontSize: 14, fontWeight: 600, marginTop: 8 },

  section: { padding: '120px 40px', position: 'relative' },
  sectionHeader: { textAlign: 'center', marginBottom: 64 },
  sectionBadge: { display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 100, color: '#60a5fa', fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 20 },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 16 },
  sectionSub: { color: 'var(--text-sub)', fontSize: 18, lineHeight: 1.6, maxWidth: 640, margin: '0 auto' },

  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 24 },
  featureCard: { padding: '32px 28px', position: 'relative', overflow: 'hidden' },
  featureIcon: { width: 64, height: 64, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  featureTitle: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 12, color: 'var(--text-main)' },
  featureDesc: { color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.6, margin: 0 },

  howGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 24, position: 'relative' },
  stepCard: { padding: '40px 24px', textAlign: 'center', position: 'relative' },
  stepNumber: { fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800, color: 'var(--brand-primary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 20 },
  stepIconWrap: { width: 80, height: 80, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' },
  stepTitle: { fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 },
  stepDesc: { color: 'var(--text-sub)', fontSize: 15, lineHeight: 1.6, margin: 0 },

  bannerSection: { padding: '40px 40px 100px' },
  
  footer: { borderTop: '1px solid var(--border-light)', padding: '60px 40px', background: 'var(--bg-page)' },
  footerInner: { maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
};
