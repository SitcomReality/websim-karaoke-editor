// app/modules/ui/layout.js
// Handles sidebar state, main content padding, and overall layout adjustments.

import { elements } from './elements.js';

let isTimingEditorVisibleForLayout = false; // Keep track of editor state for padding calc

/**
 * Initializes layout-related functionalities like sidebar toggle and responsiveness.
 */
export function initLayout() {
    updateLayoutPadding(false); // Initial padding calculation

    // Sidebar toggle button: UX slide in/out
    if (elements.sidebar && elements.sidebarToggle) {
        elements.sidebarToggle.addEventListener('click', () => {
            const collapsed = elements.sidebar.classList.toggle('collapsed');
            handleSidebarStateForLayout(collapsed);
        });
    }

    // Responsive: Auto-collapse sidebar on small screens
    window.addEventListener('resize', handleResize);

    // Initial state based on screen width
    handleResize();
}

/**
 * Adjusts layout based on sidebar collapsed state.
 * @param {boolean} collapsed - Whether the sidebar is collapsed.
 */
export function handleSidebarStateForLayout(collapsed) {
    if (collapsed) {
        elements.mainContentFrame?.classList.add('sidebar-collapsed');
        elements.sidebarToggle?.setAttribute('aria-expanded', 'false');
    } else {
        elements.mainContentFrame?.classList.remove('sidebar-collapsed');
        elements.sidebarToggle?.setAttribute('aria-expanded', 'true');
    }
    // Update layout padding just in case (might affect footer position relative to content)
    updateLayoutPadding(isTimingEditorVisibleForLayout);
}

/**
 * Calculates and applies bottom padding to the main content area
 * to prevent it from being overlapped by the fixed footer.
 * @param {boolean} isEditorVisible - Whether the timing editor panel is currently visible.
 */
export function updateLayoutPadding(isEditorVisible) {
    isTimingEditorVisibleForLayout = isEditorVisible; // Update internal state for resize events

    const mainContent = elements.mainContentFrame;
    const footerTimingEditor = elements.footerTimingEditor;
    const footerControls = elements.footerControls;

    let totalFooterHeight = 0;
    if (footerControls) {
        totalFooterHeight += footerControls.offsetHeight;
    }
    // Only add timing editor height if it's actually visible and not display: none
    if (isEditorVisible && footerTimingEditor && getComputedStyle(footerTimingEditor).display !== 'none') {
        totalFooterHeight += footerTimingEditor.offsetHeight;
    }

    // Fallback minimum height calculation if offsetHeight isn't reliable yet
    if (totalFooterHeight < 80) {
        // Use CSS variable values or estimated fixed heights as fallback
        const controlsHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--footer-controls-height')) || 92;
        const editorHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--footer-timing-editor-height')) || 170;
        totalFooterHeight = isEditorVisible ? (editorHeight + controlsHeight) : controlsHeight;
    }


    if (mainContent) {
        // Add a small buffer (e.g., 10px) for safety
        mainContent.style.paddingBottom = (totalFooterHeight + 10) + 'px';
    }
}

/**
 * Handles window resize events for responsive layout adjustments.
 */
function handleResize() {
     // Auto-collapse sidebar on small screens
    const shouldCollapse = window.innerWidth < 800;
    if (elements.sidebar) {
        const isCurrentlyCollapsed = elements.sidebar.classList.contains('collapsed');
        if (shouldCollapse && !isCurrentlyCollapsed) {
            elements.sidebar.classList.add('collapsed');
            handleSidebarStateForLayout(true);
        } else if (!shouldCollapse && isCurrentlyCollapsed && window.innerWidth >= 800) {
             // Optional: Auto-expand sidebar when resizing back to larger screen?
             // elements.sidebar.classList.remove('collapsed');
             // handleSidebarStateForLayout(false);
             // For now, respect user's choice on larger screens, only force collapse on small.
             handleSidebarStateForLayout(isCurrentlyCollapsed); // Update layout based on current state
        } else {
             handleSidebarStateForLayout(isCurrentlyCollapsed); // Ensure layout is correct even if no change
        }
    }
     // Recalculate padding on resize as footer height might change (e.g., text wrap)
    updateLayoutPadding(isTimingEditorVisibleForLayout);
}