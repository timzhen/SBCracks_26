import React from 'react';

export default function Header({ currentView, currentDate, onViewChange, onNavigate, onGoToToday }) {
    const formatCurrentDate = () => {
        const options = { 
            month: 'long', 
            year: 'numeric' 
        };
        return currentDate.toLocaleDateString('en-US', options);
    };

    return (
        <header className="calendar-header">
            <div className="header-left">
                <button className="menu-button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/>
                    </svg>
                </button>
                <div className="logo-section">
                    <svg className="calendar-icon" width="40" height="40" viewBox="0 0 24 24">
                        <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 7V6h14v1H5z" fill="#4285F4"/>
                        <path d="M7 11h5v5H7z" fill="#EA4335"/>
                    </svg>
                    <span className="logo-text">Calendar</span>
                </div>
            </div>
            <div className="header-center">
                <div className="view-controls">
                    <button 
                        className={`view-btn ${currentView === 'day' ? 'active' : ''}`}
                        onClick={() => onViewChange('day')}
                    >
                        Day
                    </button>
                    <button 
                        className={`view-btn ${currentView === 'week' ? 'active' : ''}`}
                        onClick={() => onViewChange('week')}
                    >
                        Week
                    </button>
                    <button 
                        className={`view-btn ${currentView === 'month' ? 'active' : ''}`}
                        onClick={() => onViewChange('month')}
                    >
                        Month
                    </button>
                </div>
                <div className="navigation-controls">
                    <button className="nav-btn" onClick={() => onNavigate(-1)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                        </svg>
                    </button>
                    <button className="nav-btn today-btn" onClick={onGoToToday}>Today</button>
                    <button className="nav-btn" onClick={() => onNavigate(1)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    </button>
                </div>
                <div className="current-date-display">{formatCurrentDate()}</div>
            </div>
            <div className="header-right">
                <button className="search-button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor"/>
                    </svg>
                </button>
                <button className="settings-button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor"/>
                    </svg>
                </button>
                <button className="account-button">
                    <div className="account-circle">O</div>
                </button>
            </div>
        </header>
    );
}

