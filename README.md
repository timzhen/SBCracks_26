# Google Calendar Clone - React Version

A fully functional Google Calendar clone built with React, featuring the same UI/UX design and core features as the original.

## Features

- **Multiple View Modes**: Day, Week, and Month views
- **Event Management**: Create, edit, and delete events
- **Event Styling**: Customizable event colors
- **Persistent Storage**: Events are saved to localStorage
- **Responsive Design**: Matches Google Calendar's exact UI/UX
- **Date Navigation**: Easy navigation between dates with Today button
- **Calendar Organization**: Multiple calendar categories (Calendar, Personal, Work)

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Modern JavaScript** - ES6+ features

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`)

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
SBCracks_26/
├── src/
│   ├── components/
│   │   ├── Header.jsx          # Top navigation bar
│   │   ├── Sidebar.jsx         # Left sidebar with views and calendars
│   │   ├── MonthView.jsx       # Month calendar view
│   │   ├── WeekView.jsx        # Week calendar view
│   │   ├── DayView.jsx         # Day calendar view
│   │   ├── EventModal.jsx      # Event creation/editing modal
│   │   └── ColorPicker.jsx     # Color picker component
│   ├── hooks/
│   │   └── useCalendar.js      # Custom hook for calendar state management
│   ├── utils/
│   │   └── dateUtils.js         # Date formatting utilities
│   ├── App.jsx                 # Main app component
│   ├── main.jsx                # React entry point
│   └── styles.css              # All styling matching Google Calendar design
├── index.html                  # HTML template
├── package.json                # Dependencies and scripts
├── vite.config.js              # Vite configuration
└── README.md                   # This file
```

## Usage

1. **Create an Event**: Click the "Create" button in the sidebar or click on any day/time slot
2. **Edit an Event**: Click on any existing event
3. **Delete an Event**: Open an event and click the "Delete" button
4. **Switch Views**: Use the Day/Week/Month buttons in the header or sidebar
5. **Navigate Dates**: Use the arrow buttons or click "Today" to jump to the current date

## Browser Compatibility

Works in all modern browsers that support:
- ES6 JavaScript features
- CSS Grid and Flexbox
- LocalStorage API

Enjoy your calendar!

