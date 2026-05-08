import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Sparkles, AlertCircle, PlayCircle, Ban, Plus, CheckCircle, ClipboardList } from 'lucide-react';

const API = 'http://localhost:5000/api';

const Housekeeping = () => {
  const [rooms, setRooms] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newTaskRoomId, setNewTaskRoomId] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    try {
      const [roomsRes, tasksRes] = await Promise.all([
        axios.get(`${API}/housekeeping`, { headers }),
        axios.get(`${API}/housekeeping/tasks`, { headers })
      ]);
      setRooms(roomsRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API}/housekeeping/${id}`,
        { status: newStatus, reason: 'Manual Housekeeping Update' },
        { headers }
      );
      fetchAll();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskRoomId) return;
    setAddingTask(true);
    try {
      await axios.post(`${API}/housekeeping/tasks`, { roomId: newTaskRoomId, notes: newTaskNotes }, { headers });
      setNewTaskRoomId('');
      setNewTaskNotes('');
      fetchAll();
    } catch (err) {
      alert('Failed to create task');
    } finally {
      setAddingTask(false);
    }
  };

  const markTaskDone = async (taskId) => {
    try {
      await axios.patch(`${API}/housekeeping/tasks/${taskId}`, { status: 'COMPLETED' }, { headers });
      fetchAll();
    } catch (err) {
      alert('Failed to update task');
    }
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'VACANT_CLEAN':   return { bg: 'rgba(34,197,94,0.1)',  text: '#22c55e', icon: <Sparkles size={16} /> };
      case 'VACANT_DIRTY':   return { bg: 'rgba(249,115,22,0.1)', text: '#f97316', icon: <AlertCircle size={16} /> };
      case 'OCCUPIED_CLEAN': return { bg: 'rgba(59,130,246,0.1)', text: '#3b82f6', icon: <PlayCircle size={16} /> };
      case 'OCCUPIED_DIRTY': return { bg: 'rgba(168,85,247,0.1)', text: '#a855f7', icon: <AlertCircle size={16} /> };
      case 'OUT_OF_ORDER':   return { bg: 'rgba(239,68,68,0.1)',  text: '#ef4444', icon: <Ban size={16} /> };
      default: return { bg: 'rgba(255,255,255,0.1)', text: '#fff', icon: null };
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'PENDING');
  const doneTasks = tasks.filter(t => t.status === 'COMPLETED');

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h2 className="page-title" style={{ margin: 0 }}>Housekeeping</h2>
        <p style={{ color: 'var(--text-muted)' }}>Room status and today's cleaning tasks</p>
      </div>

      {isLoading ? <p>Loading...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>

          {/* Left: Room Status Grid */}
          <div>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="var(--accent-gold)" /> Room Status
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
              {rooms.map(room => {
                const s = getStatusStyle(room.status);
                return (
                  <div key={room.id} className="glass-panel" style={{ padding: '16px', borderTop: `3px solid ${s.text}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '1.3rem' }}>Room {room.number}</h3>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: s.bg, color: s.text, padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600' }}>
                        {s.icon} {room.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '12px' }}>{room.type?.name}</p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => updateStatus(room.id, 'VACANT_CLEAN')} className="btn" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', fontSize: '0.75rem', padding: '6px 10px' }}>✓ Clean</button>
                      <button onClick={() => updateStatus(room.id, 'VACANT_DIRTY')} className="btn" style={{ background: 'rgba(249,115,22,0.1)', color: '#f97316', fontSize: '0.75rem', padding: '6px 10px' }}>Dirty</button>
                      <button onClick={() => updateStatus(room.id, 'OUT_OF_ORDER')} className="btn" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.75rem', padding: '6px 10px' }}>O.O.O</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Tasks */}
          <div>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ClipboardList size={18} color="var(--accent-gold)" /> Today's Tasks
              <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '12px', fontSize: '0.8rem' }}>{pendingTasks.length} pending</span>
            </h3>

            {/* Add Task Form */}
            <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px' }}>
              <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <select className="input-field" value={newTaskRoomId} onChange={e => setNewTaskRoomId(e.target.value)} required>
                  <option value="">Select room...</option>
                  {rooms.map(r => <option key={r.id} value={r.id}>Room {r.number} — {r.type?.name}</option>)}
                </select>
                <input type="text" className="input-field" placeholder="Notes (e.g. change towels, deep clean)" value={newTaskNotes} onChange={e => setNewTaskNotes(e.target.value)} />
                <button type="submit" className="btn btn-primary" disabled={addingTask}>
                  <Plus size={16} /> {addingTask ? 'Adding...' : 'Add Task'}
                </button>
              </form>
            </div>

            {/* Pending Tasks */}
            {pendingTasks.length === 0 && (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No pending tasks for today.</p>
            )}
            {pendingTasks.map(task => (
              <div key={task.id} className="glass-panel" style={{ padding: '14px 16px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderLeft: '3px solid #f97316' }}>
                <div>
                  <span style={{ fontWeight: '600' }}>Room {task.room?.number}</span>
                  {task.notes && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2px' }}>{task.notes}</p>}
                </div>
                <button onClick={() => markTaskDone(task.id)} className="btn" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={14} /> Done
                </button>
              </div>
            ))}

            {/* Completed Tasks */}
            {doneTasks.length > 0 && (
              <>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '16px', marginBottom: '8px' }}>Completed today ({doneTasks.length})</p>
                {doneTasks.map(task => (
                  <div key={task.id} style={{ padding: '10px 16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.5, borderLeft: '3px solid #22c55e', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <CheckCircle size={14} color="#22c55e" />
                    <span style={{ fontSize: '0.85rem' }}>Room {task.room?.number}{task.notes ? ` — ${task.notes}` : ''}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Housekeeping;
