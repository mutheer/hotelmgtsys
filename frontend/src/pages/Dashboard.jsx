import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarDays, BedDouble, ReceiptText, Settings as ConfigIcon, LogOut, Brush, BarChart3, UsersRound, FileText } from 'lucide-react';
import Guests from './Guests';
import Calendar from './Calendar';
import Housekeeping from './Housekeeping';
import Billing from './Billing';
import Overview from './Overview';
import RoomSetup from './RoomSetup';
import Settings from './Settings';
import Reports from './Reports';
import Staff from './Staff';
import Quotations from './Quotations';

// Placeholder empty components for routing
// Removed placeholders
const Dashboard = ({ setAuth }) => {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth(false);
  };

  const NavItem = ({ to, icon: Icon, label }) => {
    const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
    return (
      <Link to={to} className={`nav-item ${isActive ? 'active' : ''}`}>
        <Icon size={20} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="app-layout animate-fade-in">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ textAlign: 'center' }}>
          <img
            src="/melva-logo.png"
            alt="The Melva"
            style={{ width: '90px', height: 'auto', display: 'block', margin: '0 auto 8px' }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
          <div className="brand-text" style={{ fontSize: '1rem', letterSpacing: '1px' }}>THE MELVA</div>
        </div>
        
        <nav className="nav-links">
          <NavItem to="/" icon={LayoutDashboard} label="Overview" />
          <NavItem to="/calendar" icon={CalendarDays} label="Calendar" />
          <NavItem to="/guests" icon={Users} label="Guests" />
          <NavItem to="/billing" icon={ReceiptText} label="Billing & Folio" />
          <NavItem to="/quotations" icon={FileText} label="Quotations" />
          <NavItem to="/housekeeping" icon={Brush} label="Housekeeping" />
          
          {/* Restricted links */}
          {(user?.role === 'OWNER' || user?.role === 'ACCOUNTANT') && (
            <NavItem to="/rooms" icon={BedDouble} label="Room Setup" />
          )}
          {(user?.role === 'OWNER' || user?.role === 'ACCOUNTANT') && (
            <NavItem to="/reports" icon={BarChart3} label="Reports" />
          )}
        </nav>

        <div style={{ padding: '24px 12px', borderTop: '1px solid var(--border-light)' }}>
          {user?.role === 'OWNER' && (
            <NavItem to="/staff" icon={UsersRound} label="Staff" />
          )}
          {user?.role === 'OWNER' && (
             <NavItem to="/settings" icon={ConfigIcon} label="Settings" />
          )}
          <button 
            onClick={handleLogout}
            style={{background:'transparent', border:'none', width:'100%', cursor:'pointer', marginTop:'10px'}}
            className="nav-item"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2 style={{fontSize: '1.2rem', fontWeight: '500'}}>Reception Desk</h2>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <span style={{color: 'var(--text-muted)'}}>{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <div style={{height: '35px', width: '35px', borderRadius: '50%', background: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 'bold'}}>
              {user?.name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        <div className="content-area">
          <div className="glass-panel" style={{padding: '30px', minHeight: '600px'}}>
            {user && (
              <Routes>
                <Route path="/" element={<Overview />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/guests" element={<Guests />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/quotations" element={<Quotations />} />
                <Route path="/housekeeping" element={<Housekeeping />} />
                
                {/* Protected Routes */}
                <Route path="/rooms" element={(user.role === 'OWNER' || user.role === 'ACCOUNTANT') ? <RoomSetup /> : <Navigate to="/" />} />
                <Route path="/settings" element={user.role === 'OWNER' ? <Settings /> : <Navigate to="/" />} />
                <Route path="/staff" element={user.role === 'OWNER' ? <Staff /> : <Navigate to="/" />} />
                <Route path="/reports" element={(user.role === 'OWNER' || user.role === 'ACCOUNTANT') ? <Reports /> : <Navigate to="/" />} />
                
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
