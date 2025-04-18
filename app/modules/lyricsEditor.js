// app/modules/lyricsEditor.js

// Removed getAudioTimeCb, it's not used here
let onTimingChangeCb;
let editorEnabled = false;
let currentLineIdx = null; // Index of the line currently selected for editing
let lyrics = []; // The lyrics array with timing
let UI; // To update timing fields and editing state

export function init(dependencies) {
    // getAudioTimeCb = dependencies.getAudioTime; // Not needed here
    onTimingChangeCb = dependencies.onTimingChange;
    UI = dependencies.UI; // Need UI to update fields & highlight editing line
}

export function parseLyrics(raw, filenameHint) {
    const linesArr = [];
    const linesRaw = raw.split(/\r?\n/).filter(l => l.trim() !== '');
    const lrcPattern = /^\[(\d{1,2}):([\d.]+)](.*)$/;
    // More robust check for LRC: Presence of any valid time tag
    let isLRC = linesRaw.some(l => lrcPattern.test(l.trim()));

    linesRaw.forEach(line => {
        const trimmedLine = line.trim();
        if (isLRC) {
            const m = lrcPattern.exec(trimmedLine);
            if (m) {
                // Handle potential multiple time tags per line (common in LRC)
                // For simplicity, we take the first tag. Advanced LRC might handle differently.
                const time = parseFloat(m[1]) * 60 + parseFloat(m[2]);
                const text = m[3].trim();
                // Avoid adding lines that are only time tags
                if (text) {
                     linesArr.push({
                        text: text,
                        start: time,
                        end: null // LRC usually only defines start
                    });
                }
            } else if (trimmedLine && !trimmedLine.startsWith('[')) {
                // Keep non-timed lines in LRC files if they exist and aren't metadata
                 linesArr.push({ text: trimmedLine, start: null, end: null });
            }
        } else {
            // Plain text file
            linesArr.push({ text: trimmedLine, start: null, end: null });
        }
    });

    // Post-process LRC: Try to infer end times based on next start time
    if (isLRC) {
        for (let i = 0; i < linesArr.length; i++) {
            if (typeof linesArr[i].start === 'number' && linesArr[i].end === null) {
                 if (i + 1 < linesArr.length && typeof linesArr[i+1].start === 'number') {
                     // Set end time slightly before the next line starts
                     // Ensure end is strictly greater than start
                     const potentialEnd = linesArr[i+1].start - 0.01;
                     linesArr[i].end = Math.max(linesArr[i].start + 0.01, potentialEnd);
                 } else {
                     // If it's the last timed line, give it a default duration (e.g., 5 seconds)
                     // Or leave end as null? Leaving as null might be better. Let user set it.
                     // lyrics[i].end = lyrics[i].start + 5.0;
                 }
            }
        }
    }

    // lyrics = linesArr; // Don't set global lyrics here, return it
    return linesArr;
}

export function setLyrics(lyricArr) {
    lyrics = lyricArr || [];
    clearEditorSelection(); // Clear selection when new lyrics are set
}

export function getLyrics() {
    // Return a copy to prevent accidental direct modification from outside
    return lyrics.map(line => ({ ...line }));
}

// Returns data for a specific line, or null if index is invalid
export function getLineData(idx) {
    if (idx === null || idx < 0 || idx >= lyrics.length) {
        return null;
    }
    // Return a copy
    return { ...lyrics[idx] };
}

// Finds the line that should be highlighted during *playback*
export function findLineForTime(currentTime) {
    if (!lyrics || lyrics.length === 0) return null;
    let activeIdx = null;
    for (let i = 0; i < lyrics.length; i++) {
        const line = lyrics[i];
        // A line is active if time is between its start and end
        // Be inclusive of start time, exclusive of end time.
        if (typeof line.start === 'number' && typeof line.end === 'number') {
            if (currentTime >= line.start && currentTime < line.end) {
                activeIdx = i;
                break;
            }
        }
        // Handle lines with start but no end (e.g. end of song, or untimed LRC)
        // Highlight if current time is past start, and it's the last *timed* line
        // Or if the next line hasn't started yet.
        else if (typeof line.start === 'number' && line.end === null) {
            // Find the start time of the next line that *has* a start time
            let nextLineStartTime = Infinity;
            for (let j = i + 1; j < lyrics.length; j++) {
                if (typeof lyrics[j].start === 'number') {
                    nextLineStartTime = lyrics[j].start;
                    break;
                }
            }
             if (currentTime >= line.start && currentTime < nextLineStartTime) {
                  activeIdx = i;
                  break;
             }
        }
    }
    return activeIdx;
}

export function enableEditing() {
    if (!editorEnabled) {
        editorEnabled = true;
        // Ensure the listener is attached to the correct, persistent element
        const lyricsListElement = document.getElementById('lyrics-list');
        if (lyricsListElement) {
            lyricsListElement.addEventListener('click', onLyricClick);
        } else {
            console.error("Could not find lyrics list element to attach listener.");
        }
    }
}

export function disableEditing() {
    if (editorEnabled) {
        editorEnabled = false;
         const lyricsListElement = document.getElementById('lyrics-list');
         if (lyricsListElement) {
            lyricsListElement.removeEventListener('click', onLyricClick);
         }
        clearEditorSelection();
    }
}

// Bound listener for lyric line clicks (when editor enabled)
function onLyricClick(e) {
    if (!editorEnabled) return;
    const li = e.target.closest('li');
    // Only select if it's a valid lyric line (not placeholder)
    if (li && !li.classList.contains('placeholder') && typeof li.dataset.idx !== 'undefined') {
         // Check if the click was specifically on the time field (handled by onLyricTimeFieldClick in TimingEditorController)
        if (!e.target.classList.contains('lyric-time-field')) {
            selectEditorLine(parseInt(li.dataset.idx, 10));
        }
    }
}

// Selects a line specifically for timing editing
function selectEditorLine(idx) {
    if (idx < 0 || idx >= lyrics.length) {
        clearEditorSelection();
        return;
    }
    currentLineIdx = idx;
    // Update visual styles via UI module
    UI.highlightEditingLine(idx);
    // Update the timing editor display fields
    UI.updateTimingEditorFields(idx, lyrics[idx]);
}

// Clears the timing editor selection state
function clearEditorSelection() {
    const previousIdx = currentLineIdx;
    currentLineIdx = null;
    if (previousIdx !== null && UI) {
         UI.highlightEditingLine(null); // Use UI function to clear class
    }
    if (UI) {
        UI.updateTimingEditorFields(null); // Clear fields
    }
}

export function updateEditorTarget(idx) {
    if (idx === null || idx < 0 || idx >= lyrics.length) {
        clearEditorSelection();
    } else {
        selectEditorLine(idx);
    }
}

export function getCurrentEditorLineIdx() {
    return currentLineIdx;
}

// Timing editing controls

export function setCurrentLineStart(time) {
    if (currentLineIdx === null || !lyrics[currentLineIdx]) return false;
    const line = lyrics[currentLineIdx];
    const nextStart = (currentLineIdx < lyrics.length - 1 && typeof lyrics[currentLineIdx + 1].start === 'number')
        ? lyrics[currentLineIdx + 1].start : Infinity; // Use Infinity if no next start

    let newStart = sanitizeTime(time);
    if (newStart === null) return false; // Invalid time input

    // Constraint: Start time cannot be after its own end time (if end exists)
    if (typeof line.end === 'number' && newStart >= line.end) {
        newStart = Math.max(0, line.end - 0.01); // Set slightly before end, ensure non-negative
    }
     // Constraint: Start time cannot be negative
    if (newStart < 0) {
        newStart = 0;
    }

    line.start = newStart;

    // If end doesn't exist or is now before start, set a default end (e.g., start + 1s)
    // But ensure default end doesn't exceed next line's start
    if (typeof line.end !== 'number' || line.end <= line.start) {
        line.end = Math.min(line.start + 1.0, nextStart - 0.01);
        // Make sure end is still greater than start after potential Math.min adjustment
        if (line.end <= line.start) {
            line.end = line.start + 0.01;
        }
    }

    propagateTimingUpdate();
    return true; // Return true upon success
}

export function setCurrentLineEnd(time) {
    if (currentLineIdx === null || !lyrics[currentLineIdx]) return false;
    const line = lyrics[currentLineIdx];
    const nextStart = (currentLineIdx < lyrics.length - 1 && typeof lyrics[currentLineIdx + 1].start === 'number')
        ? lyrics[currentLineIdx + 1].start : Infinity;

    let newEnd = sanitizeTime(time);
    if (newEnd === null) return false; // Invalid time input

    // Ensure start time exists before setting end time
    if (typeof line.start !== 'number') {
        // Maybe set start to 0 or prompt user? For now, do nothing.
        console.warn("Cannot set end time when start time is not set.");
        // Or maybe set start = newEnd - 1.0?
        // line.start = Math.max(0, newEnd - 1.0);
        // propagateTimingUpdate(); // Need to update start first
        // return;
        // Alternative: Set start time to 0 if not set
        line.start = 0;
    }

    // Constraint: End time must be after start time
    if (newEnd <= line.start) {
        newEnd = line.start + 0.01; // Set slightly after start
    }

    // Constraint: End time cannot be after the start of the next line
    if (newEnd >= nextStart) {
        newEnd = nextStart - 0.01; // Set slightly before next start
        // Ensure it's still after the current start after adjustment
        if (newEnd <= line.start) {
             newEnd = line.start + 0.01;
        }
    }

    line.end = newEnd;

    // Optional: Auto-set start of next line? (Original code had this, but can be disruptive)
    // if (currentLineIdx < lyrics.length - 1) {
    //     if (lyrics[currentLineIdx + 1].start === null || lyrics[currentLineIdx + 1].start < newEnd) {
    //         lyrics[currentLineIdx + 1].start = newEnd;
    //     }
    // }

    propagateTimingUpdate();
    return true; // Return true upon success
}

/**
 * Set both start and end times for a specific lyric line.
 * Constrain to avoid overlap with next line.
 */
export function setLineTimes(idx, start, end) {
    if (idx < 0 || idx >= lyrics.length || !lyrics[idx]) return false;
    const line = lyrics[idx];
    // const prevEnd = idx > 0 && typeof lyrics[idx - 1].end === 'number' ? lyrics[idx - 1].end : undefined; // Not strictly needed for constraints here
    const nextStart = idx < lyrics.length - 1 && typeof lyrics[idx + 1].start === 'number' ? lyrics[idx + 1].start : Infinity;

    let newStart = sanitizeTime(start);
    let newEnd = sanitizeTime(end);

    // Handle null/invalid inputs gracefully
    if (newStart === null) {
        line.start = null;
        line.end = null; // If start is cleared, clear end too
        propagateTimingUpdate();
        return true; // Return true upon success
    }

    // Ensure start is non-negative
     if (newStart < 0) newStart = 0;

    // If end is provided and valid
    if (newEnd !== null) {
        // Ensure end > start
        if (newEnd <= newStart) {
            newEnd = newStart + 0.01;
        }
        // Ensure end < nextStart
        if (newEnd >= nextStart) {
            newEnd = nextStart - 0.01;
             // Re-check end > start after adjustment
             if (newEnd <= newStart) {
                 newEnd = newStart + 0.01;
             }
        }
    } else {
        // End is null/invalid, derive a default end if possible
        newEnd = Math.min(newStart + 1.0, nextStart - 0.01);
        if (newEnd <= newStart) {
             newEnd = newStart + 0.01;
        }
    }

    line.start = newStart;
    line.end = newEnd;

    propagateTimingUpdate();
    return true; // Return true upon success
}

export function nudgeCurrentLineStart(delta) {
    if (currentLineIdx === null || !lyrics[currentLineIdx]) return false;
    const line = lyrics[currentLineIdx];
    // Requires start time to exist
    if (typeof line.start !== 'number') return false;

    let newStart = sanitizeTime(line.start + delta);
    if (newStart === null) return false;

    // Constraint: Cannot be < 0
    if (newStart < 0) newStart = 0;

    // Constraint: Cannot be >= end time (if end exists)
    if (typeof line.end === 'number' && newStart >= line.end) {
        newStart = line.end - 0.01;
    }

    line.start = newStart;
    propagateTimingUpdate();
    return true; // Return true upon success
}

export function nudgeCurrentLineEnd(delta) {
    if (currentLineIdx === null || !lyrics[currentLineIdx]) return false;
    const line = lyrics[currentLineIdx];
    // Requires end time to exist (or derive from start if nudging)
    let currentEnd = line.end;
    if (typeof currentEnd !== 'number') {
         if (typeof line.start === 'number') {
             // If end doesn't exist, but start does, base nudge on start + 1s default
             currentEnd = line.start + 1.0;
         } else {
             // Cannot nudge end if neither start nor end exists
             return false;
         }
    }

    let newEnd = sanitizeTime(currentEnd + delta);
     if (newEnd === null) return false;

    // Constraint: Must be > start time
    if (typeof line.start === 'number' && newEnd <= line.start) {
        newEnd = line.start + 0.01;
    } else if (typeof line.start !== 'number' && newEnd <= 0) {
        // If start doesn't exist, ensure end is at least slightly positive
        newEnd = 0.01;
    }

    // Constraint: Cannot be >= next line's start time
    const nextStart = (currentLineIdx < lyrics.length - 1 && typeof lyrics[currentLineIdx + 1].start === 'number')
        ? lyrics[currentLineIdx + 1].start : Infinity;
    if (newEnd >= nextStart) {
        newEnd = nextStart - 0.01;
         // Re-check against start time after adjustment
        if (typeof line.start === 'number' && newEnd <= line.start) {
            newEnd = line.start + 0.01;
        } else if (typeof line.start !== 'number' && newEnd <= 0) {
            newEnd = 0.01;
        }
    }

    line.end = newEnd;
    propagateTimingUpdate();
    return true; // Return true upon success
}

export function clearCurrentLineTimes() {
    if (currentLineIdx === null || !lyrics[currentLineIdx]) return false;
    lyrics[currentLineIdx].start = null;
    lyrics[currentLineIdx].end = null;
    propagateTimingUpdate();
    return true; // Return true upon success
}

// For displaying time in min:sec format
export function formatTime(val) {
    if (val == null || isNaN(val)) return '--:--';
    const min = Math.floor(val / 60);
    const sec = Math.floor(val % 60);
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

// Timing change notification for storage/UI
function propagateTimingUpdate() {
    // Save/notify as appropriate
    if (onTimingChangeCb) onTimingChangeCb(lyrics.slice());
    // Also update the time fields for the currently selected line
    UI.updateTimingEditorFields(currentLineIdx, lyrics[currentLineIdx]);
}

function sanitizeTime(val) {
    let num = Number(val);
    if (!isFinite(num) || isNaN(num)) return null;
    if (num < 0) num = 0;
    return num;
}