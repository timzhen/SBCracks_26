import React, { useState, useEffect, useRef } from 'react';
import { formatDateForInput, formatTimeForInput } from '../utils/dateUtils';
import ColorPicker from './ColorPicker';

export default function EventModal({ isOpen, event, defaultDate, onClose, onSave, onDelete }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [calendar, setCalendar] = useState('calendar');
    const [selectedColor, setSelectedColor] = useState('#4285F4');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorPickerRef = useRef(null);

    useEffect(() => {
        if (event) {
            // Edit existing event
            setTitle(event.title);
            setDescription(event.description || '');
            
            const start = new Date(event.start);
            const end = new Date(event.end);
            
            setStartDate(formatDateForInput(start));
            setStartTime(formatTimeForInput(start));
            setEndDate(formatDateForInput(end));
            setEndTime(formatTimeForInput(end));
            
            setCalendar(event.calendar || 'calendar');
            setSelectedColor(event.color || '#4285F4');
        } else {
            // Create new event
            const eventDate = defaultDate || new Date();
            const start = new Date(eventDate);
            start.setHours(9, 0, 0, 0);
            const end = new Date(start);
            end.setHours(10, 0, 0, 0);
            
            setTitle('');
            setDescription('');
            setStartDate(formatDateForInput(start));
            setStartTime(formatTimeForInput(start));
            setEndDate(formatDateForInput(end));
            setEndTime(formatTimeForInput(end));
            setCalendar('calendar');
            setSelectedColor('#4285F4');
        }
    }, [event, defaultDate, isOpen]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(e.target)) {
                setShowColorPicker(false);
            }
        };

        if (showColorPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showColorPicker]);

    const handleSave = () => {
        if (!title.trim()) {
            alert('Please enter a title for the event');
            return;
        }

        const start = new Date(`${startDate}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);

        if (end <= start) {
            alert('End time must be after start time');
            return;
        }

        const eventData = {
            id: event ? event.id : Date.now().toString(),
            title: title.trim(),
            description,
            start: start.toISOString(),
            end: end.toISOString(),
            calendar,
            color: selectedColor
        };

        onSave(eventData);
        onClose();
    };

    const handleDelete = () => {
        if (event && window.confirm('Are you sure you want to delete this event?')) {
            onDelete(event.id);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay active" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{event ? 'Edit Event' : 'New Event'}</h2>
                    <button className="close-modal" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    <div className="form-group">
                        <input
                            type="text"
                            className="event-input"
                            placeholder="Add title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <div className="datetime-group">
                            <input
                                type="date"
                                className="date-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                            <input
                                type="time"
                                className="time-input"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                            <span>to</span>
                            <input
                                type="date"
                                className="date-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                            <input
                                type="time"
                                className="time-input"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <textarea
                            className="event-textarea"
                            placeholder="Add description"
                            rows="3"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Calendar</label>
                        <select
                            className="event-select"
                            value={calendar}
                            onChange={(e) => setCalendar(e.target.value)}
                        >
                            <option value="calendar">Calendar</option>
                            <option value="personal">Personal</option>
                            <option value="work">Work</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <div style={{ position: 'relative' }} ref={colorPickerRef}>
                            <button
                                className="color-picker-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowColorPicker(!showColorPicker);
                                }}
                            >
                                <div className="selected-color" style={{ backgroundColor: selectedColor }}></div>
                                <span>Event color</span>
                            </button>
                            <ColorPicker
                                selectedColor={selectedColor}
                                onColorSelect={(color) => {
                                    setSelectedColor(color);
                                    setShowColorPicker(false);
                                }}
                                isOpen={showColorPicker}
                            />
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    {event && (
                        <button className="btn-secondary delete-event" onClick={handleDelete}>
                            Delete
                        </button>
                    )}
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button className="btn-primary" onClick={handleSave}>Save</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

