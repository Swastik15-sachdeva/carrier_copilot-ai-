import React, { useState, useEffect } from 'react';

import ResumeScorer from './components/ResumeScorer';
import CoverLetter from './components/CoverLetter';
import CareerRoadmap from './components/CareerRoadmap';
import MockInterview from './components/MockInterview';
import InterviewQuestions from './components/InterviewQuestions';
import DsaPlanner from './components/DsaPlanner';
import LinkedinOptimizer from './components/LinkedinOptimizer';
import ProjectRecommender from './components/ProjectRecommender';
import ResourceFinder from './components/ResourceFinder';

import './App.css';
export default function App() {
  const [activeTab, setActiveTab] = useState('resume-score');

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };


  const getPageTitle = () => {
    const titles = {
      'resume-score': 'AI Resume Score & Analyzer',
      'cover-letter': 'Tailored Cover Letter Builder',
      'roadmap': 'Personalized Career Roadmap',
      'mock-interview': 'HR Mock Interview Console',
      'interview-questions': 'Interview Question Generator',
      'dsa-practice': 'DSA Practice Planner',
      'linkedin-optimizer': 'LinkedIn Profile Optimizer',
      'project-recommender': 'Project Recommendation Engine',
      'resource-finder': 'Learning Resource Recommendations'
    };
    return titles[activeTab] || 'AI Career Copilot';
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'resume-score':
        return <ResumeScorer />;
      case 'cover-letter':
        return <CoverLetter />;
      case 'roadmap':
        return <CareerRoadmap />;
      case 'mock-interview':
        return <MockInterview />;
      case 'interview-questions':
        return <InterviewQuestions />;
      case 'dsa-practice':
        return <DsaPlanner />;
      case 'linkedin-optimizer':
        return <LinkedinOptimizer />;
      case 'project-recommender':
        return <ProjectRecommender />;
      case 'resource-finder':
        return <ResourceFinder />;
      default:
        return <ResumeScorer />;
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="logo-icon">▲</div>
          <div className="brand-name">Career<span>Copilot</span></div>
        </div>
        
        <div className="sidebar-section-title">Core Services</div>
        <nav className="nav-links">
          <button 
            className={`nav-item ${activeTab === 'resume-score' ? 'active' : ''}`}
            onClick={() => setActiveTab('resume-score')}
          >
            <span className="icon">📄</span>
            <span className="label">Resume Score</span>
          </button>
          
          <button 
            className={`nav-item ${activeTab === 'cover-letter' ? 'active' : ''}`}
            onClick={() => setActiveTab('cover-letter')}
          >
            <span className="icon">✉️</span>
            <span className="label">Cover Letter</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'roadmap' ? 'active' : ''}`}
            onClick={() => setActiveTab('roadmap')}
          >
            <span className="icon">🗺️</span>
            <span className="label">Career Roadmap</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'mock-interview' ? 'active' : ''}`}
            onClick={() => setActiveTab('mock-interview')}
          >
            <span className="icon">💬</span>
            <span className="label">Mock Interview</span>
          </button>
        </nav>

        <div className="sidebar-section-title">Prep & Mentor Tools</div>
        <nav className="nav-links">
          <button 
            className={`nav-item ${activeTab === 'interview-questions' ? 'active' : ''}`}
            onClick={() => setActiveTab('interview-questions')}
          >
            <span className="icon">❓</span>
            <span className="label">Interview Prep</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'dsa-practice' ? 'active' : ''}`}
            onClick={() => setActiveTab('dsa-practice')}
          >
            <span className="icon">🧮</span>
            <span className="label">DSA Practice</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'linkedin-optimizer' ? 'active' : ''}`}
            onClick={() => setActiveTab('linkedin-optimizer')}
          >
            <span className="icon">🤝</span>
            <span className="label">LinkedIn Profile</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'project-recommender' ? 'active' : ''}`}
            onClick={() => setActiveTab('project-recommender')}
          >
            <span className="icon">🛠️</span>
            <span className="label">Project Engine</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'resource-finder' ? 'active' : ''}`}
            onClick={() => setActiveTab('resource-finder')}
          >
            <span className="icon">📚</span>
            <span className="label">Learning Links</span>
          </button>
        </nav>
        
        <div className="theme-toggle-container">
          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Dark/Light Mode">
            {theme === 'dark' ? (
              <>
                <span className="icon">
                  <svg className="theme-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                  </svg>
                </span>
                <span className="label">Light Mode</span>
              </>
            ) : (
              <>
                <span className="icon">
                  <svg className="theme-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                  </svg>
                </span>
                <span className="label">Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top header bar */}
        <header className="top-bar">
          <h1>{getPageTitle()}</h1>
        </header>
        
        {/* Content Container */}
        <div className="content-container">
          {renderActiveTab()}
        </div>
      </main>

    </div>
  );
}
