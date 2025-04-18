// app/modules/ui/lyricsDisplay.js
// Handles rendering lyrics, highlighting, and scrolling the lyrics container.

import { elements } from './elements.js';
import { formatTime } from '../ui.js'; // Corrected import path via facade

/**
 * Renders the lyrics lines in the designated list element.
 * @param {Array} lyrics - Array of lyric objects ({text, start, end}).
 * @param {boolean} showTimes - Whether to display timing information next to lyrics.
 * @param {function} [onTimeFieldClick] - Optional callback for when a time field is clicked.
 */
export function displayLyrics(lyrics, showTimes, onTimeFieldClick) {
    const ul = elements.lyricsList;
    if (!ul) return;
    ul.innerHTML = ''; // Clear previous lyrics

    if (!lyrics || !lyrics.length) {
        const li = document.createElement('li');
        li.textContent = 'No lyrics available.';
        li.className = 'placeholder';
        ul.appendChild(li);
        return;
    }

    ul.classList.toggle('show-times', showTimes);

    lyrics.forEach((line, idx) => {
        const li = document.createElement('li');
        li.dataset.idx = idx;

        if (showTimes) {
            const timeSpan = document.createElement('span');
            timeSpan.className = 'lyric-time-field';
            timeSpan.textContent = formatLineTimes(line); // Use local formatter

            if (typeof onTimeFieldClick === 'function') {
                timeSpan.title = 'Click to edit timing';
                // Use event delegation on the parent ul if performance becomes an issue
                timeSpan.addEventListener('click', (evt) => {
                    evt.stopPropagation(); // Prevent lyric line selection when clicking time
                    onTimeFieldClick(evt);
                });
            }
            li.appendChild(timeSpan);
        }

        const textSpan = document.createElement('span');
        textSpan.className = 'lyric-line-text';
        textSpan.textContent = line.text || '';
        textSpan.style.pointerEvents = 'auto'; // Ensure text part is clickable for selection
        li.appendChild(textSpan);

        ul.appendChild(li);
    });
}

/**
 * Clears any 'current' or 'editing' classes from lyric lines.
 */
export function clearActiveLyric() {
    if (!elements.lyricsList) return;
    Array.from(elements.lyricsList.children).forEach(li => {
        li.classList.remove('current', 'editing');
    });
}

/**
 * Highlights a specific lyric line based on its index.
 * @param {number|null} idx - The index of the lyric line to highlight, or null to clear.
 */
export function highlightLyric(idx) {
    if (!elements.lyricsList) return;
    const lis = elements.lyricsList.children;
    let targetLi = null;

    for (let i = 0; i < lis.length; i++) {
        const elementIdx = lis[i].dataset.idx ? parseInt(lis[i].dataset.idx, 10) : -1;
        const isCurrent = elementIdx === idx;
        if (lis[i].classList.contains('current') !== isCurrent) {
            lis[i].classList.toggle('current', isCurrent);
        }
        if (isCurrent) {
            targetLi = lis[i];
        }
    }

    // Scroll the highlighted line into view
    if (targetLi) {
        scrollLyricIntoView(targetLi);
    }
}

/**
 * Highlights a specific lyric line to indicate it's selected for editing.
 * @param {number|null} idx - The index of the lyric line to mark as editing, or null to clear.
 */
export function highlightEditingLine(idx) {
    if (!elements.lyricsList) return;
    const lis = elements.lyricsList.children;
    let targetLi = null;

    Array.from(lis).forEach(li => {
        const elementIdx = li.dataset.idx ? parseInt(li.dataset.idx, 10) : -1;
        const isEditing = elementIdx === idx;
        li.classList.toggle('editing', isEditing);
        if (isEditing) {
             targetLi = li;
        }
    });

     // Scroll the editing line into view if needed
     if (targetLi) {
        scrollLyricIntoView(targetLi);
     }
}

/**
 * Scrolls the lyrics container to bring a specific list item into view, aiming for the center.
 * @param {HTMLElement} li - The list item element to scroll to.
 */
function scrollLyricIntoView(li) {
    const container = elements.lyricsContainer;
    if (!li || !container) return;

    const containerRect = container.getBoundingClientRect();
    const liRect = li.getBoundingClientRect();

    // Calculate required scroll adjustment to center the item
    // Center of container = containerRect.top + container.clientHeight / 2
    // Center of list item = liRect.top + li.offsetHeight / 2
    // Desired scroll top = currentScrollTop + (liCenter - containerCenter)
    const desiredScrollTop = container.scrollTop + (liRect.top - containerRect.top) - (container.clientHeight / 2) + (li.offsetHeight / 2);

    // Clamp desired scrollTop between 0 and maximum scroll
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const clampedScrollTop = Math.max(0, Math.min(desiredScrollTop, maxScrollTop));

    // Only scroll if the element is outside the viewport or significantly off-center
    const isAbove = liRect.top < containerRect.top;
    const isBelow = liRect.bottom > containerRect.bottom;
    const centerDiff = Math.abs((liRect.top + li.offsetHeight / 2) - (containerRect.top + container.clientHeight / 2));

    // Thresholds to trigger scroll (e.g., outside view or more than 50px off-center)
    if (isAbove || isBelow || centerDiff > 50) {
        container.scrollTo({
            top: clampedScrollTop,
            behavior: 'smooth'
        });
    }
}

/**
 * Formats the start and end times of a lyric line for display.
 * @param {object} line - Lyric object ({start, end}).
 * @returns {string} Formatted time string like "[MM:SS - MM:SS]" or "[--:--]".
 */
function formatLineTimes(line) {
    if (!line) return '[--:--]';
    const startStr = formatTime(line.start); // Use imported formatTime
    const endStr = formatTime(line.end); // Use imported formatTime

    if (startStr !== '--:--') {
        if (endStr !== '--:--') {
            return `[${startStr} - ${endStr}]`;
        }
        return `[${startStr}]`; // Show only start if end is missing
    }
    return '[--:--]'; // No valid times
}