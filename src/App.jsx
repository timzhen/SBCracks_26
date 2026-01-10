import React, { useState } from 'react';
import { useCalendar } from './hooks/useCalendar';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MonthView from './components/MonthView';
import WeekView from './components/WeekView';
import DayView from './components/DayView';
import EventModal from './components/EventModal';

export default function App() {
    const {
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
    } = useCalendar();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalDefaultDate, setModalDefaultDate] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);

    const handleCreateEvent = () => {
        setEditingEvent(null);
        setModalDefaultDate(null);
        setIsModalOpen(true);
    };

    const handleDayClick = (date) => {
        setEditingEvent(null);
        setModalDefaultDate(date);
        setIsModalOpen(true);
    };

    const handleHourClick = (date) => {
        setEditingEvent(null);
        setModalDefaultDate(date);
        setIsModalOpen(true);
    };

    const handleEventClick = (event) => {
        setEditingEvent(event);
        setModalDefaultDate(null);
        setIsModalOpen(true);
    };

    const handleSaveEvent = (eventData) => {
        if (editingEvent) {
            updateEvent(editingEvent.id, eventData);
        } else {
            addEvent(eventData);
        }
    };

    const handleDeleteEvent = (eventId) => {
        deleteEvent(eventId);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingEvent(null);
        setModalDefaultDate(null);
    };

    return (
        <div className="calendar-container">
            <Header
                currentView={currentView}
                currentDate={currentDate}
                onViewChange={switchView}
                onNavigate={navigateDate}
                onGoToToday={goToToday}
            />
            <Sidebar
                currentView={currentView}
                onViewChange={switchView}
                onCreateEvent={handleCreateEvent}
            />
            <main className="main-content">
                {currentView === 'month' && (
                    <MonthView
                        currentDate={currentDate}
                        events={events}
                        onDayClick={handleDayClick}
                        onEventClick={handleEventClick}
                    />
                )}
                {currentView === 'week' && (
                    <WeekView
                        currentDate={currentDate}
                        events={events}
                        onHourClick={handleHourClick}
                        onEventClick={handleEventClick}
                    />
                )}
                {currentView === 'day' && (
                    <DayView
                        currentDate={currentDate}
                        events={events}
                        onHourClick={handleHourClick}
                        onEventClick={handleEventClick}
                    />
                )}
            </main>
            <EventModal
                isOpen={isModalOpen}
                event={editingEvent}
                defaultDate={modalDefaultDate}
                onClose={handleCloseModal}
                onSave={handleSaveEvent}
                onDelete={handleDeleteEvent}
            />
        </div>
    );
}

