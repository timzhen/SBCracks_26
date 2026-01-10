import React from 'react';

export default function Sidebar({ currentView, onViewChange, onCreateEvent }) {
    return (
        <aside className="sidebar">
            <button className="create-event-btn" onClick={onCreateEvent}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                <span>Create</span>
            </button>
            
            <div className="sidebar-section">
                <div 
                    className={`sidebar-item ${currentView === 'structure' ? 'active' : ''}`}
                    onClick={() => onViewChange('structure')}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                    </svg>
                    <span>Structure</span>
                </div>
                <div 
                    className={`sidebar-item ${currentView === 'month' ? 'active' : ''}`}
                    onClick={() => onViewChange('month')}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z"/>
                    </svg>
                    <span>Month</span>
                </div>
                <div 
                    className={`sidebar-item ${currentView === 'week' ? 'active' : ''}`}
                    onClick={() => onViewChange('week')}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/>
                    </svg>
                    <span>Week</span>
                </div>
                <div 
                    className={`sidebar-item ${currentView === 'day' ? 'active' : ''}`}
                    onClick={() => onViewChange('day')}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    <span>Day</span>
                </div>
            </div>

            <div className="sidebar-section">
                <div className="section-title">My calendars</div>
                <div className="calendar-list">
                    <div className="calendar-item">
                        <div className="calendar-color" style={{backgroundColor: '#4285F4'}}></div>
                        <span>Calendar</span>
                        <svg className="calendar-more" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                    </div>
                    <div className="calendar-item">
                        <div className="calendar-color" style={{backgroundColor: '#34A853'}}></div>
                        <span>Personal</span>
                        <svg className="calendar-more" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                    </div>
                    <div className="calendar-item">
                        <div className="calendar-color" style={{backgroundColor: '#EA4335'}}></div>
                        <span>Work</span>
                        <svg className="calendar-more" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                    </div>
                </div>
            </div>

            <div className="sidebar-section">
                <button className="add-calendar-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                    <span>Add calendar</span>
                </button>
            </div>
        </aside>
    );
}

