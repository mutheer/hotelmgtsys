import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, LogIn, Percent, CircleDollarSign } from 'lucide-react';

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }

    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/reports/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error("Dashboard stats restricted or error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
      <div style={{ 
        width: '50px', height: '50px', borderRadius: '12px', 
        background: `rgba(${color}, 0.1)`, color: `rgba(${color}, 1)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={24} />
      </div>
      <div>
        <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '4px', fontWeight: '500' }}>{title}</h4>
        <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{value}</div>
      </div>
    </div>
  );

  const canSeeFinancials = user?.role === 'OWNER' || user?.role === 'ACCOUNTANT';

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Good Morning!</h2>
        <p style={{ color: 'var(--text-muted)' }}>Welcome to The Melva Elegant Guest House Reception Desk.</p>
      </div>

      {loading ? <p>Loading metrics...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
          {canSeeFinancials && stats && (
             <StatCard title="Total Revenue Today" value={`P${stats.revenueToday.toFixed(2)}`} icon={CircleDollarSign} color="212, 175, 55" />
          )}
          {canSeeFinancials && stats && (
             <StatCard title="Occupancy Rate" value={stats.occupancy.rate} icon={Percent} color="59, 130, 246" />
          )}
          {stats && (
             <>
               <StatCard title="Total Registered Guests" value={stats.totalGuests} icon={Users} color="168, 85, 247" />
               <StatCard title="Check-ins Today" value={stats.todaysCheckIns} icon={LogIn} color="34, 197, 94" />
             </>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px', minHeight: '300px' }}>
          <h3 style={{ marginBottom: '20px' }}>Notice Board</h3>
          <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-light)' }}>
            <p style={{ color: 'var(--text-main)', marginBottom: '8px', fontWeight: '600' }}>Welcome to the Melva PMS!</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>The system is now fully operational. Please remember to record all walk-ins and phone bookings immediately.</p>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ marginBottom: '20px' }}>Inventory Status</h3>
          {stats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Clean & Vacant:</span>
                <span style={{ fontWeight: 'bold', color: '#22c55e' }}>{stats.occupancy.clean}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Occupied:</span>
                <span style={{ fontWeight: 'bold', color: '#3b82f6' }}>{stats.occupancy.occupied}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-light)', paddingTop: '10px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Rooms:</span>
                <span style={{ fontWeight: 'bold' }}>{stats.occupancy.total}</span>
              </div>
            </div>
          ) : <p style={{ color: 'var(--text-muted)' }}>Stats unavailable for this role.</p>}
        </div>
      </div>
    </div>
  );
};

export default Overview;
