import React from 'react';
import { formatHour, getEventsForDate } from '../utils/dateUtils';
import DarkHeader from './DarkHeader';
import DarkFooter from './DarkFooter';

export default function DarkDayView({ currentDate, events, onHourClick, onEventClick, onCreateEvent, onViewChange, currentView }) {
    const normalizedDate = new Date(currentDate);
    normalizedDate.setHours(0, 0, 0, 0);

    const dayTitle = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });

    const createEventElement = (event) => {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        const startHour = startDate.getHours() + startDate.getMinutes() / 60;
        const endHour = endDate.getHours() + endDate.getMinutes() / 60;
        const duration = Math.max(endHour - startHour, 0.5);
        const top = (startHour * 60);
        const height = Math.max(duration * 60, 20);

        const timeStr = `${formatHour(startDate.getHours())}${startDate.getMinutes() > 0 ? ':' + String(startDate.getMinutes()).padStart(2, '0') : ''}`;

        return (
            <div
                key={event.id}
                className="dark-day-event"
                style={{
                    position: 'absolute',
                    top: `${top}px`,
                    height: `${height}px`,
                    backgroundColor: event.color,
                    borderLeftColor: event.color,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                }}
            >
                <div className="dark-event-title">
                    {timeStr} - {event.title}
                </div>
            </div>
        );
    };

    const renderTimeColumn = () => {
        const timeSlots = [];
        for (let hour = 0; hour < 24; hour++) {
            timeSlots.push(
                <div key={hour} className="dark-time-slot">
                    {formatHour(hour)}
                </div>
            );
        }
        return timeSlots;
    };

    const dayEvents = getEventsForDate(events, normalizedDate);

    return (
        <div className="dark-view-container">
            <DarkHeader
                currentView={currentView}
                onViewChange={onViewChange}
                onProfileClick={() => console.log('Profile clicked')}
            />
            <div className="dark-day-header">
                <div className="dark-time-column-header"></div>
                <div className="dark-day-title">{dayTitle}</div>
            </div>
            <div className="dark-day-body">
                <div className="dark-time-column">
                    {renderTimeColumn()}
                </div>
                <div className="dark-day-grid">
                    {Array.from({ length: 24 }, (_, hour) => (
                        <div
                            key={hour}
                            className="dark-day-hour-slot"
                            onClick={() => {
                                const hourDate = new Date(currentDate);
                                hourDate.setHours(hour, 0, 0, 0);
                                onHourClick(hourDate);
                            }}
                        />
                    ))}
                    {dayEvents.map(createEventElement)}
                </div>
            </div>
            <DarkFooter
                onCreateEvent={onCreateEvent}
                onSpeakClick={() => console.log('Voice assistant activated')}
                onAIChatClick={() => console.log('Dario AI Chatbot clicked')}
            />
        </div>
    );
}

