import React, { useState } from 'react';

export default function S3ImageUpload({ onUploadComplete, category = 'misc', label = 'Evidence (Image)' }) {
  const [uploading, setUploading] = useState(false);
  const [imageKey, setImageKey] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("category", category);

    try {
      const res = await fetch("http://localhost:5000/api/storage/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setImageKey(data.image_key);
        if (onUploadComplete) onUploadComplete(data.image_key);
      } else {
        setError(data.error || "Upload failed");
      }
    } catch (err) {
      console.error(err);
      setError("Network error during upload");
    }
    setUploading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <label style={{ color: 'var(--text-main)', fontSize: '14px', fontWeight: 600 }}>{label}</label>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileChange} 
        disabled={uploading}
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-main)',
          color: 'var(--text-main)',
          padding: '12px',
          borderRadius: '8px',
          width: '100%',
          boxSizing: 'border-box'
        }} 
      />
      {uploading && <span style={{ color: '#2563eb', fontSize: '12px' }}>Uploading to Amazon S3...</span>}
      {imageKey && <span style={{ color: '#10b981', fontSize: '12px' }}>✓ Uploaded securely to S3</span>}
      {error && <span style={{ color: '#ef4444', fontSize: '12px' }}>{error}</span>}
    </div>
  );
}
