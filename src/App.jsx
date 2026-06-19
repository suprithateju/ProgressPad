import React, { useState, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import MockTests from './components/MockTests';
import Analytics from './components/Analytics';
import AISpace from './components/AISpace';

const BACKEND_URL = 'http://localhost:5000';

export default function App() {
  const [userExamId, setUserExamId] = useState(null);
  const [enrolledExams, setEnrolledExams] = useState([]);
  const [activeExam, setActiveExam] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // AI topic linking states
  const [aiTopic, setAiTopic] = useState('');
  const [aiSubTab, setAiSubTab] = useState('buddy');
  const [mobileTab, setMobileTab] = useState('syllabus'); // 'progress', 'syllabus', 'mocks'

  const [loading, setLoading] = useState(true);

  // Load user's enrolled exams
  const fetchEnrolledExams = async (selectExamId = null) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/me/exams`);
      if (res.ok) {
        const data = await res.json();
        setEnrolledExams(data);
        
        if (data.length > 0) {
          // If a specific exam should be selected
          if (selectExamId) {
            const match = data.find(e => e.id === selectExamId);
            if (match) {
              setUserExamId(match.id);
              setActiveExam(match);
            } else {
              selectPrimaryExam(data);
            }
          } else {
            selectPrimaryExam(data);
          }
        } else {
          setUserExamId(null);
          setActiveExam(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch enrolled exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectPrimaryExam = (examsList) => {
    const primary = examsList.find(e => e.is_primary) || examsList[0];
    setUserExamId(primary.id);
    setActiveExam(primary);
  };

  useEffect(() => {
    fetchEnrolledExams();
  }, []);

  // Dynamically update design tokens when active exam changes
  useEffect(() => {
    if (activeExam) {
      const root = document.documentElement;
      let primaryColor = '#2563eb';
      let rgb = '37, 99, 235';

      // Map categories to colors
      if (activeExam.category_color_ramp === 'blue') {
        primaryColor = 'var(--cat-engineering)';
        rgb = '37, 99, 235';
      } else if (activeExam.category_color_ramp === 'teal') {
        primaryColor = 'var(--cat-medical)';
        rgb = '16, 185, 129';
      } else if (activeExam.category_color_ramp === 'grey') {
        primaryColor = 'var(--cat-govt)';
        rgb = '99, 102, 241';
      } else if (activeExam.category_color_ramp === 'amber') {
        primaryColor = 'var(--cat-railway)';
        rgb = '245, 158, 11';
      } else if (activeExam.category_color_ramp === 'purple') {
        primaryColor = 'var(--cat-banking)';
        rgb = '236, 72, 153';
      } else if (activeExam.category_color_ramp === 'peach') {
        primaryColor = 'var(--cat-civil)';
        rgb = '249, 115, 22';
      } else if (activeExam.category_color_ramp === 'pink') {
        primaryColor = 'var(--cat-management)';
        rgb = '139, 92, 246';
      }

      root.style.setProperty('--accent', primaryColor);
      root.style.setProperty('--accent-rgb', rgb);
    }
  }, [activeExam]);

  const handleOnboardingComplete = (newUserExamId) => {
    fetchEnrolledExams(newUserExamId);
  };

  const handleSwitchExam = (e) => {
    const nextId = e.target.value;
    const match = enrolledExams.find(ex => ex.id === nextId);
    if (match) {
      setUserExamId(nextId);
      setActiveExam(match);
      // Reset AI states when switching exams
      setAiTopic('');
      setAiSubTab('buddy');
    }
  };

  // Navigations linking Dashboard -> AI features
  const handleSwitchToAIExplain = (topicName) => {
    setAiTopic(topicName);
    setAiSubTab('explain');
    setActiveTab('ai');
  };

  const handleSwitchToAIQuiz = (topicName) => {
    setAiTopic(topicName);
    setAiSubTab('quiz');
    setActiveTab('ai');
  };

  const handleNavTab = (tab) => {
    setActiveTab(tab);
    // Clear initial topic if clicking away from/switching tabs normally
    if (tab !== 'ai') {
      setAiTopic('');
    }
  };

  const handleAddMoreExams = () => {
    // Setting userExamId to null opens the onboarding view to enroll in another exam
    setUserExamId(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0d16' }}>
        <div style={{ textAlign: 'center' }}>
          <i className="ti ti-loader-3" style={{ fontSize: '3rem', animation: 'spin 1.5s linear infinite', color: '#2563eb', display: 'block', margin: '0 auto 1.5rem' }}></i>
          <h2 style={{ fontFamily: 'var(--font-display)', color: 'white' }}>ProgressPad</h2>
          <p style={{ color: '#9ca3af', fontSize: '0.9rem', marginTop: '0.25rem' }}>Connecting to database servers...</p>
        </div>
      </div>
    );
  }

  // Render Onboarding if not enrolled in any exam
  if (!userExamId) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="navbar">
          <div className="brand">
            <i className="ti ti-notebook"></i>
            <span>ProgressPad</span>
          </div>
        </header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Onboarding onComplete={handleOnboardingComplete} backendUrl={BACKEND_URL} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      
      {/* Dynamic Navigation Header */}
      <header className="navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="brand">
            <i className="ti ti-notebook"></i>
            <span>ProgressPad</span>
          </div>

          {/* Exam switcher */}
          {enrolledExams.length > 0 && (
            <div className="exam-switcher-container">
              <select className="exam-select" value={userExamId} onChange={handleSwitchExam}>
                {enrolledExams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.exam_name} {ex.is_primary ? '(Primary)' : ''}
                  </option>
                ))}
              </select>
              <button 
                onClick={handleAddMoreExams}
                style={{ background: 'none', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '0.25rem' }} 
                title="Enroll in another exam"
              >
                <i className="ti ti-plus" style={{ fontSize: '1.25rem' }}></i>
              </button>
            </div>
          )}
        </div>

        <nav className="nav-links">
          <div className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleNavTab('dashboard')}>
            <i className="ti ti-layout-kanban"></i> Board
          </div>
          <div className={`nav-link ${activeTab === 'mocks' ? 'active' : ''}`} onClick={() => handleNavTab('mocks')}>
            <i className="ti ti-checklist"></i> Mock Tests
          </div>
          <div className={`nav-link ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => handleNavTab('analytics')}>
            <i className="ti ti-chart-bar"></i> Performance
          </div>
          <div className={`nav-link ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => handleNavTab('ai')}>
            <i className="ti ti-sparkles"></i> AI Space
          </div>
        </nav>

        {activeExam && (
          <div className="user-badge">
            <i className="ti ti-calendar" style={{ color: 'var(--accent)' }}></i>
            <span>Exam target: <strong>{activeExam.target_date || 'Not Set'}</strong></span>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '2rem 0' }}>
        <div className="container">
          
          {activeTab === 'dashboard' && (
            <Dashboard
              userExamId={userExamId}
              backendUrl={BACKEND_URL}
              onSwitchToAIExplain={handleSwitchToAIExplain}
              onSwitchToAIQuiz={handleSwitchToAIQuiz}
              mobileView={mobileTab}
            />
          )}

          {activeTab === 'mocks' && (
            <MockTests
              userExamId={userExamId}
              backendUrl={BACKEND_URL}
              examSlug={activeExam?.exam_slug}
              activeExamDetails={activeExam}
            />
          )}

          {activeTab === 'analytics' && (
            <Analytics
              userExamId={userExamId}
              backendUrl={BACKEND_URL}
              activeExamDetails={activeExam}
            />
          )}

          {activeTab === 'ai' && (
            <AISpace
              userExamId={userExamId}
              backendUrl={BACKEND_URL}
              activeExamDetails={activeExam}
              initialTopic={aiTopic}
              activeTab={aiSubTab}
            />
          )}

        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-color)', padding: '1.25rem 0', background: 'rgba(10, 13, 22, 0.4)', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
        <div className="container">
          ProgressPad Competitive Multi-Exam Platform &copy; 2026. Made with premium aesthetics.
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <div className="mobile-bottom-nav">
        <button 
          className={`mobile-nav-btn ${activeTab === 'dashboard' && mobileTab === 'progress' ? 'active' : ''}`}
          onClick={() => { setActiveTab('dashboard'); setMobileTab('progress'); }}
        >
          <i className="ti ti-chart-donut"></i>
          <span>Progress</span>
        </button>
        <button 
          className={`mobile-nav-btn ${activeTab === 'dashboard' && mobileTab === 'syllabus' ? 'active' : ''}`}
          onClick={() => { setActiveTab('dashboard'); setMobileTab('syllabus'); }}
        >
          <i className="ti ti-layout-kanban"></i>
          <span>Syllabus</span>
        </button>
        <button 
          className={`mobile-nav-btn ${activeTab === 'mocks' ? 'active' : ''}`}
          onClick={() => { setActiveTab('mocks'); setMobileTab('mocks'); }}
        >
          <i className="ti ti-checklist"></i>
          <span>Mocks</span>
        </button>
      </div>

    </div>
  );
}
