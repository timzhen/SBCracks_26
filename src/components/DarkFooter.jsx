import React, { useState, useRef, useEffect } from 'react';

const DEEPGRAM_API_KEY = 'f40edd99a67fed5d70fce148818e893ff29d5c6f';

export default function DarkFooter({ 
    onCreateEvent, 
    onSpeakClick, 
    onAIChatClick,
    onAddEvent,
    onUpdateEvent,
    onDeleteEvent,
    onNavigateDate,
    onGoToToday,
    onSwitchView,
    currentDate,
    currentView,
    events
}) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    const parseVoiceCommandWithEntities = (transcript, entities, originalTranscript) => {
        const lowerText = transcript.toLowerCase().trim();
        console.log('Parsing command with entities:', lowerText, entities);

        // Extract entities by type
        const dateEntities = entities.filter(e => e.type === 'DATE' || e.label === 'DATE');
        const timeEntities = entities.filter(e => e.type === 'TIME' || e.label === 'TIME');
        const quantityEntities = entities.filter(e => e.type === 'QUANTITY' || e.label === 'QUANTITY');
        const personEntities = entities.filter(e => e.type === 'PERSON' || e.label === 'PERSON');
        const orgEntities = entities.filter(e => e.type === 'ORGANIZATION' || e.label === 'ORGANIZATION');
        
        // Enhanced intent detection with confidence scoring
        const createKeywords = ['create', 'add', 'schedule', 'make', 'set up', 'book', 'plan', 'put', 'insert', 'new'];
        const editKeywords = ['edit', 'update', 'modify', 'change', 'alter', 'reschedule', 'move', 'move to'];
        const deleteKeywords = ['delete', 'remove', 'cancel', 'erase', 'clear', 'drop', 'get rid of'];
        const navigateKeywords = ['go to', 'navigate', 'show', 'move to date', 'next', 'previous', 'last', 'jump'];
        const viewKeywords = ['switch to', 'change to', 'show', 'view', 'display'];
        
        // Calculate intent confidence scores
        const getIntentScore = (keywords, text) => {
            let score = 0;
            keywords.forEach(keyword => {
                if (text.includes(keyword)) {
                    // Longer keywords get higher weight
                    score += keyword.length;
                    // Exact word match gets bonus
                    if (new RegExp(`\\b${keyword}\\b`).test(text)) {
                        score += 2;
                    }
                }
            });
            return score;
        };
        
        const createScore = getIntentScore(createKeywords, lowerText);
        const editScore = getIntentScore(editKeywords, lowerText);
        const deleteScore = getIntentScore(deleteKeywords, lowerText);
        const navigateScore = getIntentScore(navigateKeywords, lowerText);
        const viewScore = getIntentScore(viewKeywords, lowerText) && (lowerText.includes('month') || lowerText.includes('week') || lowerText.includes('day'));
        
        // Check if "go to" is used for navigation (calendar navigation) vs event creation (going to a place)
        // If "go to" is followed by time/date, it's likely an event creation
        const goToForNavigation = /go to\s+(?:next|previous|last|this|today|tomorrow|yesterday|month|week|day|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(lowerText);
        const goToForEvent = /go to\s+(?:the\s+)?[a-z]+\s+[a-z]+/i.test(lowerText) && !goToForNavigation;
        
        const hasCreateIntent = createScore > 0 || goToForEvent || (dateEntities.length > 0 && timeEntities.length > 0);
        const hasEditIntent = editScore > 0;
        const hasDeleteIntent = deleteScore > 0;
        const hasNavigateIntent = navigateScore > 0 && !hasEditIntent && !goToForEvent && (goToForNavigation || !lowerText.match(/go to\s+(?:the\s+)?[a-z]+/i)); // Only navigate if not "go to [place]"
        const hasViewIntent = viewScore && !hasEditIntent;
        const hasTodayIntent = lowerText.includes('today') && !hasCreateIntent && !hasEditIntent && !goToForEvent;

        // Priority order: Delete > Edit > View > Create > Navigate
        // Delete event commands (highest priority)
        if (hasDeleteIntent && deleteScore >= editScore && deleteScore >= createScore) {
            return parseDeleteEventWithEntities(lowerText, entities, events);
        }
        
        // Edit/Update event commands (high priority)
        if (hasEditIntent && editScore >= createScore) {
            return parseEditEventWithEntities(lowerText, dateEntities, timeEntities, entities, originalTranscript);
        }
        
        // View switch commands
        if (hasViewIntent) {
            return parseViewSwitch(lowerText);
        }
        
        // Create event commands
        if (hasCreateIntent || (dateEntities.length > 0 && timeEntities.length > 0 && !hasDeleteIntent && !hasEditIntent)) {
            return parseCreateEventWithEntities(lowerText, dateEntities, timeEntities, originalTranscript);
        }
        
        // Navigation commands
        if (hasNavigateIntent || hasTodayIntent) {
            if (hasTodayIntent) {
                return { type: 'goToToday' };
            }
            return parseNavigation(lowerText);
        }
        
        // If we have date/time entities but no clear intent, assume create
        if (dateEntities.length > 0 || timeEntities.length > 0) {
            return parseCreateEventWithEntities(lowerText, dateEntities, timeEntities, originalTranscript);
        }

        return null;
    };

    const parseVoiceCommand = (transcript) => {
        // Fallback to original parser if no entities available
        return parseVoiceCommandWithEntities(transcript, [], transcript);
    };

    const parseDateFromEntity = (dateEntity, referenceDate) => {
        if (!dateEntity) return null;
        
        // Handle different entity structures
        const entityValue = dateEntity.value || dateEntity.text || dateEntity.word || '';
        if (!entityValue) return null;
        
        const today = new Date(referenceDate);
        today.setHours(0, 0, 0, 0);
        const dateText = entityValue.toString().toLowerCase();
        
        // Handle relative dates
        if (dateText.includes('today')) {
            return new Date(today);
        } else if (dateText.includes('tomorrow')) {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow;
        } else if (dateText.includes('yesterday')) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday;
        } else if (dateText.includes('next week')) {
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            return nextWeek;
        } else if (dateText.includes('last week')) {
            const lastWeek = new Date(today);
            lastWeek.setDate(lastWeek.getDate() - 7);
            return lastWeek;
        } else if (dateText.includes('next month')) {
            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            return nextMonth;
        } else if (dateText.includes('last month')) {
            const lastMonth = new Date(today);
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            return lastMonth;
        }
        
        // Parse month names (January -> 01, February -> 02, etc.)
        const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december'
        ];
        const monthNamesShort = [
            'jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
        ];
        
        for (let i = 0; i < monthNames.length; i++) {
            if (dateText.includes(monthNames[i]) || dateText.includes(monthNamesShort[i])) {
                // Try to extract day and year from the date text - handle ordinals (1st, 2nd, 3rd, 10th, etc.)
                const dayMatch = dateText.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
                const yearMatch = dateText.match(/\b(20\d{2}|\d{4})\b/);
                
                const day = dayMatch ? parseInt(dayMatch[1]) : today.getDate();
                const year = yearMatch ? parseInt(yearMatch[1]) : today.getFullYear();
                
                const targetDate = new Date(year, i, day);
                if (!isNaN(targetDate.getTime())) {
                    return targetDate;
                }
            }
        }
        
        // Parse day names
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (let i = 0; i < dayNames.length; i++) {
            if (dateText.includes(dayNames[i])) {
                const currentDay = today.getDay();
                const targetDay = i;
                let daysToAdd = targetDay - currentDay;
                if (daysToAdd <= 0) daysToAdd += 7;
                const targetDate = new Date(today);
                targetDate.setDate(targetDate.getDate() + daysToAdd);
                return targetDate;
            }
        }
        
        // Try parsing dates like "January 15", "Jan 15 2024", "1/15/2024", etc.
        const datePatterns = [
            /(\w+)\s+(\d{1,2})(?:\s+(\d{4}))?/, // "January 15" or "January 15 2024"
            /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/, // "1/15/2024" or "01/15/24"
            /(\d{4})-(\d{1,2})-(\d{1,2})/ // "2024-01-15"
        ];
        
        for (const pattern of datePatterns) {
            const match = dateText.match(pattern);
            if (match) {
                try {
                    let parsedDate;
                    if (pattern === datePatterns[0]) {
                        // Month name format
                        const monthName = match[1].toLowerCase();
                        const monthIndex = monthNames.findIndex(m => m.includes(monthName)) !== -1 
                            ? monthNames.findIndex(m => m.includes(monthName))
                            : monthNamesShort.findIndex(m => m.includes(monthName));
                        if (monthIndex !== -1) {
                            const day = parseInt(match[2]);
                            const year = match[3] ? parseInt(match[3]) : today.getFullYear();
                            parsedDate = new Date(year, monthIndex, day);
                        }
                    } else if (pattern === datePatterns[1]) {
                        // M/D/Y format
                        const month = parseInt(match[1]) - 1;
                        const day = parseInt(match[2]);
                        const year = match[3] ? (parseInt(match[3]) < 100 ? 2000 + parseInt(match[3]) : parseInt(match[3])) : today.getFullYear();
                        parsedDate = new Date(year, month, day);
                    } else {
                        // Y-M-D format
                        parsedDate = new Date(match[0]);
                    }
                    if (parsedDate && !isNaN(parsedDate.getTime())) {
                        parsedDate.setHours(0, 0, 0, 0);
                        return parsedDate;
                    }
                } catch (e) {
                    // Continue to next pattern
                }
            }
        }
        
        // Try parsing as ISO date or formatted date
        try {
            const parsed = new Date(entityValue);
            if (!isNaN(parsed.getTime())) {
                parsed.setHours(0, 0, 0, 0);
                return parsed;
            }
        } catch (e) {
            // Ignore parsing errors
        }
        
        return null;
    };

    const parseTimeFromEntity = (timeEntity) => {
        if (!timeEntity) return null;
        
        // Handle different entity structures
        const entityValue = timeEntity.value || timeEntity.text || timeEntity.word || '';
        if (!entityValue) return null;
        
        const timeText = entityValue.toString().toLowerCase().trim();
        
        // Match various time formats: "2pm", "2:30pm", "14:30", "2 o'clock", etc.
        const patterns = [
            /(\d{1,2}):(\d{2})\s*(am|pm)?/i,
            /(\d{1,2})\s*(am|pm)/i,
            /(\d{1,2})\s*o'?clock/i,
            /(\d{1,2}):(\d{2})/i,
            /(\d{1,2})/i
        ];
        
        for (const pattern of patterns) {
            const match = timeText.match(pattern);
            if (match) {
                let hours = parseInt(match[1]);
                const minutes = match[2] ? parseInt(match[2]) : 0;
                const period = match[3] ? match[3].toLowerCase() : (hours >= 12 ? 'pm' : 'am');
                
                // Convert to 24-hour format
                if (period === 'pm' && hours !== 12) {
                    hours += 12;
                } else if (period === 'am' && hours === 12) {
                    hours = 0;
                }
                
                if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                    return { hours, minutes };
                }
            }
        }
        
        return null;
    };

    const extractActionPhrase = (text) => {
        // Remove common preamble phrases that people use before describing events
        const preambles = [
            /i\s+(?:need|want|have|got|must|should|would like)\s+to\s+/gi,
            /i\s+(?:need|want|have|got|must|should)\s+/gi,
            /i\s+(?:am|'m)\s+(?:going|gonna)\s+to\s+/gi,
            /i\s+(?:am|'m)\s+/gi,
            /(?:let\s+me|i'll|i\s+will)\s+/gi,
            /(?:please|can you|could you)\s+/gi,
            /(?:remind me|schedule|create|add|make|book)\s+(?:to\s+)?/gi
        ];
        
        let cleanedText = text;
        preambles.forEach(preamble => {
            cleanedText = cleanedText.replace(preamble, '').trim();
        });
        
        // Find action phrases - look for verb + object patterns
        // Common patterns: "pick up X", "meet with X", "go to X", "call X", "attend X", etc.
        const actionPatterns = [
            // "hangout/hang out with [person/group]"
            /(?:hang\s*out|hangout)\s+with\s+(?:the\s+)?(.+?)(?:\s+(?:at|on|from|to|for|\d{1,2}(?:\s*(?:am|pm|o'clock))|january|february|march|april|may|june|july|august|september|october|november|december)|$)/i,
            // "go to [location]" - capture the full phrase including "go to"
            /(?:go to|go|visit|attend)\s+(?:the\s+)?(.+?)(?:\s+(?:at|on|from|to|for|\d{1,2}(?:\s*(?:am|pm|o'clock))|january|february|march|april|may|june|july|august|september|october|november|december)|$)/i,
            // "pick up/get/fetch/grab [object]"
            /(?:pick up|pickup|get|fetch|grab)\s+(?:the\s+)?(.+?)(?:\s+(?:at|on|from|to|for|\d{1,2}(?:\s*(?:am|pm|o'clock))|january|february|march|april|may|june|july|august|september|october|november|december)|$)/i,
            // "meet with [person]"
            /(?:meet|meeting)\s+(?:with\s+)?(?:the\s+)?(.+?)(?:\s+(?:at|on|from|to|for|\d{1,2}(?:\s*(?:am|pm|o'clock))|january|february|march|april|may|june|july|august|september|october|november|december)|$)/i,
            // "call/phone/contact [person]"
            /(?:call|phone|contact)\s+(?:the\s+)?(.+?)(?:\s+(?:at|on|from|to|for|\d{1,2}(?:\s*(?:am|pm|o'clock))|january|february|march|april|may|june|july|august|september|october|november|december)|$)/i,
            // "have/do/take [activity]"
            /(?:have|do|take)\s+(?:a\s+)?(?:the\s+)?(.+?)(?:\s+(?:at|on|from|to|for|\d{1,2}(?:\s*(?:am|pm|o'clock))|january|february|march|april|may|june|july|august|september|october|november|december)|$)/i,
            // "work on/complete/finish/start [task]"
            /(?:work on|complete|finish|start)\s+(?:the\s+)?(.+?)(?:\s+(?:at|on|from|to|for|\d{1,2}(?:\s*(?:am|pm|o'clock))|january|february|march|april|may|june|july|august|september|october|november|december)|$)/i,
            // Generic verb + with pattern (e.g., "play with", "chat with", "dance with")
            /\b([a-z]+\s+with\s+[a-z]+(?:\s+[a-z]+)?)(?:\s+(?:at|on|from|to|for|\d{1,2}(?:\s*(?:am|pm|o'clock))|january|february|march|april|may|june|july|august|september|october|november|december)|$)/i,
            // Possessive patterns like "grandma's birthday", "John's meeting"
            /([a-z]+(?:'s)?\s+[a-z]+(?:\s+[a-z]+)?)(?:\s+(?:at|on|from|to|for|\d{1,2}(?:\s*(?:am|pm|o'clock))|january|february|march|april|may|june|july|august|september|october|november|december)|$)/i,
            // Direct object patterns (noun phrases)
            /(?:the|a|an)\s+(.+?)(?:\s+(?:at|on|from|to|for|with|\d{1,2}(?:\s*(?:am|pm|o'clock))|january|february|march|april|may|june|july|august|september|october|november|december)|$)/i,
            // Any significant phrase before date/time keywords (fallback) - capture multi-word phrases
            /(.+?)(?:\s+(?:at|on|from|to|for|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}(?:\s*(?:am|pm|o'clock)|:|\/)))/i
        ];
        
        for (let i = 0; i < actionPatterns.length; i++) {
            const pattern = actionPatterns[i];
            const match = cleanedText.match(pattern);
            if (match && match[1]) {
                let phrase = match[1].trim();
                
                // For "hangout with" patterns (index 0), reconstruct the full phrase
                if (i === 0 && cleanedText.match(/(?:hang\s*out|hangout)\s+with/i)) {
                    const hangoutMatch = cleanedText.match(/((?:hang\s*out|hangout)\s+with\s+.+?)(?:\s+(?:at|on|from|to|for|\d{1,2}|january|february|march|april|may|june|july|august|september|october|november|december)|$)/i);
                    if (hangoutMatch && hangoutMatch[1]) {
                        phrase = hangoutMatch[1].trim();
                    }
                }
                
                // For "go to" patterns (index 1), include "go to" in the title for clarity
                if (i === 1 && cleanedText.match(/go to/i)) {
                    phrase = `go to ${phrase}`;
                }
                
                // Clean up the phrase - remove leading articles but keep action verbs
                if (!phrase.match(/^(?:go to|hang\s*out|hangout)\s+/i)) {
                    phrase = phrase.replace(/^(?:the|a|an)\s+/i, '').trim();
                }
                
                // Remove any trailing time/date words that might have been captured
                phrase = phrase.replace(/\s+(?:at|on|from|to|for|the|a|an)\s*$/i, '').trim();
                
                if (phrase.length > 2 && phrase.length < 100) {
                    return phrase;
                }
            }
        }
        
        return null;
    };

    const parseCreateEventWithEntities = (text, dateEntities, timeEntities, originalTranscript) => {
        // First, try to extract the action phrase using NLP patterns
        // This handles natural speech like "I need to go pick up the kids at 3pm"
        const actionPhrase = extractActionPhrase(originalTranscript || text);
        
        // Extract title - use a smarter approach to find the event name
        let title = actionPhrase || originalTranscript || text;
        
        // First, remove date/time entities from title
        dateEntities.forEach(entity => {
            const entityValue = (entity.value || entity.text || entity.word || '').toString();
            if (entityValue) {
                // Use word boundaries to avoid partial matches
                const escaped = entityValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                title = title.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '').trim();
            }
        });
        timeEntities.forEach(entity => {
            const entityValue = (entity.value || entity.text || entity.word || '').toString();
            if (entityValue) {
                const escaped = entityValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                title = title.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '').trim();
            }
        });
        
        // Remove action words (but keep them if they're part of the title)
        const actionPatterns = [
            /\b(?:create|add|schedule|make|set up|book|plan|put|insert)\s+(?:event|meeting|appointment)?\s*/gi,
            /\bevent\s+/gi,
            /\bmeeting\s+/gi,
            /\bappointment\s+/gi
        ];
        actionPatterns.forEach(pattern => {
            title = title.replace(pattern, '').trim();
        });
        
        // Remove common time/date prepositions and their context
        const timePrepositions = [
            /\bon\s+(?:the\s+)?(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|today|tomorrow|next|last)/gi,
            /\bat\s+\d+/gi,
            /\bfor\s+(?:tomorrow|today|next|last|the)/gi,
            /\b(?:on|at|for)\s+the\b/gi
        ];
        timePrepositions.forEach(pattern => {
            title = title.replace(pattern, '').trim();
        });
        
        // Remove standalone prepositions only if they're at the start (but preserve "go to" patterns)
        if (!title.match(/^go to\s/i)) {
            title = title.replace(/^\s*(?:on|at|for|with|to|from|the|a|an)\s+/gi, '').trim();
        }
        // Remove trailing prepositions (but not if it's part of "go to")
        if (!title.match(/go to\s*$/i)) {
            title = title.replace(/\s+(?:on|at|for|with|to|from|the|a|an)\s*$/gi, '').trim();
        }
        
        // Remove month names (full and abbreviated)
        const monthNames = [
            'january', 'february', 'march', 'april', 'may', 'june',
            'july', 'august', 'september', 'october', 'november', 'december',
            'jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
        ];
        monthNames.forEach(month => {
            title = title.replace(new RegExp(`\\b${month}\\b`, 'gi'), '').trim();
        });
        
        // Remove day names
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        dayNames.forEach(day => {
            title = title.replace(new RegExp(`\\b${day}\\b`, 'gi'), '').trim();
        });
        
        // Remove common time expressions and date patterns
        const timeExpressions = [
            /\d{1,2}(?::\d{2})?\s*(?:am|pm|o'clock|a\.m\.|p\.m\.)/gi,
            /\b(?:tomorrow|today|yesterday|next|last)\s+(?:week|month|day|year)/gi,
            /\b(?:this|next|last)\s+(?:week|month|year)/gi,
            /\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/gi, // Dates like 1/15 or 1/15/2024
            /\d{4}-\d{1,2}-\d{1,2}/gi, // Dates like 2024-01-15
            /\b(?:on|at|for|in)\s+(?:the\s+)?\d{1,2}(?:st|nd|rd|th)?/gi, // "on the 15th"
            /\b(?:of|the)\s+\d{1,2}(?:st|nd|rd|th)?/gi // "of the 15th"
        ];
        timeExpressions.forEach(pattern => {
            title = title.replace(pattern, '').trim();
        });
        
        // Remove ordinal numbers (1st, 2nd, 3rd, etc.)
        title = title.replace(/\b\d{1,2}(?:st|nd|rd|th)\b/gi, '').trim();
        
        // Clean up extra spaces and punctuation issues
        title = title.replace(/\s+/g, ' ').trim();
        title = title.replace(/^[,.\s]+|[,.\s]+$/g, '').trim();
        
        // If we successfully extracted an action phrase, use it as the base title
        // and clean it up further
        if (actionPhrase && (!title || title.length < 3 || title === 'New Event' || title === originalTranscript || title === text)) {
            // Clean up the action phrase
            let cleanedPhrase = actionPhrase;
            // Remove date/time/month/day names if they slipped through
            const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december',
                'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
                'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            monthNames.forEach(month => {
                cleanedPhrase = cleanedPhrase.replace(new RegExp(`\\b${month}\\b`, 'gi'), '').trim();
            });
            dayNames.forEach(day => {
                cleanedPhrase = cleanedPhrase.replace(new RegExp(`\\b${day}\\b`, 'gi'), '').trim();
            });
            // Remove times
            cleanedPhrase = cleanedPhrase.replace(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/gi, '').trim();
            // Remove dates
            cleanedPhrase = cleanedPhrase.replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/gi, '').trim();
            cleanedPhrase = cleanedPhrase.replace(/\d{1,2}(?:st|nd|rd|th)/gi, '').trim();
            cleanedPhrase = cleanedPhrase.replace(/\s+/g, ' ').trim();
            
            if (cleanedPhrase && cleanedPhrase.length > 0 && cleanedPhrase.length < 100) {
                title = cleanedPhrase;
            }
        }
        
        // If title is empty or too short, try to extract from original transcript differently
        if (!title || title.length < 2) {
            // Try finding content between action word and first date/time indicator
            // But exclude common date/time/month/day words
            const excludeWords = [
                'january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december',
                'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec',
                'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
                'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat',
                'today', 'tomorrow', 'yesterday', 'next', 'last', 'this'
            ].join('|');
            
            // Improved pattern to capture activity phrases - handles "I need to [activity] on [date]"
            const titlePattern = new RegExp(
                `(?:i\\s+(?:need|want|have|got|must|should|would like)\\s+to\\s+|create|add|schedule|make|book|plan|put|insert)\\s*` +
                `(?:event|meeting|appointment)?\\s*` +
                `(.+?)` +
                `(?=\\s+(?:on|at|for|tomorrow|today|${excludeWords}|\\d{1,2}(?:\\s*(?:am|pm)|\\/|:|st|nd|rd|th))|$)`,
                'i'
            );
            
            const titleMatch = (originalTranscript || text).match(titlePattern);
            if (titleMatch && titleMatch[1]) {
                let extractedTitle = titleMatch[1].trim();
                // Remove any remaining date/time/month/day words
                excludeWords.split('|').forEach(word => {
                    extractedTitle = extractedTitle.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
                });
                // Remove dates and times
                extractedTitle = extractedTitle.replace(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/gi, '').trim();
                extractedTitle = extractedTitle.replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/gi, '').trim();
                extractedTitle = extractedTitle.replace(/\s+/g, ' ').trim();
                
                if (extractedTitle && extractedTitle.length > 0) {
                    title = extractedTitle;
                } else {
                    title = 'New Event';
                }
            } else {
                title = 'New Event';
            }
        }
        
        // Final cleanup - ensure we didn't accidentally include date/time words
        const finalExcludeCheck = [
            ...monthNames,
            ...dayNames,
            'today', 'tomorrow', 'yesterday', 'next', 'last', 'this',
            'week', 'month', 'year', 'day'
        ];
        finalExcludeCheck.forEach(word => {
            if (title.toLowerCase().trim() === word.toLowerCase()) {
                title = 'New Event';
            }
        });
        
        // Final cleanup
        if (!title || title.length === 0 || title.trim().length === 0) {
            title = 'New Event';
        }
        
        // Parse date using entities first, then fallback to text parsing
        const today = new Date(currentDate);
        today.setHours(0, 0, 0, 0);
        let targetDate = new Date(today);
        targetDate.setHours(9, 0, 0, 0);
        
        // Use date entity if available
        if (dateEntities.length > 0) {
            const parsedDate = parseDateFromEntity(dateEntities[0], currentDate);
            if (parsedDate) {
                targetDate = new Date(parsedDate);
                targetDate.setHours(9, 0, 0, 0);
            }
        } else {
            // Fallback to text parsing - use original transcript for better parsing
            const textToParse = (originalTranscript || text).toLowerCase();
            
            if (textToParse.includes('today')) {
                targetDate = new Date(today);
            } else if (textToParse.includes('tomorrow')) {
                targetDate = new Date(today);
                targetDate.setDate(targetDate.getDate() + 1);
            } else if (textToParse.includes('next week')) {
                targetDate = new Date(today);
                targetDate.setDate(targetDate.getDate() + 7);
            }
            
            // Parse month names (January, February, etc.)
            const monthNamesFull = [
                'january', 'february', 'march', 'april', 'may', 'june',
                'july', 'august', 'september', 'october', 'november', 'december'
            ];
            const monthNamesShort = [
                'jan', 'feb', 'mar', 'apr', 'may', 'jun',
                'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
            ];
            
            for (let i = 0; i < monthNamesFull.length; i++) {
                const monthName = monthNamesFull[i];
                const monthShort = monthNamesShort[i];
                const monthPattern = new RegExp(`\\b${monthName}\\b|\\b${monthShort}\\b`, 'i');
                
                if (monthPattern.test(textToParse)) {
                    // Try to extract day and year - handle ordinals (1st, 2nd, 3rd, 10th, etc.)
                    // Look for day after the month name
                    const monthIndex = textToParse.toLowerCase().indexOf(monthName) >= 0 
                        ? textToParse.toLowerCase().indexOf(monthName)
                        : textToParse.toLowerCase().indexOf(monthShort);
                    
                    // Find day number after the month (handle "January 10th", "Jan 10th", etc.)
                    const afterMonth = textToParse.substring(monthIndex + monthName.length);
                    const dayMatch = afterMonth.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
                    const yearMatch = textToParse.match(/\b(20\d{2}|\d{4})\b/);
                    
                    const day = dayMatch ? parseInt(dayMatch[1]) : today.getDate();
                    const year = yearMatch ? parseInt(yearMatch[1]) : today.getFullYear();
                    
                    // Validate day is reasonable (1-31)
                    if (day >= 1 && day <= 31) {
                        const parsedDate = new Date(year, i, day);
                        if (!isNaN(parsedDate.getTime())) {
                            targetDate = parsedDate;
                            break;
                        }
                    }
                }
            }
            
            // Parse day names
            const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            for (let i = 0; i < dayNames.length; i++) {
                if (textToParse.includes(dayNames[i])) {
                    const currentDay = today.getDay();
                    const targetDay = i;
                    let daysToAdd = targetDay - currentDay;
                    if (daysToAdd <= 0) daysToAdd += 7;
                    targetDate = new Date(today);
                    targetDate.setDate(targetDate.getDate() + daysToAdd);
                    break;
                }
            }
        }
        
        // Parse time using entities first, then fallback to text parsing
        let timeParsed = false;
        if (timeEntities.length > 0) {
            const timeData = parseTimeFromEntity(timeEntities[0]);
            if (timeData && timeData.hours !== undefined) {
                targetDate.setHours(timeData.hours, timeData.minutes || 0, 0, 0);
                timeParsed = true;
            }
        }
        
        if (!timeParsed) {
            // Fallback to text parsing - improved patterns for times like "8 am", "9 am", "10 pm"
            // Use original transcript for better parsing
            const textToParse = originalTranscript || text;
            const timePatterns = [
                /(\d{1,2}):(\d{2})\s*(am|pm)\b/i,  // "8:30 am"
                /\b(\d{1,2})\s+(am|pm)\b/i,  // "8 am", "9 pm", "10 am" - word boundary and space
                /at\s+(\d{1,2})\s+(?:am|pm|o'clock)\b/i,  // "at 8 am"
                /(\d{1,2}):(\d{2})/i,  // "14:30"
                /\b(\d{1,2})\s*(?:am|pm)\b/i  // Another pattern for "8 am"
            ];
            
            for (const pattern of timePatterns) {
                const match = textToParse.match(pattern);
                if (match) {
                    let hours = parseInt(match[1]);
                    const minutes = match[2] ? parseInt(match[2]) : 0;
                    // Get period from match[3] or match[2] depending on pattern
                    const period = (match[3] || (match[2] && match[2].match(/am|pm/i) ? match[2].toLowerCase() : null));
                    const periodLower = period ? period.toLowerCase() : null;
                    
                    // Handle AM/PM conversion
                    if (periodLower === 'pm' && hours !== 12) {
                        hours += 12;
                    } else if (periodLower === 'am' && hours === 12) {
                        hours = 0;
                    }
                    
                    // Validate hours (0-23) and minutes (0-59)
                    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                        targetDate.setHours(hours, minutes, 0, 0);
                        timeParsed = true;
                        break;
                    }
                }
            }
        }
        
        // Default duration: 1 hour
        const endDate = new Date(targetDate);
        endDate.setHours(targetDate.getHours() + 1);
        
        return {
            type: 'createEvent',
            event: {
                title: title,
                start: targetDate.toISOString(),
                end: endDate.toISOString(),
                description: '',
                calendar: 'calendar',
                color: '#4285F4'
            }
        };
    };

    const parseCreateEvent = (text) => {
        // Fallback to entity-based parsing without entities
        return parseCreateEventWithEntities(text, [], [], text);
    };

    const parseDeleteEventWithEntities = (text, entities, eventsList) => {
        if (!eventsList || eventsList.length === 0) {
            return null;
        }
        
        // Extract keywords that might be event titles
        const deleteKeywords = ['delete', 'remove', 'cancel', 'erase', 'clear', 'drop'];
        let searchText = text;
        
        // Remove delete keywords
        deleteKeywords.forEach(keyword => {
            searchText = searchText.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '').trim();
        });
        
        // Remove common words
        const commonWords = ['event', 'meeting', 'appointment', 'the', 'a', 'an', 'on', 'at', 'for'];
        commonWords.forEach(word => {
            searchText = searchText.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
        });
        
        // Extract person/organization entities that might be event names
        const personEntities = entities.filter(e => (e.type === 'PERSON' || e.label === 'PERSON') && (e.value || e.text || e.word));
        const orgEntities = entities.filter(e => (e.type === 'ORGANIZATION' || e.label === 'ORGANIZATION') && (e.value || e.text || e.word));
        const quantityEntities = entities.filter(e => (e.type === 'QUANTITY' || e.label === 'QUANTITY') && (e.value || e.text || e.word));
        
        // Build search terms from entities and remaining text
        const searchTerms = [];
        personEntities.forEach(e => {
            const val = (e.value || e.text || e.word || '').toString().toLowerCase();
            if (val) searchTerms.push(val);
        });
        orgEntities.forEach(e => {
            const val = (e.value || e.text || e.word || '').toString().toLowerCase();
            if (val) searchTerms.push(val);
        });
        if (searchText) {
            // Split into words
            const words = searchText.split(/\s+/).filter(w => w.length > 2);
            searchTerms.push(...words);
        }
        
        // Try to find matching events
        if (searchTerms.length > 0) {
            // First try exact matches
            for (const term of searchTerms) {
                const event = eventsList.find(e => 
                    e.title.toLowerCase().includes(term) || 
                    term.includes(e.title.toLowerCase())
                );
                if (event) {
                    return { type: 'deleteEvent', eventId: event.id, eventTitle: event.title };
                }
            }
            
            // Try partial matches
            for (const term of searchTerms) {
                const matches = eventsList.filter(e => 
                    e.title.toLowerCase().includes(term)
                );
                if (matches.length === 1) {
                    return { type: 'deleteEvent', eventId: matches[0].id, eventTitle: matches[0].title };
                }
            }
        }
        
        // If we have date entities, try to find events on that date
        const dateEntities = entities.filter(e => e.type === 'DATE' || e.label === 'DATE');
        if (dateEntities.length > 0) {
            const parsedDate = parseDateFromEntity(dateEntities[0], currentDate);
            if (parsedDate) {
                const dateEvents = eventsList.filter(e => {
                    const eventDate = new Date(e.start);
                    eventDate.setHours(0, 0, 0, 0);
                    parsedDate.setHours(0, 0, 0, 0);
                    return eventDate.getTime() === parsedDate.getTime();
                });
                
                if (dateEvents.length === 1) {
                    return { type: 'deleteEvent', eventId: dateEvents[0].id, eventTitle: dateEvents[0].title };
                } else if (dateEvents.length > 0 && searchTerms.length > 0) {
                    // Try to match by title on that date
                    for (const term of searchTerms) {
                        const event = dateEvents.find(e => e.title.toLowerCase().includes(term));
                        if (event) {
                            return { type: 'deleteEvent', eventId: event.id, eventTitle: event.title };
                        }
                    }
                }
            }
        }
        
        // Fallback: delete today's first event
        const todayEvents = eventsList.filter(e => {
            const eventDate = new Date(e.start);
            return eventDate.toDateString() === currentDate.toDateString();
        });
        if (todayEvents.length > 0) {
            return { type: 'deleteEvent', eventId: todayEvents[0].id, eventTitle: todayEvents[0].title };
        }
        
        return null;
    };

    const parseDeleteEvent = (text) => {
        // Fallback to entity-based parsing without entities
        return parseDeleteEventWithEntities(text, [], events);
    };

    const parseEditEventWithEntities = (text, dateEntities, timeEntities, allEntities, originalTranscript) => {
        if (!events || events.length === 0) {
            return null;
        }
        
        // Extract keywords that might be event titles
        const editKeywords = ['edit', 'update', 'modify', 'change', 'alter', 'reschedule', 'move'];
        let searchText = text;
        
        // Remove edit keywords
        editKeywords.forEach(keyword => {
            searchText = searchText.replace(new RegExp(`\\b${keyword}\\b`, 'gi'), '').trim();
        });
        
        // Remove common words
        const commonWords = ['event', 'meeting', 'appointment', 'the', 'a', 'an', 'on', 'at', 'for', 'to'];
        commonWords.forEach(word => {
            searchText = searchText.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim();
        });
        
        // Extract person/organization entities that might be event names
        const personEntities = allEntities.filter(e => (e.type === 'PERSON' || e.label === 'PERSON') && (e.value || e.text || e.word));
        const orgEntities = allEntities.filter(e => (e.type === 'ORGANIZATION' || e.label === 'ORGANIZATION') && (e.value || e.text || e.word));
        
        // Build search terms from entities and remaining text
        const searchTerms = [];
        personEntities.forEach(e => {
            const val = (e.value || e.text || e.word || '').toString().toLowerCase();
            if (val) searchTerms.push(val);
        });
        orgEntities.forEach(e => {
            const val = (e.value || e.text || e.word || '').toString().toLowerCase();
            if (val) searchTerms.push(val);
        });
        if (searchText) {
            const words = searchText.split(/\s+/).filter(w => w.length > 2);
            searchTerms.push(...words);
        }
        
        // Find the event to edit
        let eventToEdit = null;
        
        // Try to find matching events by title
        if (searchTerms.length > 0) {
            // First try exact matches
            for (const term of searchTerms) {
                const event = events.find(e => 
                    e.title.toLowerCase().includes(term) || 
                    term.includes(e.title.toLowerCase())
                );
                if (event) {
                    eventToEdit = event;
                    break;
                }
            }
            
            // Try partial matches if no exact match
            if (!eventToEdit) {
                for (const term of searchTerms) {
                    const matches = events.filter(e => e.title.toLowerCase().includes(term));
                    if (matches.length === 1) {
                        eventToEdit = matches[0];
                        break;
                    }
                }
            }
        }
        
        // If we have date entities, try to find events on that date
        if (!eventToEdit && dateEntities.length > 0) {
            const parsedDate = parseDateFromEntity(dateEntities[0], currentDate);
            if (parsedDate) {
                const dateEvents = events.filter(e => {
                    const eventDate = new Date(e.start);
                    eventDate.setHours(0, 0, 0, 0);
                    parsedDate.setHours(0, 0, 0, 0);
                    return eventDate.getTime() === parsedDate.getTime();
                });
                
                if (dateEvents.length === 1) {
                    eventToEdit = dateEvents[0];
                } else if (dateEvents.length > 0 && searchTerms.length > 0) {
                    // Try to match by title on that date
                    for (const term of searchTerms) {
                        const event = dateEvents.find(e => e.title.toLowerCase().includes(term));
                        if (event) {
                            eventToEdit = event;
                            break;
                        }
                    }
                }
            }
        }
        
        // Fallback: use today's first event
        if (!eventToEdit) {
            const todayEvents = events.filter(e => {
                const eventDate = new Date(e.start);
                return eventDate.toDateString() === currentDate.toDateString();
            });
            if (todayEvents.length > 0) {
                eventToEdit = todayEvents[0];
            }
        }
        
        if (!eventToEdit) {
            return null;
        }
        
        // Extract updates - start with existing event data
        const updatedEvent = { ...eventToEdit };
        let hasUpdates = false;
        
        // Parse new date if provided
        const today = new Date(currentDate);
        today.setHours(0, 0, 0, 0);
        let newDate = new Date(eventToEdit.start);
        
        if (dateEntities.length > 0) {
            const parsedDate = parseDateFromEntity(dateEntities[0], currentDate);
            if (parsedDate) {
                newDate = new Date(parsedDate);
                newDate.setHours(newDate.getHours(), newDate.getMinutes(), 0, 0);
                hasUpdates = true;
            }
        }
        
        // Parse new time if provided
        if (timeEntities.length > 0) {
            const timeData = parseTimeFromEntity(timeEntities[0]);
            if (timeData) {
                newDate.setHours(timeData.hours, timeData.minutes, 0, 0);
                hasUpdates = true;
            }
        } else {
            // Preserve original time if no new time provided
            const originalTime = new Date(eventToEdit.start);
            newDate.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
        }
        
        // Extract new title if provided (text after edit keywords but before date/time)
        const titlePattern = /(?:edit|update|modify|change|alter|reschedule|move)\s+(?:event|meeting|appointment)?\s*(.+?)(?:\s+(?:on|at|for|to|tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}(?:\s*(?:am|pm)))|$)/i;
        const titleMatch = originalTranscript.match(titlePattern);
        if (titleMatch && titleMatch[1]) {
            let newTitle = titleMatch[1].trim();
            // Remove date/time entities from title
            dateEntities.forEach(entity => {
                const entityValue = (entity.value || entity.text || entity.word || '').toString();
                if (entityValue) {
                    newTitle = newTitle.replace(new RegExp(entityValue, 'gi'), '').trim();
                }
            });
            timeEntities.forEach(entity => {
                const entityValue = (entity.value || entity.text || entity.word || '').toString();
                if (entityValue) {
                    newTitle = newTitle.replace(new RegExp(entityValue, 'gi'), '').trim();
                }
            });
            newTitle = newTitle.replace(/\s+/g, ' ').trim();
            if (newTitle && newTitle.length > 0 && newTitle.toLowerCase() !== eventToEdit.title.toLowerCase()) {
                updatedEvent.title = newTitle;
                hasUpdates = true;
            }
        }
        
        // Calculate end date (preserve duration or default to 1 hour)
        const originalStart = new Date(eventToEdit.start);
        const originalEnd = new Date(eventToEdit.end);
        const duration = originalEnd.getTime() - originalStart.getTime();
        const newEndDate = new Date(newDate.getTime() + duration);
        
        // Update event data
        updatedEvent.start = newDate.toISOString();
        updatedEvent.end = newEndDate.toISOString();
        
        if (hasUpdates || newDate.getTime() !== originalStart.getTime()) {
            return {
                type: 'editEvent',
                eventId: eventToEdit.id,
                event: updatedEvent,
                eventTitle: eventToEdit.title
            };
        }
        
        return null;
    };

    const parseNavigation = (text) => {
        if (text.includes('next week') || text.includes('forward')) {
            return { type: 'navigate', direction: 1 };
        }
        if (text.includes('previous week') || text.includes('last week') || text.includes('back')) {
            return { type: 'navigate', direction: -1 };
        }
        if (text.includes('next month')) {
            return { type: 'navigate', direction: 1 };
        }
        if (text.includes('previous month') || text.includes('last month')) {
            return { type: 'navigate', direction: -1 };
        }
        if (text.includes('next day') || text.includes('tomorrow')) {
            return { type: 'navigate', direction: 1 };
        }
        if (text.includes('previous day') || text.includes('yesterday')) {
            return { type: 'navigate', direction: -1 };
        }
        return null;
    };

    const parseViewSwitch = (text) => {
        if (text.includes('month view') || text.includes('monthly')) {
            return { type: 'switchView', view: 'month' };
        }
        if (text.includes('week view') || text.includes('weekly')) {
            return { type: 'switchView', view: 'week' };
        }
        if (text.includes('day view') || text.includes('daily')) {
            return { type: 'switchView', view: 'day' };
        }
        return null;
    };

    const executeCommand = (command) => {
        if (!command) {
            console.log('No command recognized');
            return;
        }

        try {
            switch (command.type) {
                case 'createEvent':
                    if (command.event && onAddEvent) {
                        const eventData = {
                            ...command.event,
                            id: Date.now().toString()
                        };
                        onAddEvent(eventData);
                        const eventDate = new Date(eventData.start);
                        const dateStr = eventDate.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric'
                        });
                        const timeStr = eventDate.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true
                        });
                        alert(`✓ Created event: "${eventData.title}" on ${dateStr} at ${timeStr}`);
                    }
                    break;
                case 'editEvent':
                    if (command.eventId && command.event && onUpdateEvent) {
                        onUpdateEvent(command.eventId, command.event);
                        const eventDate = new Date(command.event.start);
                        const dateStr = eventDate.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric'
                        });
                        const timeStr = eventDate.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true
                        });
                        alert(`✓ Updated event: "${command.event.title}" on ${dateStr} at ${timeStr}`);
                    } else {
                        alert('Could not find event to edit. Please specify the event name more clearly.');
                    }
                    break;
                case 'deleteEvent':
                    if (command.eventId && onDeleteEvent) {
                        const eventTitle = command.eventTitle || 'event';
                        onDeleteEvent(command.eventId);
                        alert(`✓ Deleted event: "${eventTitle}"`);
                    } else {
                        alert('Could not find event to delete. Please specify the event name more clearly.');
                    }
                    break;
                case 'navigate':
                    if (onNavigateDate) {
                        onNavigateDate(command.direction);
                        const directionText = command.direction > 0 ? 'forward' : 'back';
                        alert(`✓ Navigated ${directionText}`);
                    }
                    break;
                case 'switchView':
                    if (onSwitchView) {
                        onSwitchView(command.view);
                        alert(`✓ Switched to ${command.view} view`);
                    }
                    break;
                case 'goToToday':
                    if (onGoToToday) {
                        onGoToToday();
                        alert('✓ Navigated to today');
                    }
                    break;
                default:
                    console.log('Unknown command type:', command.type);
                    alert(`Unknown command type: ${command.type}`);
            }
        } catch (error) {
            console.error('Error executing command:', error);
            alert(`Error executing command: ${error.message}`);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setIsRecording(true);
            audioChunksRef.current = [];
            
            // Record audio using MediaRecorder - try different mime types
            let mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported('audio/webm')) {
                if (MediaRecorder.isTypeSupported('audio/mp4')) {
                    mimeType = 'audio/mp4';
                } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                    mimeType = 'audio/ogg';
                } else {
                    mimeType = ''; // Let browser choose default
                }
            }
            
            const options = mimeType ? { mimeType } : {};
            mediaRecorderRef.current = new MediaRecorder(stream, options);
            
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };
            
            mediaRecorderRef.current.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                setIsRecording(false); // Always reset recording state when stopped
                
                if (audioChunksRef.current.length > 0) {
                    setIsProcessing(true);
                    try {
                        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                        await transcribeAudio(audioBlob);
                    } catch (error) {
                        console.error('Error in transcription:', error);
                        alert(`Error processing audio: ${error.message}`);
                    } finally {
                        setIsProcessing(false);
                    }
                }
            };
            
            mediaRecorderRef.current.start();
            
            // Auto-stop after 20 seconds (longer timeout to allow user to finish speaking)
            const timeoutId = setTimeout(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                    stopRecording();
                }
            }, 20000);
            
            // Store timeout ID for cleanup
            mediaRecorderRef.current.timeoutId = timeoutId;
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
            setIsRecording(false);
        }
    };
    
    const transcribeAudio = async (audioBlob) => {
        try {
            // Determine content type based on blob type
            let contentType = 'audio/webm';
            if (audioBlob.type) {
                contentType = audioBlob.type;
            }
            
            // Use Deepgram's audio intelligence features:
            // - smart_format: better formatting
            // - paragraphs: better understanding of structure
            // - utterances: separate utterances
            // - entity_detection: extract dates, times, quantities
            // - punctuate: punctuation
            // - model: nova-3 for best accuracy and understanding
            const params = new URLSearchParams({
                model: 'nova-3',
                language: 'en-US',
                smart_format: 'true',
                punctuate: 'true',
                paragraphs: 'true',
                utterances: 'true',
                entity_detection: 'true',
                diarize: 'false'
            });
            
            const response = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Token ${DEEPGRAM_API_KEY}`,
                    'Content-Type': contentType
                },
                body: audioBlob
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Deepgram API error:', response.status, errorText);
                throw new Error(`Deepgram API error: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';
            // Handle different possible entity structures from Deepgram
            let entities = [];
            try {
                entities = data.results?.channels?.[0]?.alternatives?.[0]?.entities || 
                          data.results?.channels?.[0]?.alternatives?.[0]?.words?.filter(w => w.type || w.label) || 
                          [];
            } catch (e) {
                console.warn('Could not parse entities:', e);
            }
            const paragraphs = data.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript || 
                              data.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcripts?.[0] || '';
            
            console.log('Full Deepgram response:', data);
            console.log('Transcript:', transcript);
            console.log('Entities:', entities);
            console.log('Paragraphs:', paragraphs);
            
            if (transcript.trim()) {
                // Use paragraphs if available, otherwise use transcript
                const textToParse = paragraphs.trim() || transcript.trim();
                console.log('Attempting to parse:', textToParse);
                console.log('Available entities:', entities.map(e => ({ type: e.type || e.label, value: e.value })));
                
                const command = parseVoiceCommandWithEntities(textToParse, entities, transcript);
                if (command) {
                    console.log('Command parsed successfully:', command);
                    executeCommand(command);
                } else {
                    // Provide helpful feedback based on what was detected
                    const detectedDate = dateEntities.length > 0 ? dateEntities[0].value : 'none';
                    const detectedTime = timeEntities.length > 0 ? timeEntities[0].value : 'none';
                    const detectedIntents = [];
                    if (textToParse.match(/create|add|schedule|make/i)) detectedIntents.push('create');
                    if (textToParse.match(/delete|remove|cancel/i)) detectedIntents.push('delete');
                    if (textToParse.match(/go to|navigate|next|previous/i)) detectedIntents.push('navigate');
                    
                    let message = `Could not fully understand: "${textToParse}"\n\n`;
                    message += `Detected:\n`;
                    message += `- Date: ${detectedDate}\n`;
                    message += `- Time: ${detectedTime}\n`;
                    message += `- Intent: ${detectedIntents.join(', ') || 'unclear'}\n\n`;
                    message += `Try being more specific:\n`;
                    message += `• "Create event [name] tomorrow at 2pm"\n`;
                    message += `• "Add meeting with John on Monday at 10am"\n`;
                    message += `• "Delete event [name]" or "Remove [name]"`;
                    
                    alert(message);
                }
            } else {
                alert('No speech detected. Please speak more clearly or check your microphone permissions.');
            }
        } catch (error) {
            console.error('Transcription error:', error);
            let errorMessage = 'Error transcribing audio. ';
            if (error.message.includes('401') || error.message.includes('Unauthorized')) {
                errorMessage += 'API key issue. Please check your Deepgram credentials.';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                errorMessage += 'Network error. Please check your internet connection.';
            } else {
                errorMessage += `${error.message}. Please try again.`;
            }
            alert(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            // Clear timeout if it exists
            if (mediaRecorderRef.current.timeoutId) {
                clearTimeout(mediaRecorderRef.current.timeoutId);
                mediaRecorderRef.current.timeoutId = null;
            }
            // Stop recording if it's active
            if (mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        }
        // Ensure recording state is reset
        setIsRecording(false);
    };

    const handleMicClick = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
        if (onSpeakClick) {
            onSpeakClick();
        }
    };

    return (
        <div className="day-structure-footer">
            <button className="day-structure-create-btn" onClick={onCreateEvent}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                </svg>
                <span>Create Event</span>
            </button>
            <button 
                className={`day-structure-mic-btn ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
                onClick={handleMicClick}
                disabled={isProcessing}
            >
                {isRecording ? (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="red" opacity="0.8"/>
                        <circle cx="12" cy="12" r="6" fill="white"/>
                    </svg>
                ) : isProcessing ? (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="31.416" strokeDashoffset="15.708">
                            <animate attributeName="stroke-dashoffset" values="15.708;47.124;15.708" dur="1s" repeatCount="indefinite"/>
                        </circle>
                    </svg>
                ) : (
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" fill="currentColor"/>
                </svg>
                )}
            </button>
            <button className="day-structure-dario-btn" onClick={onAIChatClick}>
                <div className="dario-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                    </svg>
                </div>
                <span className="dario-label">Dario</span>
            </button>
        </div>
    );
}

