import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { readStream } from '../utils/stream';

export default function InterviewQuestions({ apiKey }) {
  const [targetRole, setTargetRole] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('Entry Level (0-2 years)');
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setQuestions('');

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) {
      headers['X-Gemini-API-Key'] = apiKey;
    }

    try {
      const response = await fetch('/mentor/interview-questions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          target_role: targetRole.trim(),
          experience_level: experienceLevel
        })
      });

      if (!response.ok) {
        throw new Error('Questions generation server error.');
      }

      setLoading(false);

      await readStream(
        response,
        (chunk) => {
          setQuestions((prev) => prev + chunk);
        }
      );
    } catch (error) {
      console.error(error);
      alert('An error occurred during interview question generation.');
      setLoading(false);
    }
  };

  return (
    <div className="grid-layout">
      {/* Left Input Card */}
      <div className="card">
        <h2 className="card-title">Generate Interview Prep Questions</h2>
        <p className="card-subtitle">Generate a custom set of technical, behavioral, and case-study questions tailored to your level.</p>
        
        <form onSubmit={handleSubmit} className="app-form">
          <div className="form-group">
            <label htmlFor="iq-role">Target Job Role</label>
            <input 
              type="text" 
              id="iq-role" 
              placeholder="e.g. Backend Developer, Data Analyst" 
              required
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="iq-level">Experience Level</label>
            <select 
              id="iq-level"
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
            >
              <option value="Internship / Co-op">Internship / Co-op</option>
              <option value="Entry Level (0-2 years)">Entry Level (0-2 years)</option>
              <option value="Mid Level (3-5 years)">Mid Level (3-5 years)</option>
              <option value="Senior Level (5+ years)">Senior Level (5+ years)</option>
              <option value="Staff / Principal Architect">Staff / Principal Architect</option>
            </select>
          </div>
          
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Generating Qs...' : 'Generate Prep Set'}
          </button>
        </form>
      </div>
      
      {/* Right Output Panel */}
      <div className="card result-panel">
        <h2 className="card-title">Tailored Question Set</h2>
        
        {!loading && !questions && (
          <div className="empty-state">
            <span className="empty-icon">❓</span>
            <h3>No questions generated</h3>
            <p>Select your target role and experience details to load a specialized study questions workbook.</p>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Formulating technical and behavioral scenario questions...</p>
          </div>
        )}

        {questions && (
          <div className="stream-output markdown-body">
            <ReactMarkdown>{questions}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
