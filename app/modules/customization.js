// app/modules/customization.js

let applyThemeCb = null;
let UI = null; // Store reference to UI module

export function init(dependencies) {
    applyThemeCb = dependencies.applyThemeCb;
    UI = dependencies.UI; // Store UI reference
}

export function extractAndApplyColors(imageUrl, autoApply = false) {
    // Ensure UI is available
    if (!UI) {
        console.error("Customization module requires UI module dependency.");
        return;
    }
    import('color-thief-browser').then(ColorThief => {
        const img = document.createElement('img');
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = function() {
            try {
                const ct = new ColorThief.default();
                const palette = ct.getPalette(img, 4);
                const [c1, c2, c3, c4] = palette;
                const rgbToHex = (rgb) => '#' + rgb.map(x => {
                    const hex = x.toString(16);
                    return hex.length === 1 ? '0' + hex : hex;
                }).join('');

                // Convert palette to hex strings for color inputs
                const theme = {
                    background: rgbToHex(c1),
                    text: rgbToHex(c4),
                    highlightBg: rgbToHex(c2),
                    highlightText: rgbToHex(c3),
                };

                if (autoApply && applyThemeCb) {
                    // Let the callback handle applying + saving + updating UI
                    applyThemeCb(theme);
                } else if (autoApply) {
                    // Directly apply and update UI if no callback (e.g., during initial load)
                    applyTheme(theme);
                } else {
                    // If not auto-applying, just update the inputs for preview
                    UI.updateThemeInputs(theme);
                }
            } catch (error) {
                console.error("Error extracting colors:", error);
                alert("Could not extract colors from the image. It might be too complex or inaccessible.");
            }
        };
        img.onerror = function() {
            console.error("Error loading image for color extraction.");
            alert("Could not load the image to extract colors.");
        }
    }).catch(error => {
        console.error("Failed to load ColorThief module:", error);
        alert("Color extraction library failed to load.");
    });
}

export function resetThemeToDefault() {
    const defaultTheme = getDefaultTheme();
    if (applyThemeCb) {
        applyThemeCb(defaultTheme); // This will call applyTheme internally which updates inputs
    } else {
        applyTheme(defaultTheme); // Directly apply and update UI if no callback
    }
}

export function getDefaultTheme() {
    // Return hex values for consistency with color pickers
    return {
        background: '#f0f0f0',
        text: '#333333', 
        highlightBg: '#ffff99',
        highlightText: '#000000' 
    };
}

function setThemeCSS(theme) {
    // Ensure theme object has valid colors, fallback if necessary
    const safeTheme = { ...getDefaultTheme(), ...theme };
    document.documentElement.style.setProperty('--background-color', safeTheme.background);
    document.documentElement.style.setProperty('--text-color', safeTheme.text);
    document.documentElement.style.setProperty('--highlight-bg-color', safeTheme.highlightBg);
    document.documentElement.style.setProperty('--highlight-text-color', safeTheme.highlightText);
}

/**
 * Applies the theme by setting CSS variables and updating UI inputs.
 * @param {object} theme - The theme object.
 */
export function applyTheme(theme) {
    // Ensure UI is available
    if (!UI) {
        console.error("Customization module requires UI module dependency for applyTheme.");
        return;
    }
    const themeToApply = theme || getDefaultTheme(); // Use default if theme is null/undefined
    setThemeCSS(themeToApply);
    UI.updateThemeInputs(themeToApply); // Update color input fields
}