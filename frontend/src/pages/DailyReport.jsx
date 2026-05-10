import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Printer, RefreshCw } from 'lucide-react';

const API = 'http://localhost:5000/api';

const DailyReport = () => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchReport = async (d = date) => {
    setBusy(true);
    try {
      const res = await axios.get(`${API}/daily-report?date=${d}`, { headers });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { fetchReport(date); }, [date]);

  const printReport = async () => {
    if (window.melvaApi?.saveDocumentPdf) {
      await window.melvaApi.saveDocumentPdf({ kind: 'shift-reports', number: date });
    }
    window.print();
  };

  if (!data) return <p>Loading shift report…</p>;

  const s = data.summary;

  return (
    <div className="animate-fade-in">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="page-title" style={{ margin: 0, marginBottom: '6px' }}>Daily Shift Report</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="date" className="input-field" value={date}
              onChange={e => setDate(e.target.value)}
              onClick={e => e.target.showPicker?.()} onFocus={e => e.target.showPicker?.()}
              style={{ padding: '6px 12px' }} />
            <button className="btn" onClick={() => fetchReport(date)} disabled={busy} style={{ background: 'rgba(255,255,255,0.05)' }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={printReport}>
          <Printer size={16} /> Print & Save PDF
        </button>
      </div>

      <div className="print-only print-doc-wrapper">
        <div className="print-doc">
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <img src="/melva-logo.png" alt="" style={{ width: '90px', display: 'block', margin: '0 auto 8px' }} onError={e => { e.currentTarget.style.display = 'none'; }} />
            <h1 style={{ fontSize: '14pt', margin: 0 }}>THE MELVA ELEGANT BOUTIQUE GUEST HOUSE</h1>
            <h2 style={{ fontSize: '16pt', margin: '8px 0' }}>DAILY SHIFT REPORT</h2>
            <div>Date: <strong>{new Date(data.date).toLocaleDateString('en-GB')}</strong></div>
            <div style={{ fontSize: '9pt', color: '#444', marginTop: '4px' }}>Prepared by: {user.name} · Printed: {new Date().toLocaleString('en-GB')}</div>
          </div>

          <table style={{ width: '100%', marginBottom: '16px', fontSize: '10pt' }}>
            <tbody>
              <tr><td style={{ padding: '4px 8px', fontWeight: 700 }}>Check-Ins today</td><td style={{ padding: '4px 8px', textAlign: 'right' }}>{s.checkedInCount}</td></tr>
              <tr><td style={{ padding: '4px 8px', fontWeight: 700 }}>Check-Outs today</td><td style={{ padding: '4px 8px', textAlign: 'right' }}>{s.checkedOutCount}</td></tr>
              <tr><td style={{ padding: '4px 8px', fontWeight: 700 }}>Bookings created today</td><td style={{ padding: '4px 8px', textAlign: 'right' }}>{s.bookingsCreated}</td></tr>
              <tr><td style={{ padding: '4px 8px', fontWeight: 700, borderTop: '1px solid #000' }}>Total Revenue Received</td><td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, borderTop: '1px solid #000' }}>P{s.totalRevenue.toFixed(2)}</td></tr>
              {Object.entries(s.byMethod).map(([m, v]) => (
                <tr key={m}><td style={{ padding: '4px 8px 4px 24px', color: '#444' }}>{m.replace('_', ' ')}</td><td style={{ padding: '4px 8px', textAlign: 'right' }}>P{v.toFixed(2)}</td></tr>
              ))}
              <tr><td style={{ padding: '4px 8px', fontWeight: 700, color: '#a16207' }}>💰 Cash on hand</td><td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: '#a16207' }}>P{s.cashOnHand.toFixed(2)}</td></tr>
            </tbody>
          </table>

          {data.checkedIn.length > 0 && (
            <>
              <h3 style={{ fontSize: '11pt', marginTop: '14px' }}>Check-Ins ({data.checkedIn.length})</h3>
              <table className="doc-table"><tbody>
                {data.checkedIn.map(b => (
                  <tr key={b.id}><td>{b.guest?.firstName} {b.guest?.lastName}</td><td>Room {b.room?.number}</td><td style={{ textAlign: 'right' }}>by {b.user?.name || '-'}</td></tr>
                ))}
              </tbody></table>
            </>
          )}

          {data.checkedOut.length > 0 && (
            <>
              <h3 style={{ fontSize: '11pt', marginTop: '14px' }}>Check-Outs ({data.checkedOut.length})</h3>
              <table className="doc-table"><tbody>
                {data.checkedOut.map(b => (
                  <tr key={b.id}><td>{b.guest?.firstName} {b.guest?.lastName}</td><td>Room {b.room?.number}</td></tr>
                ))}
              </tbody></table>
            </>
          )}

          {data.paymentsToday.length > 0 && (
            <>
              <h3 style={{ fontSize: '11pt', marginTop: '14px' }}>Payments ({data.paymentsToday.length})</h3>
              <table className="doc-table"><tbody>
                {data.paymentsToday.map(p => (
                  <tr key={p.id}>
                    <td>{p.folio?.booking?.guest?.firstName} {p.folio?.booking?.guest?.lastName}</td>
                    <td>{p.method.replace('_', ' ')}</td>
                    <td>{p.reference || '-'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>P{p.amount.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', color: '#444' }}>{p.user?.name}</td>
                  </tr>
                ))}
              </tbody></table>
            </>
          )}

          <div style={{ marginTop: '40px', fontSize: '9pt' }}>
            ____________________________&nbsp;&nbsp;&nbsp;&nbsp;____________________________<br />
            Outgoing receptionist (signature){'   '}Incoming receptionist (signature)
          </div>
        </div>
      </div>

      {/* On-screen summary panel */}
      <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <StatTile label="Check-Ins" value={s.checkedInCount} />
        <StatTile label="Check-Outs" value={s.checkedOutCount} />
        <StatTile label="New Bookings" value={s.bookingsCreated} />
        <StatTile label="Total Revenue" value={`P${s.totalRevenue.toFixed(2)}`} accent="#22c55e" />
        <StatTile label="Cash on Hand" value={`P${s.cashOnHand.toFixed(2)}`} accent="var(--accent-gold)" />
      </div>

      <div className="no-print glass-panel" style={{ padding: '20px' }}>
        <h4 style={{ marginBottom: '10px' }}>Payments today by method</h4>
        {Object.keys(s.byMethod).length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No payments yet.</p> : (
          <table style={{ width: '100%' }}>
            <tbody>
              {Object.entries(s.byMethod).map(([m, v]) => (
                <tr key={m}><td style={{ padding: '6px 0', color: 'var(--text-muted)' }}>{m.replace('_', ' ')}</td><td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700 }}>P{v.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const StatTile = ({ label, value, accent }) => (
  <div className="glass-panel" style={{ padding: '16px' }}>
    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>
    <div style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: '6px', color: accent || 'inherit' }}>{value}</div>
  </div>
);

export default DailyReport;
