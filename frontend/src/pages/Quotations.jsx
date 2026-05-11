import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Trash2, Printer, FileText, Edit2, Save, ArrowLeft } from 'lucide-react';

const API = 'http://localhost:5000/api';

// Default settings used to prefill new quotes — all editable per quote
const DEFAULT_BANK = {
  accountName: 'The Melva (Pty) Ltd',
  internalBranchCode: '002',
  externalBranchCode: '290267'
};
const DEFAULT_NOTES = 'BED AND BREAKFAST FOR ONE\n\nINCLUDES TOURISM LEVY.';

const emptyLine = () => ({
  date: new Date().toISOString().split('T')[0],
  description: '',
  rooms: '',
  days: '',
  unitPrice: '',
  total: 0
});

const blankForm = () => ({
  quoteNumber: '',
  date: new Date().toISOString().split('T')[0],
  clientName: '',
  clientTel: '',
  clientEmail: '',
  clientAddress: '',
  lineItems: [emptyLine()],
  notes: DEFAULT_NOTES,
  vatPct: 12,
  discount: 0,
  bankDetails: { ...DEFAULT_BANK }
});

const Quotations = () => {
  const [view, setView] = useState('list');  // list | edit | print
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blankForm());
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchList = async () => {
    try {
      const res = await axios.get(`${API}/quotations`, { headers });
      setItems(res.data);
    } catch (err) { console.error(err); }
  };
  useEffect(() => { fetchList(); }, []);

  const newQuote = async () => {
    setForm(blankForm());
    setEditingId(null);
    try {
      const res = await axios.get(`${API}/quotations/next-number`, { headers });
      setForm(f => ({ ...f, quoteNumber: res.data.quoteNumber }));
    } catch (_) {}
    setView('edit');
  };

  const openEdit = (q) => {
    setForm({
      quoteNumber: q.quoteNumber,
      date: new Date(q.date).toISOString().split('T')[0],
      clientName: q.clientName,
      clientTel: q.clientTel || '',
      clientEmail: q.clientEmail || '',
      clientAddress: q.clientAddress || '',
      lineItems: q.lineItems.length ? q.lineItems : [emptyLine()],
      notes: q.notes || '',
      vatPct: q.vatPct,
      discount: q.discount || 0,
      bankDetails: q.bankDetails || { ...DEFAULT_BANK }
    });
    setEditingId(q.id);
    setView('edit');
  };

  const updateLine = (idx, patch) => {
    setForm(f => {
      const lineItems = f.lineItems.map((li, i) => {
        if (i !== idx) return li;
        const merged = { ...li, ...patch };
        const days = parseFloat(merged.days) || 0;
        const rooms = parseFloat(merged.rooms) || 1;
        const unit = parseFloat(merged.unitPrice) || 0;
        // Total = rooms * days * unit price.  Empty rooms means 1.
        const qtyMult = days > 0 ? days : 1;
        merged.total = +(rooms * qtyMult * unit).toFixed(2);
        return merged;
      });
      return { ...f, lineItems };
    });
  };

  const addLine = () => setForm(f => ({ ...f, lineItems: [...f.lineItems, emptyLine()] }));
  const removeLine = (idx) => setForm(f => ({ ...f, lineItems: f.lineItems.filter((_, i) => i !== idx) }));

  const totals = () => {
    const subtotal = form.lineItems.reduce((s, li) => s + (Number(li.total) || 0), 0);
    const discount = Math.min(Math.max(0, Number(form.discount) || 0), subtotal);
    const taxable = subtotal - discount;
    const vatAmount = +(taxable * (form.vatPct / 100)).toFixed(2);
    const total = +(taxable + vatAmount).toFixed(2);
    return { subtotal: +subtotal.toFixed(2), discount: +discount.toFixed(2), vatAmount, total };
  };

  const save = async () => {
    if (!form.clientName) return alert('Client name is required.');
    setBusy(true);
    try {
      const payload = { ...form };
      if (editingId) {
        const res = await axios.patch(`${API}/quotations/${editingId}`, payload, { headers });
        await fetchList();
        return res.data;
      } else {
        const res = await axios.post(`${API}/quotations`, payload, { headers });
        await fetchList();
        setEditingId(res.data.id);
        return res.data;
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveAndPrint = async () => {
    const saved = await save();
    if (!saved) return;
    setView('print');
    setTimeout(async () => {
      if (window.melvaApi?.saveDocumentPdf) {
        await window.melvaApi.saveDocumentPdf({ kind: 'quotations', number: saved.quoteNumber });
      }
      window.print();
    }, 250);
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this quotation?')) return;
    try {
      await axios.delete(`${API}/quotations/${id}`, { headers });
      fetchList();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  // ─── LIST VIEW ───────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 className="page-title" style={{ margin: 0 }}>Quotations</h2>
          <button className="btn btn-primary" onClick={newQuote}>
            <Plus size={18} /> New Quotation
          </button>
        </div>
        <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <th style={{ padding: '14px' }}>Quote #</th>
                <th style={{ padding: '14px' }}>Date</th>
                <th style={{ padding: '14px' }}>Client</th>
                <th style={{ padding: '14px', textAlign: 'right' }}>Total</th>
                <th style={{ padding: '14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(q => (
                <tr key={q.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>{q.quoteNumber}</td>
                  <td style={{ padding: '12px 14px' }}>{new Date(q.date).toLocaleDateString('en-GB')}</td>
                  <td style={{ padding: '12px 14px' }}>{q.clientName}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>P{q.total.toFixed(2)}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    <button className="btn" onClick={() => openEdit(q)} style={{ background: 'rgba(255,255,255,0.04)', padding: '4px 10px', marginRight: '6px' }}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button className="btn" onClick={() => remove(q.id)} style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', padding: '4px 10px' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan="5" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No quotations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const t = totals();

  // ─── EDIT / CREATE VIEW ──────────────────────────────────────────────────
  if (view === 'edit') {
    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <button className="btn" onClick={() => setView('list')} style={{ background: 'rgba(255,255,255,0.05)' }}>
            <ArrowLeft size={16} /> Back
          </button>
          <h2 className="page-title" style={{ margin: 0 }}>{editingId ? 'Edit Quotation' : 'New Quotation'}</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn" onClick={save} disabled={busy} style={{ background: 'rgba(255,255,255,0.05)' }}>
              <Save size={16} /> Save
            </button>
            <button className="btn btn-primary" onClick={saveAndPrint} disabled={busy}>
              <Printer size={16} /> Save & Print
            </button>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">Quote Number</label>
              <input className="input-field" value={form.quoteNumber} onChange={e => setForm({ ...form, quoteNumber: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Date</label>
              <input type="date" className="input-field" value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                onClick={e => e.target.showPicker?.()} onFocus={e => e.target.showPicker?.()} />
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">Attention (Client Name)</label>
              <input className="input-field" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} required />
            </div>
            <div className="input-group">
              <label className="input-label">Tel</label>
              <input className="input-field" value={form.clientTel} onChange={e => setForm({ ...form, clientTel: e.target.value })} />
            </div>
          </div>
          <div className="form-grid">
            <div className="input-group">
              <label className="input-label">E-mail</label>
              <input className="input-field" value={form.clientEmail} onChange={e => setForm({ ...form, clientEmail: e.target.value })} />
            </div>
            <div className="input-group">
              <label className="input-label">Address</label>
              <input className="input-field" value={form.clientAddress} onChange={e => setForm({ ...form, clientAddress: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
          <h4 style={{ marginBottom: '12px' }}>Line Items</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'left' }}>
                <th style={{ padding: '6px 4px', width: '120px' }}>DATE</th>
                <th style={{ padding: '6px 4px' }}>Description</th>
                <th style={{ padding: '6px 4px', width: '85px', textAlign: 'right' }}>Rooms</th>
                <th style={{ padding: '6px 4px', width: '85px', textAlign: 'right' }}>Days</th>
                <th style={{ padding: '6px 4px', width: '110px', textAlign: 'right' }}>Unit Price (P)</th>
                <th style={{ padding: '6px 4px', width: '110px', textAlign: 'right' }}>Total</th>
                <th style={{ width: '36px' }}></th>
              </tr>
            </thead>
            <tbody>
              {form.lineItems.map((li, i) => (
                <tr key={i}>
                  <td style={{ padding: '4px' }}>
                    <input type="date" className="input-field" value={li.date}
                      style={{ padding: '6px' }}
                      onChange={e => updateLine(i, { date: e.target.value })}
                      onClick={e => e.target.showPicker?.()} onFocus={e => e.target.showPicker?.()} />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input className="input-field" value={li.description} placeholder="e.g. Executive Room, Lunch, Dinner"
                      style={{ padding: '6px' }}
                      onChange={e => updateLine(i, { description: e.target.value })} />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input type="number" className="input-field" value={li.rooms} style={{ padding: '6px', textAlign: 'right' }}
                      onChange={e => updateLine(i, { rooms: e.target.value })} placeholder="—" />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input type="number" className="input-field" value={li.days} style={{ padding: '6px', textAlign: 'right' }}
                      onChange={e => updateLine(i, { days: e.target.value })} placeholder="—" />
                  </td>
                  <td style={{ padding: '4px' }}>
                    <input type="number" step="0.01" className="input-field" value={li.unitPrice} style={{ padding: '6px', textAlign: 'right' }}
                      onChange={e => updateLine(i, { unitPrice: e.target.value })} />
                  </td>
                  <td style={{ padding: '12px 4px', textAlign: 'right', fontWeight: 600 }}>{Number(li.total).toFixed(2)}</td>
                  <td style={{ padding: '4px' }}>
                    <button onClick={() => removeLine(i)} title="Remove" style={{ all: 'unset', cursor: 'pointer', color: '#ef4444', padding: '6px' }}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn" onClick={addLine} style={{ background: 'rgba(255,255,255,0.05)', marginTop: '8px' }}>
            <Plus size={14} /> Add row
          </button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <table style={{ minWidth: '300px' }}>
              <tbody>
                <tr><td style={{ padding: '4px 12px', textAlign: 'right' }}>Sub Total</td>
                    <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 700 }}>P{t.subtotal.toFixed(2)}</td></tr>
                <tr>
                  <td style={{ padding: '4px 12px', textAlign: 'right' }}>
                    Discount (P)
                    <input type="number" step="0.01" min="0" value={form.discount}
                      onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })}
                      style={{ width: '80px', marginLeft: '8px', padding: '4px 6px', background: 'rgba(168,85,247,0.10)', border: '1px solid #a855f7', borderRadius: '4px', color: 'inherit' }} />
                  </td>
                  <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 700, color: t.discount > 0 ? '#c4b5fd' : 'inherit' }}>
                    {t.discount > 0 ? `-P${t.discount.toFixed(2)}` : 'P0.00'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 12px', textAlign: 'right' }}>
                    VAT
                    <input type="number" step="0.01" value={form.vatPct}
                      onChange={e => setForm({ ...form, vatPct: parseFloat(e.target.value) || 0 })}
                      style={{ width: '60px', marginLeft: '8px', padding: '4px 6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-light)', borderRadius: '4px', color: 'inherit' }} />
                    %
                  </td>
                  <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 700 }}>P{t.vatAmount.toFixed(2)}</td>
                </tr>
                <tr><td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 700, borderTop: '1px solid var(--border-light)' }}>Total</td>
                    <td style={{ padding: '4px 12px', textAlign: 'right', fontWeight: 700, borderTop: '1px solid var(--border-light)' }}>P{t.total.toFixed(2)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="form-grid">
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>Notes</h4>
            <textarea className="input-field" rows="5" value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              style={{ resize: 'vertical' }} placeholder="e.g. BED AND BREAKFAST FOR ONE&#10;INCLUDES TOURISM LEVY." />
          </div>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h4 style={{ marginBottom: '10px' }}>Banking Details</h4>
            <div className="input-group">
              <label className="input-label">Account Name</label>
              <input className="input-field" value={form.bankDetails.accountName}
                onChange={e => setForm({ ...form, bankDetails: { ...form.bankDetails, accountName: e.target.value } })} />
            </div>
            <div className="input-group">
              <label className="input-label">Internal Branch Code</label>
              <input className="input-field" value={form.bankDetails.internalBranchCode}
                onChange={e => setForm({ ...form, bankDetails: { ...form.bankDetails, internalBranchCode: e.target.value } })} />
            </div>
            <div className="input-group">
              <label className="input-label">External Branch Code</label>
              <input className="input-field" value={form.bankDetails.externalBranchCode}
                onChange={e => setForm({ ...form, bankDetails: { ...form.bankDetails, externalBranchCode: e.target.value } })} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── PRINT VIEW (matches the supplied quotation PDF) ─────────────────────
  return (
    <div className="animate-fade-in">
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button className="btn" onClick={() => setView('edit')} style={{ background: 'rgba(255,255,255,0.05)' }}>
          <ArrowLeft size={16} /> Back to edit
        </button>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Printer size={16} /> Print
        </button>
      </div>

      <div className="print-only print-doc-wrapper">
        <div className="print-doc">
          {/* Header */}
          <table style={{ marginBottom: '14px' }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', verticalAlign: 'top' }}>
                  <div style={{ fontSize: '10pt', marginBottom: '4px' }}>P O Box 808</div>
                  <img src="/melva-logo.png" alt=""
                    style={{ maxWidth: '120px', maxHeight: '100px', objectFit: 'contain' }}
                    onError={e => { e.currentTarget.style.display = 'none'; }} />
                  <div style={{ fontWeight: 700, marginTop: '6px', fontSize: '11pt' }}>THE MELVA ELEGANT GUESTHOUSE</div>
                </td>
                <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'right', fontSize: '10pt' }}>
                  <div>Plot 34912, Block 8</div>
                  <div>Gaborone</div>
                  <div style={{ marginTop: '20px' }}>Tel: 3119162/ 73115959</div>
                </td>
              </tr>
            </tbody>
          </table>

          <h2 style={{ textAlign: 'center', fontSize: '18pt', margin: '20px 0' }}>QUOTATION</h2>

          {/* Client info */}
          <table style={{ marginBottom: '18px' }}>
            <tbody>
              <tr>
                <td style={{ verticalAlign: 'top', width: '60%' }}>
                  <table style={{ fontSize: '10pt' }}>
                    <tbody>
                      <tr><td style={{ fontWeight: 700, paddingRight: '8px' }}>DATE :</td><td>{new Date(form.date).toLocaleDateString('en-GB').replace(/\//g, '/')}</td></tr>
                      <tr><td style={{ fontWeight: 700, paddingRight: '8px' }}>ATT&nbsp;&nbsp;:</td><td style={{ textTransform: 'uppercase' }}>{form.clientName}</td></tr>
                      {form.clientTel && <tr><td style={{ fontWeight: 700, paddingRight: '8px' }}>TEL&nbsp;&nbsp;:</td><td>{form.clientTel}</td></tr>}
                      {form.clientEmail && <tr><td style={{ fontWeight: 700, paddingRight: '8px' }}>E-mail:</td><td>{form.clientEmail}</td></tr>}
                      {form.clientAddress && <tr><td style={{ fontWeight: 700, paddingRight: '8px' }}>Address:</td><td>{form.clientAddress}</td></tr>}
                    </tbody>
                  </table>
                </td>
                <td style={{ verticalAlign: 'top', textAlign: 'left' }}>
                  <div style={{ fontSize: '10pt' }}>
                    <strong>QUOTE :&nbsp;&nbsp;{form.quoteNumber}</strong>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Items */}
          <table className="doc-table" style={{ marginBottom: '16px', border: '1px solid #000' }}>
            <thead>
              <tr style={{ background: '#e8e8e8' }}>
                <th style={{ border: '1px solid #000', width: '12%' }}>DATE</th>
                <th style={{ border: '1px solid #000' }}>Description</th>
                <th style={{ border: '1px solid #000', width: '9%' }}>No of rooms</th>
                <th style={{ border: '1px solid #000', width: '9%' }}>No of days</th>
                <th style={{ border: '1px solid #000', width: '14%' }}>Unit Price(P)</th>
                <th style={{ border: '1px solid #000', width: '14%' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {form.lineItems.filter(li => li.description).map((li, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #000' }}>{new Date(li.date).toLocaleDateString('en-GB')}</td>
                  <td style={{ border: '1px solid #000', textTransform: 'uppercase' }}>{li.description}</td>
                  <td style={{ border: '1px solid #000' }}>{li.rooms || ''}</td>
                  <td style={{ border: '1px solid #000' }}>{li.days || ''}</td>
                  <td style={{ border: '1px solid #000' }}>{(parseFloat(li.unitPrice) || 0).toFixed(2)}</td>
                  <td style={{ border: '1px solid #000' }}>{Number(li.total).toFixed(2)}</td>
                </tr>
              ))}
              {/* Padding rows for visual symmetry */}
              {Array.from({ length: Math.max(0, 3 - form.lineItems.filter(li => li.description).length) }).map((_, i) => (
                <tr key={`pad-${i}`}>
                  <td style={{ border: '1px solid #000', height: '24px' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000' }}></td>
                </tr>
              ))}
              <tr>
                <td colSpan="4" style={{ border: '1px solid #000' }}></td>
                <td style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 700 }}>Sub Total</td>
                <td style={{ border: '1px solid #000', fontWeight: 700 }}>{t.subtotal.toFixed(2)}</td>
              </tr>
              {t.discount > 0 && (
                <tr>
                  <td colSpan="4" style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 700 }}>Discount</td>
                  <td style={{ border: '1px solid #000', fontWeight: 700 }}>-{t.discount.toFixed(2)}</td>
                </tr>
              )}
              <tr>
                <td colSpan="4" style={{ border: '1px solid #000' }}></td>
                <td style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 700 }}>{form.vatPct}% vat</td>
                <td style={{ border: '1px solid #000', fontWeight: 700 }}>{t.vatAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan="4" style={{ border: '1px solid #000' }}></td>
                <td style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 700 }}>Total</td>
                <td style={{ border: '1px solid #000', fontWeight: 700 }}>{t.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* Notes */}
          {form.notes && (
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '10pt', marginBottom: '20px' }}>
              {form.notes}
            </div>
          )}

          {/* Banking */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontWeight: 700, marginBottom: '8px' }}>BANKING DETAILS</div>
            <table style={{ fontSize: '10pt' }}>
              <tbody>
                <tr><td style={{ paddingRight: '20px' }}>Account Name:</td><td>{form.bankDetails.accountName}</td></tr>
                <tr><td>Internal Branch code:</td><td>{form.bankDetails.internalBranchCode}</td></tr>
                <tr><td>External Branch Code:</td><td>{form.bankDetails.externalBranchCode}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Quotations;
