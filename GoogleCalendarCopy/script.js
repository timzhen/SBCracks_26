// Calendar state
let currentDate = new Date();
let currentView = 'month';
let events = [];
let selectedEvent = null;
let selectedColor = '#4285F4';

// Initialize calendar
document.addEventListener('DOMContentLoaded', () => {
    initializeCalendar();
    setupEventListeners();
    updateCurrentDateDisplay();
    renderCalendar();
});

// Initialize calendar setup
function initializeCalendar() {
    // Load events from localStorage
    const savedEvents = localStorage.getItem('calendarEvents');
    if (savedEvents) {
        events = JSON.parse(savedEvents);
    }
}

// Setup all event listeners
function setupEventListeners() {
    // View switching
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            switchView(e.target.dataset.view);
        });
    });

    document.querySelectorAll('.sidebar-item').forEach(item => {
        if (item.dataset.view) {
            item.addEventListener('click', () => {
                switchView(item.dataset.view);
            });
        }
    });

    // Navigation
    document.getElementById('prev-month').addEventListener('click', () => {
        navigateDate(-1);
    });

    document.getElementById('next-month').addEventListener('click', () => {
        navigateDate(1);
    });

    document.getElementById('today-btn').addEventListener('click', () => {
        currentDate = new Date();
        updateCurrentDateDisplay();
        renderCalendar();
    });

    // Create event button
    document.getElementById('create-event-btn').addEventListener('click', () => {
        openEventModal();
    });

    // Modal controls
    document.getElementById('close-modal').addEventListener('click', closeEventModal);
    document.getElementById('cancel-event').addEventListener('click', closeEventModal);
    document.getElementById('save-event').addEventListener('click', saveEvent);
    document.getElementById('delete-event').addEventListener('click', deleteEvent);

    // Color picker
    document.getElementById('color-picker').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleColorPicker();
    });

    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', (e) => {
            selectedColor = e.target.dataset.color;
            document.querySelector('.selected-color').style.backgroundColor = selectedColor;
            toggleColorPicker();
        });
    });

    // Close modals on outside click
    document.getElementById('event-modal').addEventListener('click', (e) => {
        if (e.target.id === 'event-modal') {
            closeEventModal();
        }
    });

    // Click on calendar days
    document.addEventListener('click', (e) => {
        if (e.target.closest('.calendar-day') && !e.target.closest('.event-item')) {
            const dayElement = e.target.closest('.calendar-day');
            const dateStr = dayElement.dataset.date;
            if (dateStr) {
                const date = new Date(dateStr);
                openEventModal(date);
            }
        }
    });
}

// Switch between views
function switchView(view) {
    currentView = view;
    
    // Update active states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.classList.toggle('active', item.dataset.view === view);
    });

    // Show/hide views
    document.querySelectorAll('.calendar-view').forEach(viewEl => {
        viewEl.classList.remove('active');
    });

    document.getElementById(`${view}-view`).classList.add('active');

    renderCalendar();
}

// Navigate dates
function navigateDate(direction) {
    if (currentView === 'month') {
        currentDate.setMonth(currentDate.getMonth() + direction);
    } else if (currentView === 'week') {
        currentDate.setDate(currentDate.getDate() + (direction * 7));
    } else if (currentView === 'day') {
        currentDate.setDate(currentDate.getDate() + direction);
    }
    updateCurrentDateDisplay();
    renderCalendar();
}

// Update current date display
function updateCurrentDateDisplay() {
    const options = { 
        month: 'long', 
        year: 'numeric' 
    };
    const dateStr = currentDate.toLocaleDateString('en-US', options);
    document.getElementById('current-date').textContent = dateStr;
}

// Render calendar based on current view
function renderCalendar() {
    if (currentView === 'month') {
        renderMonthView();
    } else if (currentView === 'week') {
        renderWeekView();
    } else if (currentView === 'day') {
        renderDayView();
    }
}

// Render month view
function renderMonthView() {
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

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

    // Create calendar days
    for (let i = 0; i < 42; i++) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
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

        dayElement.dataset.date = date.toISOString();
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }

        // Check if today
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        // Day number
        const dayNumber = document.createElement('div');
        dayNumber.className = 'day-number';
        dayNumber.textContent = day;
        dayElement.appendChild(dayNumber);

        // Events for this day
        const dayEvents = getEventsForDate(date);
        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'day-events';

        const maxVisibleEvents = 3;
        const visibleEvents = dayEvents.slice(0, maxVisibleEvents);
        const moreEventsCount = dayEvents.length - maxVisibleEvents;

        visibleEvents.forEach(event => {
            const eventEl = createEventElement(event, 'month');
            eventsContainer.appendChild(eventEl);
        });

        if (moreEventsCount > 0) {
            const moreEl = document.createElement('div');
            moreEl.className = 'event-item more-events';
            moreEl.textContent = `+${moreEventsCount} more`;
            eventsContainer.appendChild(moreEl);
        }

        dayElement.appendChild(eventsContainer);
        grid.appendChild(dayElement);
    }
}

// Render week view
function renderWeekView() {
    const weekDaysContainer = document.getElementById('week-days');
    const weekGridContainer = document.getElementById('week-grid');
    weekDaysContainer.innerHTML = '';
    weekGridContainer.innerHTML = '';

    // Get start of week (Sunday)
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);
    startOfWeek.setHours(0, 0, 0, 0);

    // Create week day headers
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0);

        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date.getTime() === today.getTime()) {
            dayHeader.classList.add('today');
        }

        const dayName = document.createElement('div');
        dayName.className = 'week-day-name';
        dayName.textContent = date.toLocaleDateString('en-US', { weekday: 'short' });
        dayHeader.appendChild(dayName);

        const dayNumber = document.createElement('div');
        dayNumber.className = 'week-day-number';
        dayNumber.textContent = date.getDate();
        dayHeader.appendChild(dayNumber);

        weekDaysContainer.appendChild(dayHeader);

        // Create week day column
        const dayColumn = document.createElement('div');
        dayColumn.className = 'week-day-column';
        const normalizedDate = new Date(date);
        normalizedDate.setHours(0, 0, 0, 0);
        dayColumn.dataset.date = normalizedDate.toISOString();

        // Create hour slots
        for (let hour = 0; hour < 24; hour++) {
            const hourSlot = document.createElement('div');
            hourSlot.className = 'week-hour-slot';
            hourSlot.dataset.hour = hour;
            const hourDate = new Date(normalizedDate);
            hourDate.setHours(hour, 0, 0, 0);
            hourSlot.dataset.date = hourDate.toISOString();
            hourSlot.addEventListener('click', () => {
                openEventModal(hourDate);
            });
            dayColumn.appendChild(hourSlot);
        }

        weekGridContainer.appendChild(dayColumn);
    }

    // Render time column
    renderTimeColumn('week');

    // Render events
    renderEventsInWeekView(startOfWeek);
}

// Render day view
function renderDayView() {
    const dayTitle = document.getElementById('day-title');
    dayTitle.textContent = currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });

    const dayGrid = document.getElementById('day-grid');
    dayGrid.innerHTML = '';

    // Normalize current date for comparison
    const normalizedDate = new Date(currentDate);
    normalizedDate.setHours(0, 0, 0, 0);

    // Create hour slots
    for (let hour = 0; hour < 24; hour++) {
        const hourSlot = document.createElement('div');
        hourSlot.className = 'day-hour-slot';
        hourSlot.dataset.hour = hour;
        hourSlot.addEventListener('click', () => {
            const date = new Date(currentDate);
            date.setHours(hour, 0, 0, 0);
            openEventModal(date);
        });
        dayGrid.appendChild(hourSlot);
    }

    // Render time column
    renderTimeColumn('day');

    // Render events
    renderEventsInDayView();
}

// Render time column
function renderTimeColumn(view) {
    const timeColumnId = view === 'week' ? 'time-column' : 'day-time-column';
    const timeColumn = document.getElementById(timeColumnId);
    if (!timeColumn) return;

    timeColumn.innerHTML = '';

    for (let hour = 0; hour < 24; hour++) {
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        const timeStr = formatHour(hour);
        timeSlot.textContent = timeStr;
        timeColumn.appendChild(timeSlot);
    }
}

// Format hour for display
function formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
}

// Render events in week view
function renderEventsInWeekView(startOfWeek) {
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        date.setHours(0, 0, 0, 0);

        const dayEvents = getEventsForDate(date);
        
        // Find the matching day column by comparing date strings
        const allColumns = document.querySelectorAll('.week-day-column');
        let dayColumn = null;
        allColumns.forEach(col => {
            const colDate = new Date(col.dataset.date);
            colDate.setHours(0, 0, 0, 0);
            if (colDate.getTime() === date.getTime()) {
                dayColumn = col;
            }
        });
        
        if (!dayColumn) continue;

        dayEvents.forEach(event => {
            const eventEl = createEventElement(event, 'week', date);
            if (eventEl) {
                dayColumn.appendChild(eventEl);
            }
        });
    }
}

// Render events in day view
function renderEventsInDayView() {
    const dayEvents = getEventsForDate(currentDate);
    const dayGrid = document.getElementById('day-grid');

    if (!dayGrid) return;

    dayEvents.forEach(event => {
        const eventEl = createEventElement(event, 'day', currentDate);
        if (eventEl) {
            dayGrid.appendChild(eventEl);
        }
    });
}

// Create event element
function createEventElement(event, view, referenceDate = null) {
    if (view === 'month') {
        const eventEl = document.createElement('div');
        eventEl.className = 'event-item';
        eventEl.style.backgroundColor = event.color;
        eventEl.textContent = event.title;
        eventEl.dataset.eventId = event.id;
        eventEl.addEventListener('click', (e) => {
            e.stopPropagation();
            openEventModal(null, event);
        });
        return eventEl;
    } else {
        // Week and Day view
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        // Only show event if it's on the reference date
        if (referenceDate) {
            const refDateStr = referenceDate.toDateString();
            const eventStartStr = startDate.toDateString();
            if (eventStartStr !== refDateStr) {
                return null;
            }
        }
        
        const startHour = startDate.getHours() + startDate.getMinutes() / 60;
        const endHour = endDate.getHours() + endDate.getMinutes() / 60;
        const duration = Math.max(endHour - startHour, 0.5); // Minimum 30 minutes
        const top = (startHour * 60);
        const height = Math.max(duration * 60, 20);

        const eventEl = document.createElement('div');
        eventEl.className = view === 'week' ? 'week-event' : 'day-event';
        eventEl.style.position = 'absolute';
        eventEl.style.top = `${top}px`;
        eventEl.style.height = `${height}px`;
        eventEl.style.backgroundColor = event.color;
        eventEl.style.borderLeftColor = event.color;
        eventEl.dataset.eventId = event.id;

        const titleEl = document.createElement('div');
        titleEl.className = 'event-title';
        const timeStr = `${formatHour(startDate.getHours())}${startDate.getMinutes() > 0 ? ':' + String(startDate.getMinutes()).padStart(2, '0') : ''}`;
        titleEl.textContent = `${timeStr} - ${event.title}`;
        eventEl.appendChild(titleEl);

        eventEl.addEventListener('click', (e) => {
            e.stopPropagation();
            openEventModal(null, event);
        });

        return eventEl;
    }
}

// Get events for a specific date
function getEventsForDate(date) {
    const dateStr = date.toDateString();
    return events.filter(event => {
        const eventStart = new Date(event.start);
        return eventStart.toDateString() === dateStr;
    });
}

// Open event modal
function openEventModal(date = null, event = null) {
    const modal = document.getElementById('event-modal');
    const modalTitle = document.getElementById('modal-title');
    const deleteBtn = document.getElementById('delete-event');

    selectedEvent = event;

    if (event) {
        // Edit existing event
        modalTitle.textContent = 'Edit Event';
        deleteBtn.style.display = 'block';
        document.getElementById('event-title').value = event.title;
        document.getElementById('event-description').value = event.description || '';
        
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        
        document.getElementById('event-start-date').value = formatDateForInput(startDate);
        document.getElementById('event-start-time').value = formatTimeForInput(startDate);
        document.getElementById('event-end-date').value = formatDateForInput(endDate);
        document.getElementById('event-end-time').value = formatTimeForInput(endDate);
        
        document.getElementById('event-calendar').value = event.calendar || 'calendar';
        selectedColor = event.color || '#4285F4';
        document.querySelector('.selected-color').style.backgroundColor = selectedColor;
    } else {
        // Create new event
        modalTitle.textContent = 'New Event';
        deleteBtn.style.display = 'none';
        document.getElementById('event-title').value = '';
        document.getElementById('event-description').value = '';
        
        const eventDate = date || currentDate;
        const startDate = new Date(eventDate);
        startDate.setHours(9, 0, 0, 0);
        const endDate = new Date(startDate);
        endDate.setHours(10, 0, 0, 0);
        
        document.getElementById('event-start-date').value = formatDateForInput(startDate);
        document.getElementById('event-start-time').value = formatTimeForInput(startDate);
        document.getElementById('event-end-date').value = formatDateForInput(endDate);
        document.getElementById('event-end-time').value = formatTimeForInput(endDate);
        
        document.getElementById('event-calendar').value = 'calendar';
        selectedColor = '#4285F4';
        document.querySelector('.selected-color').style.backgroundColor = selectedColor;
    }

    modal.classList.add('active');
}

// Close event modal
function closeEventModal() {
    const modal = document.getElementById('event-modal');
    modal.classList.remove('active');
    toggleColorPicker(false);
    selectedEvent = null;
}

// Save event
function saveEvent() {
    const title = document.getElementById('event-title').value.trim();
    if (!title) {
        alert('Please enter a title for the event');
        return;
    }

    const startDate = document.getElementById('event-start-date').value;
    const startTime = document.getElementById('event-start-time').value;
    const endDate = document.getElementById('event-end-date').value;
    const endTime = document.getElementById('event-end-time').value;

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);

    if (end <= start) {
        alert('End time must be after start time');
        return;
    }

    const event = {
        id: selectedEvent ? selectedEvent.id : Date.now().toString(),
        title: title,
        description: document.getElementById('event-description').value,
        start: start.toISOString(),
        end: end.toISOString(),
        calendar: document.getElementById('event-calendar').value,
        color: selectedColor
    };

    if (selectedEvent) {
        // Update existing event
        const index = events.findIndex(e => e.id === selectedEvent.id);
        if (index !== -1) {
            events[index] = event;
        }
    } else {
        // Add new event
        events.push(event);
    }

    saveEvents();
    renderCalendar();
    closeEventModal();
}

// Delete event
function deleteEvent() {
    if (selectedEvent && confirm('Are you sure you want to delete this event?')) {
        events = events.filter(e => e.id !== selectedEvent.id);
        saveEvents();
        renderCalendar();
        closeEventModal();
    }
}

// Save events to localStorage
function saveEvents() {
    localStorage.setItem('calendarEvents', JSON.stringify(events));
}

// Format date for input
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format time for input
function formatTimeForInput(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Toggle color picker
function toggleColorPicker(show = null) {
    const colorPicker = document.getElementById('color-picker-modal');
    if (show === null) {
        colorPicker.classList.toggle('active');
    } else {
        colorPicker.classList.toggle('active', show);
    }
}

// Close color picker on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('#color-picker') && !e.target.closest('#color-picker-modal')) {
        toggleColorPicker(false);
    }
});
