import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API = 'http://localhost:5000/api';

// ==================== MAIN APP ====================
export default function App() {
  const [page, setPage] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setPage('dashboard');
    }
  }, [token]);

  const handleAuth = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    setPage('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setPage('login');
  };

  if (page === 'login') return <LoginPage onLogin={handleAuth} onGoSignup={() => setPage('signup')} />;
  if (page === 'signup') return <SignupPage onSignup={handleAuth} onGoLogin={() => setPage('login')} />;

  return (
    <div>
      <nav className="navbar">
        <h2>🌙 SleepSync</h2>
        <div className="nav-links">
          <a href="#" className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>📊 Dashboard</a>
          <a href="#" className={page === 'analytics' ? 'active' : ''} onClick={() => setPage('analytics')}>📈 Analytics</a>
          <a href="#" className={page === 'goals' ? 'active' : ''} onClick={() => setPage('goals')}>🎯 Goals</a>
          <a href="#" className={page === 'ai' ? 'active' : ''} onClick={() => setPage('ai')}>🤖 AI Insights</a>
        </div>
        <div className="nav-right">
          <span>👤 {user?.username}</span>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="container">
        {page === 'dashboard' && <Dashboard />}
        {page === 'analytics' && <AnalyticsPage />}
        {page === 'goals' && <GoalsPage />}
        {page === 'ai' && <AIInsightsPage />}
      </div>
    </div>
  );
}

// ==================== LOGIN PAGE ====================
function LoginPage({ onLogin, onGoSignup }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Please fill all fields');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { username, password });
      onLogin(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page-split">
      {/* LEFT SIDE - IMAGE WITH TEXT */}
      <div className="auth-image-side">
        <div className="auth-image-overlay"></div>
        <div className="auth-image-content">
          <div className="auth-logo-large">🌙</div>
          <h1 className="auth-brand-title">SleepSync</h1>
          <div className="auth-divider"></div>
          <h2 className="auth-tagline">Transform Your Nights,<br/>Transform Your Life</h2>
          <p className="auth-description">
            Quality sleep is the foundation of a healthy, productive life. 
            Track your patterns, build better habits, and wake up refreshed every day.
          </p>
          <div className="auth-stats-row">
            <div className="auth-stat-item">
              <span className="auth-stat-number">7-9h</span>
              <span className="auth-stat-label">Optimal Sleep</span>
            </div>
            <div className="auth-stat-item">
              <span className="auth-stat-number">90min</span>
              <span className="auth-stat-label">Sleep Cycles</span>
            </div>
            <div className="auth-stat-item">
              <span className="auth-stat-number">30%</span>
              <span className="auth-stat-label">Better Focus</span>
            </div>
          </div>
          <div className="auth-quote">
            <span className="quote-mark">"</span>
            Sleep is the best meditation.
            <span className="quote-mark">"</span>
            <br/>
            <span className="quote-author">— Dalai Lama</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - LOGIN FORM */}
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Welcome Back</h2>
            <p>Sign in to continue your sleep journey</p>
          </div>
          
          {error && <div className="error-msg">⚠️ {error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username or Email</label>
              <div className="input-with-icon">
                <span className="input-icon-left">👤</span>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username or email" />
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <span className="input-icon-left">🔒</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" />
              </div>
            </div>
            
            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" /> Remember me
              </label>
            </div>
            
            <button className="btn btn-primary btn-login" type="submit" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner-small"></span> Signing in...
                </span>
              ) : (
                'Sign In →'
              )}
            </button>
          </form>
          
          <div className="auth-separator">
            <span>or</span>
          </div>
          
          <p className="link-text">
            Don't have an account?{' '}
            <span onClick={onGoSignup}>Create Account</span>
          </p>
          
          <div className="auth-footer-text">
            <p>🔒 Secure & Encrypted</p>
            <p>Your sleep data is private and protected</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SIGNUP PAGE ====================
function SignupPage({ onSignup, onGoLogin }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !email || !password) {
      setError('All fields are required');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/signup`, { username, email, password });
      onSignup(res.data.user, res.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Try different username.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page-split">
      {/* LEFT SIDE - IMAGE WITH TEXT */}
      <div className="auth-image-side">
        <div className="auth-image-overlay"></div>
        <div className="auth-image-content">
          <div className="auth-logo-large">🌟</div>
          <h1 className="auth-brand-title">SleepSync</h1>
          <div className="auth-divider"></div>
          <h2 className="auth-tagline">Begin Your Journey<br/>to Better Sleep</h2>
          <p className="auth-description">
            Join thousands who have transformed their sleep habits. 
            Track, analyze, and improve your sleep quality starting today.
          </p>
          <div className="auth-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">✅</span>
              <span>Personalized sleep tracking</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">✅</span>
              <span>AI-powered recommendations</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">✅</span>
              <span>Completely free to use</span>
            </div>
          </div>
          <div className="auth-quote">
            <span className="quote-mark">"</span>
            The future belongs to those who sleep well.
            <span className="quote-mark">"</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - SIGNUP FORM */}
      <div className="auth-form-side">
        <div className="auth-form-container">
          <div className="auth-form-header">
            <h2>Create Account</h2>
            <p>Start your sleep improvement journey</p>
          </div>
          
          {error && <div className="error-msg">⚠️ {error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Username</label>
              <div className="input-with-icon">
                <span className="input-icon-left">👤</span>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Choose a username" />
              </div>
            </div>
            <div className="form-group">
              <label>Email</label>
              <div className="input-with-icon">
                <span className="input-icon-left">📧</span>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" />
              </div>
            </div>
            <div className="form-group">
              <label>Password (min 6 characters)</label>
              <div className="input-with-icon">
                <span className="input-icon-left">🔒</span>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" />
              </div>
            </div>
            
            <button className="btn btn-primary btn-login" type="submit" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner-small"></span> Creating Account...
                </span>
              ) : (
                'Create Account →'
              )}
            </button>
          </form>
          
          <div className="auth-separator">
            <span>or</span>
          </div>
          
          <p className="link-text">
            Already have an account?{' '}
            <span onClick={onGoLogin}>Sign In</span>
          </p>
          
          <div className="auth-footer-text">
            <p>🔒 Secure & Encrypted</p>
            <p>Your sleep data is private and protected</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== DASHBOARD ====================
function Dashboard() {
  const [sessions, setSessions] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    bed_time: '', wake_time: '', sleep_quality: 3, notes: '',
    caffeine: false, exercise: false, screen_time: 0
  });

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    try {
      const res = await axios.get(`${API}/sleep`);
      setSessions(res.data.sessions);
    } catch (err) {
      console.error('Failed to fetch');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/sleep`, form);
      setShowForm(false);
      setForm({ bed_time: '', wake_time: '', sleep_quality: 3, notes: '', caffeine: false, exercise: false, screen_time: 0 });
      fetchSessions();
    } catch (err) {
      alert('Failed to log sleep. Make sure backend is running!');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this session?')) {
      await axios.delete(`${API}/sleep/${id}`);
      fetchSessions();
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{fontSize:26, fontWeight:700}}>📊 Dashboard</h1>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 28px' }}
          onClick={() => setShowForm(true)}>+ Log Sleep</button>
      </div>

      <div className="dashboard-grid">
        <div className="card">
          <h3>Recent Sleep Sessions</h3>
          <div className="sleep-list">
            {sessions.length === 0 && <p style={{ color: '#9aa0a6' }}>No sessions yet. Log your first sleep!</p>}
            {sessions.slice(0, 10).map(s => {
              const duration = ((new Date(s.wake_time) - new Date(s.bed_time)) / 3600000).toFixed(1);
              return (
                <div key={s.id} className="sleep-item">
                  <div className="header">
                    <strong>{new Date(s.bed_time).toLocaleDateString()}</strong>
                    <span className="quality-stars">{'⭐'.repeat(s.sleep_quality)}</span>
                  </div>
                  <div style={{ fontSize: 14, color: '#5f6368' }}>
                    🛌 {new Date(s.bed_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    → ⏰ {new Date(s.wake_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    &nbsp;| 💤 {duration}h
                  </div>
                  {s.notes && <p style={{ marginTop: 5, fontSize: 14 }}>📝 {s.notes}</p>}
                  <div className="factors">
                    {s.caffeine && <span className="factor-tag">☕ Caffeine</span>}
                    {s.exercise && <span className="factor-tag">🏃 Exercise</span>}
                    {s.screen_time > 0 && <span className="factor-tag">📱 {s.screen_time}min</span>}
                  </div>
                  <button onClick={() => handleDelete(s.id)} style={{ marginTop: 10, background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight:500 }}>
                    🗑️ Delete
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card">
          <h3>Quick Stats</h3>
          <QuickStats sessions={sessions} />
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Log Sleep Session</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>🛌 Bed Time</label>
                  <input type="datetime-local" value={form.bed_time}
                    onChange={e => setForm({ ...form, bed_time: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>⏰ Wake Time</label>
                  <input type="datetime-local" value={form.wake_time}
                    onChange={e => setForm({ ...form, wake_time: e.target.value })} required />
                </div>
              </div>
              <div className="form-group">
                <label>⭐ Sleep Quality (1-5)</label>
                <input type="number" min="1" max="5" value={form.sleep_quality}
                  onChange={e => setForm({ ...form, sleep_quality: parseInt(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>📝 Notes</label>
                <textarea rows="3" value={form.notes} placeholder="How was your sleep?"
                  onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="checkbox-group">
                <input type="checkbox" checked={form.caffeine}
                  onChange={e => setForm({ ...form, caffeine: e.target.checked })} />
                <label>☕ Had Caffeine Today</label>
              </div>
              <div className="checkbox-group">
                <input type="checkbox" checked={form.exercise}
                  onChange={e => setForm({ ...form, exercise: e.target.checked })} />
                <label>🏃 Did Exercise Today</label>
              </div>
              <div className="form-group">
                <label>📱 Screen Time Before Bed (minutes)</label>
                <input type="number" min="0" value={form.screen_time}
                  onChange={e => setForm({ ...form, screen_time: parseInt(e.target.value) || 0 })} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">💾 Save Session</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== QUICK STATS ====================
function QuickStats({ sessions }) {
  if (sessions.length === 0) return <p style={{ color: '#9aa0a6' }}>Log sleep to see stats</p>;

  const qualities = sessions.map(s => s.sleep_quality);
  const avgQuality = (qualities.reduce((a, b) => a + b, 0) / qualities.length).toFixed(1);
  
  let streak = 0;
  for (let s of sessions) {
    if (s.sleep_quality >= 3) streak++;
    else break;
  }

  return (
    <div className="stat-cards" style={{marginBottom:0}}>
      <div className="stat-card">
        <div className="value">{sessions.length}</div>
        <div className="label">Total Sessions</div>
      </div>
      <div className="stat-card">
        <div className="value">{avgQuality}</div>
        <div className="label">Avg Quality</div>
      </div>
      <div className="stat-card">
        <div className="value">{streak}🔥</div>
        <div className="label">Day Streak</div>
      </div>
      <div className="stat-card">
        <div className="value">{sessions.filter(s => s.caffeine).length}</div>
        <div className="label">Caffeine Days</div>
      </div>
    </div>
  );
}

// ==================== ANALYTICS PAGE ====================
function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    axios.get(`${API}/analytics`).then(res => setAnalytics(res.data)).catch(console.error);
  }, []);

  if (!analytics) return <p style={{textAlign:'center', marginTop:50}}>Loading analytics...</p>;
  if (analytics.message) return <p style={{textAlign:'center', marginTop:50, color:'#9aa0a6'}}>No data yet. Log some sleep first!</p>;

  return (
    <div>
      <h1 style={{fontSize:26, fontWeight:700, marginBottom:24}}>📈 Analytics</h1>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="value">{analytics.avg_duration_hours}h</div>
          <div className="label">Avg Duration</div>
        </div>
        <div className="stat-card">
          <div className="value">{analytics.avg_quality}/5</div>
          <div className="label">Avg Quality</div>
        </div>
        <div className="stat-card">
          <div className="value">{analytics.current_streak}🔥</div>
          <div className="label">Streak</div>
        </div>
        <div className="stat-card">
          <div className="value">{analytics.total_sessions}</div>
          <div className="label">Total Logs</div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ marginTop: 24 }}>
        <div className="card">
          <h3>🌟 Best Night</h3>
          <p style={{margin:'8px 0'}}>📅 {analytics.best_night?.date}</p>
          <p style={{margin:'8px 0'}}>⭐ {'⭐'.repeat(analytics.best_night?.quality || 0)}</p>
          <p style={{margin:'8px 0'}}>💤 {analytics.best_night?.duration}h</p>
        </div>
        <div className="card">
          <h3>😔 Worst Night</h3>
          <p style={{margin:'8px 0'}}>📅 {analytics.worst_night?.date}</p>
          <p style={{margin:'8px 0'}}>⭐ {'⭐'.repeat(analytics.worst_night?.quality || 0)}</p>
          <p style={{margin:'8px 0'}}>💤 {analytics.worst_night?.duration}h</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3>🏷️ Factor Breakdown</h3>
        <p style={{margin:'10px 0'}}>☕ Caffeine consumed on <strong>{analytics.caffeine_days}</strong> days</p>
        <p style={{margin:'10px 0'}}>🏃 Exercise done on <strong>{analytics.exercise_days}</strong> days</p>
        <p style={{margin:'10px 0'}}>📱 Avg screen time: <strong>{analytics.avg_screen_time}</strong> minutes</p>
      </div>
    </div>
  );
}

// ==================== GOALS PAGE ====================
function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ target_bed_time: '23:00', target_wake_time: '07:00', target_hours: 8 });

  useEffect(() => { fetchGoals(); }, []);

  const fetchGoals = async () => {
    try {
      const res = await axios.get(`${API}/goals`);
      setGoals(res.data.goals);
    } catch (err) {
      console.error('Failed to fetch goals');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/goals`, form);
      setShowForm(false);
      fetchGoals();
    } catch (err) {
      alert('Failed to set goal');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{fontSize:26, fontWeight:700}}>🎯 Sleep Goals</h1>
        <button className="btn btn-primary" style={{ width: 'auto', padding: '12px 28px' }}
          onClick={() => setShowForm(true)}>+ Set Goal</button>
      </div>

      {goals.length === 0 && <p style={{ color: '#9aa0a6', textAlign: 'center', marginTop: 40 }}>No goals yet. Create your first sleep goal!</p>}

      {goals.map(g => (
        <div key={g.id} className={`goal-card ${g.is_active ? 'active' : ''}`} style={{ marginBottom: 16 }}>
          <h3>{g.is_active ? '🟢 Active Goal' : '⚪ Previous Goal'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginTop: 14 }}>
            <div><strong style={{color:'#5f6368', fontSize:12, textTransform:'uppercase'}}>🛌 Bed Time</strong><br/><span style={{fontSize:18, fontWeight:600}}>{g.target_bed_time}</span></div>
            <div><strong style={{color:'#5f6368', fontSize:12, textTransform:'uppercase'}}>⏰ Wake Time</strong><br/><span style={{fontSize:18, fontWeight:600}}>{g.target_wake_time}</span></div>
            <div><strong style={{color:'#5f6368', fontSize:12, textTransform:'uppercase'}}>💤 Target</strong><br/><span style={{fontSize:18, fontWeight:600}}>{g.target_hours} hours</span></div>
          </div>
        </div>
      ))}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Set Sleep Goal</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>🛌 Target Bed Time</label>
                <input type="time" value={form.target_bed_time}
                  onChange={e => setForm({ ...form, target_bed_time: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>⏰ Target Wake Time</label>
                <input type="time" value={form.target_wake_time}
                  onChange={e => setForm({ ...form, target_wake_time: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>💤 Target Sleep Hours</label>
                <input type="number" min="4" max="12" step="0.5" value={form.target_hours}
                  onChange={e => setForm({ ...form, target_hours: parseFloat(e.target.value) })} required />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">💾 Save Goal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== AI INSIGHTS PAGE ====================
function AIInsightsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/ai/recommendations`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{textAlign:'center', marginTop:60, fontSize:18}}>🤖 Analyzing your sleep patterns...</p>;
  if (!data) return <p style={{textAlign:'center', marginTop:60}}>Unable to load insights.</p>;

  return (
    <div>
      <h1 style={{fontSize:26, fontWeight:700, marginBottom:8}}>🤖 AI-Powered Sleep Insights</h1>
      <p style={{color:'#9aa0a6', marginBottom:28}}>Personalized recommendations based on {data.summary?.total_sessions_analyzed || 0} sleep logs</p>

      {data.message ? (
        <div className="card" style={{textAlign:'center', padding:40}}>
          <p style={{fontSize:18, color:'#5f6368'}}>{data.message}</p>
          {data.recommendations?.map((rec, i) => (
            <p key={i} style={{marginTop:10}}>{rec.icon} {rec.description}</p>
          ))}
        </div>
      ) : (
        <>
          <div className="stat-cards">
            <div className="stat-card">
              <div className="value">{data.summary?.avg_quality}/5</div>
              <div className="label">Avg Quality</div>
            </div>
            <div className="stat-card">
              <div className="value" style={{textTransform:'capitalize'}}>{data.summary?.dominant_mood}</div>
              <div className="label">Dominant Mood</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.recommendations?.length || 0}</div>
              <div className="label">Recommendations</div>
            </div>
            <div className="stat-card">
              <div className="value">{data.summary?.sleep_hygiene_tips?.length || 0}</div>
              <div className="label">Hygiene Tips</div>
            </div>
          </div>

          <h2 style={{margin:'28px 0 16px', fontSize:20}}>📋 Personalized Recommendations</h2>
          {data.recommendations?.map((rec, i) => (
            <div key={i} className="ai-recommendation">
              <h3>{rec.icon} {rec.title}</h3>
              <p>{rec.description}</p>
              <div className="ai-action">💡 {rec.action}</div>
            </div>
          ))}

          {data.summary?.sleep_hygiene_tips?.length > 0 && (
            <div className="hygiene-card">
              <h3>🌿 Sleep Hygiene Tips</h3>
              <ul>
                {data.summary.sleep_hygiene_tips.map((tip, i) => (
                  <li key={i}>✅ {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}