import React from 'react';
import { formatHour, getEventsForDate } from '../utils/dateUtils';

export default function DayView({ currentDate, events, onHourClick, onEventClick }) {
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
        const duration = Math.max(endHour - startHour, 0.5); // Minimum 30 minutes
        const top = (startHour * 60);
        const height = Math.max(duration * 60, 20);

        const timeStr = `${formatHour(startDate.getHours())}${startDate.getMinutes() > 0 ? ':' + String(startDate.getMinutes()).padStart(2, '0') : ''}`;

        return (
            <div
                key={event.id}
                className="day-event"
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
                <div className="event-title">
                    {timeStr} - {event.title}
                </div>
            </div>
        );
    };

    const renderTimeColumn = () => {
        const timeSlots = [];
        for (let hour = 0; hour < 24; hour++) {
            timeSlots.push(
                <div key={hour} className="time-slot">
                    {formatHour(hour)}
                </div>
            );
        }
        return timeSlots;
    };

    const dayEvents = getEventsForDate(events, normalizedDate);

    return (
        <div className="calendar-view day-view active">
            <div className="day-header">
                <div className="time-column"></div>
                <div className="day-title">{dayTitle}</div>
            </div>
            <div className="day-body">
                <div className="time-column">
                    {renderTimeColumn()}
                </div>
                <div className="day-grid">
                    {Array.from({ length: 24 }, (_, hour) => (
                        <div
                            key={hour}
                            className="day-hour-slot"
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
        </div>
    );
}

