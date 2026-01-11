import React from 'react';
import { getEventsForDate } from '../utils/dateUtils';
import DarkHeader from './DarkHeader';
import DarkFooter from './DarkFooter';

export default function DarkMonthView({ 
    currentDate, 
    events, 
    onDayClick, 
    onEventClick, 
    onCreateEvent, 
    onViewChange, 
    currentView,
    onAddEvent,
    onUpdateEvent,
    onDeleteEvent,
    onNavigateDate,
    onGoToToday
}) {
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
                className="dark-month-event-item"
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
                day = daysInPrevMonth - startingDayOfWeek + i + 1;
                date = new Date(year, month - 1, day);
                isOtherMonth = true;
            } else if (i < startingDayOfWeek + daysInMonth) {
                day = i - startingDayOfWeek + 1;
                date = new Date(year, month, day);
            } else {
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
                    className={`dark-month-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                    data-date={dateStr}
                    onClick={() => onDayClick(date)}
                >
                    <div className="dark-month-day-number">{day}</div>
                    <div className="dark-month-day-events">
                        {visibleEvents.map(createEventElement)}
                        {moreEventsCount > 0 && (
                            <div className="dark-month-event-item more-events">
                                +{moreEventsCount} more
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        
        return days;
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[month];

    return (
        <div className="dark-view-container">
            <DarkHeader
                currentView={currentView}
                onViewChange={onViewChange}
                onProfileClick={() => console.log('Profile clicked')}
            />
            <div className="dark-month-view">
                <div className="dark-month-header">
                    <div className="dark-month-name">{monthName}</div>
                    <div className="dark-month-year">{year}</div>
                </div>
                <div className="dark-month-weekdays">
                    <div className="dark-weekday">Sun</div>
                    <div className="dark-weekday">Mon</div>
                    <div className="dark-weekday">Tue</div>
                    <div className="dark-weekday">Wed</div>
                    <div className="dark-weekday">Thu</div>
                    <div className="dark-weekday">Fri</div>
                    <div className="dark-weekday">Sat</div>
                </div>
                <div className="dark-month-grid">
                    {renderCalendarDays()}
                </div>
            </div>
            <DarkFooter
                onCreateEvent={onCreateEvent}
                onSpeakClick={() => console.log('Voice assistant activated')}
                onAIChatClick={() => console.log('Dario AI Chatbot clicked')}
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
        </div>
    );
}

