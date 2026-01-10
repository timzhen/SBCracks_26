import { useState, useEffect } from 'react';

export function useCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [currentView, setCurrentView] = useState('week');
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Load events from localStorage on mount
    useEffect(() => {
        const savedEvents = localStorage.getItem('calendarEvents');
        if (savedEvents) {
            setEvents(JSON.parse(savedEvents));
        }
    }, []);

    // Save events to localStorage whenever events change
    useEffect(() => {
        localStorage.setItem('calendarEvents', JSON.stringify(events));
    }, [events]);

    const navigateDate = (direction) => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            if (currentView === 'month') {
                newDate.setMonth(newDate.getMonth() + direction);
            } else if (currentView === 'week') {
                newDate.setDate(newDate.getDate() + (direction * 7));
            } else if (currentView === 'day') {
                newDate.setDate(newDate.getDate() + direction);
            }
            return newDate;
        });
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const switchView = (view) => {
        setCurrentView(view);
    };

    const addEvent = (event) => {
        setEvents(prev => [...prev, event]);
    };

    const updateEvent = (eventId, updatedEvent) => {
        setEvents(prev => prev.map(e => e.id === eventId ? updatedEvent : e));
    };

    const deleteEvent = (eventId) => {
        setEvents(prev => prev.filter(e => e.id !== eventId));
    };

    return {
        currentDate,
        currentView,
        events,
        selectedEvent,
        setSelectedEvent,
        navigateDate,
        goToToday,
        switchView,
        addEvent,
        updateEvent,
        deleteEvent,
    };
}

