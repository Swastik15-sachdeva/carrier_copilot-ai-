import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStream } from '../utils/stream';

export default function DsaPlanner({ apiKey }) {
  const [targetRole, setTargetRole] = useState('');
  const [timeline, setTimeline] = useState('1 Month');
  const [currentLevel, setCurrentLevel] = useState('Intermediate');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setPlan('');

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-Gemini-API-Key'] = apiKey;
    }

    try {
      const response = await fetch('/mentor/dsa-planner', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target_role: targetRole.trim(),
          timeline: timeline,
          current_level: currentLevel
        })
      });

      if (!response.ok) {
        throw new Error('DSA plan generation server error.');
      }

      setLoading(false);

      await readStream(
        response,
        (chunk) => {
          setPlan((prev) => prev + chunk);
        }
      );
    } catch (error) {
      console.error(error);
      alert('An error occurred during DSA practice planner generation.');
      setLoading(false);
    }
  };

  return (
    <div className="grid-layout">
      {/* Left Input Card */}
      <div className="card">
        <h2 className="card-title">DSA Practice Planner</h2>
        <p className="card-subtitle">Generate a custom schedule for coding problems, algorithmic topics, and interview review patterns.</p>
        
        <form onSubmit={handleSubmit} className="app-form">
          <div className="form-group">
            <label htmlFor="dsa-role">Target Job Role</label>
            <input 
              type="text" 
              id="dsa-role" 
              placeholder="e.g. Software Engineer, Systems Engineer" 
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="dsa-timeline">Preparation Timeline</label>
            <select 
              id="dsa-timeline"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
            >
              <option value="1 Week (Intense)">1 Week (Intense)</option>
              <option value="2 Weeks">2 Weeks</option>
              <option value="1 Month">1 Month</option>
              <option value="2 Months">2 Months</option>
              <option value="3 Months">3 Months</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="dsa-level">Current DSA Proficiency</label>
            <select 
              id="dsa-level"
              value={currentLevel}
              onChange={(e) => setCurrentLevel(e.target.value)}
            >
              <option value="Beginner (No experience / basic arrays)">Beginner (No experience / basic arrays)</option>
              <option value="Intermediate (Know trees/sorting, struggle with DP)">Intermediate (Know trees/sorting, struggle with DP)</option>
              <option value="Advanced (Solve LeetCode mediums easily, know graphs)">Advanced (Solve LeetCode mediums easily, know graphs)</option>
            </select>
          </div>
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Designing Plan...' : 'Generate DSA Schedule'}
          </button>
        </form>
      </div>
      
      {/* Right Output Panel */}
      <div className="card result-panel">
        <h2 className="card-title">Personalized DSA Schedule</h2>
        
        {!loading && !plan && (
          <div className="empty-state">
            <span className="empty-icon">🧮</span>
            <h3>No schedule designed yet</h3>
            <p>Define your preparation timeline and goals on the left to structure your algorithmic upskilling schedule.</p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Designing structures, data patterns, and practice roadmap...</p>
          </div>
        )}

        {plan && (
          <div className="stream-output markdown-body">
            <ReactMarkdown>{plan}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
