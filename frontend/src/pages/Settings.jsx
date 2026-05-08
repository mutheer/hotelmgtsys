import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Save, Settings as SettingsIcon } from 'lucide-react';

const API = 'http://localhost:5000/api';

const SETTING_LABELS = {
  PROPERTY_NAME: 'Property Name',
  SERVICE_BREAKFAST_PRICE: 'Breakfast Price (P)',
  SERVICE_LAUNDRY_PRICE: 'Laundry Price (P)',
  SERVICE_AIRPORT_TRANSFER_PRICE: 'Airport Transfer Price (P)',
  DEPOSIT_PERCENTAGE: 'Deposit Percentage (%)',
  LARGE_BOOKING_THRESHOLD_NIGHTS: 'Large Booking Threshold (nights)',
};

const Settings = () => {
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get(`${API}/settings`, { headers })
      .then(r => setSettings(r.data))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (key) => {
    setSaving(key);
    try {
      await axios.post(`${API}/settings`, { key, value: settings[key] }, { headers });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } catch {
      alert(`Failed to save ${key}`);
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) return <p>Loading settings...</p>;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <SettingsIcon size={24} color="var(--accent-gold)" />
        <div>
          <h2 className="page-title" style={{ margin: 0 }}>System Settings</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '4px' }}>Owner access only — configure property details and pricing</p>
        </div>
      </div>

      <div style={{ maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {Object.entries(SETTING_LABELS).map(([key, label]) => (
          <div key={key} className="glass-panel" style={{ padding: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>{label}</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="input-field"
                style={{ flex: 1 }}
                value={settings[key] || ''}
                onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleSave(key)}
              />
              <button
                className="btn btn-primary"
                onClick={() => handleSave(key)}
                disabled={saving === key}
                style={{ minWidth: '80px', background: saved === key ? '#22c55e' : undefined }}
              >
                {saved === key ? '✓ Saved' : saving === key ? '...' : <><Save size={14} /> Save</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Settings;
