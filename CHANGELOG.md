# Changelog

All notable changes to Screenshot Pro will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-08-27

### Added
- Initial release of Screenshot Pro
- Full-page screenshot capture with intelligent scrolling
- Built-in image editor with crop, text, arrow, highlight, and emoji tools
- Multiple export formats (PNG, JPEG, PDF)
- Comprehensive viewer with zoom and pan controls
- Settings page for customization
- Keyboard shortcuts support
- Bug reporting system
- Help documentation system
- Close buttons and escape key support for better navigation

### Features
- **Screenshot Capture**
  - Full-page screenshots with automatic scrolling
  - Handles complex layouts and iframes
  - Configurable capture options
  
- **Image Editor**
  - Crop tool for precise image trimming
  - Text annotations with customizable fonts and colors
  - Arrow and line drawing tools
  - Highlight tool for emphasizing content
  - Emoji stickers for fun annotations
  - Undo/redo functionality
  - Keyboard shortcuts (1-5 for tools, Ctrl+Z/Ctrl+Shift+Z for undo/redo)

- **Viewer Interface**
  - Zoom in/out with mouse wheel or buttons
  - Pan and drag functionality
  - Fit to screen option
  - Copy to clipboard
  - Download in multiple formats
  - Close button and Escape key support

- **User Experience**
  - Intuitive popup interface
  - Comprehensive help documentation
  - Settings page for customization
  - Bug reporting system
  - Keyboard shortcuts throughout the application
  - Responsive design for different screen sizes

- **Technical Features**
  - Chrome Extension Manifest V3 compliance
  - Service worker background script
  - Content script injection for screenshot capture
  - Local storage for user preferences
  - Error handling and debugging support

### Keyboard Shortcuts
- `Alt+Shift+P` - Take screenshot
- `Escape` - Close viewer/editor
- `Ctrl+S` - Save (in editor/viewer)
- `Ctrl+C` - Copy to clipboard
- `Ctrl+E` - Open editor
- `+/-` - Zoom in/out
- `0` - Fit to screen
- `1-5` - Select editor tools

### Browser Support
- Chrome 88+ (Manifest V3)
- Edge 88+ (Chromium-based)

### Known Issues
- None at initial release

### Security
- All user data stored locally
- No external data transmission
- Minimal required permissions
- Privacy policy included

---

## Future Releases

### Planned Features
- Cloud storage integration
- Advanced annotation tools
- Batch screenshot processing
- Custom keyboard shortcut configuration
- Additional export formats
- Screenshot scheduling
- OCR text extraction
- Collaboration features

### Feedback
We welcome feedback and feature requests! Use the built-in bug report feature or contact us through the extension's help system.
