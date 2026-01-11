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

    // Convert word numbers to numeric values (e.g., "twelve" -> 12, "two" -> 2, "thirty" -> 30)
    const wordToNumber = (word) => {
        const wordMap = {
            'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
            'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20,
            'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23, 'twenty-four': 24,
            'thirty': 30, 'forty': 40, 'fifty': 50
        };
        const normalized = word.toLowerCase().trim();
        return wordMap[normalized] !== undefined ? wordMap[normalized] : null;
    };

    // Capitalize first letter of each word in title
    const capitalizeTitle = (title) => {
        if (!title || title.length === 0) return title;
        return title.split(' ').map(word => {
            if (word.length === 0) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }).join(' ');
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
        // Check for all-day event phrases (birthday, graduation, holidays, celebrations, etc.)
        const textToCheck = (originalTranscript || text).toLowerCase();
        
        // First, check for explicit "all day" phrases
        const explicitAllDayPatterns = [
            /\ball\s+day\b/i,
            /\ball\s+day\s+event\b/i,
            /\ball\s+day\s+long\b/i,
            /\bentire\s+day\b/i,
            /\bfull\s+day\b/i,
            /\bwhole\s+day\b/i
        ];
        let explicitAllDay = false;
        for (const pattern of explicitAllDayPatterns) {
            if (pattern.test(textToCheck)) {
                explicitAllDay = true;
                break;
            }
        }
        
        // Keywords that should automatically be all-day (birthdays, graduations, anniversaries, holidays)
        const autoAllDayKeywords = [
            'birthday', 'graduation', 'anniversary', 'holiday', 'vacation', 'day off',
            'wedding', 'funeral', 'memorial', 'christmas', 'easter', 'thanksgiving', 'new year',
            'valentine', 'halloween', 'independence day', 'labor day', 'memorial day', 'veterans day',
            'martin luther king', 'presidents day', 'columbus day', 'flag day', 'mothers day', 'fathers day',
            'hanukkah', 'passover', 'ramadan', 'eid', 'diwali', 'chinese new year', 'kwanzaa'
        ];
        
        // Extended keywords list (for fallback detection)
        const allDayKeywords = [
            'birthday', 'graduation', 'anniversary', 'holiday', 'vacation', 'day off',
            'wedding', 'funeral', 'memorial', 'christmas', 'easter', 'thanksgiving', 'new year',
            'valentine', 'halloween', 'independence day', 'labor day', 'memorial day', 'veterans day',
            'martin luther king', 'presidents day', 'columbus day', 'flag day', 'mothers day', 'fathers day',
            'hanukkah', 'passover', 'ramadan', 'eid', 'diwali', 'chinese new year', 'kwanzaa',
            'birthday party', 'graduation ceremony', 'wedding ceremony', 'funeral service',
            'company holiday', 'national holiday', 'federal holiday', 'bank holiday',
            'sick day', 'personal day', 'mental health day', 'sabbatical', 'leave of absence',
            'family reunion', 'class reunion', 'high school reunion', 'college reunion',
            'block party', 'festival', 'carnival', 'fair', 'parade', 'marathon', 'race day',
            'conference', 'convention', 'summit', 'symposium', 'seminar', 'workshop',
            'training day', 'orientation', 'retreat', 'team building', 'company outing',
            'field trip', 'excursion', 'trip', 'journey', 'travel day',
            'moving day', 'moving', 'relocation', 'housewarming',
            'baptism', 'first communion', 'bar mitzvah', 'bat mitzvah', 'confirmation',
            'engagement', 'engagement party', 'bridal shower', 'baby shower',
            'retirement party', 'going away party', 'farewell party', 'welcome party',
            'prom', 'homecoming', 'dance', 'gala', 'ball', 'banquet', 'dinner party',
            'open house', 'house party', 'birthday bash', 'celebration', 'festivities',
            'holiday celebration', 'holiday party', 'office party', 'christmas party',
            'new years eve', 'new years day', 'new year party', 'countdown',
            'game day', 'sports day', 'championship', 'tournament', 'playoff',
            'movie day', 'beach day', 'pool day', 'park day', 'picnic day',
            'shopping day', 'spa day', 'relaxation day', 'self care day',
            'birthday celebration', 'graduation day', 'wedding day', 'anniversary celebration',
            'christmas eve', 'christmas day', 'new years eve party', 'new years day party',
            'halloween party', 'thanksgiving dinner', 'easter sunday', 'easter monday',
            'valentines day', 'valentine day', 'st patricks day', 'st patrick day',
            'patricks day', 'patrick day', 'april fools day', 'april fools',
            'cinco de mayo', 'july fourth', 'july 4th', 'independence day celebration',
            'labor day weekend', 'memorial day weekend', 'veterans day ceremony',
            'mlk day', 'martin luther king jr day', 'presidents day weekend',
            'columbus day parade', 'flag day ceremony', 'mothers day brunch',
            'fathers day barbecue', 'grandparents day', 'childrens day', 'womens day',
            'international womens day', 'mens day', 'international mens day',
            'earth day', 'world environment day', 'world health day', 'world food day',
            'human rights day', 'peace day', 'international peace day', 'unity day',
            'victory day', 'remembrance day', 'armistice day', 'veterans day',
            'holocaust remembrance day', 'yom hashoah', 'yom kippur', 'rosh hashanah',
            'sukkot', 'purim', 'shavuot', 'lag baomer', 'tu bishvat', 'simchat torah',
            'ash wednesday', 'good friday', 'palm sunday', 'maundy thursday',
            'pentecost', 'whit monday', 'corpus christi', 'assumption day',
            'all saints day', 'all souls day', 'immaculate conception', 'feast day',
            'saint patrick day', 'saint valentine day', 'saint nicholas day',
            'three kings day', 'epiphany', 'twelfth night', 'candlemas',
            'mardi gras', 'fat tuesday', 'ash wednesday', 'lent', 'holy week',
            'passion week', 'easter week', 'easter octave', 'eastertide',
            'advent', 'christmas season', 'christmastide', 'twelve days of christmas',
            'boxing day', 'st stephens day', 'new years day', 'january first',
            'groundhog day', 'super bowl sunday', 'super bowl', 'super bowl party',
            'grammy awards', 'oscar awards', 'academy awards', 'golden globe',
            'emmy awards', 'tony awards', 'sag awards', 'brit awards',
            'election day', 'inauguration day', 'state of the union', 'debate day',
            'primary day', 'caucus day', 'voting day', 'polling day',
            'tax day', 'april fifteenth', 'april 15th', 'tax deadline',
            'filing day', 'refund day', 'payday', 'payroll day',
            'bill due date', 'rent due date', 'mortgage due date', 'insurance due date',
            'subscription renewal', 'membership renewal', 'license renewal',
            'registration day', 'enrollment day', 'registration deadline',
            'application deadline', 'submission deadline', 'project deadline',
            'assignment due date', 'paper due date', 'homework due date',
            'exam day', 'test day', 'final exam', 'midterm exam',
            'quiz day', 'assessment day', 'evaluation day', 'review day',
            'study day', 'study session', 'cram session', 'review session',
            'graduation practice', 'graduation rehearsal', 'cap and gown',
            'commencement', 'commencement ceremony', 'commencement day',
            'diploma ceremony', 'awards ceremony', 'honor ceremony',
            'parent teacher conference', 'open house', 'school orientation',
            'back to school', 'first day of school', 'last day of school',
            'winter break', 'spring break', 'summer break', 'fall break',
            'semester break', 'quarter break', 'midterm break', 'reading week',
            'study week', 'finals week', 'exam week', 'assessment week',
            'field day', 'spirit week', 'homecoming week', 'prom week',
            'sports banquet', 'awards banquet', 'honor banquet', 'recognition banquet',
            'athletic banquet', 'scholastic banquet', 'cultural banquet',
            'science fair', 'art show', 'talent show', 'variety show',
            'school play', 'school musical', 'drama production', 'theater production',
            'band concert', 'orchestra concert', 'choir concert', 'recital',
            'dance recital', 'music recital', 'piano recital', 'violin recital',
            'art exhibition', 'gallery opening', 'museum visit', 'cultural event',
            'book fair', 'book signing', 'author visit', 'library event',
            'reading day', 'literacy day', 'poetry reading', 'story time',
            'career day', 'job fair', 'career fair', 'internship fair',
            'college fair', 'university fair', 'education fair', 'scholarship fair',
            'science olympiad', 'math olympiad', 'debate tournament', 'speech tournament',
            'spelling bee', 'geography bee', 'history bee', 'quiz bowl',
            'robotics competition', 'coding competition', 'hackathon', 'hack day',
            'game jam', 'design challenge', 'innovation day', 'invention convention',
            'maker faire', 'steam day', 'stem day', 'science day',
            'math day', 'reading day', 'writing day', 'history day',
            'foreign language day', 'culture day', 'diversity day', 'heritage day',
            'black history month', 'womens history month', 'hispanic heritage month',
            'asian pacific heritage month', 'native american heritage month',
            'pride month', 'lgbtq pride', 'pride parade', 'pride festival',
            'juneteenth', 'emancipation day', 'freedom day', 'independence day',
            'black friday', 'cyber monday', 'small business saturday', 'giving tuesday',
            'prime day', 'prime day sale', 'flash sale', 'clearance sale',
            'grand opening', 'store opening', 'restaurant opening', 'business opening',
            'closing sale', 'going out of business', 'liquidation sale', 'clearance event',
            'sample sale', 'warehouse sale', 'popup sale', 'trunk show',
            'fashion show', 'runway show', 'designer showcase', 'boutique opening',
            'art walk', 'gallery walk', 'studio tour', 'open studio',
            'wine tasting', 'beer tasting', 'food tasting', 'chocolate tasting',
            'coffee cupping', 'tea tasting', 'cheese tasting', 'whiskey tasting',
            'cooking class', 'baking class', 'culinary class', 'mixology class',
            'bartending class', 'wine class', 'beer class', 'cocktail class',
            'painting class', 'drawing class', 'sculpture class', 'pottery class',
            'photography class', 'videography class', 'editing class', 'photoshop class',
            'yoga class', 'pilates class', 'dance class', 'fitness class',
            'martial arts class', 'self defense class', 'boxing class', 'kickboxing class',
            'swimming lesson', 'diving lesson', 'sailing lesson', 'surfing lesson',
            'skiing lesson', 'snowboarding lesson', 'ice skating lesson', 'figure skating',
            'golf lesson', 'tennis lesson', 'racquetball lesson', 'squash lesson',
            'basketball camp', 'football camp', 'soccer camp', 'baseball camp',
            'softball camp', 'volleyball camp', 'lacrosse camp', 'hockey camp',
            'swimming camp', 'diving camp', 'gymnastics camp', 'cheerleading camp',
            'dance camp', 'music camp', 'theater camp', 'art camp',
            'science camp', 'math camp', 'coding camp', 'robotics camp',
            'adventure camp', 'outdoor camp', 'nature camp', 'environmental camp',
            'survival camp', 'scout camp', 'camping trip', 'backpacking trip',
            'hiking trip', 'mountaineering', 'rock climbing', 'bouldering',
            'caving', 'spelunking', 'kayaking', 'canoeing', 'rafting',
            'white water rafting', 'river rafting', 'paddle boarding', 'stand up paddle',
            'scuba diving', 'snorkeling', 'deep sea fishing', 'fishing trip',
            'hunting trip', 'bird watching', 'wildlife viewing', 'safari',
            'whale watching', 'dolphin watching', 'sea turtle watching', 'penguin watching',
            'aurora watching', 'northern lights', 'southern lights', 'meteor shower',
            'solar eclipse', 'lunar eclipse', 'eclipse viewing', 'planet viewing',
            'star gazing', 'astronomy night', 'telescope viewing', 'observatory visit',
            'planetarium visit', 'space center visit', 'nasa visit', 'space museum',
            'science museum', 'natural history museum', 'history museum', 'art museum',
            'childrens museum', 'interactive museum', 'hands on museum', 'discovery center',
            'aquarium visit', 'zoo visit', 'wildlife park', 'safari park',
            'botanical garden', 'arboretum', 'conservatory', 'greenhouse',
            'butterfly garden', 'rose garden', 'japanese garden', 'zen garden',
            'sculpture garden', 'outdoor sculpture', 'public art', 'street art',
            'mural tour', 'graffiti tour', 'architecture tour', 'historical tour',
            'walking tour', 'guided tour', 'self guided tour', 'audio tour',
            'food tour', 'culinary tour', 'restaurant tour', 'market tour',
            'wine tour', 'brewery tour', 'distillery tour', 'spirits tour',
            'chocolate factory tour', 'cheese factory tour', 'coffee roastery tour',
            'bakery tour', 'farm tour', 'ranch tour', 'vineyard tour',
            'orchard tour', 'apple picking', 'berry picking', 'cherry picking',
            'pumpkin picking', 'christmas tree cutting', 'tree planting', 'gardening day',
            'community garden', 'urban farming', 'composting workshop', 'sustainability day',
            'environmental day', 'earth day celebration', 'clean up day', 'beach cleanup',
            'park cleanup', 'trail cleanup', 'river cleanup', 'ocean cleanup',
            'tree planting day', 'reforestation', 'habitat restoration', 'conservation day',
            'wildlife rehabilitation', 'animal rescue', 'pet adoption', 'foster orientation',
            'volunteer day', 'community service', 'charity work', 'fundraising event',
            'benefit concert', 'benefit dinner', 'auction', 'silent auction',
            'live auction', 'charity auction', 'art auction', 'wine auction',
            'charity walk', 'charity run', 'charity bike ride', 'charity swim',
            'relay for life', 'walk for a cause', 'race for a cause', 'run for a cause',
            'bike for a cause', 'swim for a cause', 'climb for a cause', 'hike for a cause',
            'polar plunge', 'ice bucket challenge', 'fundraiser', 'fundraising gala',
            'charity gala', 'benefit gala', 'annual gala', 'spring gala',
            'fall gala', 'winter gala', 'holiday gala', 'christmas gala',
            'new year gala', 'valentine gala', 'easter gala', 'halloween gala',
            'costume party', 'masquerade ball', 'themed party', 'decade party',
            '80s party', '90s party', 'retro party', 'vintage party',
            'disco party', 'glow party', 'neon party', 'blacklight party',
            'pool party', 'beach party', 'luau', 'tiki party',
            'tropical party', 'hawaiian party', 'caribbean party', 'island party',
            'barbecue', 'bbq', 'cookout', 'grill out', 'tailgate party',
            'game day party', 'super bowl party', 'world cup party', 'championship party',
            'watch party', 'viewing party', 'premiere party', 'finale party',
            'series premiere', 'season premiere', 'season finale', 'series finale',
            'movie premiere', 'film premiere', 'red carpet', 'awards show',
            'grammy viewing party', 'oscar viewing party', 'emmy viewing party',
            'tony viewing party', 'golden globe viewing party', 'sag viewing party',
            'mtv video music awards', 'billboard music awards', 'american music awards',
            'country music awards', 'cma awards', 'acm awards', 'bet awards',
            'naacp image awards', 'soul train awards', 'essence awards',
            'peoples choice awards', 'teen choice awards', 'kids choice awards',
            'nickelodeon kids choice', 'disney channel awards', 'mtv movie awards',
            'comedy central roasts', 'comedy awards', 'stand up comedy', 'comedy show',
            'improv show', 'sketch comedy', 'open mic night', 'poetry slam',
            'spoken word', 'storytelling night', 'book club', 'reading group',
            'writing group', 'writing workshop', 'writers retreat', 'writing conference',
            'publishing event', 'book launch', 'book release', 'author event',
            'book signing', 'book reading', 'author talk', 'author lecture',
            'literary festival', 'poetry festival', 'writing festival', 'book festival',
            'comic con', 'anime con', 'gaming con', 'tech con',
            'startup weekend', 'entrepreneur weekend', 'business weekend', 'innovation weekend',
            'hackathon', 'hack day', 'code jam', 'game jam',
            'design jam', 'design sprint', 'design workshop', 'ux workshop',
            'ui workshop', 'web design', 'graphic design', 'product design',
            'industrial design', 'fashion design', 'interior design', 'landscape design',
            'architecture workshop', 'drafting workshop', 'cad workshop', '3d modeling',
            '3d printing', 'laser cutting', 'cnc machining', 'woodworking',
            'metalworking', 'welding', 'blacksmithing', 'glassblowing',
            'jewelry making', 'silversmithing', 'goldsmithing', 'watchmaking',
            'clock making', 'furniture making', 'cabinet making', 'carpentry',
            'home improvement', 'diy project', 'renovation', 'remodeling',
            'home repair', 'plumbing', 'electrical work', 'roofing',
            'siding', 'painting', 'staining', 'deck building',
            'fence building', 'shed building', 'gazebo building', 'pergola building',
            'patio building', 'walkway building', 'driveway building', 'landscaping',
            'sprinkler installation', 'irrigation', 'drainage', 'grading',
            'excavation', 'foundation', 'concrete work', 'masonry',
            'brick work', 'stone work', 'tile work', 'flooring',
            'carpet installation', 'hardwood installation', 'laminate installation', 'vinyl installation',
            'ceramic tile', 'porcelain tile', 'natural stone', 'marble',
            'granite', 'quartz', 'countertop installation', 'backsplash installation',
            'cabinet installation', 'appliance installation', 'fixture installation', 'lighting installation',
            'electrical installation', 'plumbing installation', 'hvac installation', 'heating installation',
            'cooling installation', 'air conditioning', 'furnace installation', 'boiler installation',
            'water heater installation', 'sump pump installation', 'septic installation', 'well installation',
            'solar panel installation', 'wind turbine installation', 'generator installation', 'battery installation',
            'electric vehicle charging', 'ev charging station', 'tesla supercharger', 'charging installation',
            'smart home installation', 'home automation', 'security system', 'alarm system',
            'camera installation', 'surveillance system', 'intercom system', 'doorbell installation',
            'lock installation', 'door installation', 'window installation', 'skylight installation',
            'garage door installation', 'opener installation', 'gate installation', 'fence installation',
            'pool installation', 'spa installation', 'hot tub installation', 'sauna installation',
            'steam room installation', 'shower installation', 'bathtub installation', 'sink installation',
            'toilet installation', 'faucet installation', 'shower head installation', 'water filter installation',
            'water softener installation', 'reverse osmosis', 'whole house filter', 'point of use filter',
            'refrigerator installation', 'dishwasher installation', 'oven installation', 'stove installation',
            'range installation', 'cooktop installation', 'hood installation', 'microwave installation',
            'washer installation', 'dryer installation', 'washer dryer installation', 'laundry room',
            'closet installation', 'pantry installation', 'shelving installation', 'organization system',
            'home office setup', 'office installation', 'desk installation', 'chair installation',
            'filing system', 'storage system', 'bookcase installation', 'entertainment center',
            'tv installation', 'tv mount installation', 'sound system installation', 'surround sound',
            'home theater installation', 'projector installation', 'screen installation', 'speaker installation',
            'subwoofer installation', 'amplifier installation', 'receiver installation', 'media server',
            'network installation', 'wifi installation', 'ethernet installation', 'cable installation',
            'fiber installation', 'isp installation', 'router installation', 'modem installation',
            'mesh network', 'range extender', 'access point', 'network switch',
            'nas installation', 'server installation', 'backup system', 'cloud setup',
            'data migration', 'data backup', 'data recovery', 'data transfer',
            'computer setup', 'laptop setup', 'desktop setup', 'workstation setup',
            'printer installation', 'scanner installation', 'copier installation', 'fax installation',
            'monitor installation', 'keyboard installation', 'mouse installation', 'webcam installation',
            'microphone installation', 'headset installation', 'speaker installation', 'headphone installation',
            'tablet setup', 'phone setup', 'smartphone setup', 'iphone setup',
            'android setup', 'smartwatch setup', 'fitness tracker setup', 'smart device setup',
            'iot device setup', 'smart bulb setup', 'smart plug setup', 'smart switch setup',
            'smart thermostat setup', 'smart lock setup', 'smart doorbell setup', 'smart camera setup',
            'smart speaker setup', 'alexa setup', 'google home setup', 'homepod setup',
            'echo setup', 'nest setup', 'ring setup', 'arlo setup',
            'philips hue setup', 'lifx setup', 'nanoleaf setup', 'smart home hub',
            'homekit setup', 'google assistant setup', 'siri setup', 'bixby setup',
            'cortana setup', 'voice assistant setup', 'smart home automation', 'home integration',
            'system integration', 'api integration', 'software integration', 'hardware integration',
            'platform integration', 'service integration', 'third party integration', 'custom integration',
            'migration service', 'transfer service', 'setup service', 'installation service',
            'configuration service', 'troubleshooting service', 'repair service', 'maintenance service',
            'support service', 'consultation service', 'training service', 'education service',
            'onboarding service', 'orientation service', 'induction service', 'initiation service',
            'kickoff meeting', 'project kickoff', 'team kickoff', 'sprint kickoff',
            'sprint planning', 'sprint review', 'sprint retrospective', 'daily standup',
            'daily scrum', 'agile meeting', 'scrum meeting', 'kanban meeting',
            'planning meeting', 'strategy meeting', 'tactical meeting', 'operational meeting',
            'staff meeting', 'all hands meeting', 'town hall', 'company meeting',
            'department meeting', 'team meeting', 'one on one', 'one on one meeting',
            'performance review', 'annual review', 'quarterly review', 'monthly review',
            'weekly review', 'daily review', 'project review', 'code review',
            'design review', 'architecture review', 'security review', 'compliance review',
            'audit review', 'financial review', 'budget review', 'forecast review',
            'sales review', 'marketing review', 'product review', 'engineering review',
            'qa review', 'testing review', 'deployment review', 'post mortem',
            'incident review', 'security incident', 'data breach', 'system outage',
            'downtime', 'maintenance window', 'scheduled maintenance', 'emergency maintenance',
            'planned outage', 'unplanned outage', 'service interruption', 'network interruption',
            'power outage', 'internet outage', 'phone outage', 'cable outage',
            'weather outage', 'natural disaster', 'hurricane', 'tornado',
            'earthquake', 'flood', 'wildfire', 'blizzard',
            'snowstorm', 'ice storm', 'thunderstorm', 'lightning',
            'hail', 'sleet', 'freezing rain', 'extreme cold',
            'extreme heat', 'heat wave', 'cold snap', 'polar vortex',
            'wind storm', 'dust storm', 'sandstorm', 'haboob',
            'fog', 'smog', 'air quality alert', 'pollution alert',
            'fire alert', 'evacuation', 'shelter in place', 'emergency alert',
            'amber alert', 'silver alert', 'emergency broadcast', 'weather alert',
            'tsunami warning', 'tornado warning', 'hurricane warning', 'flood warning',
            'blizzard warning', 'winter storm warning', 'ice storm warning', 'wind warning',
            'heat warning', 'cold warning', 'frost warning', 'freeze warning',
            'drought warning', 'wildfire warning', 'air quality warning', 'ozone warning',
            'uv index warning', 'sunburn warning', 'heat stroke warning', 'hypothermia warning',
            'severe weather', 'extreme weather', 'dangerous weather', 'hazardous weather',
            'weather emergency', 'weather disaster', 'climate emergency', 'environmental emergency',
            'natural emergency', 'public emergency', 'state emergency', 'national emergency',
            'local emergency', 'regional emergency', 'county emergency', 'city emergency',
            'town emergency', 'village emergency', 'municipal emergency', 'jurisdiction emergency',
            'federal emergency', 'state of emergency', 'state of disaster', 'disaster declaration',
            'emergency declaration', 'evacuation order', 'mandatory evacuation', 'voluntary evacuation',
            'shelter in place order', 'curfew', 'lockdown', 'quarantine',
            'isolation', 'containment', 'restriction', 'prohibition',
            'ban', 'embargo', 'sanction', 'trade restriction',
            'travel restriction', 'travel ban', 'travel advisory', 'travel warning',
            'health advisory', 'public health advisory', 'health warning', 'health alert',
            'disease outbreak', 'pandemic', 'epidemic', 'endemic',
            'public health emergency', 'health emergency', 'medical emergency', 'health crisis',
            'healthcare crisis', 'hospital crisis', 'medical crisis', 'health system crisis',
            'shortage', 'supply shortage', 'resource shortage', 'staff shortage',
            'nurse shortage', 'doctor shortage', 'medical personnel shortage', 'healthcare worker shortage',
            'equipment shortage', 'supply shortage', 'material shortage', 'resource shortage',
            'fuel shortage', 'gas shortage', 'energy shortage', 'power shortage',
            'water shortage', 'food shortage', 'medicine shortage', 'drug shortage',
            'vaccine shortage', 'test shortage', 'ppe shortage', 'mask shortage',
            'ventilator shortage', 'hospital bed shortage', 'icu bed shortage', 'emergency bed shortage',
            'ambulance shortage', 'emergency vehicle shortage', 'first responder shortage', 'paramedic shortage',
            'emt shortage', 'firefighter shortage', 'police officer shortage', 'law enforcement shortage',
            'security personnel shortage', 'guard shortage', 'watchman shortage', 'patrol shortage',
            'maintenance worker shortage', 'janitor shortage', 'custodian shortage', 'cleaner shortage',
            'sanitation worker shortage', 'waste management shortage', 'garbage collection shortage', 'recycling shortage',
            'trash pickup', 'garbage pickup', 'recycling pickup', 'yard waste pickup',
            'bulk pickup', 'hazardous waste pickup', 'electronics recycling', 'tire recycling',
            'battery recycling', 'oil recycling', 'paint recycling', 'chemical disposal',
            'hazardous material disposal', 'toxic waste disposal', 'radioactive waste disposal', 'nuclear waste disposal',
            'medical waste disposal', 'biohazard disposal', 'sharps disposal', 'pharmaceutical disposal',
            'drug disposal', 'medication disposal', 'prescription disposal', 'controlled substance disposal',
            'weapon disposal', 'firearm disposal', 'ammunition disposal', 'explosive disposal',
            'bomb disposal', 'ied disposal', 'improvised explosive disposal', 'suspicious package',
            'bomb threat', 'terrorist threat', 'security threat', 'safety threat',
            'active shooter', 'active threat', 'immediate threat', 'emergency threat',
            'evacuation', 'emergency evacuation', 'building evacuation', 'school evacuation',
            'workplace evacuation', 'office evacuation', 'factory evacuation', 'warehouse evacuation',
            'store evacuation', 'mall evacuation', 'theater evacuation', 'stadium evacuation',
            'arena evacuation', 'concert evacuation', 'festival evacuation', 'fair evacuation',
            'amusement park evacuation', 'theme park evacuation', 'water park evacuation', 'zoo evacuation',
            'aquarium evacuation', 'museum evacuation', 'library evacuation', 'government building evacuation',
            'courthouse evacuation', 'city hall evacuation', 'capitol evacuation', 'white house evacuation',
            'airport evacuation', 'train station evacuation', 'bus station evacuation', 'subway evacuation',
            'metro evacuation', 'transit evacuation', 'transportation evacuation', 'vehicle evacuation',
            'traffic evacuation', 'highway evacuation', 'freeway evacuation', 'bridge evacuation',
            'tunnel evacuation', 'ferry evacuation', 'port evacuation', 'harbor evacuation',
            'marina evacuation', 'beach evacuation', 'coastal evacuation', 'island evacuation',
            'flood evacuation', 'hurricane evacuation', 'tornado evacuation', 'wildfire evacuation',
            'earthquake evacuation', 'tsunami evacuation', 'volcanic evacuation', 'landslide evacuation',
            'mudslide evacuation', 'avalanche evacuation', 'rockfall evacuation', 'debris flow evacuation',
            'dam failure evacuation', 'levee failure evacuation', 'bridge failure evacuation', 'structure failure evacuation',
            'building collapse', 'bridge collapse', 'tunnel collapse', 'dam collapse',
            'wall collapse', 'ceiling collapse', 'floor collapse', 'roof collapse',
            'scaffold collapse', 'crane collapse', 'tower collapse', 'monument collapse',
            'statue collapse', 'sculpture collapse', 'art installation collapse', 'temporary structure collapse',
            'tent collapse', 'canopy collapse', 'marquee collapse', 'stage collapse',
            'bleacher collapse', 'grandstand collapse', 'stadium collapse', 'arena collapse',
            'gymnasium collapse', 'auditorium collapse', 'theater collapse', 'cinema collapse',
            'church collapse', 'temple collapse', 'mosque collapse', 'synagogue collapse',
            'cathedral collapse', 'basilica collapse', 'shrine collapse', 'chapel collapse',
            'monastery collapse', 'convent collapse', 'abbey collapse', 'priory collapse',
            'catacomb collapse', 'crypt collapse', 'mausoleum collapse', 'tomb collapse',
            'pyramid collapse', 'ziggurat collapse', 'stupa collapse', 'pagoda collapse',
            'minaret collapse', 'spire collapse', 'bell tower collapse', 'clock tower collapse',
            'watchtower collapse', 'lighthouse collapse', 'beacon collapse', 'signal tower collapse',
            'radio tower collapse', 'tv tower collapse', 'cell tower collapse', 'communication tower collapse',
            'power tower collapse', 'transmission tower collapse', 'utility tower collapse', 'telephone pole collapse',
            'streetlight collapse', 'traffic light collapse', 'sign collapse', 'billboard collapse',
            'advertisement collapse', 'display collapse', 'exhibition collapse', 'showcase collapse',
            'showroom collapse', 'showcase collapse', 'gallery collapse', 'museum collapse',
            'library collapse', 'archive collapse', 'repository collapse', 'storage collapse',
            'warehouse collapse', 'factory collapse', 'mill collapse', 'plant collapse',
            'refinery collapse', 'power plant collapse', 'nuclear plant collapse', 'chemical plant collapse',
            'manufacturing plant collapse', 'assembly plant collapse', 'production plant collapse', 'processing plant collapse',
            'food processing plant collapse', 'meat packing plant collapse', 'dairy processing plant collapse', 'beverage plant collapse',
            'brewery collapse', 'winery collapse', 'distillery collapse', 'ethanol plant collapse',
            'biofuel plant collapse', 'biomass plant collapse', 'biogas plant collapse', 'composting facility collapse',
            'recycling facility collapse', 'waste treatment facility collapse', 'sewage treatment facility collapse', 'water treatment facility collapse',
            'desalination plant collapse', 'filtration plant collapse', 'purification plant collapse', 'bottling plant collapse',
            'packaging plant collapse', 'distribution center collapse', 'fulfillment center collapse', 'sorting facility collapse',
            'logistics center collapse', 'transportation hub collapse', 'freight terminal collapse', 'cargo terminal collapse',
            'airport terminal collapse', 'train terminal collapse', 'bus terminal collapse', 'ferry terminal collapse',
            'port terminal collapse', 'harbor terminal collapse', 'marina collapse', 'dock collapse',
            'pier collapse', 'wharf collapse', 'quay collapse', 'jetty collapse',
            'breakwater collapse', 'seawall collapse', 'levee collapse', 'dike collapse',
            'dam collapse', 'reservoir collapse', 'tank collapse', 'silo collapse',
            'grain silo collapse', 'feed silo collapse', 'cement silo collapse', 'chemical storage collapse',
            'fuel storage collapse', 'oil storage collapse', 'gas storage collapse', 'propane storage collapse',
            'natural gas storage collapse', 'lng storage collapse', 'cng storage collapse', 'hydrogen storage collapse',
            'battery storage collapse', 'energy storage collapse', 'power storage collapse', 'electricity storage collapse',
            'solar storage collapse', 'wind storage collapse', 'hydro storage collapse', 'pumped storage collapse',
            'compressed air storage collapse', 'flywheel storage collapse', 'supercapacitor storage collapse', 'cryogenic storage collapse',
            'cold storage collapse', 'refrigerated storage collapse', 'freezer storage collapse', 'ice storage collapse',
            'frozen storage collapse', 'perishable storage collapse', 'food storage collapse', 'grain storage collapse',
            'feed storage collapse', 'seed storage collapse', 'fertilizer storage collapse', 'pesticide storage collapse',
            'herbicide storage collapse', 'fungicide storage collapse', 'insecticide storage collapse', 'rodenticide storage collapse',
            'disinfectant storage collapse', 'sanitizer storage collapse', 'cleaning supply storage collapse', 'janitorial supply storage collapse',
            'maintenance supply storage collapse', 'repair supply storage collapse', 'tool storage collapse', 'equipment storage collapse',
            'vehicle storage collapse', 'fleet storage collapse', 'parking garage collapse', 'parking structure collapse',
            'parking deck collapse', 'parking ramp collapse', 'multi level parking collapse', 'underground parking collapse',
            'surface parking collapse', 'lot collapse', 'driveway collapse', 'road collapse',
            'street collapse', 'avenue collapse', 'boulevard collapse', 'highway collapse',
            'freeway collapse', 'expressway collapse', 'turnpike collapse', 'tollway collapse',
            'parkway collapse', 'scenic highway collapse', 'byway collapse', 'backroad collapse',
            'country road collapse', 'rural road collapse', 'gravel road collapse', 'dirt road collapse',
            'unpaved road collapse', 'trail collapse', 'path collapse', 'sidewalk collapse',
            'walkway collapse', 'boardwalk collapse', 'promenade collapse', 'esplanade collapse',
            'pedestrian bridge collapse', 'footbridge collapse', 'skybridge collapse', 'overpass collapse',
            'underpass collapse', 'tunnel collapse', 'subway tunnel collapse', 'metro tunnel collapse',
            'rail tunnel collapse', 'road tunnel collapse', 'water tunnel collapse', 'sewer tunnel collapse',
            'utility tunnel collapse', 'steam tunnel collapse', 'conduit collapse', 'pipe collapse',
            'pipeline collapse', 'water main collapse', 'sewer main collapse', 'gas main collapse',
            'electric main collapse', 'telephone main collapse', 'cable main collapse', 'fiber main collapse',
            'internet main collapse', 'broadband main collapse', 'communication main collapse', 'data main collapse',
            'network main collapse', 'server main collapse', 'database main collapse', 'cloud main collapse',
            'storage main collapse', 'backup main collapse', 'archive main collapse', 'repository main collapse',
            'library main collapse', 'registry main collapse', 'catalog main collapse', 'index main collapse',
            'search main collapse', 'query main collapse', 'api main collapse', 'service main collapse',
            'application main collapse', 'software main collapse', 'platform main collapse', 'ecosystem main collapse',
            'infrastructure main collapse', 'system main collapse', 'network infrastructure collapse', 'it infrastructure collapse',
            'cyber infrastructure collapse', 'digital infrastructure collapse', 'information infrastructure collapse', 'communication infrastructure collapse',
            'transportation infrastructure collapse', 'logistics infrastructure collapse', 'supply chain infrastructure collapse', 'distribution infrastructure collapse',
            'energy infrastructure collapse', 'power infrastructure collapse', 'electrical infrastructure collapse', 'utility infrastructure collapse',
            'water infrastructure collapse', 'sewage infrastructure collapse', 'wastewater infrastructure collapse', 'stormwater infrastructure collapse',
            'flood control infrastructure collapse', 'drainage infrastructure collapse', 'irrigation infrastructure collapse', 'agricultural infrastructure collapse',
            'food infrastructure collapse', 'farming infrastructure collapse', 'ranching infrastructure collapse', 'livestock infrastructure collapse',
            'dairy infrastructure collapse', 'poultry infrastructure collapse', 'aquaculture infrastructure collapse', 'fishery infrastructure collapse',
            'forestry infrastructure collapse', 'timber infrastructure collapse', 'lumber infrastructure collapse', 'paper infrastructure collapse',
            'mining infrastructure collapse', 'quarry infrastructure collapse', 'extraction infrastructure collapse', 'processing infrastructure collapse',
            'refining infrastructure collapse', 'smelting infrastructure collapse', 'manufacturing infrastructure collapse', 'production infrastructure collapse',
            'assembly infrastructure collapse', 'fabrication infrastructure collapse', 'construction infrastructure collapse', 'building infrastructure collapse',
            'housing infrastructure collapse', 'residential infrastructure collapse', 'commercial infrastructure collapse', 'industrial infrastructure collapse',
            'office infrastructure collapse', 'retail infrastructure collapse', 'hospitality infrastructure collapse', 'tourism infrastructure collapse',
            'entertainment infrastructure collapse', 'recreation infrastructure collapse', 'sports infrastructure collapse', 'fitness infrastructure collapse',
            'wellness infrastructure collapse', 'health infrastructure collapse', 'medical infrastructure collapse', 'hospital infrastructure collapse',
            'clinic infrastructure collapse', 'pharmacy infrastructure collapse', 'laboratory infrastructure collapse', 'research infrastructure collapse',
            'education infrastructure collapse', 'school infrastructure collapse', 'university infrastructure collapse', 'library infrastructure collapse',
            'museum infrastructure collapse', 'cultural infrastructure collapse', 'heritage infrastructure collapse', 'historical infrastructure collapse',
            'archaeological infrastructure collapse', 'preservation infrastructure collapse', 'conservation infrastructure collapse', 'restoration infrastructure collapse',
            'rehabilitation infrastructure collapse', 'renovation infrastructure collapse', 'redevelopment infrastructure collapse', 'revitalization infrastructure collapse',
            'urban renewal infrastructure collapse', 'gentrification infrastructure collapse', 'development infrastructure collapse', 'planning infrastructure collapse',
            'zoning infrastructure collapse', 'permitting infrastructure collapse', 'licensing infrastructure collapse', 'regulation infrastructure collapse',
            'compliance infrastructure collapse', 'enforcement infrastructure collapse', 'inspection infrastructure collapse', 'monitoring infrastructure collapse',
            'surveillance infrastructure collapse', 'security infrastructure collapse', 'safety infrastructure collapse', 'emergency infrastructure collapse',
            'response infrastructure collapse', 'preparedness infrastructure collapse', 'resilience infrastructure collapse', 'adaptation infrastructure collapse',
            'mitigation infrastructure collapse', 'prevention infrastructure collapse', 'protection infrastructure collapse', 'defense infrastructure collapse',
            'military infrastructure collapse', 'defense infrastructure collapse', 'national security infrastructure collapse', 'homeland security infrastructure collapse',
            'border security infrastructure collapse', 'customs infrastructure collapse', 'immigration infrastructure collapse', 'passport infrastructure collapse',
            'visa infrastructure collapse', 'travel infrastructure collapse', 'tourism infrastructure collapse', 'hospitality infrastructure collapse',
            'hotel infrastructure collapse', 'resort infrastructure collapse', 'spa infrastructure collapse', 'wellness infrastructure collapse',
            'fitness infrastructure collapse', 'gym infrastructure collapse', 'health club infrastructure collapse', 'sports club infrastructure collapse',
            'country club infrastructure collapse', 'golf club infrastructure collapse', 'tennis club infrastructure collapse', 'yacht club infrastructure collapse',
            'sailing club infrastructure collapse', 'rowing club infrastructure collapse', 'swimming club infrastructure collapse', 'diving club infrastructure collapse',
            'surfing club infrastructure collapse', 'skiing club infrastructure collapse', 'snowboarding club infrastructure collapse', 'mountaineering club infrastructure collapse',
            'hiking club infrastructure collapse', 'camping club infrastructure collapse', 'backpacking club infrastructure collapse', 'rock climbing club infrastructure collapse',
            'bouldering club infrastructure collapse', 'caving club infrastructure collapse', 'spelunking club infrastructure collapse', 'kayaking club infrastructure collapse',
            'canoeing club infrastructure collapse', 'rafting club infrastructure collapse', 'whitewater rafting club infrastructure collapse', 'paddleboarding club infrastructure collapse',
            'stand up paddle club infrastructure collapse', 'scuba diving club infrastructure collapse', 'snorkeling club infrastructure collapse', 'fishing club infrastructure collapse',
            'deep sea fishing club infrastructure collapse', 'fly fishing club infrastructure collapse', 'ice fishing club infrastructure collapse', 'spearfishing club infrastructure collapse',
            'hunting club infrastructure collapse', 'shooting club infrastructure collapse', 'archery club infrastructure collapse', 'target shooting club infrastructure collapse',
            'skeet shooting club infrastructure collapse', 'trap shooting club infrastructure collapse', 'sporting clays club infrastructure collapse', 'rifle club infrastructure collapse',
            'pistol club infrastructure collapse', 'revolver club infrastructure collapse', 'handgun club infrastructure collapse', 'long gun club infrastructure collapse',
            'shotgun club infrastructure collapse', 'hunting rifle club infrastructure collapse', 'varmint rifle club infrastructure collapse', 'big game rifle club infrastructure collapse',
            'small game rifle club infrastructure collapse', 'waterfowl shotgun club infrastructure collapse', 'upland bird shotgun club infrastructure collapse', 'turkey shotgun club infrastructure collapse',
            'deer hunting club infrastructure collapse', 'elk hunting club infrastructure collapse', 'moose hunting club infrastructure collapse', 'bear hunting club infrastructure collapse',
            'boar hunting club infrastructure collapse', 'wild boar hunting club infrastructure collapse', 'feral pig hunting club infrastructure collapse', 'javelina hunting club infrastructure collapse',
            'coyote hunting club infrastructure collapse', 'wolf hunting club infrastructure collapse', 'mountain lion hunting club infrastructure collapse', 'bobcat hunting club infrastructure collapse',
            'lynx hunting club infrastructure collapse', 'fox hunting club infrastructure collapse', 'raccoon hunting club infrastructure collapse', 'opossum hunting club infrastructure collapse',
            'skunk hunting club infrastructure collapse', 'groundhog hunting club infrastructure collapse', 'woodchuck hunting club infrastructure collapse', 'prairie dog hunting club infrastructure collapse',
            'gopher hunting club infrastructure collapse', 'mole hunting club infrastructure collapse', 'rabbit hunting club infrastructure collapse', 'hare hunting club infrastructure collapse',
            'squirrel hunting club infrastructure collapse', 'chipmunk hunting club infrastructure collapse', 'marmot hunting club infrastructure collapse', 'beaver hunting club infrastructure collapse',
            'muskrat hunting club infrastructure collapse', 'nutria hunting club infrastructure collapse', 'otter hunting club infrastructure collapse', 'mink hunting club infrastructure collapse',
            'weasel hunting club infrastructure collapse', 'ferret hunting club infrastructure collapse', 'badger hunting club infrastructure collapse', 'wolverine hunting club infrastructure collapse',
            'martin hunting club infrastructure collapse', 'fisher hunting club infrastructure collapse', 'sable hunting club infrastructure collapse', 'ermine hunting club infrastructure collapse',
            'stoat hunting club infrastructure collapse', 'pine marten hunting club infrastructure collapse', 'beech marten hunting club infrastructure collapse', 'stone marten hunting club infrastructure collapse',
            'house marten hunting club infrastructure collapse', 'yellow throated marten hunting club infrastructure collapse', 'nilgiri marten hunting club infrastructure collapse', 'japanese marten hunting club infrastructure collapse',
            'sable hunting club infrastructure collapse', 'pine marten hunting club infrastructure collapse', 'beech marten hunting club infrastructure collapse', 'stone marten hunting club infrastructure collapse',
            'house marten hunting club infrastructure collapse', 'yellow throated marten hunting club infrastructure collapse', 'nilgiri marten hunting club infrastructure collapse', 'japanese marten hunting club infrastructure collapse'
        ];
        // Patterns for automatic all-day events (birthdays, graduations, anniversaries, holidays only)
        const autoAllDayPatterns = [
            // "it is my birthday", "it's my graduation", "my birthday is"
            /\b(?:it\s+is|it's|my|the)\s+(?:birthday|graduation|anniversary|holiday|vacation|wedding|funeral|memorial)\b/i,
            // "birthday is on", "graduation on", "anniversary on"
            /\b(?:birthday|graduation|anniversary|holiday|vacation|wedding|funeral|memorial)\s+(?:is|on|at|will be)\b/i,
            // "celebrate birthday", "celebration of graduation"
            /\b(?:celebrate|celebration|celebrating)\s+(?:birthday|graduation|anniversary|holiday|wedding)\b/i,
            // "birthday celebration", "graduation day"
            /\b(?:birthday|graduation|anniversary|wedding)\s+(?:celebration|day|party|ceremony)\b/i,
            // "day off", "holiday", "vacation day"
            /\b(?:day\s+off|holiday|vacation\s+day|sick\s+day|personal\s+day)\b/i,
            // "my birthday", "his graduation", "their anniversary"
            /\b(?:my|his|her|our|their|a|the)\s+(?:birthday|graduation|anniversary|wedding|holiday|vacation)\b/i,
            // Holiday patterns
            /\b(?:christmas|easter|thanksgiving|new\s+year|valentine|halloween)\b/i,
            // "company holiday", "national holiday", "federal holiday", "bank holiday"
            /\b(?:company|national|federal|bank)\s+holiday\b/i,
            // Family/social events
            /\b(?:family|class|high\s+school|college)\s+reunion\b/i,
            /\b(?:wedding|funeral|memorial)\s+(?:ceremony|service|party)\b/i,
            // Religious events
            /\b(?:hanukkah|passover|ramadan|eid|diwali|chinese\s+new\s+year|kwanzaa)\b/i,
            // Life events
            /\b(?:baptism|first\s+communion|bar\s+mitzvah|bat\s+mitzvah|confirmation)\b/i,
            /\b(?:engagement|bridal|baby|retirement|going\s+away|farewell|welcome)\s+party\b/i,
            // School/educational events
            /\b(?:prom|homecoming|dance|gala|ball|banquet)\b/i,
            // Sports/competitive events
            /\b(?:game\s+day|sports\s+day|championship|tournament|playoff|marathon|race\s+day)\b/i,
            // Recreational events
            /\b(?:movie|beach|pool|park|picnic|shopping|spa|relaxation|self\s+care)\s+day\b/i,
            // Work events
            /\b(?:training\s+day|orientation|retreat|team\s+building|company\s+outing)\b/i,
            /\b(?:conference|convention|summit|symposium|seminar|workshop)\b/i,
            // Travel events
            /\b(?:field\s+trip|excursion|trip|journey|travel\s+day|moving\s+day|relocation)\b/i,
            // Party/celebration events
            /\b(?:block\s+party|festival|carnival|fair|parade|open\s+house|house\s+party)\b/i,
            /\b(?:birthday\s+bash|celebration|festivities|holiday\s+celebration|holiday\s+party|office\s+party)\b/i,
            // Special occasions
            /\b(?:new\s+years\s+eve|new\s+years\s+day|new\s+year\s+party|countdown)\b/i,
            /\b(?:housewarming|dinner\s+party)\b/i
        ];
        
        // Check for automatic all-day (only for birthdays, graduations, anniversaries, holidays)
        let isAllDay = false;
        for (const pattern of autoAllDayPatterns) {
            if (pattern.test(textToCheck)) {
                isAllDay = true;
                break;
            }
        }
        
        // Also check if any auto all-day keywords are present without time indicators
        if (!isAllDay) {
            const hasAutoAllDayKeyword = autoAllDayKeywords.some(keyword => 
                textToCheck.includes(keyword)
            );
            // If we have an auto all-day keyword but no specific time mentioned, assume all-day
            const hasTimeIndicators = /\b\d{1,2}\s*(?:am|pm|:\d{2}|o'clock)\b/i.test(textToCheck) ||
                                     /\b(?:morning|afternoon|evening|night|noon|midnight)\b/i.test(textToCheck);
            if (hasAutoAllDayKeyword && !hasTimeIndicators) {
                isAllDay = true;
            }
        }
        
        // If explicit "all day" is mentioned, set to all-day
        if (explicitAllDay) {
            isAllDay = true;
        }
        
        // First, try to extract the action phrase using NLP patterns
        // This handles natural speech like "I need to go pick up the kids at 3pm"
        const actionPhrase = extractActionPhrase(originalTranscript || text);
        
        // Extract title - use a smarter approach to find the event name
        let title = actionPhrase || originalTranscript || text;
        
        // Extract and remove time ranges FIRST before cleaning title
        // This includes patterns like "12:00 - 1:30 pm", "from 12:30 pm to 1:30 pm", "twelve to two thirty pm", etc.
        const textToParse = (originalTranscript || text).toLowerCase();
        const timeRangePatterns = [
            // Pattern: "twelve to two thirty pm" (word numbers)
            /\b(?:at\s+)?(twelve|eleven|ten|nine|eight|seven|six|five|four|three|two|one)(?:\s+(?:and\s+)?(thirty|twenty|fifteen|ten|five))?\s*(am|pm)?\s+to\s+(twelve|eleven|ten|nine|eight|seven|six|five|four|three|two|one)(?:\s+(?:and\s+)?(thirty|twenty|fifteen|ten|five))?\s*(am|pm)/i,
            // Pattern: "12:00 - 1:30 pm" or "12:00-1:30 pm" (with dash/hyphen)
            /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
            // Pattern: "from 12:30 pm to 1:30 pm"
            /from\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+to\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
            // Pattern: "12:30 pm to 1:30 pm" or "12:30 to 1:30 pm"
            /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+to\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
            // Pattern: "between 12:30 pm and 1:30 pm"
            /between\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+and\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
        ];
        
        // Remove time ranges from title
        timeRangePatterns.forEach(pattern => {
            title = title.replace(pattern, '').trim();
        });
        
        // Remove date/time entities from title
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
            // Time patterns - more comprehensive to catch all time formats
            /\d{1,2}(?::\d{2})?\s*(?:am|pm|o'clock|a\.m\.|p\.m\.)/gi,
            // Time ranges with dash
            /\d{1,2}(?::\d{2})?\s*(?:am|pm)?\s*[-–—]\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)/gi,
            // Standalone am/pm that might be left over (after removing times)
            /\b(?:am|pm)\b/gi,
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
        
        // Remove "from", "to", "between", "and" when they appear near times (likely time range indicators)
        title = title.replace(/\b(?:from|to|between|and)\s+(?:the\s+)?\d{1,2}/gi, '').trim();
        
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
                // Only set default time if not an all-day event
                if (!isAllDay) {
                    targetDate.setHours(9, 0, 0, 0);
                }
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
                    // Look for day after the month name (textToParse is already lowercase)
                    const monthIndex = textToParse.indexOf(monthName) >= 0 
                        ? textToParse.indexOf(monthName)
                        : textToParse.indexOf(monthShort);
                    
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
        
        // Parse time range or single time using entities first, then fallback to text parsing
        let startTimeParsed = false;
        let endTimeParsed = false;
        let startTime = null;
        let endTime = null;
        
        // FIRST: Check for simple numeric time ranges (e.g., "1-5", "1-6", "2-4") - these override all-day
        const simpleTimeRangePattern = /\b(\d{1,2})\s*[-–—]\s*(\d{1,2})\b/i;
        const simpleRangeMatch = (originalTranscript || text).match(simpleTimeRangePattern);
        
        if (simpleRangeMatch) {
            const startHour = parseInt(simpleRangeMatch[1]);
            const endHour = parseInt(simpleRangeMatch[2]);
            // If both are reasonable hours (1-12 or 1-24), treat as time range and override all-day
            if (startHour >= 1 && startHour <= 24 && endHour >= 1 && endHour <= 24 && endHour > startHour) {
                // This is a time range, so override all-day
                isAllDay = false;
                // Set times (assume PM if hours are 1-12, otherwise use as-is)
                let startHours24 = startHour;
                let endHours24 = endHour;
                if (startHour <= 12) {
                    startHours24 = startHour === 12 ? 12 : startHour + 12; // Assume PM
                }
                if (endHour <= 12) {
                    endHours24 = endHour === 12 ? 12 : endHour + 12; // Assume PM
                }
                if (startHours24 >= 0 && startHours24 < 24 && endHours24 >= 0 && endHours24 < 24) {
                    startTime = { hours: startHours24, minutes: 0 };
                    endTime = { hours: endHours24, minutes: 0 };
                    startTimeParsed = true;
                    endTimeParsed = true;
                }
            }
        }
        
        // Try to parse time range from entities (multiple time entities = range)
        if (!startTimeParsed && !endTimeParsed && timeEntities.length >= 2) {
            // Two time entities - treat as start and end time
            const startTimeData = parseTimeFromEntity(timeEntities[0]);
            const endTimeData = parseTimeFromEntity(timeEntities[1]);
            
            if (startTimeData && startTimeData.hours !== undefined) {
                startTime = startTimeData;
                startTimeParsed = true;
            }
            if (endTimeData && endTimeData.hours !== undefined) {
                endTime = endTimeData;
                endTimeParsed = true;
            }
        } else if (!startTimeParsed && timeEntities.length === 1) {
            // Single time entity - just start time
            const timeData = parseTimeFromEntity(timeEntities[0]);
            if (timeData && timeData.hours !== undefined) {
                startTime = timeData;
                startTimeParsed = true;
                // If we have a time, it's not all-day
                isAllDay = false;
            }
        }
        
        // Also try to parse time range from text (e.g., "from 12:30 pm to 1:30 pm", "twelve to two thirty pm")
        if (!startTimeParsed || !endTimeParsed) {
            const textToParse = (originalTranscript || text).toLowerCase();
            
            // First try word number pattern (e.g., "twelve to two thirty pm")
            const wordNumberTimePattern = /\b(?:at\s+)?(twelve|eleven|ten|nine|eight|seven|six|five|four|three|two|one)(?:\s+(?:and\s+)?(thirty|twenty|fifteen|ten|five))?\s*(am|pm)?\s+to\s+(twelve|eleven|ten|nine|eight|seven|six|five|four|three|two|one)(?:\s+(?:and\s+)?(thirty|twenty|fifteen|ten|five))?\s*(am|pm)/i;
            const wordMatch = textToParse.match(wordNumberTimePattern);
            
            if (wordMatch) {
                // If we found a time range, override all-day
                isAllDay = false;
                // Extract word numbers and convert to numeric
                const startHourWord = wordMatch[1].toLowerCase();
                const startMinuteWord = wordMatch[2] ? wordMatch[2].toLowerCase() : null;
                let startPeriod = wordMatch[3] ? wordMatch[3].toLowerCase() : '';
                
                const endHourWord = wordMatch[4].toLowerCase();
                const endMinuteWord = wordMatch[5] ? wordMatch[5].toLowerCase() : null;
                const endPeriod = wordMatch[6] ? wordMatch[6].toLowerCase() : '';
                
                // Convert word numbers to numeric
                const startHours = wordToNumber(startHourWord);
                const startMinutes = startMinuteWord ? wordToNumber(startMinuteWord) : 0;
                const endHours = wordToNumber(endHourWord);
                const endMinutes = endMinuteWord ? wordToNumber(endMinuteWord) : 0;
                
                // If start period is missing but end has pm/am, infer start period from end period
                // This handles cases like "twelve to two thirty pm" -> "12:00 pm to 2:30 pm"
                if (!startPeriod && endPeriod) {
                    startPeriod = endPeriod;
                }
                
                if (startHours !== null && endHours !== null && startMinutes !== null && endMinutes !== null) {
                    // Convert to 24-hour format
                    let startHours24 = startHours;
                    if (startPeriod === 'pm' && startHours24 !== 12) startHours24 += 12;
                    if (startPeriod === 'am' && startHours24 === 12) startHours24 = 0;
                    
                    let endHours24 = endHours;
                    if (endPeriod === 'pm' && endHours24 !== 12) endHours24 += 12;
                    if (endPeriod === 'am' && endHours24 === 12) endHours24 = 0;
                    
                    // Validate and set
                    if (startHours24 >= 0 && startHours24 < 24 && startMinutes >= 0 && startMinutes < 60) {
                        startTime = { hours: startHours24, minutes: startMinutes };
                        startTimeParsed = true;
                    }
                    if (endHours24 >= 0 && endHours24 < 24 && endMinutes >= 0 && endMinutes < 60) {
                        endTime = { hours: endHours24, minutes: endMinutes };
                        endTimeParsed = true;
                    }
                }
            } else {
                // Fallback to numeric patterns
                const timeRangePatterns = [
                    // Pattern: "12:00 - 1:30 pm" or "12:00-1:30 pm" (with dash/hyphen)
                    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*[-–—]\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
                    // Pattern: "from 12:30 pm to 1:30 pm"
                    /from\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+to\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
                    // Pattern: "12:30 pm to 1:30 pm" or "12:30 to 1:30 pm" (start period optional)
                    /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+to\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
                    // Pattern: "between 12:30 pm and 1:30 pm"
                    /between\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+and\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i
                ];
                
                let rangeMatch = null;
                for (const pattern of timeRangePatterns) {
                    rangeMatch = textToParse.match(pattern);
                    if (rangeMatch) {
                        // If we found a time range, override all-day
                        isAllDay = false;
                        break;
                    }
                }
                
                if (rangeMatch) {
                    // All patterns have the same structure: groups 1=start_hour, 2=start_minutes, 3=start_period, 
                    // 4=end_hour, 5=end_minutes, 6=end_period
                    const startHours = parseInt(rangeMatch[1]);
                    const startMinutes = rangeMatch[2] ? parseInt(rangeMatch[2]) : 0;
                    let startPeriod = (rangeMatch[3] || '').toLowerCase();
                    
                    const endHours = parseInt(rangeMatch[4]);
                    const endMinutes = rangeMatch[5] ? parseInt(rangeMatch[5]) : 0;
                    let endPeriod = (rangeMatch[6] || '').toLowerCase();
                    
                    // If start period is missing but end has pm/am, infer start period from end period
                    // This handles cases like "12:00 to 1:30 pm" -> "12:00 pm to 2:30 pm"
                    if (!startPeriod && endPeriod) {
                        startPeriod = endPeriod;
                    }
                    
                    // Convert start time to 24-hour format
                    let startHours24 = startHours;
                    if (startPeriod === 'pm' && startHours24 !== 12) startHours24 += 12;
                    if (startPeriod === 'am' && startHours24 === 12) startHours24 = 0;
                    
                    // Convert end time to 24-hour format
                    let endHours24 = endHours;
                    if (endPeriod === 'pm' && endHours24 !== 12) endHours24 += 12;
                    if (endPeriod === 'am' && endHours24 === 12) endHours24 = 0;
                    
                    // Validate and set start time
                    if (startHours24 >= 0 && startHours24 < 24 && startMinutes >= 0 && startMinutes < 60) {
                        startTime = { hours: startHours24, minutes: startMinutes };
                        startTimeParsed = true;
                    }
                    
                    // Validate and set end time
                    if (endHours24 >= 0 && endHours24 < 24 && endMinutes >= 0 && endMinutes < 60) {
                        endTime = { hours: endHours24, minutes: endMinutes };
                        endTimeParsed = true;
                    }
                }
            }
        }
        
        // Apply start time if parsed (but skip if it's an all-day event)
        if (!isAllDay && startTimeParsed && startTime) {
            targetDate.setHours(startTime.hours, startTime.minutes || 0, 0, 0);
        } else if (!isAllDay && !startTimeParsed) {
            // Fallback to text parsing for single time - improved patterns for times like "8 am", "9 am", "10 pm"
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
                        startTimeParsed = true;
                        break;
                    }
                }
            }
        }
        
        // Calculate end time
        const endDate = new Date(targetDate);
        
        // If this is an all-day event (birthday, graduation, etc.), set to all-day times
        if (isAllDay) {
            // Set start to 00:00:00 of the target date
            targetDate.setHours(0, 0, 0, 0);
            // Set end to 23:59:59 of the target date
            endDate.setHours(23, 59, 59, 999);
        } else if (endTimeParsed && endTime) {
            // Use parsed end time
            endDate.setHours(endTime.hours, endTime.minutes || 0, 0, 0);
            // If end time is before start time, assume it's the next day
            if (endDate.getTime() < targetDate.getTime()) {
                endDate.setDate(endDate.getDate() + 1);
            }
        } else {
            // Default duration: 1 hour
            endDate.setHours(targetDate.getHours() + 1, targetDate.getMinutes(), 0, 0);
        }
        
        // Capitalize title before returning
        const capitalizedTitle = capitalizeTitle(title);
        
        return {
            type: 'createEvent',
            event: {
                title: capitalizedTitle,
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
                        // Check if it's an all-day event (start at 00:00:00 and end at 23:59:59 on same day)
                        const eventEnd = new Date(eventData.end);
                        const isAllDayEvent = eventDate.getHours() === 0 && eventDate.getMinutes() === 0 && 
                                             eventEnd.getHours() === 23 && eventEnd.getMinutes() === 59 && 
                                             eventDate.toDateString() === eventEnd.toDateString();
                        
                        if (isAllDayEvent) {
                            alert(`✓ Created all-day event: "${eventData.title}" on ${dateStr}`);
                        } else {
                            const timeStr = eventDate.toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true
                            });
                            alert(`✓ Created event: "${eventData.title}" on ${dateStr} at ${timeStr}`);
                        }
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
            <div className="day-structure-footer-center">
                <button 
                    className="day-structure-arrow-btn day-structure-arrow-left"
                    onClick={() => onNavigateDate && onNavigateDate(-1)}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor"/>
                    </svg>
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
                <button 
                    className="day-structure-arrow-btn day-structure-arrow-right"
                    onClick={() => onNavigateDate && onNavigateDate(1)}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor"/>
                    </svg>
                </button>
            </div>
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

