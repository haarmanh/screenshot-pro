# Screenshot Pro - Chrome Extension

A comprehensive Chrome extension for taking pixel-perfect, full-page screenshots with built-in editing tools and multiple export formats.

## Features

- **Full-Page Screenshots**: Capture entire web pages with intelligent scrolling
- **Built-in Editor**: Crop, annotate, add arrows, highlights, and emoji stickers
- **Multiple Export Formats**: PNG, JPEG, and PDF support

- **Smart Capture**: Handles scrollable elements and iframes
- **Keyboard Shortcuts**: Configurable hotkeys (default: Alt+Shift+P)
- **Auto-filename Generation**: Timestamps and customizable naming

## Installation

### For Development/Testing

1. **Download/Clone the Extension**
   - Download all files to a local directory
   - Ensure the folder structure is maintained

2. **Create Icon Files** (Required)
   - Open `create-placeholder-icons.html` in your browser
   - Download the generated icon files
   - Place them in the `icons/` folder with names:
     - `icon16.png`
     - `icon32.png` 
     - `icon48.png`
     - `icon128.png`

3. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the extension folder
   - The extension should appear in your extensions list

4. **Test the Extension**
   - Click the extension icon in the toolbar
   - Try taking a screenshot on any webpage
   - Check the browser console for any errors

## Usage

### Taking Screenshots

1. **Via Extension Icon**: Click the Screenshot Pro icon in the toolbar
2. **Via Keyboard**: Press Alt+Shift+P (or your configured shortcut)
3. **Via Popup**: Click "Take Full-Page Screenshot" button

### Editing Screenshots

1. Screenshots automatically open in the viewer
2. Click "Edit" to open the editing interface
3. Use tools: Crop, Text, Arrow, Highlight, Emoji
4. Save or export your edited screenshot

### Settings

- Click "Settings" in the popup to configure:
  - Default export format and quality
  - Filename templates
  - Capture options
  - Keyboard shortcuts

## Troubleshooting

### Common Issues

1. **"Cannot read properties of undefined" Error**
   - Make sure all required permissions are granted
   - Reload the extension after installation
   - Check that icon files exist in the icons folder

2. **Screenshots Not Working**
   - Ensure you're not on a restricted page (chrome://, extension pages)
   - Check that the extension has activeTab permission
   - Try refreshing the page and trying again

3. **Missing Icons**
   - Generate icons using the provided HTML file
   - Place PNG files in the icons folder
   - Reload the extension

### Debug Mode

1. Enable debug mode in settings
2. Check browser console for detailed logs
3. Use the bug report feature to collect system info

## File Structure

```
├── manifest.json              # Extension manifest
├── background.js             # Service worker
├── content.js               # Content script
├── popup.html               # Extension popup
├── viewer.html              # Screenshot viewer
├── editor.html              # Screenshot editor
├── options.html             # Settings page
├── css/                     # Stylesheets
│   ├── popup.css
│   ├── viewer.css
│   ├── editor.css
│   └── options.css
├── js/                      # JavaScript modules
│   ├── popup.js
│   ├── viewer.js
│   ├── editor.js
│   ├── options.js
│   ├── screenshot-engine.js

├── icons/                   # Extension icons
└── assets/                  # Additional assets
```

## Technical Details

### Permissions Used

- `activeTab`: Access current tab for screenshots
- `storage`: Save user preferences
- `tabs`: Create new tabs for viewer/editor
- `notifications`: Show status notifications
- `scripting`: Inject content scripts when needed

### Architecture

- **Background Script**: Handles extension lifecycle and API calls
- **Content Script**: Injected into web pages for screenshot capture
- **Screenshot Engine**: Advanced capture logic with scrolling and stitching

- **Popup Interface**: Quick access controls
- **Viewer/Editor**: Full-featured image viewing and editing

### Browser Compatibility

- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)

## Development

### Adding Features

1. Update manifest.json for new permissions
2. Add new modules to js/ folder
3. Update web_accessible_resources if needed
4. Test thoroughly on different page types

### Building for Production

1. Minify JavaScript files
2. Optimize images
3. Test on various websites
4. Package as .crx or .zip for distribution

## License

This extension is provided as-is for educational and development purposes.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Use the built-in bug report feature
3. Check browser console for error messages
