/**
 * Content Script for Screenshot Pro Extension
 * Handles page interaction and screenshot capture logic
 */

// Try to load screenshot engine, but don't block if it fails
try {
    if (!window.ScreenshotEngine && !document.querySelector('script[src*="screenshot-engine.js"]')) {
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('js/screenshot-engine.js');
        script.id = 'screenshot-engine-script';

        script.onload = () => {
            if (window.ScreenshotEngine) {
                try {
                    screenshotEngine = new window.ScreenshotEngine();
                    console.log('Screenshot engine initialized successfully');
                } catch (error) {
                    console.warn('Failed to initialize screenshot engine:', error);
                }
            }
        };

        script.onerror = () => {
            console.warn('Failed to load screenshot engine, will use fallback');
        };

        document.head.appendChild(script);
    } else if (window.ScreenshotEngine && !screenshotEngine) {
        try {
            screenshotEngine = new window.ScreenshotEngine();
            console.log('Screenshot engine initialized (already loaded)');
        } catch (error) {
            console.warn('Failed to initialize existing screenshot engine:', error);
        }
    }
} catch (error) {
    console.warn('Error setting up screenshot engine:', error);
}

// Global state
let isCapturing = false;
let captureOptions = {};
let screenshotEngine = null;

// Initialize content script
console.log('Screenshot Pro content script loaded');



// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);
    
    switch (message.action) {
        case 'ping':
            sendResponse({ success: true, status: 'ready' });
            break;
            
        case 'startCapture':
            if (isCapturing) {
                sendResponse({ success: false, error: 'Capture already in progress' });
                return;
            }
            
            startScreenshotCapture(message.options)
                .then(result => sendResponse({ success: true, data: result }))
                .catch(error => sendResponse({ success: false, error: error.message }));
            return true; // Keep message channel open for async response
            
        default:
            console.warn('Unknown message action:', message.action);
            sendResponse({ success: false, error: 'Unknown action' });
    }
});

/**
 * Main screenshot capture orchestrator
 */
async function startScreenshotCapture(options = {}) {
    try {
        isCapturing = true;
        captureOptions = options;

        console.log('Starting screenshot capture with options:', options);

        // Show capture indicator
        showCaptureIndicator();

        // Use basic screenshot method for reliability
        const result = await captureBasicScreenshot();
        return result;

    } catch (error) {
        console.error('Screenshot capture failed:', error);
        throw error;
    } finally {
        isCapturing = false;
        hideCaptureIndicator();
    }
}







/**
 * UI feedback functions
 */

function showCaptureIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'screenshot-capture-indicator';
    indicator.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 123, 255, 0.9);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            gap: 8px;
        ">
            <div style="
                width: 16px;
                height: 16px;
                border: 2px solid white;
                border-top: 2px solid transparent;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            "></div>
            <span>Capturing screenshot...</span>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    document.body.appendChild(indicator);
}

function updateCaptureProgress(progress) {
    const indicator = document.getElementById('screenshot-capture-indicator');
    if (indicator) {
        const span = indicator.querySelector('span');
        if (span) {
            span.textContent = `Capturing... ${Math.round(progress * 100)}%`;
        }
    }
}

function hideCaptureIndicator() {
    const indicator = document.getElementById('screenshot-capture-indicator');
    if (indicator) {
        indicator.remove();
    }
}

/**
 * Fallback screenshot function using Chrome API directly
 */
async function captureBasicScreenshot() {
    console.log('Using basic screenshot fallback');

    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'captureTab' }, (response) => {
            if (response && response.success) {
                resolve({
                    imageData: response.data,
                    url: window.location.href,
                    title: document.title,
                    dimensions: {
                        viewport: {
                            width: window.innerWidth,
                            height: window.innerHeight
                        },
                        page: {
                            width: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
                            height: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)
                        }
                    },
                    timestamp: new Date().toISOString(),
                    metadata: {
                        captureType: 'basic-fallback'
                    }
                });
            } else {
                reject(new Error(response?.error || 'Basic screenshot failed'));
            }
        });
    });
}


