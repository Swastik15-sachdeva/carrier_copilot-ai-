import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid configurations
mermaid.initialize({
  startOnLoad: true,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    background: '#111827',
    primaryColor: '#00f2fe',
    primaryTextColor: '#f3f4f6',
    lineColor: '#4facfe',
    secondaryColor: '#7f00ff',
    tertiaryColor: '#e100ff'
  }
});

export default function Mermaid({ chart }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && chart) {
      // Clear processed attribute so mermaid re-renders the element on content updates
      ref.current.removeAttribute('data-processed');
      ref.current.innerHTML = chart;
      try {
        mermaid.contentLoaded();
      } catch (err) {
        console.error("Mermaid rendering error:", err);
      }
    }
  }, [chart]);

  return (
    <div 
      className="mermaid" 
      ref={ref} 
      style={{ 
        background: 'rgba(255, 255, 255, 0.02)', 
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: '1.25rem',
        margin: '1.25rem 0',
        display: 'flex',
        justifyContent: 'center',
        overflowX: 'auto'
      }}
    >
      {chart}
    </div>
  );
}
