import React, { useState } from 'react';
import { MapPin, Loader2, Check } from 'lucide-react';

export default function LocationInput({ value, onChange, placeholder = "Location", required = false, style = {} }) {
  const [isDetecting, setIsDetecting] = useState(false);
  const [detected, setDetected] = useState(false);

  const handleDetect = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    setIsDetecting(true);
    setDetected(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
          const data = await response.json();
          const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          
          if (onChange) {
            onChange({ target: { name: 'location', value: address } });
          }
          setDetected(true);
          setTimeout(() => setDetected(false), 2500);
        } catch (error) {
          console.error("Geocoding failed:", error);
          alert("Failed to reverse geocode location. Please try again.");
        } finally {
          setIsDetecting(false);
        }
      },
      (err) => {
        setIsDetecting(false);
        alert("Failed to detect location. Please ensure location permissions are enabled.");
      }
    );
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
      <input
        type="text"
        name="location"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        style={{ ...style, paddingRight: '110px' }}
      />
      <button
        type="button"
        onClick={handleDetect}
        disabled={isDetecting}
        style={{
          position: 'absolute',
          right: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          background: detected 
            ? 'var(--gradient-success, linear-gradient(135deg,#10b981,#059669))' 
            : isDetecting 
              ? 'var(--bg-card-hover, #f1f5f9)' 
              : 'var(--gradient-brand, linear-gradient(135deg,#2563eb,#7c3aed))',
          color: detected || !isDetecting ? 'white' : 'var(--text-muted)',
          border: 'none',
          padding: '5px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: isDetecting ? 'not-allowed' : 'pointer',
          letterSpacing: '0.01em',
          boxShadow: detected 
            ? '0 2px 8px rgba(16,185,129,0.3)' 
            : isDetecting 
              ? 'none' 
              : '0 2px 8px rgba(37,99,235,0.25)',
          transition: 'all 0.3s ease',
        }}
      >
        {detected ? (
          <Check size={14} />
        ) : isDetecting ? (
          <Loader2 size={14} className="location-spin" />
        ) : (
          <MapPin size={14} />
        )}
        {detected ? 'Done' : isDetecting ? 'Detecting...' : 'Detect'}
      </button>

      <style>{`
        @keyframes locationSpin {
          100% { transform: rotate(360deg); }
        }
        .location-spin {
          animation: locationSpin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
