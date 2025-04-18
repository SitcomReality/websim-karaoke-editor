// app/modules/customization.js

let applyThemeCb = null;

export function init(applyTheme) {
    applyThemeCb = applyTheme;
}

export function extractAndApplyColors(imageUrl, autoApply = false) {
    import('color-thief-browser').then(ColorThief => {
        const img = document.createElement('img');
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = function() {
            const ct = new ColorThief.default();
            const palette = ct.getPalette(img, 4);
            const [c1, c2, c3, c4] = palette;
            const rgbStr = arr => `rgb(${arr.join(',')})`;
            const theme = {
                background: rgbStr(c1),
                text: rgbStr(c4),
                highlightBg: rgbStr(c2),
                highlightText: rgbStr(c3),
            };
            if (autoApply) {
                setTheme(theme);
                if (applyThemeCb) applyThemeCb(theme);
            }
        };
    });
}

export function resetThemeToDefault() {
    setTheme(getDefaultTheme());
    if (applyThemeCb) applyThemeCb(getDefaultTheme());
}

export function getDefaultTheme() {
    return {
        background: '#f0f0f0',
        text: '#333',
        highlightBg: '#ffff99',
        highlightText: '#000'
    };
}

function setTheme(theme) {
    document.documentElement.style.setProperty('--background-color', theme.background);
    document.documentElement.style.setProperty('--text-color', theme.text);
    document.documentElement.style.setProperty('--highlight-bg-color', theme.highlightBg);
    document.documentElement.style.setProperty('--highlight-text-color', theme.highlightText);
}
export function applyTheme(theme) {
    setTheme(theme);
}

