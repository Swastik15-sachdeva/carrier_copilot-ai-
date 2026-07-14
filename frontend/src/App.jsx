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
