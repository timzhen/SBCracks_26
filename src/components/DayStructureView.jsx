import React, { useState } from 'react';
import { getEventsForDate } from '../utils/dateUtils';
import ViewMenu from './ViewMenu';
import DarkFooter from './DarkFooter';

export default function DayStructureView({ 
    currentDate, 
    events, 
    onDayClick, 
    onCreateEvent, 
    onViewChange, 
    currentView,
    onAddEvent,
    onUpdateEvent,
    onDeleteEvent,
    onNavigateDate,
    onGoToToday
}) {
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
        // Voice assistant is handled by DarkFooter
        console.log('Voice assistant activated');
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
                                <div className="day-structure-day-slot">
                                    {Array.from({ length: 24 }, (_, hour) => {
                                        const hourEvents = dayEvents.filter(event => {
                                            const eventDate = new Date(event.start);
                                            return eventDate.getHours() === hour;
                                        });
                                        
                                        return (
                                            <div
                                                key={hour}
                                                className="day-structure-hour-slot"
                                                onClick={() => handleDaySlotClick(day.date, hour)}
                                            >
                                                <div className="day-structure-hour-label">
                                                    {hour === 0 ? '12 AM' : 
                                                     hour < 12 ? `${hour} AM` :
                                                     hour === 12 ? '12 PM' :
                                                     `${hour - 12} PM`}
                                                </div>
                                                <div className="day-structure-hour-content">
                                                    {hourEvents.map(event => (
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
            <DarkFooter
                onCreateEvent={onCreateEvent}
                onSpeakClick={handleSpeakClick}
                onAIChatClick={handleAIChatClick}
                onAddEvent={onAddEvent}
                onUpdateEvent={onUpdateEvent}
                onDeleteEvent={onDeleteEvent}
                onNavigateDate={onNavigateDate}
                onGoToToday={onGoToToday}
                onSwitchView={onViewChange}
                currentDate={currentDate}
                currentView={currentView}
                events={events}
            />
            <ViewMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                onViewChange={onViewChange}
                currentView={currentView}
            />
        </div>
    );
}
