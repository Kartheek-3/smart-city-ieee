import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
  { code: 'fr', label: 'FR' }
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  const S = {
    container: { position: 'relative', display: 'inline-block' },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      background: 'var(--bg-input)',
      border: '1px solid var(--border-main)',
      borderRadius: '8px',
      padding: '6px 12px',
      color: 'var(--text-main)',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.2s ease',
    },
    menu: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: '8px',
      background: 'var(--bg-card)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border-main)',
      borderRadius: '8px',
      overflow: 'hidden',
      display: isOpen ? 'flex' : 'none',
      flexDirection: 'column',
      minWidth: '80px',
      zIndex: 100,
      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
    },
    option: {
      padding: '8px 16px',
      color: 'var(--text-sub)',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      textAlign: 'left',
      fontSize: '13px',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    optionActive: {
      color: 'var(--text-main)',
      background: 'var(--brand-light)',
    },
    dot: {
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      background: '#4488ff',
      marginLeft: '8px',
    }
  };

  // Default to first 2 letters if complex locale like en-US
  const currentLang = (i18n.resolvedLanguage || 'en').substring(0, 2).toLowerCase();

  return (
    <div style={S.container}>
      <button 
        style={S.button} 
        onClick={() => setIsOpen(!isOpen)}
        onMouseOver={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
        onMouseOut={e => e.currentTarget.style.background = 'var(--bg-input)'}
      >
        <Globe size={14} />
        {currentLang.toUpperCase()}
      </button>

      {isOpen && (
        <>
          {/* Invisible overlay to catch outside clicks */}
          <div 
            style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
            onClick={() => setIsOpen(false)}
          />
          <div style={S.menu}>
            {LANGUAGES.map(lang => {
              const isActive = currentLang === lang.code;
              return (
                <button
                  key={lang.code}
                  style={{...S.option, ...(isActive ? S.optionActive : {})}}
                  onClick={() => changeLanguage(lang.code)}
                  onMouseOver={e => !isActive && (e.currentTarget.style.color = 'var(--text-main)')}
                  onMouseOut={e => !isActive && (e.currentTarget.style.color = 'var(--text-sub)')}
                >
                  {lang.label}
                  {isActive && <div style={S.dot} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
