import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStream } from '../utils/stream';
import Mermaid from './Mermaid';

export default function CareerRoadmap() {
  const [currentSkills, setCurrentSkills] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState('');
  const abortControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setRoadmap('');

    const headers = { 'Content-Type': 'application/json' };

    try {
      const response = await fetch('/roadmap/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          current_skills: currentSkills.trim(),
          target_role: targetRole.trim()
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('Roadmap generation server error.');
      }

      await readStream(
        response,
        (chunk) => {
          setRoadmap((prev) => prev + chunk);
        }
      );

      setLoading(false);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error(error);
      alert('An error occurred during roadmap generation.');
      setLoading(false);
    }
  };

  return (
    <div className="grid-layout">
      {/* Left Input Card */}
      <div className="card">
        <h2 className="card-title">Generate Career Path</h2>
        <p className="card-subtitle">Generate a custom phased learning roadmap based on where you are and where you want to go.</p>
        
        <form onSubmit={handleSubmit} className="app-form">
          <div className="form-group">
            <label htmlFor="roadmap-skills">Current Skills</label>
            <textarea 
              id="roadmap-skills" 
              placeholder="e.g. Basic HTML, CSS, JavaScript, introductory Python" 
              rows={3} 
              required
              value={currentSkills}
              onChange={(e) => setCurrentSkills(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="roadmap-target-role">Target Job Role</label>
            <input 
              type="text" 
              id="roadmap-target-role" 
              placeholder="e.g. Full Stack Developer, Data Scientist" 
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Designing...' : 'Build My Roadmap'}
          </button>
        </form>
      </div>
      
      {/* Right Output Panel */}
      <div className="card result-panel">
        <div className="panel-header-actions">
          <h2 className="card-title">Your Career Roadmap</h2>
          {roadmap && (
            <button className="btn btn-secondary btn-sm print-btn" onClick={() => window.print()}>
              🖨️ Export PDF
            </button>
          )}
        </div>
        
        {!loading && !roadmap && (
          <div className="empty-state">
            <span className="empty-icon">🗺️</span>
            <h3>Enter your goals</h3>
            <p>Fill out the profile on the left to stream a structured learning path with project milestones.</p>
          </div>
        )}

        {loading && !roadmap && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Designing custom upskilling phases...</p>
          </div>
        )}

        {roadmap && (
          <div className="stream-output markdown-body">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-mermaid/.test(className || '');
                  if (!inline && match) {
                    return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                  }
                  return <code className={className} {...props}>{children}</code>;
                }
              }}
            >
              {roadmap}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
