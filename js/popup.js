/**
 * Popup Script for Screenshot Pro Extension
 * Handles popup UI interactions and communication with background script
 */

// DOM elements
let takeScreenshotBtn, formatSelect, qualitySelect, openSettingsBtn, openHelpBtn, reportBugBtn, statusDiv;

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePopup);

/**
 * Initialize popup interface
 */
async function initializePopup() {
    console.log('Initializing popup');
    
    // Get DOM elements
    takeScreenshotBtn = document.getElementById('takeScreenshot');
    formatSelect = document.getElementById('format');
    qualitySelect = document.getElementById('quality');
    openSettingsBtn = document.getElementById('openSettings');
    openHelpBtn = document.getElementById('openHelp');
    reportBugBtn = document.getElementById('reportBug');
    statusDiv = document.getElementById('status');
    
    // Set up event listeners
    setupEventListeners();
    
    // Load user settings
    await loadSettings();
    
    // Check if we can take screenshots on current tab
    await checkTabPermissions();
}

/**
 * Set up event listeners for popup elements
 */
function setupEventListeners() {
    // Main screenshot button
    takeScreenshotBtn.addEventListener('click', handleTakeScreenshot);
    
    // Settings button
    openSettingsBtn.addEventListener('click', openSettings);

    // Help button
    if (openHelpBtn) {
        openHelpBtn.addEventListener('click', openHelp);
    }

    // Bug report button
    reportBugBtn.addEventListener('click', openBugReport);
    
    // Format and quality change handlers
    formatSelect.addEventListener('change', saveQuickSettings);
    qualitySelect.addEventListener('change', saveQuickSettings);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Handle take screenshot button click
 */
async function handleTakeScreenshot() {
    try {
        showStatus('Taking screenshot...', 'info');
        takeScreenshotBtn.disabled = true;
        
        // Get current settings
        const options = {
            defaultFormat: formatSelect.value,
            defaultQuality: qualitySelect.value
        };
        
        // Send message to background script
        const response = await sendMessage({
            action: 'takeScreenshot',
            options: options
        });
        
        if (response.success) {
            showStatus('Screenshot captured successfully!', 'success');
            
            // Close popup after short delay
            setTimeout(() => {
                window.close();
            }, 1000);
        } else {
            throw new Error(response.error || 'Screenshot failed');
        }
        
    } catch (error) {
        console.error('Screenshot error:', error);
        showStatus(`Error: ${error.message}`, 'error');
    } finally {
        takeScreenshotBtn.disabled = false;
    }
}

/**
 * Open settings page
 */
function openSettings() {
    chrome.runtime.openOptionsPage();
    window.close();
}

/**
 * Open help page
 */
function openHelp() {
    const helpUrl = chrome.runtime.getURL('help.html');
    chrome.tabs.create({ url: helpUrl });
    window.close();
}

/**
 * Open bug report dialog
 */
async function openBugReport() {
    try {
        // Collect system information
        const systemInfo = await collectSystemInfo();
        
        // Create bug report data
        const bugReportData = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            extensionVersion: chrome.runtime.getManifest().version,
            systemInfo: systemInfo,
            currentUrl: await getCurrentTabUrl(),
            logs: await getRecentLogs()
        };
        
        // Send bug report
        const response = await sendMessage({
            action: 'reportBug',
            data: bugReportData
        });
        
        if (response.success) {
            showStatus('Bug report submitted. Thank you!', 'success');
        } else {
            throw new Error(response.error || 'Failed to submit bug report');
        }
        
    } catch (error) {
        console.error('Bug report error:', error);
        showStatus(`Error submitting report: ${error.message}`, 'error');
    }
}

/**
 * Handle keyboard shortcuts in popup
 */
function handleKeyboardShortcuts(event) {
    // Enter key on take screenshot button
    if (event.key === 'Enter' && document.activeElement === takeScreenshotBtn) {
        handleTakeScreenshot();
    }
    
    // Escape key to close popup
    if (event.key === 'Escape') {
        window.close();
    }
}

/**
 * Load user settings and update UI
 */
async function loadSettings() {
    try {
        const response = await sendMessage({ action: 'getSettings' });
        
        if (response.success) {
            const settings = response.data;
            
            // Update format select
            if (settings.defaultFormat) {
                formatSelect.value = settings.defaultFormat;
            }
            
            // Update quality select
            if (settings.defaultQuality) {
                qualitySelect.value = settings.defaultQuality;
            }
        }
        
    } catch (error) {
        console.error('Failed to load settings:', error);
    }
}

/**
 * Save quick settings when changed
 */
async function saveQuickSettings() {
    try {
        const settings = {
            defaultFormat: formatSelect.value,
            defaultQuality: qualitySelect.value
        };
        
        await sendMessage({
            action: 'saveSettings',
            settings: settings
        });
        
    } catch (error) {
        console.error('Failed to save quick settings:', error);
    }
}

/**
 * Check if we have permissions for current tab
 */
async function checkTabPermissions() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            showStatus('No active tab found', 'error');
            takeScreenshotBtn.disabled = true;
            return;
        }
        
        // Check if tab URL is supported
        const url = tab.url;
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || 
            url.startsWith('edge://') || url.startsWith('about:')) {
            showStatus('Screenshots not supported on this page', 'error');
            takeScreenshotBtn.disabled = true;
            return;
        }
        
        // Tab is supported
        takeScreenshotBtn.disabled = false;
        
    } catch (error) {
        console.error('Permission check error:', error);
        showStatus('Unable to check tab permissions', 'error');
        takeScreenshotBtn.disabled = true;
    }
}

/**
 * Show status message to user
 */
function showStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.classList.remove('hidden');
    
    // Auto-hide after 3 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 3000);
    }
}

/**
 * Send message to background script
 */
function sendMessage(message) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
    });
}

/**
 * Collect system information for bug reports
 */
async function collectSystemInfo() {
    const info = {
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        screenResolution: `${screen.width}x${screen.height}`,
        colorDepth: screen.colorDepth,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
    
    // Add Chrome version if available
    if (navigator.userAgentData) {
        try {
            const brands = navigator.userAgentData.brands;
            const chromeBrand = brands.find(brand => brand.brand.includes('Chrome'));
            if (chromeBrand) {
                info.chromeVersion = chromeBrand.version;
            }
        } catch (error) {
            console.warn('Could not get Chrome version:', error);
        }
    }
    
    return info;
}

/**
 * Get current tab URL
 */
async function getCurrentTabUrl() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab ? tab.url : 'unknown';
    } catch (error) {
        return 'unknown';
    }
}

/**
 * Get recent logs (placeholder - would need actual log collection)
 */
async function getRecentLogs() {
    // In a real implementation, this would collect recent console logs
    // For now, return placeholder data
    return [
        'Popup initialized',
        'Settings loaded',
        'Tab permissions checked'
    ];
}

/**
 * Handle popup unload
 */
window.addEventListener('beforeunload', () => {
    console.log('Popup closing');
});
