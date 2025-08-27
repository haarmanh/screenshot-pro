/**
 * Background Service Worker for Screenshot Pro Extension
 * Handles extension lifecycle, commands, and communication between components
 */

// Extension installation and startup
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Screenshot Pro installed:', details.reason);
    
    // Set default settings on first install
    if (details.reason === 'install') {
        setDefaultSettings();
    }
});

// Handle keyboard shortcut commands
chrome.commands.onCommand.addListener((command) => {
    console.log('Command received:', command);
    
    if (command === 'take-screenshot') {
        takeScreenshot();
    }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    console.log('Extension icon clicked for tab:', tab.id);
    takeScreenshot();
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    switch (message.action) {
        case 'takeScreenshot':
            takeScreenshot(message.options)
                .then(result => sendResponse({ success: true, data: result }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open for async response

        case 'captureTab':
            captureCurrentTab()
                .then(result => sendResponse({ success: true, data: result }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open for async response

        case 'openViewer':
            openViewer(message.imageData, message.metadata);
            sendResponse({ success: true });
            break;

        case 'openEditor':
            openEditor(message.imageData, message.metadata);
            sendResponse({ success: true });
            break;

        case 'reportBug':
            handleBugReport(message.data);
            sendResponse({ success: true });
            break;

        case 'getSettings':
            getSettings()
                .then(settings => sendResponse({ success: true, data: settings }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        case 'saveSettings':
            saveSettings(message.settings)
                .then(() => sendResponse({ success: true }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true;

        default:
            console.warn('Unknown message action:', message.action);
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

/**
 * Main screenshot capture function
 */
async function takeScreenshot(options = {}) {
    try {
        console.log('Starting screenshot capture with options:', options);
        
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new Error('No active tab found');
        }
        
        // Get user settings
        const settings = await getSettings();
        const captureOptions = { ...settings, ...options };
        
        // Inject content script if needed
        await ensureContentScriptInjected(tab.id);
        
        // Start capture process
        const result = await chrome.tabs.sendMessage(tab.id, {
            action: 'startCapture',
            options: captureOptions
        });
        
        if (!result.success) {
            throw new Error(result.error || 'Screenshot capture failed');
        }
        
        // Process the captured data
        const processedData = await processScreenshotData(result.data, captureOptions);
        
        // Open viewer if auto-open is enabled
        if (captureOptions.autoOpenViewer !== false) {
            await openViewer(processedData.imageData, processedData.metadata);
        }
        
        return processedData;
        
    } catch (error) {
        console.error('Screenshot capture error:', error);
        
        // Show error notification
        try {
            chrome.notifications.create({
                type: 'basic',
                title: 'Screenshot Failed',
                message: error.message || 'An error occurred while taking the screenshot'
            });
        } catch (notificationError) {
            console.warn('Could not show notification:', notificationError);
        }
        
        throw error;
    }
}

/**
 * Ensure content script is injected in the target tab
 */
async function ensureContentScriptInjected(tabId) {
    try {
        // Try to ping the content script
        await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    } catch (error) {
        // Content script not available, inject it
        console.log('Injecting content script into tab:', tabId);
        await chrome.scripting.executeScript({
            target: { tabId },
            files: ['content.js']
        });
    }
}

/**
 * Process raw screenshot data
 */
async function processScreenshotData(rawData, options) {
    const metadata = {
        timestamp: new Date().toISOString(),
        url: rawData.url,
        title: rawData.title,
        dimensions: rawData.dimensions,
        format: options.defaultFormat || 'png',
        quality: options.defaultQuality || 'medium',
        captureOptions: options
    };
    
    // Generate filename
    const filename = generateFilename(metadata, options);
    
    return {
        imageData: rawData.imageData,
        metadata: {
            ...metadata,
            filename
        }
    };
}

/**
 * Generate filename based on template and metadata
 */
function generateFilename(metadata, options) {
    const template = options.filenameTemplate || 'screenshot-{timestamp}';
    const format = metadata.format;
    
    let filename = template;
    
    // Replace variables
    const timestamp = formatTimestamp(new Date(metadata.timestamp), options.timestampFormat);
    const date = new Date(metadata.timestamp).toISOString().split('T')[0];
    const time = new Date(metadata.timestamp).toTimeString().split(' ')[0].replace(/:/g, '-');
    const title = sanitizeFilename(metadata.title || 'untitled');
    const domain = sanitizeFilename(new URL(metadata.url).hostname);
    
    filename = filename
        .replace('{timestamp}', timestamp)
        .replace('{date}', date)
        .replace('{time}', time)
        .replace('{title}', title)
        .replace('{domain}', domain);
    
    return `${filename}.${format}`;
}

/**
 * Format timestamp according to user preference
 */
function formatTimestamp(date, format = 'iso') {
    switch (format) {
        case 'simple':
            return date.toISOString().replace(/[-:T]/g, '').split('.')[0];
        case 'readable':
            return date.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        default: // iso
            return date.toISOString().replace(/:/g, '-').split('.')[0];
    }
}

/**
 * Sanitize filename for filesystem compatibility
 */
function sanitizeFilename(filename) {
    return filename
        .replace(/[<>:"/\\|?*]/g, '-')
        .replace(/\s+/g, '-')
        .substring(0, 50);
}

/**
 * Open screenshot viewer in new tab
 */
async function openViewer(imageData, metadata) {
    const viewerUrl = chrome.runtime.getURL('viewer.html');
    const tab = await chrome.tabs.create({ url: viewerUrl });
    
    // Wait for tab to load, then send data
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs.sendMessage(tab.id, {
                action: 'loadScreenshot',
                imageData,
                metadata
            });
        }
    });
}

/**
 * Open screenshot editor in new tab
 */
async function openEditor(imageData, metadata) {
    const editorUrl = chrome.runtime.getURL('editor.html');
    const tab = await chrome.tabs.create({ url: editorUrl });
    
    // Wait for tab to load, then send data
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
        if (tabId === tab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs.sendMessage(tab.id, {
                action: 'loadScreenshot',
                imageData,
                metadata
            });
        }
    });
}

/**
 * Handle bug report submission
 */
async function handleBugReport(reportData) {
    console.log('Bug report submitted:', reportData);
    
    // In a real implementation, this would send the report to a server
    // For now, we'll just log it and show a notification
    
    try {
        chrome.notifications.create({
            type: 'basic',
            title: 'Bug Report Submitted',
            message: 'Thank you for your feedback! We\'ll review your report.'
        });
    } catch (notificationError) {
        console.warn('Could not show notification:', notificationError);
    }
}

/**
 * Get user settings from storage
 */
async function getSettings() {
    const result = await chrome.storage.sync.get(null);
    return result;
}

/**
 * Save user settings to storage
 */
async function saveSettings(settings) {
    await chrome.storage.sync.set(settings);
}

/**
 * Capture visible tab using Chrome API
 */
async function captureVisibleTab() {
    return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
            } else {
                resolve(dataUrl);
            }
        });
    });
}

/**
 * Set default settings on first install
 */
async function setDefaultSettings() {
    const defaultSettings = {
        defaultFormat: 'png',
        defaultQuality: 'medium',
        backgroundColor: '#ffffff',
        resolution: 'original',
        captureIframes: true,
        smartScrolling: true,
        cacheEnabled: true,
        scrollDelay: 500,
        filenameTemplate: 'screenshot-{timestamp}',
        timestampFormat: 'iso',
        debugMode: false,
        autoOpenViewer: true
    };

    await chrome.storage.sync.set(defaultSettings);
    console.log('Default settings initialized');
}

/**
 * Capture current tab using Chrome API
 */
async function captureCurrentTab() {
    try {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            throw new Error('No active tab found');
        }

        // Capture the visible area of the tab
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
            format: 'png',
            quality: 100
        });

        return dataUrl;
    } catch (error) {
        console.error('Failed to capture tab:', error);
        throw error;
    }
}
