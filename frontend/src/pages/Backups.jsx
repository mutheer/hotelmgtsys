import React, { useEffect, useState } from 'react';
import { RefreshCw, RotateCcw, Save, AlertTriangle } from 'lucide-react';

const Backups = () => {
  const [folder, setFolder] = useState('');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const hasIpc = !!window.melvaApi;

  const refresh = async () => {
    if (!hasIpc) return;
    setBusy(true); setErr(''); setMsg('');
    try {
      const res = await window.melvaApi.listBackups();
      if (res.ok) { setFolder(res.folder); setItems(res.items); }
      else setErr(res.error || 'Failed to list backups');
    } finally { setBusy(false); }
  };

  useEffect(() => { refresh(); }, []);

  const runNow = async () => {
    setBusy(true); setErr(''); setMsg('');
    try {
      const res = await window.melvaApi.runBackupNow();
      if (res.ok) { setMsg('Backup taken.'); await refresh(); }
      else setErr(res.error || 'Failed to run backup');
    } finally { setBusy(false); }
  };

  const restore = async (b) => {
    const confirm1 = window.confirm(
      `⚠ Restore '${b.name}'?\n\nThis will REPLACE the live database with this backup. The current DB will be safely archived first. All users will be disconnected until restart.\n\nContinue?`
    );
    if (!confirm1) return;
    const typed = window.prompt('Type RESTORE in capital letters to confirm:');
    if (typed !== 'RESTORE') return setErr('Restore cancelled — confirmation text did not match.');

    setBusy(true); setErr(''); setMsg('');
    try {
      const res = await window.melvaApi.restoreBackup({ fileName: b.name });
      if (res.ok) {
        setMsg(`Restored. Pre-restore safety copy: ${res.safetyCopy}. Reloading…`);
        setTimeout(() => window.location.reload(), 2500);
      } else {
        setErr(res.error || 'Restore failed');
      }
    } finally { setBusy(false); }
  };

  if (!hasIpc) {
    return <div className="glass-panel" style={{ padding: '20px' }}>Backup controls are only available inside the desktop app.</div>;
  }

  const fmtSize = (b) => b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Backups</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn" onClick={refresh} disabled={busy} style={{ background: 'rgba(255,255,255,0.05)' }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={runNow} disabled={busy}>
            <Save size={14} /> Take Backup Now
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '14px', marginBottom: '14px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <div>Backup folder: <code>{folder || '—'}</code></div>
        <div style={{ marginTop: '4px' }}>Backups run automatically every midnight. Edit <code>%APPDATA%\\melva-hotel-management\\backup-config.json</code> to change the folder (e.g. point at OneDrive).</div>
      </div>

      {msg && <div style={{ background: 'rgba(34,197,94,0.1)', color: '#86efac', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>{msg}</div>}
      {err && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '12px', borderRadius: '8px', marginBottom: '14px' }}>{err}</div>}

      <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <th style={{ padding: '12px 14px' }}>File</th>
              <th style={{ padding: '12px 14px' }}>Taken</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Size</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan="4" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>No backups yet. Click "Take Backup Now" to create one.</td></tr>}
            {items.map(it => (
              <tr key={it.path} style={{ borderTop: '1px solid var(--border-light)' }}>
                <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.85rem' }}>{it.name}</td>
                <td style={{ padding: '10px 14px' }}>{new Date(it.mtimeMs).toLocaleString('en-GB')}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>{fmtSize(it.size)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                  <button className="btn" onClick={() => restore(it)} disabled={busy}
                    style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5', padding: '4px 10px' }}>
                    <RotateCcw size={14} /> Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '16px', padding: '14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: '#fcd34d', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem' }}>
          <strong>How restore works:</strong> the current database is archived as <code>hotel-pre-restore-…</code> in the same folder, then replaced with the chosen backup. The server restarts and the page reloads. If anything goes wrong, the pre-restore copy can be restored back.
        </div>
      </div>
    </div>
  );
};

export default Backups;
