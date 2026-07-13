import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStream } from '../utils/stream';

export default function ProjectRecommender({ apiKey }) {
  const [currentSkills, setCurrentSkills] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRecommendations('');

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-Gemini-API-Key'] = apiKey;
    }

    try {
      const response = await fetch('/mentor/project-recommendations', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          current_skills: currentSkills.trim(),
          target_role: targetRole.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Project recommendations server error.');
      }

      setLoading(false);

      await readStream(
        response,
        (chunk) => {
          setRecommendations((prev) => prev + chunk);
        }
      );
    } catch (error) {
      console.error(error);
      alert('An error occurred during project recommendations.');
      setLoading(false);
    }
  };

  return (
    <div className="grid-layout">
      {/* Left Input Card */}
      <div className="card">
        <h2 className="card-title">Project Recommendation Engine</h2>
        <p className="card-subtitle">Generate 3 custom project blueprints designed to demonstrate your ability to scale systems for your target role.</p>
        
        <form onSubmit={handleSubmit} className="app-form">
          <div className="form-group">
            <label htmlFor="pr-skills">Current Skills</label>
            <textarea 
              id="pr-skills" 
              placeholder="e.g. Node.js, Express, Basic React, MySQL, basic Git" 
              rows={3} 
              required
              value={currentSkills}
              onChange={(e) => setCurrentSkills(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="pr-role">Target Job Role</label>
            <input 
              type="text" 
              id="pr-role" 
              placeholder="e.g. backend Engineer, Data Engineer" 
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Recommending Projects...' : 'Recommend Projects'}
          </button>
        </form>
      </div>
      
      {/* Right Output Panel */}
      <div className="card result-panel">
        <h2 className="card-title">Tailored Project Blueprints</h2>
        
        {!loading && !recommendations && (
          <div className="empty-state">
            <span className="empty-icon">🛠️</span>
            <h3>No recommendations yet</h3>
            <p>Specify your current skills and target position to build portfolio blueprints including architectures, steps, and recruiters' key targets.</p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Designing system architectures, data flows, and build steps...</p>
          </div>
        )}

        {recommendations && (
          <div className="stream-output markdown-body">
            <ReactMarkdown>{recommendations}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
