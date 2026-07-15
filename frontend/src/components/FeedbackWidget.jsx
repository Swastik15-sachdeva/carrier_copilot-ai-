import React, { useState } from 'react';

export default function FeedbackWidget({ telemetryId }) {
  const [feedbackState, setFeedbackState] = useState(0); // 0 = none, 1 = up, -1 = down
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFeedback = async (score) => {
    if (!telemetryId || feedbackState === score || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/telemetry/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telemetry_id: telemetryId, feedback: score })
      });
      
      if (res.ok) {
        setFeedbackState(score);
      }
    } catch (e) {
      console.error("Failed to submit feedback", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!telemetryId) return null;

  return (
    <div className="feedback-widget" style={{
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.75rem', 
      marginTop: '1.5rem',
      padding: '1rem',
      backgroundColor: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '8px',
      border: '1px solid var(--border-color)'
    }}>
      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
        Was this analysis helpful?
      </span>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          type="button"
          onClick={() => handleFeedback(1)}
          disabled={isSubmitting}
          style={{
            background: feedbackState === 1 ? 'rgba(0, 242, 254, 0.2)' : 'transparent',
            border: `1px solid ${feedbackState === 1 ? '#00f2fe' : 'var(--border-color)'}`,
            color: feedbackState === 1 ? '#00f2fe' : 'var(--text-secondary)',
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>👍</span> Yes
        </button>
        <button 
          type="button"
          onClick={() => handleFeedback(-1)}
          disabled={isSubmitting}
          style={{
            background: feedbackState === -1 ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
            border: `1px solid ${feedbackState === -1 ? '#ef4444' : 'var(--border-color)'}`,
            color: feedbackState === -1 ? '#ef4444' : 'var(--text-secondary)',
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <span>👎</span> No
        </button>
      </div>
      {feedbackState !== 0 && (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Thanks for your feedback!
        </span>
      )}
    </div>
  );
}
