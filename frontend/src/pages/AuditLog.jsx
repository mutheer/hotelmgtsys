import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Filter, Eye } from 'lucide-react';
import Modal from '../components/Modal';

const API = 'http://localhost:5000/api';
const PAGE_SIZE = 50;

const ACTIONS = [
  '', 'CREATE_BOOKING', 'UPDATE_BOOKING', 'CHECK_IN_GUEST', 'CANCEL_BOOKING',
  'TRANSFER_ROOM', 'MARK_NO_SHOW', 'CREATE_GROUP_BOOKING', 'CANCEL_GROUP',
  'ADD_SERVICE_CHARGE', 'DELETE_SERVICE_CHARGE',
  'ADD_PAYMENT', 'DELETE_PAYMENT',
  'ADD_DISCOUNT', 'DELETE_DISCOUNT',
  'ISSUE_INVOICE', 'ISSUE_RECEIPT', 'CHECKOUT_FOLIO',
  'CREATE_GUEST', 'UPDATE_GUEST'
];

const AuditLog = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState({ action: '', entity: '' });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchPage = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE, offset });
      if (filter.action) params.set('action', filter.action);
      if (filter.entity) params.set('entity', filter.entity);
      const res = await axios.get(`${API}/audit?${params}`, { headers });
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPage(); }, [offset, filter.action, filter.entity]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Audit Log</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{total.toLocaleString()} total entries</div>
      </div>

      <div className="glass-panel" style={{ padding: '14px', marginBottom: '14px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Filter size={16} color="var(--text-muted)" />
        <select className="input-field" value={filter.action}
          onChange={e => { setFilter({ ...filter, action: e.target.value }); setOffset(0); }}
          style={{ padding: '6px 10px', width: 'auto' }}>
          <option value="">All actions</option>
          {ACTIONS.filter(Boolean).map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="input-field" value={filter.entity}
          onChange={e => { setFilter({ ...filter, entity: e.target.value }); setOffset(0); }}
          style={{ padding: '6px 10px', width: 'auto' }}>
          <option value="">All entities</option>
          {['Booking', 'BookingGroup', 'Guest', 'ServiceCharge', 'Payment', 'Discount', 'Invoice', 'Folio'].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px 14px' }}>When</th>
              <th style={{ padding: '12px 14px' }}>Who</th>
              <th style={{ padding: '12px 14px' }}>Action</th>
              <th style={{ padding: '12px 14px' }}>Entity</th>
              <th style={{ padding: '12px 14px', width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No entries match.</td></tr>}
            {items.map(it => (
              <tr key={it.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.8rem' }}>{new Date(it.createdAt).toLocaleString('en-GB')}</td>
                <td style={{ padding: '10px 14px' }}>{it.user?.name || '—'}<br /><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{it.user?.role}</span></td>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.8rem' }}>{it.action}</td>
                <td style={{ padding: '10px 14px' }}>{it.entity}<br /><span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{String(it.entityId).slice(0, 8)}</span></td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                  <button onClick={() => setSelected(it)} style={{ all: 'unset', cursor: 'pointer', color: 'var(--accent-gold)', padding: '4px' }} title="View details">
                    <Eye size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
        <button className="btn" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))} style={{ background: 'rgba(255,255,255,0.05)' }}>
          <ChevronLeft size={14} /> Prev
        </button>
        <span style={{ color: 'var(--text-muted)' }}>Page {page} of {pageCount}</span>
        <button className="btn" disabled={offset + PAGE_SIZE >= total} onClick={() => setOffset(offset + PAGE_SIZE)} style={{ background: 'rgba(255,255,255,0.05)' }}>
          Next <ChevronRight size={14} />
        </button>
      </div>

      {selected && (
        <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={`${selected.action}`}>
          <div style={{ fontSize: '0.9rem' }}>
            <p><strong>When:</strong> {new Date(selected.createdAt).toLocaleString('en-GB')}</p>
            <p><strong>Who:</strong> {selected.user?.name} (@{selected.user?.username}) — {selected.user?.role}</p>
            <p><strong>Entity:</strong> {selected.entity} <code style={{ fontSize: '0.8rem' }}>{selected.entityId}</code></p>
            {selected.reason && <p><strong>Reason:</strong> {selected.reason}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>BEFORE</div>
                <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', overflow: 'auto', maxHeight: '300px', fontSize: '0.75rem' }}>{selected.beforeValue ? JSON.stringify(JSON.parse(selected.beforeValue), null, 2) : '—'}</pre>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>AFTER</div>
                <pre style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', overflow: 'auto', maxHeight: '300px', fontSize: '0.75rem' }}>{selected.afterValue ? JSON.stringify(JSON.parse(selected.afterValue), null, 2) : '—'}</pre>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLog;
