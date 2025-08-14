import React from "react";

export default function AutoScribeTest() {
  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: 'white',
      padding: '40px 20px'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 'bold' }}>
          AutoScribe
        </h1>
        <p style={{ fontSize: '1.25rem', marginBottom: '2rem', opacity: 0.8 }}>
          Intelligent Screen Recording & Documentation
        </p>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginTop: '3rem'
        }}>
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '2rem', 
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🚀 Fast Recording</h3>
            <p>Capture your screen with intelligent automation</p>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '2rem', 
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>⚡ Smart Analysis</h3>
            <p>AI-powered documentation generation</p>
          </div>
          
          <div style={{ 
            background: 'rgba(255,255,255,0.1)', 
            padding: '2rem', 
            borderRadius: '1rem',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🎯 Precise Control</h3>
            <p>Hotkey-driven workflow for power users</p>
          </div>
        </div>
        
        <div style={{ marginTop: '3rem' }}>
          <button style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '0.5rem',
            border: 'none',
            fontSize: '1.125rem',
            fontWeight: '600',
            cursor: 'pointer',
            marginRight: '1rem'
          }}>
            Download for Windows
          </button>
          
          <button style={{
            background: 'transparent',
            color: 'white',
            padding: '1rem 2rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(255,255,255,0.3)',
            fontSize: '1.125rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            View on GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
