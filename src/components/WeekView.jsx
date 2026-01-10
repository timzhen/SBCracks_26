import React from 'react';
import { formatHour, getEventsForDate } from '../utils/dateUtils';

export default function WeekView({ currentDate, events, onHourClick, onEventClick }) {
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
        
        // Only show event if it's on the reference date
        const refDateStr = date.toDateString();
        const eventStartStr = startDate.toDateString();
        if (eventStartStr !== refDateStr) {
            return null;
        }
        
        const startHour = startDate.getHours() + startDate.getMinutes() / 60;
        const endHour = endDate.getHours() + endDate.getMinutes() / 60;
        const duration = Math.max(endHour - startHour, 0.5); // Minimum 30 minutes
        const top = (startHour * 60);
        const height = Math.max(duration * 60, 20);

        const timeStr = `${formatHour(startDate.getHours())}${startDate.getMinutes() > 0 ? ':' + String(startDate.getMinutes()).padStart(2, '0') : ''}`;

        return (
            <div
                key={event.id}
                className="week-event"
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

    const renderWeekDays = () => {
        const days = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            date.setHours(0, 0, 0, 0);
            
            const isToday = date.getTime() === today.getTime();
            const dayEvents = getEventsForDate(events, date);

            days.push(
                <div key={i} className={`week-day-header ${isToday ? 'today' : ''}`}>
                    <div className="week-day-name">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="week-day-number">{date.getDate()}</div>
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
                <div key={i} className="week-day-column" data-date={date.toISOString()}>
                    {Array.from({ length: 24 }, (_, hour) => (
                        <div
                            key={hour}
                            className="week-hour-slot"
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
        <div className="calendar-view week-view active">
            <div className="week-header">
                <div className="time-column"></div>
                <div className="week-days">
                    {renderWeekDays()}
                </div>
            </div>
            <div className="week-body">
                <div className="time-column">
                    {renderTimeColumn()}
                </div>
                <div className="week-grid">
                    {renderWeekColumns()}
                </div>
            </div>
        </div>
    );
}

