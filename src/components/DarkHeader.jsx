import React, { useState } from 'react';
import ViewMenu from './ViewMenu';

export default function DarkHeader({ currentView, onViewChange, onProfileClick }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <div className="dark-header">
                <button className="dark-menu-btn" onClick={() => setIsMenuOpen(true)}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/>
                    </svg>
                </button>
                <button className="dark-profile-btn" onClick={onProfileClick}>
                    <div className="profile-icon-wrapper">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                    </div>
                    <span className="profile-label">Profile</span>
                </button>
            </div>
            <ViewMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onViewChange={onViewChange}
                currentView={currentView}
            />
        </>
    );
}

