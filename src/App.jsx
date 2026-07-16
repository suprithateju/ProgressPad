import React, { useState, useEffect } from 'react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import MockTests from './components/MockTests';
import Analytics from './components/Analytics';
import AISpace from './components/AISpace';
import { getLocalBackup } from './utils/backup';

const getBackendUrl = () => {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  const hostname = window.location.hostname;
  const isLocal =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.local') ||
    /^[0-9.]+$/.test(hostname) ||
    hostname.includes(':');

  return isLocal ? `http://${hostname}:5000` : 'https://progress-pad.onrender.com';
};

const BACKEND_URL = getBackendUrl();

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
  const [dbStatus, setDbStatus] = useState('SQLite');
  const [dbModalOpen, setDbModalOpen] = useState(false);

  useEffect(() => {
    const fetchDbStatus = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/db-status`);
        if (res.ok) {
          const data = await res.json();
          setDbStatus(data.dbType);
        }
      } catch (err) {
        console.error('Failed to fetch DB status:', err);
      }
    };
    fetchDbStatus();
  }, []);

  // Load user's enrolled exams
  const fetchEnrolledExams = async (selectExamId = null) => {
    const email = localStorage.getItem('user_email');
    if (!email) {
      setUserExamId(null);
      setActiveExam(null);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/users/me/exams`, {
        headers: {
          'X-User-Email': email
        }
      });
      if (res.ok) {
        let data = await res.json();
        
        // Auto-restore backup if database reset is detected on server (backend data is empty but we have local backup)
        if (data.length === 0) {
          const backup = getLocalBackup();
          if (backup.enrolledExams && Object.keys(backup.enrolledExams).length > 0) {
            console.log('Backend reset detected. Restoring database tables from local backup...');
            try {
              const syncRes = await fetch(`${BACKEND_URL}/api/users/me/sync-restore`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-User-Email': email
                },
                body: JSON.stringify({ enrolledExams: backup.enrolledExams })
              });
              if (syncRes.ok) {
                const retryRes = await fetch(`${BACKEND_URL}/api/users/me/exams`, {
                  headers: {
                    'X-User-Email': email
                  }
                });
                if (retryRes.ok) {
                  data = await retryRes.json();
                }
              }
            } catch (syncErr) {
              console.error('Failed to sync-restore database from local backup:', syncErr);
            }
          }
        }

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
        <div className="navbar-left">
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
            <i className="ti ti-alarm" style={{ color: 'var(--accent)' }}></i>
            <span>Daily Goal: <strong>{activeExam.daily_goal_hrs || 2.0} hrs</strong></span>
          </div>
        )}

        {dbStatus && (
          <div 
            className="user-badge" 
            style={{ 
              cursor: 'pointer', 
              background: dbStatus === 'PostgreSQL' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${dbStatus === 'PostgreSQL' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}` 
            }}
            onClick={() => setDbModalOpen(true)}
          >
            <i className={`ti ${dbStatus === 'PostgreSQL' ? 'ti-database-check' : 'ti-database-exclamation'}`} style={{ color: dbStatus === 'PostgreSQL' ? '#10b981' : '#f59e0b' }}></i>
            <span style={{ color: dbStatus === 'PostgreSQL' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>
              {dbStatus === 'PostgreSQL' ? 'Cloud Sync Active' : 'SQLite (Temporary)'}
            </span>
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
              activeExamDetails={activeExam}
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

      <DatabaseModal isOpen={dbModalOpen} onClose={() => setDbModalOpen(false)} dbType={dbStatus} />

    </div>
  );
}

// Database Modal setup helper component
function DatabaseModal({ isOpen, onClose, dbType }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" style={{ zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content glass-panel" style={{ maxWidth: '520px', width: '90%', margin: '0 auto' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <i className={`ti ${dbType === 'PostgreSQL' ? 'ti-database-check' : 'ti-database-exclamation'}`} style={{ color: dbType === 'PostgreSQL' ? '#10b981' : '#f59e0b' }}></i>
            Database Storage Status
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}>
            <i className="ti ti-x"></i>
          </button>
        </div>
        <div className="modal-body" style={{ fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
          {dbType === 'PostgreSQL' ? (
            <div>
              <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <strong style={{ color: '#10b981', display: 'block', marginBottom: '0.25rem' }}>✓ Permanent Cloud Storage Active</strong>
                Your ProgressPad account is connected to a cloud PostgreSQL database. Your progress, custom topics, and mock tests are safely stored forever and will be available on all your devices.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                <strong style={{ color: '#f59e0b', display: 'block', marginBottom: '0.25rem' }}>⚠️ Temporary Database Active (SQLite)</strong>
                Because this application is hosted on Render's free tier, the local database file is reset every time the server restarts or goes to sleep (after 15 minutes of inactivity).
                <br /><br />
                <em>Note: We have enabled automated backend cloud syncing to save your progress, but for complete multi-device sync, we highly recommend linking a free cloud database.</em>
              </div>
              <h4 style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Link a Free Permanent Database in 3 Steps:</h4>
              <ol style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                <li>
                  <strong>Create a Free Database</strong>
                  <br />
                  Sign up at <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Supabase.com</a> or <a href="https://neon.tech" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>Neon.tech</a> and create a new free PostgreSQL project.
                </li>
                <li>
                  <strong>Copy the Connection URL</strong>
                  <br />
                  From your database settings dashboard, copy the <strong>Connection String</strong> URL (it looks like: <code>postgres://user:password@host/db</code>).
                </li>
                <li>
                  <strong>Add to Render Settings</strong>
                  <br />
                  Go to your <strong>Render Dashboard</strong>, select your ProgressPad backend service, navigate to <strong>Environment</strong>, and add a new environment variable:
                  <div style={{ margin: '0.5rem 0' }}>
                    <code style={{ background: 'rgba(255,255,255,0.05)', padding: '0.25rem 0.5rem', borderRadius: '4px', display: 'block', wordBreak: 'break-all' }}>
                      Key: <strong>DATABASE_URL</strong>
                      <br />
                      Value: <strong>[your-copied-connection-string]</strong>
                    </code>
                  </div>
                  Save changes. Render will automatically redeploy the backend and use the permanent cloud database!
                </li>
              </ol>
            </div>
          )}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
