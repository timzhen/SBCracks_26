import React from 'react';
import { formatHour, getEventsForDate } from '../utils/dateUtils';

export default function DarkWeekView({ currentDate, events, onHourClick, onEventClick }) {
    // Get start of week (Sunday)
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const createEventElement = (event, date) => {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        const refDateStr = date.toDateString();
        const eventStartStr = startDate.toDateString();
        if (eventStartStr !== refDateStr) {
            return null;
        }
        
        const startHour = startDate.getHours() + startDate.getMinutes() / 60;
        const endHour = endDate.getHours() + endDate.getMinutes() / 60;
        const duration = Math.max(endHour - startHour, 0.5);
        const top = (startHour * 60);
        const height = Math.max(duration * 60, 20);

        const timeStr = `${formatHour(startDate.getHours())}${startDate.getMinutes() > 0 ? ':' + String(startDate.getMinutes()).padStart(2, '0') : ''}`;

        return (
            <div
                key={event.id}
                className="dark-week-event"
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

    const renderWeekDays = () => {
        const days = [];
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            date.setHours(0, 0, 0, 0);
            
            const isToday = date.getTime() === today.getTime();

            days.push(
                <div key={i} className={`dark-week-day-header ${isToday ? 'today' : ''}`}>
                    <div className="dark-week-day-name">{dayNames[i]}</div>
                    <div className="dark-week-day-number">{date.getDate()}</div>
                </div>
            );
        }
        
        return days;
    };

    const renderWeekColumns = () => {
        const columns = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            date.setHours(0, 0, 0, 0);
            
            const dayEvents = getEventsForDate(events, date);

            columns.push(
                <div key={i} className="dark-week-day-column" data-date={date.toISOString()}>
                    {Array.from({ length: 24 }, (_, hour) => (
                        <div
                            key={hour}
                            className="dark-week-hour-slot"
                            onClick={() => {
                                const hourDate = new Date(date);
                                hourDate.setHours(hour, 0, 0, 0);
                                onHourClick(hourDate);
                            }}
                        />
                    ))}
                    {dayEvents.map(event => createEventElement(event, date))}
                </div>
            );
        }
        
        return columns;
    };

    return (
        <div className="dark-view-container">
            <div className="dark-week-header">
                <div className="dark-time-column-header"></div>
                <div className="dark-week-days">
                    {renderWeekDays()}
                </div>
            </div>
            <div className="dark-week-body">
                <div className="dark-time-column">
                    {renderTimeColumn()}
                </div>
                <div className="dark-week-grid">
                    {renderWeekColumns()}
                </div>
            </div>
        </div>
    );
}

