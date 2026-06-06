import React, { useState, useEffect } from 'react';

export default function S3Image({ imageKey, alt = "Image", style = {}, className = "" }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!imageKey) return;
    
    // If it's already a full HTTP URL (e.g. from an older implementation), just use it
    if (imageKey.startsWith('http://') || imageKey.startsWith('https://')) {
      setUrl(imageKey);
      return;
    }

    const fetchPresignedUrl = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/storage/presign?key=${encodeURIComponent(imageKey)}`);
        if (res.ok) {
          const data = await res.json();
          setUrl(data.url);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error("Failed to fetch presigned URL for", imageKey, err);
        setError(true);
      }
    };

    fetchPresignedUrl();
  }, [imageKey]);

  if (!imageKey) return null;
  if (error) return <div style={{...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)', color: 'var(--text-sub)'}}>Image Unavailable</div>;
  if (!url) return <div style={{...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-input)', color: 'var(--text-sub)'}}>Loading...</div>;

  return <img src={url} alt={alt} style={style} className={className} />;
}
