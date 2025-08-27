/**
 * Icon Generator for Screenshot Pro Extension
 * Creates simple icons programmatically
 */

function generateIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    // Round corners
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, size * 0.1);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    
    // Camera icon
    const centerX = size / 2;
    const centerY = size / 2;
    const iconSize = size * 0.6;
    
    // Camera body
    ctx.fillStyle = 'white';
    ctx.fillRect(centerX - iconSize/2, centerY - iconSize/3, iconSize, iconSize/1.5);
    
    // Camera lens
    ctx.beginPath();
    ctx.arc(centerX, centerY, iconSize/4, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
    
    // Inner lens circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, iconSize/6, 0, 2 * Math.PI);
    ctx.fillStyle = '#666';
    ctx.fill();
    
    // Camera flash
    ctx.fillStyle = 'white';
    ctx.fillRect(centerX - iconSize/2 + iconSize/8, centerY - iconSize/2, iconSize/6, iconSize/6);
    
    // Screenshot indicator (small squares)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const squareSize = size * 0.08;
    ctx.fillRect(size * 0.1, size * 0.1, squareSize, squareSize);
    ctx.fillRect(size * 0.1, size * 0.8, squareSize, squareSize);
    ctx.fillRect(size * 0.8, size * 0.1, squareSize, squareSize);
    ctx.fillRect(size * 0.8, size * 0.8, squareSize, squareSize);
    
    return canvas.toDataURL('image/png');
}

// Generate and download icons
function generateAllIcons() {
    const sizes = [16, 32, 48, 128];
    sizes.forEach(size => {
        const dataUrl = generateIcon(size);
        
        // Create download link
        const link = document.createElement('a');
        link.download = `icon${size}.png`;
        link.href = dataUrl;
        link.click();
    });
}

// Export for use
if (typeof window !== 'undefined') {
    window.generateIcon = generateIcon;
    window.generateAllIcons = generateAllIcons;
}
