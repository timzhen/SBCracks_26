import React from 'react';

export default function DarkFooter({ onCreateEvent, onSpeakClick, onAIChatClick }) {
    return (
        <div className="day-structure-footer">
            <button className="day-structure-create-btn" onClick={onCreateEvent}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                </svg>
                <span>Create Event</span>
            </button>
            <button className="day-structure-mic-btn" onClick={onSpeakClick}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" fill="currentColor"/>
                </svg>
            </button>
            <button className="day-structure-dario-btn" onClick={onAIChatClick}>
                <div className="dario-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                    </svg>
                </div>
                <span className="dario-label">Dario</span>
            </button>
        </div>
    );
}

