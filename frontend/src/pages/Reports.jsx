import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, TrendingUp, BedDouble, Users } from 'lucide-react';

const API = 'http://localhost:5000/api';

const fmt = (n) => `P${Number(n || 0).toFixed(2)}`;

const METHOD_LABELS = {
  CASH: 'Cash',
  CARD: 'Card / Swipe',
  MOBILE_MONEY: 'Mobile Money',
  EFT: 'EFT / Transfer',
};

const Reports = () => {
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [revenue, setRevenue] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const [revRes, occRes] = await Promise.all([
        axios.get(`${API}/reports/revenue?from=${from}&to=${to}`, { headers }),
        axios.get(`${API}/reports/occupancy?from=${from}&to=${to}`, { headers }),
      ]);
      setRevenue(revRes.data);
      setOccupancy(occRes.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Reports</h2>
        <p style={{ color: 'var(--text-muted)' }}>Manager & Accountant access only</p>
      </div>

      {/* Date Range Filter */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>From</span>
          <input type="date" className="input-field" value={from} onChange={e => setFrom(e.target.value)} style={{ padding: '6px 12px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>To</span>
          <input type="date" className="input-field" value={to} onChange={e => setTo(e.target.value)} style={{ padding: '6px 12px' }} />
        </div>
        <button className="btn btn-primary" onClick={fetchReports} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Run Report'}
        </button>
      </div>

      {revenue && occupancy && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

          {/* Revenue Summary */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <TrendingUp size={20} color="var(--accent-gold)" /> Revenue
            </h3>
            <div style={{ fontSize: '2.4rem', fontWeight: 'bold', marginBottom: '8px' }}>
              {fmt(revenue.totalRevenue)}
            </div>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.85rem' }}>
              {new Date(from).toLocaleDateString('en-GB')} — {new Date(to).toLocaleDateString('en-GB')}
            </p>

            <h4 style={{ marginBottom: '12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>By Payment Method</h4>
            {Object.entries(revenue.byMethod || {}).map(([method, amount]) => (
              <div key={method} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span>{METHOD_LABELS[method] || method}</span>
                <span style={{ fontWeight: 'bold' }}>{fmt(amount)}</span>
              </div>
            ))}
            {Object.keys(revenue.byMethod || {}).length === 0 && (
              <p style={{ color: 'var(--text-muted)' }}>No payments in this period.</p>
            )}

            {revenue.payments?.length > 0 && (
              <>
                <h4 style={{ margin: '20px 0 12px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Recent Transactions</h4>
                {revenue.payments.slice(0, 8).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{new Date(p.createdAt).toLocaleDateString('en-GB')} — {p.folio?.booking?.guest?.firstName} {p.folio?.booking?.guest?.lastName}</span>
                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{fmt(p.amount)}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Occupancy Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <BedDouble size={20} color="var(--accent-gold)" /> Occupancy
              </h3>
              <div style={{ fontSize: '2.4rem', fontWeight: 'bold', marginBottom: '4px' }}>
                {occupancy.occupancyRate}%
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '20px' }}>Average occupancy rate</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Total Rooms', value: occupancy.totalRooms },
                  { label: 'Bookings', value: occupancy.bookings },
                  { label: 'Room Nights Sold', value: occupancy.totalNights },
                  { label: 'Available Room Nights', value: occupancy.availableRoomNights },
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>{stat.value}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                <Users size={20} color="var(--accent-gold)" /> Guests
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Total Guests (All Time)', value: occupancy.totalGuests },
                  { label: 'Repeat Guests', value: occupancy.repeatGuests },
                ].map(stat => (
                  <div key={stat.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 'bold' }}>{stat.value}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
