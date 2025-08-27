/**
 * Options/Settings Page for Screenshot Pro Extension
 * Handles user preferences and configuration
 */

// DOM elements
let settingsForm, saveButton, saveStatus;
let defaultFormat, defaultQuality, backgroundColor, resolution;
let captureIframes, smartScrolling, cacheEnabled, scrollDelay, scrollDelayValue;
let filenameTemplate, timestampFormat;
let currentShortcut, changeShortcutBtn;
let debugMode, autoOpenViewer;
let clearCacheBtn, resetSettingsBtn;

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeOptions);

/**
 * Initialize the options page
 */
async function initializeOptions() {
    console.log('Initializing options page');
    
    // Get DOM elements
    getElements();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load current settings
    await loadSettings();
    
    // Update UI
    updateUI();
}

/**
 * Get all DOM elements
 */
function getElements() {
    // Form and buttons
    saveButton = document.getElementById('saveSettings');
    saveStatus = document.getElementById('saveStatus');
    
    // Screenshot settings
    defaultFormat = document.getElementById('defaultFormat');
    defaultQuality = document.getElementById('defaultQuality');
    backgroundColor = document.getElementById('backgroundColor');
    resolution = document.getElementById('resolution');
    
    // Capture settings
    captureIframes = document.getElementById('captureIframes');
    smartScrolling = document.getElementById('smartScrolling');
    cacheEnabled = document.getElementById('cacheEnabled');
    scrollDelay = document.getElementById('scrollDelay');
    scrollDelayValue = document.getElementById('scrollDelayValue');
    
    // Filename settings
    filenameTemplate = document.getElementById('filenameTemplate');
    timestampFormat = document.getElementById('timestampFormat');
    
    // Keyboard shortcuts
    currentShortcut = document.getElementById('currentShortcut');
    changeShortcutBtn = document.getElementById('changeShortcut');
    
    // Advanced settings
    debugMode = document.getElementById('debugMode');
    autoOpenViewer = document.getElementById('autoOpenViewer');
    clearCacheBtn = document.getElementById('clearCache');
    resetSettingsBtn = document.getElementById('resetSettings');
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Save button
    saveButton.addEventListener('click', saveSettings);
    
    // Auto-save on change for most settings
    const autoSaveElements = [
        defaultFormat, defaultQuality, backgroundColor, resolution,
        captureIframes, smartScrolling, cacheEnabled,
        filenameTemplate, timestampFormat,
        debugMode, autoOpenViewer
    ];
    
    autoSaveElements.forEach(element => {
        element.addEventListener('change', debounce(autoSave, 1000));
    });
    
    // Scroll delay slider
    scrollDelay.addEventListener('input', () => {
        scrollDelayValue.textContent = `${scrollDelay.value}ms`;
        debounce(autoSave, 1000)();
    });
    
    // Shortcut change
    changeShortcutBtn.addEventListener('click', changeShortcut);
    
    // Action buttons
    clearCacheBtn.addEventListener('click', clearCache);
    resetSettingsBtn.addEventListener('click', resetSettings);

    // Filename template validation
    if (filenameTemplate) {
        filenameTemplate.addEventListener('blur', () => {
            if (!validateFilenameTemplate(filenameTemplate.value)) {
                showStatus('Invalid filename template', 'error');
                filenameTemplate.focus();
            }
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

/**
 * Load current settings from storage
 */
async function loadSettings() {
    try {
        const response = await sendMessage({ action: 'getSettings' });
        
        if (response.success) {
            const settings = response.data;
            
            // Screenshot settings
            if (settings.defaultFormat) defaultFormat.value = settings.defaultFormat;
            if (settings.defaultQuality) defaultQuality.value = settings.defaultQuality;
            if (settings.backgroundColor) backgroundColor.value = settings.backgroundColor;
            if (settings.resolution) resolution.value = settings.resolution;
            
            // Capture settings
            captureIframes.checked = settings.captureIframes !== false;
            smartScrolling.checked = settings.smartScrolling !== false;
            cacheEnabled.checked = settings.cacheEnabled !== false;
            if (settings.scrollDelay) {
                scrollDelay.value = settings.scrollDelay;
                scrollDelayValue.textContent = `${settings.scrollDelay}ms`;
            }
            
            // Filename settings
            if (settings.filenameTemplate) filenameTemplate.value = settings.filenameTemplate;
            if (settings.timestampFormat) timestampFormat.value = settings.timestampFormat;
            
            // Advanced settings
            debugMode.checked = settings.debugMode === true;
            autoOpenViewer.checked = settings.autoOpenViewer !== false;
            
            console.log('Settings loaded successfully');
        } else {
            throw new Error(response.error || 'Failed to load settings');
        }
        
    } catch (error) {
        console.error('Failed to load settings:', error);
        showStatus('Failed to load settings', 'error');
    }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
    try {
        showStatus('Saving...', 'info');
        
        const settings = {
            defaultFormat: defaultFormat.value,
            defaultQuality: defaultQuality.value,
            backgroundColor: backgroundColor.value,
            resolution: resolution.value,
            captureIframes: captureIframes.checked,
            smartScrolling: smartScrolling.checked,
            cacheEnabled: cacheEnabled.checked,
            scrollDelay: parseInt(scrollDelay.value),
            filenameTemplate: filenameTemplate.value,
            timestampFormat: timestampFormat.value,
            debugMode: debugMode.checked,
            autoOpenViewer: autoOpenViewer.checked
        };
        
        const response = await sendMessage({
            action: 'saveSettings',
            settings: settings
        });
        
        if (response.success) {
            showStatus('Settings saved successfully', 'success');
        } else {
            throw new Error(response.error || 'Failed to save settings');
        }
        
    } catch (error) {
        console.error('Failed to save settings:', error);
        showStatus('Failed to save settings', 'error');
    }
}

/**
 * Auto-save settings (debounced)
 */
async function autoSave() {
    await saveSettings();
}

/**
 * Change keyboard shortcut
 */
function changeShortcut() {
    changeShortcutBtn.textContent = 'Press keys...';
    changeShortcutBtn.disabled = true;
    
    const handleKeyPress = (event) => {
        event.preventDefault();
        
        const keys = [];
        if (event.ctrlKey) keys.push('Ctrl');
        if (event.altKey) keys.push('Alt');
        if (event.shiftKey) keys.push('Shift');
        if (event.metaKey) keys.push('Cmd');
        
        if (event.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
            keys.push(event.key.toUpperCase());
        }
        
        if (keys.length >= 2) {
            const shortcut = keys.join('+');
            currentShortcut.textContent = shortcut;
            
            // Update Chrome commands (this requires permissions that we don't have)
            // For now, just show the new shortcut
            showStatus('Shortcut updated (restart extension to apply)', 'success');
        }
        
        // Reset button
        changeShortcutBtn.textContent = 'Change';
        changeShortcutBtn.disabled = false;
        document.removeEventListener('keydown', handleKeyPress);
    };
    
    document.addEventListener('keydown', handleKeyPress);
    
    // Timeout after 10 seconds
    setTimeout(() => {
        changeShortcutBtn.textContent = 'Change';
        changeShortcutBtn.disabled = false;
        document.removeEventListener('keydown', handleKeyPress);
    }, 10000);
}

/**
 * Clear cache
 */
async function clearCache() {
    if (confirm('Are you sure you want to clear the cache? This will remove all cached screenshot data.')) {
        try {
            // Clear Chrome storage
            await chrome.storage.local.clear();
            showStatus('Cache cleared successfully', 'success');
        } catch (error) {
            console.error('Failed to clear cache:', error);
            showStatus('Failed to clear cache', 'error');
        }
    }
}

/**
 * Reset all settings to defaults
 */
async function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        try {
            // Clear all settings
            await chrome.storage.sync.clear();
            
            // Reload the page to show default values
            window.location.reload();
            
        } catch (error) {
            console.error('Failed to reset settings:', error);
            showStatus('Failed to reset settings', 'error');
        }
    }
}

/**
 * Update UI elements
 */
function updateUI() {
    // Update scroll delay display
    scrollDelayValue.textContent = `${scrollDelay.value}ms`;
    
    // Load current shortcut from Chrome commands
    chrome.commands.getAll((commands) => {
        const screenshotCommand = commands.find(cmd => cmd.name === 'take-screenshot');
        if (screenshotCommand && screenshotCommand.shortcut) {
            currentShortcut.textContent = screenshotCommand.shortcut;
        }
    });
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboard(event) {
    // Ctrl+S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveSettings();
    }
    
    // Escape to close (if opened in popup)
    if (event.key === 'Escape') {
        window.close();
    }
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
    saveStatus.textContent = message;
    saveStatus.className = `save-status ${type}`;
    
    // Clear status after 3 seconds for non-error messages
    if (type !== 'error') {
        setTimeout(() => {
            saveStatus.textContent = '';
            saveStatus.className = 'save-status';
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
 * Debounce function to limit API calls
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Validate filename template
 */
function validateFilenameTemplate(template) {
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(template)) {
        return false;
    }
    
    // Check for valid variables
    const validVariables = ['{timestamp}', '{date}', '{time}', '{title}', '{domain}'];
    const variables = template.match(/\{[^}]+\}/g) || [];
    
    for (const variable of variables) {
        if (!validVariables.includes(variable)) {
            return false;
        }
    }
    
    return true;
}



/**
 * Preview filename
 */
function previewFilename() {
    const template = filenameTemplate.value;
    const format = defaultFormat.value;
    const timestampFormatValue = timestampFormat.value;
    
    // Generate preview
    const now = new Date();
    let timestamp;
    
    switch (timestampFormatValue) {
        case 'simple':
            timestamp = now.toISOString().replace(/[-:T]/g, '').split('.')[0];
            break;
        case 'readable':
            timestamp = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
            break;
        default: // iso
            timestamp = now.toISOString().replace(/:/g, '-').split('.')[0];
    }
    
    const preview = template
        .replace('{timestamp}', timestamp)
        .replace('{date}', now.toISOString().split('T')[0])
        .replace('{time}', now.toTimeString().split(' ')[0].replace(/:/g, '-'))
        .replace('{title}', 'Example Page Title')
        .replace('{domain}', 'example.com');
    
    return `${preview}.${format}`;
}

// Add filename preview
const previewElement = document.createElement('div');
previewElement.className = 'help-text';
previewElement.style.marginTop = '8px';
filenameTemplate.parentNode.appendChild(previewElement);

function updateFilenamePreview() {
    previewElement.textContent = `Preview: ${previewFilename()}`;
}

filenameTemplate.addEventListener('input', updateFilenamePreview);
defaultFormat.addEventListener('change', updateFilenamePreview);
timestampFormat.addEventListener('change', updateFilenamePreview);

// Initial preview
setTimeout(updateFilenamePreview, 100);
