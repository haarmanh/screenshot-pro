/**
 * Help Page JavaScript
 */

// Initialize help page
document.addEventListener('DOMContentLoaded', initializeHelp);

function initializeHelp() {
    setupEventListeners();
    loadVersionInfo();
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Close button
    const closeBtn = document.getElementById('closeHelp');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeHelp);
    }
    
    // Report bug link
    const reportBugLink = document.getElementById('reportBugLink');
    if (reportBugLink) {
        reportBugLink.addEventListener('click', (e) => {
            e.preventDefault();
            openBugReport();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    
    // Smooth scrolling for internal links
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboard(event) {
    switch (event.key) {
        case 'Escape':
            closeHelp();
            event.preventDefault();
            break;
        case 'F1':
            // Prevent default F1 help
            event.preventDefault();
            break;
    }
}

/**
 * Close help page
 */
function closeHelp() {
    try {
        // Try to go back in browser history
        if (window.history.length > 1) {
            window.history.back();
        } else {
            // If no history, close the tab
            window.close();
        }
    } catch (error) {
        console.log('Could not navigate back, closing tab');
        window.close();
    }
}

/**
 * Open bug report
 */
function openBugReport() {
    try {
        // Send message to background script to open bug report
        chrome.runtime.sendMessage({
            action: 'reportBug',
            data: {
                source: 'help_page',
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Could not open bug report:', error);
        // Fallback: show alert with instructions
        alert('To report a bug:\n1. Open the extension popup\n2. Click "Report Bug"\n3. Fill out the form with details');
    }
}

/**
 * Load version information
 */
function loadVersionInfo() {
    try {
        // Get manifest version
        const manifestData = chrome.runtime.getManifest();
        if (manifestData && manifestData.version) {
            const versionElement = document.querySelector('.help-footer p');
            if (versionElement) {
                versionElement.innerHTML = versionElement.innerHTML.replace(
                    'v1.0.0', 
                    `v${manifestData.version}`
                );
            }
        }
    } catch (error) {
        console.log('Could not load version info:', error);
    }
}

/**
 * Utility function to highlight search terms
 */
function highlightSearchTerm(term) {
    if (!term || term.length < 2) return;
    
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    const textNodes = [];
    let node;
    
    while (node = walker.nextNode()) {
        textNodes.push(node);
    }
    
    textNodes.forEach(textNode => {
        const parent = textNode.parentNode;
        if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return;
        
        const text = textNode.textContent;
        const regex = new RegExp(`(${term})`, 'gi');
        
        if (regex.test(text)) {
            const highlightedText = text.replace(regex, '<mark>$1</mark>');
            const wrapper = document.createElement('span');
            wrapper.innerHTML = highlightedText;
            parent.replaceChild(wrapper, textNode);
        }
    });
}

/**
 * Add search functionality (if needed in future)
 */
function addSearchFunctionality() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search help...';
    searchInput.className = 'help-search';
    
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.trim();
        // Clear previous highlights
        document.querySelectorAll('mark').forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
        
        // Highlight new term
        if (term) {
            highlightSearchTerm(term);
        }
    });
    
    // Add to header if desired
    // const header = document.querySelector('.help-header');
    // if (header) {
    //     header.appendChild(searchInput);
    // }
}

// Export functions for potential use by other scripts
window.helpPageUtils = {
    closeHelp,
    openBugReport,
    highlightSearchTerm
};
