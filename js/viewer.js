/**
 * Screenshot Viewer for Screenshot Pro Extension
 * Handles viewing, zooming, and exporting screenshots
 */

// Global state
let currentImageData = null;
let currentMetadata = null;
let currentZoom = 1;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let imagePosition = { x: 0, y: 0 };


// DOM elements
let screenshotImage, imageContainer, imageInfo, zoomLevel;
let zoomInBtn, zoomOutBtn, fitToScreenBtn, downloadBtn, copyBtn, editBtn;
let exportFormat, loadingSpinner;

// Initialize viewer when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeViewer);



/**
 * Initialize the screenshot viewer
 */
function initializeViewer() {
    console.log('Initializing screenshot viewer');
    
    // Get DOM elements
    screenshotImage = document.getElementById('screenshotImage');
    imageContainer = document.getElementById('imageContainer');
    imageInfo = document.getElementById('imageInfo');
    zoomLevel = document.getElementById('zoomLevel');
    zoomInBtn = document.getElementById('zoomIn');
    zoomOutBtn = document.getElementById('zoomOut');
    fitToScreenBtn = document.getElementById('fitToScreen');
    downloadBtn = document.getElementById('downloadBtn');
    copyBtn = document.getElementById('copyBtn');
    editBtn = document.getElementById('editBtn');
    exportFormat = document.getElementById('exportFormat');
    loadingSpinner = document.getElementById('loadingSpinner');

    
    // Set up event listeners
    setupEventListeners();



    // Show loading state
    showLoading();
}

/**
 * Set up event listeners for viewer controls
 */
function setupEventListeners() {
    // Zoom controls
    zoomInBtn.addEventListener('click', () => setZoom(currentZoom * 1.2));
    zoomOutBtn.addEventListener('click', () => setZoom(currentZoom / 1.2));
    fitToScreenBtn.addEventListener('click', fitToScreen);
    
    // Export controls
    downloadBtn.addEventListener('click', downloadImage);
    copyBtn.addEventListener('click', copyToClipboard);
    editBtn.addEventListener('click', openEditor);

    // Close button
    const closeBtn = document.getElementById('closeBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeViewer);
    }
    
    // Image interaction
    screenshotImage.addEventListener('load', onImageLoad);
    screenshotImage.addEventListener('error', onImageError);
    
    // Mouse events for panning
    screenshotImage.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
    
    // Wheel event for zooming
    imageContainer.addEventListener('wheel', handleWheel);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
    

    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
}

/**
 * Handle messages from background script
 */
function handleMessage(message, sender, sendResponse) {
    console.log('Viewer received message:', message);
    
    switch (message.action) {
        case 'loadScreenshot':
            loadScreenshot(message.imageData, message.metadata);
            sendResponse({ success: true });
            break;
            
        default:
            console.warn('Unknown message action:', message.action);
            sendResponse({ success: false, error: 'Unknown action' });
    }
}

/**
 * Load screenshot data into viewer
 */
function loadScreenshot(imageData, metadata) {
    console.log('Loading screenshot with metadata:', metadata);
    
    currentImageData = imageData;
    currentMetadata = metadata;
    
    // Update image source
    screenshotImage.src = imageData;
    
    // Update image info
    updateImageInfo();
    
    // Hide loading spinner
    hideLoading();
}

/**
 * Update image information display
 */
function updateImageInfo() {
    if (!currentMetadata) return;
    
    const info = [];
    
    if (currentMetadata.dimensions) {
        info.push(`${currentMetadata.dimensions.width || currentMetadata.dimensions.page?.width || 'Unknown'}×${currentMetadata.dimensions.height || currentMetadata.dimensions.page?.height || 'Unknown'}`);
    }
    
    if (currentMetadata.title) {
        info.push(currentMetadata.title);
    }
    
    if (currentMetadata.timestamp) {
        const date = new Date(currentMetadata.timestamp);
        info.push(date.toLocaleString());
    }
    
    imageInfo.textContent = info.join(' • ');
}

/**
 * Image load event handler
 */
function onImageLoad() {
    console.log('Image loaded successfully');
    
    // Fit to screen initially
    fitToScreen();
    
    // Enable controls
    enableControls();
}

/**
 * Image error event handler
 */
function onImageError() {
    console.error('Failed to load image');
    hideLoading();
    showError('Failed to load screenshot image');
}

/**
 * Zoom controls
 */
function setZoom(newZoom) {
    currentZoom = Math.max(0.1, Math.min(5, newZoom));
    updateImageTransform();
    updateZoomDisplay();
}

function fitToScreen() {
    if (!screenshotImage.naturalWidth || !screenshotImage.naturalHeight) return;
    
    const containerRect = imageContainer.getBoundingClientRect();
    const imageAspect = screenshotImage.naturalWidth / screenshotImage.naturalHeight;
    const containerAspect = containerRect.width / containerRect.height;
    
    let newZoom;
    if (imageAspect > containerAspect) {
        // Image is wider
        newZoom = (containerRect.width * 0.9) / screenshotImage.naturalWidth;
    } else {
        // Image is taller
        newZoom = (containerRect.height * 0.9) / screenshotImage.naturalHeight;
    }
    
    currentZoom = newZoom;
    imagePosition = { x: 0, y: 0 };
    updateImageTransform();
    updateZoomDisplay();
}

function updateImageTransform() {
    const transform = `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${currentZoom})`;
    screenshotImage.style.transform = transform;
}

function updateZoomDisplay() {
    zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
}

/**
 * Mouse interaction for panning
 */
function startDrag(event) {
    if (currentZoom <= 1) return; // No need to pan if not zoomed
    
    isDragging = true;
    dragStart = { x: event.clientX - imagePosition.x, y: event.clientY - imagePosition.y };
    screenshotImage.style.cursor = 'grabbing';
    event.preventDefault();
}

function drag(event) {
    if (!isDragging) return;
    
    imagePosition = {
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
    };
    
    updateImageTransform();
    event.preventDefault();
}

function endDrag() {
    isDragging = false;
    screenshotImage.style.cursor = currentZoom > 1 ? 'grab' : 'default';
}

/**
 * Wheel event for zooming
 */
function handleWheel(event) {
    event.preventDefault();
    
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = currentZoom * zoomFactor;
    
    // Calculate zoom center point
    const rect = imageContainer.getBoundingClientRect();
    const centerX = event.clientX - rect.left;
    const centerY = event.clientY - rect.top;
    
    // Adjust position to zoom towards cursor
    const zoomRatio = newZoom / currentZoom;
    imagePosition.x = centerX - (centerX - imagePosition.x) * zoomRatio;
    imagePosition.y = centerY - (centerY - imagePosition.y) * zoomRatio;
    
    setZoom(newZoom);
}

/**
 * Keyboard shortcuts
 */
function handleKeyboard(event) {
    switch (event.key) {
        case '+':
        case '=':
            setZoom(currentZoom * 1.2);
            event.preventDefault();
            break;
        case '-':
            setZoom(currentZoom / 1.2);
            event.preventDefault();
            break;
        case '0':
            fitToScreen();
            event.preventDefault();
            break;
        case 'c':
            if (event.ctrlKey || event.metaKey) {
                copyToClipboard();
                event.preventDefault();
            }
            break;
        case 's':
            if (event.ctrlKey || event.metaKey) {
                downloadImage();
                event.preventDefault();
            }
            break;
        case 'e':
            if (event.ctrlKey || event.metaKey) {
                openEditor();
                event.preventDefault();
            }
            break;
        case 'Escape':
            closeViewer();
            event.preventDefault();
            break;
    }
}

/**
 * Export functions
 */
async function downloadImage() {
    if (!currentImageData) return;
    
    try {
        const format = exportFormat.value;
        const filename = generateFilename(format);
        
        let dataUrl = currentImageData;
        
        // Convert format if needed
        if (format !== 'png') {
            dataUrl = await convertImageFormat(currentImageData, format);
        }
        
        // Create download link
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        link.click();
        
        showSuccess('Image downloaded successfully');
        
    } catch (error) {
        console.error('Download failed:', error);
        showError('Failed to download image');
    }
}

async function copyToClipboard() {
    if (!currentImageData) return;
    
    try {
        // Convert data URL to blob
        const response = await fetch(currentImageData);
        const blob = await response.blob();
        
        // Copy to clipboard
        await navigator.clipboard.write([
            new ClipboardItem({ [blob.type]: blob })
        ]);
        
        showSuccess('Image copied to clipboard');
        
    } catch (error) {
        console.error('Copy failed:', error);
        showError('Failed to copy image to clipboard');
    }
}

function openEditor() {
    if (!currentImageData) return;
    
    // Send message to background to open editor
    chrome.runtime.sendMessage({
        action: 'openEditor',
        imageData: currentImageData,
        metadata: currentMetadata
    });
}

/**
 * Utility functions
 */
function generateFilename(format) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('.')[0];
    const title = currentMetadata?.title ? 
        currentMetadata.title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 30) : 
        'screenshot';
    
    return `${title}-${timestamp}.${format}`;
}

async function convertImageFormat(dataUrl, format) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Fill white background for JPEG
            if (format === 'jpeg') {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            ctx.drawImage(img, 0, 0);
            
            const quality = format === 'jpeg' ? 0.9 : undefined;
            const convertedDataUrl = canvas.toDataURL(`image/${format}`, quality);
            resolve(convertedDataUrl);
        };
        
        img.src = dataUrl;
    });
}



/**
 * UI state functions
 */
function showLoading() {
    loadingSpinner.classList.remove('hidden');
    screenshotImage.style.display = 'none';
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
    screenshotImage.style.display = 'block';
}

function enableControls() {
    const controls = [zoomInBtn, zoomOutBtn, fitToScreenBtn, downloadBtn, copyBtn, editBtn];
    controls.forEach(control => control.disabled = false);
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showError(message) {
    showNotification(message, 'error');
}

function showInfo(message) {
    showNotification(message, 'info');
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#f44336' : type === 'success' ? '#4caf50' : '#2196f3'};
        color: white;
        padding: 12px 20px;
        border-radius: 6px;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Close the viewer and return to previous page
 */
function closeViewer() {
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

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
