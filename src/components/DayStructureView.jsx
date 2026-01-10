import React, { useState } from 'react';
import { getEventsForDate } from '../utils/dateUtils';
import ViewMenu from './ViewMenu';

export default function DayStructureView({ currentDate, events, onDayClick, onCreateEvent, onViewChange, currentView }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    // Get start of week (Sunday)
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDays = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        weekDays.push({
            date,
            name: dayNames[i],
            dateStr: `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
        });
    }

    const handleAIChatClick = () => {
        // TODO: Open AI chatbot (Dario)
        console.log('Dario AI Chatbot clicked');
    };

    const handleSpeakClick = () => {
        // TODO: Implement voice assistant to schedule events or ask questions
        console.log('Voice assistant activated - speak to schedule events or ask questions');
    };

    const handleMenuClick = () => {
        setIsMenuOpen(true);
    };

    const handleProfileClick = () => {
        // TODO: Update profile button functionality
        console.log('Profile button clicked');
    };

    const handleDaySlotClick = (dayDate, hour = null) => {
        const date = new Date(dayDate);
        if (hour !== null) {
            date.setHours(hour, 0, 0, 0);
        }
        onDayClick(date);
    };

    return (
        <div className="day-structure-container dark-theme">
            {/* Top Header */}
            <div className="day-structure-header">
                <button className="day-structure-menu-btn" onClick={handleMenuClick}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/>
                    </svg>
                </button>
                <div className="day-structure-week-view">
                    {weekDays.map((day, index) => {
                        const dayEvents = getEventsForDate(events, day.date);
                        return (
                            <div key={index} className="day-structure-column">
                                <div className="day-structure-day-header">
                                    <div className="day-structure-day-name">{day.name}</div>
                                    <div className="day-structure-day-date">{day.dateStr}</div>
                                </div>
                                <div 
                                    className="day-structure-day-slot"
                                    onClick={() => handleDaySlotClick(day.date)}
                                >
                                    {dayEvents.map(event => (
                                        <div 
                                            key={event.id}
                                            className="day-structure-event-item"
                                            style={{ backgroundColor: event.color }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDayClick(new Date(event.start));
                                            }}
                                        >
                                            {event.title}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <button className="day-structure-profile-btn" onClick={handleProfileClick}>
                    <div className="profile-icon-wrapper">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                    </div>
                    <span className="profile-label">Profile</span>
                </button>
            </div>

            {/* Footer */}
            <div className="day-structure-footer">
                <button className="day-structure-create-btn" onClick={onCreateEvent}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                    </svg>
                    <span>Create Event</span>
                </button>
                <button className="day-structure-mic-btn" onClick={handleSpeakClick}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" fill="currentColor"/>
                    </svg>
                </button>
                <button className="day-structure-dario-btn" onClick={handleAIChatClick}>
                    <div className="dario-icon-wrapper">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                        </svg>
                    </div>
                    <span className="dario-label">Dario</span>
                </button>
            </div>
            <ViewMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onViewChange={onViewChange}
                currentView={currentView}
            />
        </div>
    );
}
