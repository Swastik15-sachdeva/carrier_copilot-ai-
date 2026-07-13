import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStream } from '../utils/stream';

export default function LinkedinOptimizer({ apiKey }) {
  const [targetRole, setTargetRole] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [loading, setLoading] = useState(false);
  const [optimization, setOptimization] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOptimization('');

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-Gemini-API-Key'] = apiKey;
    }

    try {
      const response = await fetch('/mentor/linkedin-optimizer', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target_role: targetRole.trim(),
          resume_text: resumeText.trim()
        })
      });

      if (!response.ok) {
        throw new Error('LinkedIn optimization server error.');
      }

      setLoading(false);

      await readStream(
        response,
        (chunk) => {
          setOptimization((prev) => prev + chunk);
        }
      );
    } catch (error) {
      console.error(error);
      alert('An error occurred during LinkedIn optimization.');
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!optimization) return;
    navigator.clipboard.writeText(optimization);
    alert('Optimizations copied to clipboard!');
  };

  return (
    <div className="grid-layout">
      {/* Left Input Card */}
      <div className="card">
        <h2 className="card-title">LinkedIn Profile Optimizer</h2>
        <p className="card-subtitle">Convert your technical resume into LinkedIn headlines, profiles, summaries, and keyword lists.</p>
        
        <form onSubmit={handleSubmit} className="app-form">
          <div className="form-group">
            <label htmlFor="li-role">Target Job Role</label>
            <input 
              type="text" 
              id="li-role" 
              placeholder="e.g. Solutions Architect, Full Stack Developer" 
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="li-resume">Resume Summary / Details</label>
            <textarea 
              id="li-resume" 
              placeholder="Paste key experience bullet points, skills list, or overall bio..." 
              rows={6} 
              required
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Optimizing Profile...' : 'Optimize Profile'}
          </button>
        </form>
      </div>
      
      {/* Right Output Panel */}
      <div className="card result-panel">
        <div className="panel-header-actions">
          <h2 className="card-title">LinkedIn Enhancements</h2>
          {optimization && (
            <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
              Copy Profile text
            </button>
          )}
        </div>
        
        {!loading && !optimization && (
          <div className="empty-state">
            <span className="empty-icon">🤝</span>
            <h3>No profile optimizations yet</h3>
            <p>Paste your details on the left. The AI will output copy-pasteable headline adjustments and a professional profile summary.</p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Drafting SEO headlines and first-person summaries...</p>
          </div>
        )}

        {optimization && (
          <div className="stream-output markdown-body">
            <ReactMarkdown>{optimization}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
