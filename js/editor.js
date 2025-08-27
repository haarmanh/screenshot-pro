/**
 * Screenshot Editor for Screenshot Pro Extension
 * Handles image editing with crop, annotation, arrows, highlighting, and emoji tools
 */

// Global state
let canvas, ctx;
let originalImageData = null;
let currentImageData = null;
let currentMetadata = null;
let currentTool = 'crop';
let isDrawing = false;
let startX, startY;
let editHistory = [];
let historyIndex = -1;

// Tool states
let cropArea = null;
let annotations = [];
let currentAnnotation = null;

// DOM elements
let editorCanvas, cropOverlay;
let toolButtons, toolPanels;
let undoBtn, redoBtn, saveBtn, exportBtn, cancelBtn;

// Initialize editor when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeEditor);

/**
 * Initialize the screenshot editor
 */
function initializeEditor() {
    console.log('Initializing screenshot editor');
    
    // Get DOM elements
    editorCanvas = document.getElementById('editorCanvas');
    cropOverlay = document.getElementById('cropOverlay');
    
    // Get tool buttons and panels
    toolButtons = document.querySelectorAll('.tool-btn[data-tool]');
    toolPanels = document.querySelectorAll('.tool-options');
    
    // Get action buttons
    undoBtn = document.getElementById('undoBtn');
    redoBtn = document.getElementById('redoBtn');
    saveBtn = document.getElementById('saveBtn');
    exportBtn = document.getElementById('exportBtn');
    cancelBtn = document.getElementById('cancelBtn');
    
    // Set up canvas
    canvas = editorCanvas;
    ctx = canvas.getContext('2d');
    
    // Set up event listeners
    setupEventListeners();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
    
    // Initialize tool options
    initializeToolOptions();
}

/**
 * Set up event listeners for editor controls
 */
function setupEventListeners() {
    // Tool selection
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => selectTool(btn.dataset.tool));
    });
    
    // Canvas events
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('click', handleCanvasClick);
    
    // Action buttons
    undoBtn.addEventListener('click', undo);
    redoBtn.addEventListener('click', redo);
    saveBtn.addEventListener('click', saveImage);
    exportBtn.addEventListener('click', exportImage);
    cancelBtn.addEventListener('click', cancelEdit);
    
    // Tool option controls
    setupToolOptionListeners();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);
}

/**
 * Handle messages from background script
 */
function handleMessage(message, sender, sendResponse) {
    console.log('Editor received message:', message);
    
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
 * Load screenshot data into editor
 */
function loadScreenshot(imageData, metadata) {
    console.log('Loading screenshot for editing');
    
    originalImageData = imageData;
    currentImageData = imageData;
    currentMetadata = metadata;
    
    const img = new Image();
    img.onload = () => {
        // Set canvas size to image size
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0);
        
        // Save initial state
        saveState();
        
        // Update UI
        updateHistoryButtons();
    };
    
    img.src = imageData;
}

/**
 * Tool selection and management
 */
function selectTool(toolName) {
    currentTool = toolName;
    
    // Update tool button states
    toolButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === toolName);
    });
    
    // Update tool panel visibility
    toolPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `${toolName}Panel`);
    });
    
    // Update cursor
    updateCursor();
    
    // Clear current annotation if switching tools
    if (currentAnnotation) {
        finishCurrentAnnotation();
    }
}

/**
 * Canvas interaction handlers
 */
function handleMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    startX = event.clientX - rect.left;
    startY = event.clientY - rect.top;
    isDrawing = true;
    
    switch (currentTool) {
        case 'crop':
            startCrop(startX, startY);
            break;
        case 'text':
            startText(startX, startY);
            break;
        case 'arrow':
            startArrow(startX, startY);
            break;
        case 'highlight':
            startHighlight(startX, startY);
            break;
    }
}

function handleMouseMove(event) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;
    
    switch (currentTool) {
        case 'crop':
            updateCrop(currentX, currentY);
            break;
        case 'arrow':
            updateArrow(currentX, currentY);
            break;
        case 'highlight':
            updateHighlight(currentX, currentY);
            break;
    }
}

function handleMouseUp(event) {
    if (!isDrawing) return;
    
    isDrawing = false;
    
    switch (currentTool) {
        case 'crop':
            finishCrop();
            break;
        case 'arrow':
            finishArrow();
            break;
        case 'highlight':
            finishHighlight();
            break;
    }
}

function handleCanvasClick(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (currentTool === 'emoji') {
        addEmoji(x, y);
    }
}

/**
 * Crop tool implementation
 */
function startCrop(x, y) {
    cropArea = { startX: x, startY: y, endX: x, endY: y };
    updateCropOverlay();
}

function updateCrop(x, y) {
    if (!cropArea) return;
    
    cropArea.endX = x;
    cropArea.endY = y;
    updateCropOverlay();
}

function finishCrop() {
    // Crop functionality will be applied when user confirms
}

function updateCropOverlay() {
    if (!cropArea) {
        cropOverlay.classList.add('hidden');
        return;
    }
    
    const left = Math.min(cropArea.startX, cropArea.endX);
    const top = Math.min(cropArea.startY, cropArea.endY);
    const width = Math.abs(cropArea.endX - cropArea.startX);
    const height = Math.abs(cropArea.endY - cropArea.startY);
    
    cropOverlay.style.left = `${left}px`;
    cropOverlay.style.top = `${top}px`;
    cropOverlay.style.width = `${width}px`;
    cropOverlay.style.height = `${height}px`;
    cropOverlay.classList.remove('hidden');
}

function applyCrop() {
    if (!cropArea) return;
    
    const left = Math.min(cropArea.startX, cropArea.endX);
    const top = Math.min(cropArea.startY, cropArea.endY);
    const width = Math.abs(cropArea.endX - cropArea.startX);
    const height = Math.abs(cropArea.endY - cropArea.startY);
    
    if (width < 10 || height < 10) return; // Too small
    
    // Create new canvas with cropped dimensions
    const imageData = ctx.getImageData(left, top, width, height);
    canvas.width = width;
    canvas.height = height;
    ctx.putImageData(imageData, 0, 0);
    
    // Clear crop area
    cropArea = null;
    cropOverlay.classList.add('hidden');
    
    saveState();
}

/**
 * Text tool implementation
 */
function startText(x, y) {
    const text = prompt('Enter text:');
    if (!text) return;
    
    const fontSize = document.getElementById('fontSize').value;
    const color = document.getElementById('textColor').value;
    const style = document.getElementById('textStyle').value;
    
    addTextAnnotation(x, y, text, { fontSize, color, style });
}

function addTextAnnotation(x, y, text, options) {
    ctx.save();
    ctx.font = `${options.fontSize}px Arial`;
    ctx.fillStyle = options.color;
    
    if (options.style === 'bubble') {
        drawTextBubble(x, y, text, options);
    } else if (options.style === 'callout') {
        drawTextCallout(x, y, text, options);
    } else {
        ctx.fillText(text, x, y);
    }
    
    ctx.restore();
    saveState();
}

function drawTextBubble(x, y, text, options) {
    const metrics = ctx.measureText(text);
    const padding = 8;
    const bubbleWidth = metrics.width + padding * 2;
    const bubbleHeight = parseInt(options.fontSize) + padding * 2;
    
    // Draw bubble background
    ctx.fillStyle = 'white';
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.roundRect(x - padding, y - bubbleHeight + padding, bubbleWidth, bubbleHeight, 8);
    ctx.fill();
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = options.color;
    ctx.fillText(text, x, y);
}

function drawTextCallout(x, y, text, options) {
    const metrics = ctx.measureText(text);
    const padding = 8;
    const calloutWidth = metrics.width + padding * 2;
    const calloutHeight = parseInt(options.fontSize) + padding * 2;
    
    // Draw callout background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = options.color;
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.rect(x - padding, y - calloutHeight + padding, calloutWidth, calloutHeight);
    ctx.fill();
    ctx.stroke();
    
    // Draw pointer
    ctx.beginPath();
    ctx.moveTo(x + calloutWidth / 2, y + padding);
    ctx.lineTo(x + calloutWidth / 2 - 10, y + padding + 15);
    ctx.lineTo(x + calloutWidth / 2 + 10, y + padding + 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = options.color;
    ctx.fillText(text, x, y);
}

/**
 * Arrow tool implementation
 */
function startArrow(x, y) {
    currentAnnotation = {
        type: 'arrow',
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        color: document.getElementById('arrowColor').value,
        width: document.getElementById('arrowWidth').value
    };
}

function updateArrow(x, y) {
    if (!currentAnnotation || currentAnnotation.type !== 'arrow') return;
    
    currentAnnotation.endX = x;
    currentAnnotation.endY = y;
    
    redrawCanvas();
    drawArrow(currentAnnotation);
}

function finishArrow() {
    if (!currentAnnotation || currentAnnotation.type !== 'arrow') return;
    
    annotations.push({ ...currentAnnotation });
    currentAnnotation = null;
    saveState();
}

function drawArrow(arrow) {
    ctx.save();
    ctx.strokeStyle = arrow.color;
    ctx.lineWidth = arrow.width;
    ctx.lineCap = 'round';
    
    // Draw line
    ctx.beginPath();
    ctx.moveTo(arrow.startX, arrow.startY);
    ctx.lineTo(arrow.endX, arrow.endY);
    ctx.stroke();
    
    // Draw arrowhead
    const angle = Math.atan2(arrow.endY - arrow.startY, arrow.endX - arrow.startX);
    const headLength = 15;
    
    ctx.beginPath();
    ctx.moveTo(arrow.endX, arrow.endY);
    ctx.lineTo(
        arrow.endX - headLength * Math.cos(angle - Math.PI / 6),
        arrow.endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(arrow.endX, arrow.endY);
    ctx.lineTo(
        arrow.endX - headLength * Math.cos(angle + Math.PI / 6),
        arrow.endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
    
    ctx.restore();
}

/**
 * Highlight tool implementation
 */
function startHighlight(x, y) {
    currentAnnotation = {
        type: 'highlight',
        points: [{ x, y }],
        color: document.getElementById('highlightColor').value,
        opacity: document.getElementById('highlightOpacity').value
    };
}

function updateHighlight(x, y) {
    if (!currentAnnotation || currentAnnotation.type !== 'highlight') return;
    
    currentAnnotation.points.push({ x, y });
    
    redrawCanvas();
    drawHighlight(currentAnnotation);
}

function finishHighlight() {
    if (!currentAnnotation || currentAnnotation.type !== 'highlight') return;
    
    annotations.push({ ...currentAnnotation });
    currentAnnotation = null;
    saveState();
}

function drawHighlight(highlight) {
    if (highlight.points.length < 2) return;
    
    ctx.save();
    ctx.globalAlpha = highlight.opacity;
    ctx.strokeStyle = highlight.color;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(highlight.points[0].x, highlight.points[0].y);
    
    for (let i = 1; i < highlight.points.length; i++) {
        ctx.lineTo(highlight.points[i].x, highlight.points[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
}

/**
 * Emoji tool implementation
 */
function addEmoji(x, y) {
    const selectedEmoji = document.querySelector('.emoji-btn.active');
    if (!selectedEmoji) {
        alert('Please select an emoji first');
        return;
    }
    
    const emoji = selectedEmoji.dataset.emoji;
    
    ctx.save();
    ctx.font = '32px Arial';
    ctx.fillText(emoji, x - 16, y + 16);
    ctx.restore();
    
    saveState();
}

/**
 * History management
 */
function saveState() {
    // Remove any states after current index
    editHistory = editHistory.slice(0, historyIndex + 1);
    
    // Add new state
    editHistory.push(canvas.toDataURL());
    historyIndex++;
    
    // Limit history size
    if (editHistory.length > 20) {
        editHistory.shift();
        historyIndex--;
    }
    
    updateHistoryButtons();
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        loadState(editHistory[historyIndex]);
        updateHistoryButtons();
    }
}

function redo() {
    if (historyIndex < editHistory.length - 1) {
        historyIndex++;
        loadState(editHistory[historyIndex]);
        updateHistoryButtons();
    }
}

function loadState(dataUrl) {
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
}

function updateHistoryButtons() {
    undoBtn.disabled = historyIndex <= 0;
    redoBtn.disabled = historyIndex >= editHistory.length - 1;
}

/**
 * Canvas redrawing
 */
function redrawCanvas() {
    if (editHistory.length > 0) {
        loadState(editHistory[historyIndex]);
    }
    
    // Redraw all annotations
    annotations.forEach(annotation => {
        switch (annotation.type) {
            case 'arrow':
                drawArrow(annotation);
                break;
            case 'highlight':
                drawHighlight(annotation);
                break;
        }
    });
}

/**
 * Tool options setup
 */
function initializeToolOptions() {
    // Font size slider
    const fontSizeSlider = document.getElementById('fontSize');
    const fontSizeValue = document.getElementById('fontSizeValue');
    fontSizeSlider.addEventListener('input', () => {
        fontSizeValue.textContent = `${fontSizeSlider.value}px`;
    });
    
    // Arrow width slider
    const arrowWidthSlider = document.getElementById('arrowWidth');
    const arrowWidthValue = document.getElementById('arrowWidthValue');
    arrowWidthSlider.addEventListener('input', () => {
        arrowWidthValue.textContent = `${arrowWidthSlider.value}px`;
    });
    
    // Highlight opacity slider
    const highlightOpacitySlider = document.getElementById('highlightOpacity');
    const highlightOpacityValue = document.getElementById('highlightOpacityValue');
    highlightOpacitySlider.addEventListener('input', () => {
        highlightOpacityValue.textContent = `${Math.round(highlightOpacitySlider.value * 100)}%`;
    });
    
    // Emoji selection
    const emojiButtons = document.querySelectorAll('.emoji-btn');
    emojiButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            emojiButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function setupToolOptionListeners() {
    // Crop aspect ratio
    const aspectRatio = document.getElementById('aspectRatio');
    aspectRatio.addEventListener('change', () => {
        // Update crop behavior based on aspect ratio
        console.log('Aspect ratio changed:', aspectRatio.value);
    });
}

/**
 * Utility functions
 */
function updateCursor() {
    switch (currentTool) {
        case 'crop':
            canvas.style.cursor = 'crosshair';
            break;
        case 'text':
            canvas.style.cursor = 'text';
            break;
        case 'arrow':
        case 'highlight':
            canvas.style.cursor = 'crosshair';
            break;
        case 'emoji':
            canvas.style.cursor = 'pointer';
            break;
        default:
            canvas.style.cursor = 'default';
    }
}

function finishCurrentAnnotation() {
    if (currentAnnotation) {
        switch (currentAnnotation.type) {
            case 'arrow':
                finishArrow();
                break;
            case 'highlight':
                finishHighlight();
                break;
        }
    }
}

/**
 * Action handlers
 */
function saveImage() {
    // Apply crop if active
    if (cropArea) {
        applyCrop();
    }
    
    const editedImageData = canvas.toDataURL();
    
    // Send back to viewer
    chrome.runtime.sendMessage({
        action: 'openViewer',
        imageData: editedImageData,
        metadata: {
            ...currentMetadata,
            edited: true,
            editTimestamp: new Date().toISOString()
        }
    });
    
    // Close editor
    window.close();
}

function exportImage() {
    // Apply crop if active
    if (cropArea) {
        applyCrop();
    }
    
    const editedImageData = canvas.toDataURL();
    const filename = `edited-screenshot-${Date.now()}.png`;
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = editedImageData;
    link.click();
}

function cancelEdit() {
    if (confirm('Are you sure you want to cancel editing? All changes will be lost.')) {
        window.close();
    }
}

/**
 * Keyboard shortcuts
 */
function handleKeyboard(event) {
    switch (event.key) {
        case 'z':
            if (event.ctrlKey || event.metaKey) {
                if (event.shiftKey) {
                    redo();
                } else {
                    undo();
                }
                event.preventDefault();
            }
            break;
        case 's':
            if (event.ctrlKey || event.metaKey) {
                saveImage();
                event.preventDefault();
            }
            break;
        case 'Escape':
            cancelEdit();
            break;
        case '1':
            selectTool('crop');
            break;
        case '2':
            selectTool('text');
            break;
        case '3':
            selectTool('arrow');
            break;
        case '4':
            selectTool('highlight');
            break;
        case '5':
            selectTool('emoji');
            break;
    }
}
