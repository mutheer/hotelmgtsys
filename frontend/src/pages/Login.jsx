import React, { useState } from 'react';
import axios from 'axios';
import { LogIn } from 'lucide-react';

const Login = ({ setAuth }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        username,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      setAuth(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="glass-panel login-card animate-fade-in">
        <div className="login-header" style={{ textAlign: 'center' }}>
          <img
            src="/melva-logo.png"
            alt="The Melva"
            style={{ width: '120px', height: 'auto', margin: '0 auto 12px', display: 'block' }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="login-logo" style={{ fontSize: '1.4rem', letterSpacing: '2px' }}>THE MELVA</div>
          <p className="login-subtitle">Elegant Guest House PMS</p>
        </div>

        <form onSubmit={handleLogin}>
          {error && (
            <div style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Username</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input 
              type="password" 
              className="input-field" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary btn-block" 
            style={{ marginTop: '20px' }}
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
