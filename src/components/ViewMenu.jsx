import React from 'react';

export default function ViewMenu({ isOpen, onClose, onViewChange, currentView }) {
    if (!isOpen) return null;

    const views = [
        { id: 'day', label: 'Day' },
        { id: 'week', label: 'Week' },
        { id: 'month', label: 'Month' },
    ];

    return (
        <>
            <div className="view-menu-overlay" onClick={onClose}></div>
            <div className="view-menu">
                <div className="view-menu-header">
                    <h3>Switch View</h3>
                    <button className="view-menu-close" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                <div className="view-menu-items">
                    {views.map(view => (
                        <button
                            key={view.id}
                            className={`view-menu-item ${currentView === view.id ? 'active' : ''}`}
                            onClick={() => {
                                onViewChange(view.id);
                                onClose();
                            }}
                        >
                            {view.label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

