import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" onClick={e => e.stopPropagation()} style={{ padding: '40px' }}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>
        <h3 style={{ fontSize: '1.6rem', marginBottom: '30px', color: 'var(--accent-gold)' }}>{title}</h3>
        {children}
      </div>
    </div>
  );
};

export default Modal;
