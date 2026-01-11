/**
 * Detects overlapping events and calculates their layout positions
 * Returns events with layout information (column, columns)
 */
export function calculateEventLayout(events) {
    if (!events || events.length === 0) return [];

    // Convert events to objects with time information
    const eventsWithTime = events.map((event, index) => {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        return {
            ...event,
            startTime: startDate.getTime(),
            endTime: endDate.getTime(),
            originalIndex: index,
        };
    });

    // Sort events by start time, then by duration (longer first)
    eventsWithTime.sort((a, b) => {
        if (a.startTime !== b.startTime) {
            return a.startTime - b.startTime;
        }
        return b.endTime - a.endTime; // Longer events first
    });

    // Initialize columns
    eventsWithTime.forEach(event => {
        event.column = 0;
        event.columns = 1;
    });

    // Assign columns using greedy algorithm
    for (let i = 0; i < eventsWithTime.length; i++) {
        const event = eventsWithTime[i];
        
        // Find all events that overlap with this event (processed so far)
        const overlapping = [];
        for (let j = 0; j < i; j++) {
            const otherEvent = eventsWithTime[j];
            // Check if events overlap (not just touching)
            if (event.startTime < otherEvent.endTime && event.endTime > otherEvent.startTime) {
                overlapping.push(otherEvent);
            }
        }

        // Find the first available column that doesn't conflict
        const usedColumns = overlapping.map(e => e.column);
        let column = 0;
        while (usedColumns.includes(column)) {
            column++;
        }

        event.column = column;

        // Update columns count for all overlapping events in this group
        const allOverlapping = [event, ...overlapping];
        const maxColumnInGroup = Math.max(...allOverlapping.map(e => e.column));
        const totalColumns = maxColumnInGroup + 1;
        
        // Update columns count for all events in this overlapping group
        allOverlapping.forEach(e => {
            e.columns = totalColumns;
        });
    }

    // Final pass: ensure all overlapping groups have correct columns count
    const processed = new Set();
    for (let i = 0; i < eventsWithTime.length; i++) {
        if (processed.has(i)) continue;

        // Find all events that overlap with this event (including transitive)
        const group = [eventsWithTime[i]];
        processed.add(i);
        
        let foundNew = true;
        while (foundNew) {
            foundNew = false;
            for (let j = 0; j < eventsWithTime.length; j++) {
                if (processed.has(j)) continue;
                
                const otherEvent = eventsWithTime[j];
                // Check if it overlaps with any event in current group
                const overlaps = group.some(groupEvent =>
                    otherEvent.startTime < groupEvent.endTime &&
                    otherEvent.endTime > groupEvent.startTime
                );
                
                if (overlaps) {
                    group.push(otherEvent);
                    processed.add(j);
                    foundNew = true;
                }
            }
        }

        // Update columns count for entire group
        const maxColumn = Math.max(...group.map(e => e.column));
        const totalColumns = maxColumn + 1;
        group.forEach(e => {
            e.columns = totalColumns;
        });
    }

    return eventsWithTime;
}
