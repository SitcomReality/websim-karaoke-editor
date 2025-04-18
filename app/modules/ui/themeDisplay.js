// app/modules/ui/themeDisplay.js
// Handles updating theme-related UI elements like color pickers.

import { elements } from './elements.js';

/**
 * Updates the values of the color input elements based on a theme object.
 * @param {object} theme - The theme object containing color properties
 *                        (background, text, highlightBg, highlightText).
 */
export function updateThemeInputs(theme) {
    if (!theme) return; // Don't try to update if no theme is provided

    // Use provided theme colors or fall back to defaults if a color is missing
    if (elements.colorBgInput) elements.colorBgInput.value = theme.background || '#f0f0f0';
    if (elements.colorTextInput) elements.colorTextInput.value = theme.text || '#333333';
    if (elements.colorHighlightBgInput) elements.colorHighlightBgInput.value = theme.highlightBg || '#ffff99';
    if (elements.colorHighlightTextInput) elements.colorHighlightTextInput.value = theme.highlightText || '#000000';
}