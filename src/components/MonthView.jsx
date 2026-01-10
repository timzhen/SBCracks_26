import React from 'react';
import { getEventsForDate } from '../utils/dateUtils';

export default function MonthView({ currentDate, events, onDayClick, onEventClick }) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Get previous month's days to fill the grid
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const createEventElement = (event) => {
        return (
            <div
                key={event.id}
                className="event-item"
                style={{ backgroundColor: event.color }}
                onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                }}
            >
                {event.title}
            </div>
        );
    };

    const renderCalendarDays = () => {
        const days = [];
        
        for (let i = 0; i < 42; i++) {
            let day, date, isOtherMonth = false;

            if (i < startingDayOfWeek) {
                // Previous month
                day = daysInPrevMonth - startingDayOfWeek + i + 1;
                date = new Date(year, month - 1, day);
                isOtherMonth = true;
            } else if (i < startingDayOfWeek + daysInMonth) {
                // Current month
                day = i - startingDayOfWeek + 1;
                date = new Date(year, month, day);
            } else {
                // Next month
                day = i - startingDayOfWeek - daysInMonth + 1;
                date = new Date(year, month + 1, day);
                isOtherMonth = true;
            }

            const dateStr = date.toISOString();
            const normalizedDate = new Date(date);
            normalizedDate.setHours(0, 0, 0, 0);
            const isToday = normalizedDate.getTime() === today.getTime();
            
            const dayEvents = getEventsForDate(events, normalizedDate);
            const maxVisibleEvents = 3;
            const visibleEvents = dayEvents.slice(0, maxVisibleEvents);
            const moreEventsCount = dayEvents.length - maxVisibleEvents;

            days.push(
                <div
                    key={i}
                    className={`calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                    data-date={dateStr}
                    onClick={() => onDayClick(date)}
                >
                    <div className="day-number">{day}</div>
                    <div className="day-events">
                        {visibleEvents.map(createEventElement)}
                        {moreEventsCount > 0 && (
                            <div className="event-item more-events">
                                +{moreEventsCount} more
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        
        return days;
    };

    return (
        <div className="calendar-view month-view active">
            <div className="calendar-weekdays">
                <div className="weekday">Sun</div>
                <div className="weekday">Mon</div>
                <div className="weekday">Tue</div>
                <div className="weekday">Wed</div>
                <div className="weekday">Thu</div>
                <div className="weekday">Fri</div>
                <div className="weekday">Sat</div>
            </div>
            <div className="calendar-grid">
                {renderCalendarDays()}
            </div>
        </div>
    );
}

