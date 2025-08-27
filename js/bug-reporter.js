/**
 * Bug Reporter for Screenshot Pro Extension
 * Collects system information and logs for debugging
 */

class BugReporter {
    constructor() {
        this.logs = [];
        this.maxLogs = 100;
        this.startTime = Date.now();
        
        // Start collecting logs
        this.initializeLogging();
    }

    /**
     * Initialize logging system
     */
    initializeLogging() {
        // Capture console logs
        this.originalConsoleLog = console.log;
        this.originalConsoleError = console.error;
        this.originalConsoleWarn = console.warn;
        
        console.log = (...args) => {
            this.addLog('log', args);
            this.originalConsoleLog.apply(console, args);
        };
        
        console.error = (...args) => {
            this.addLog('error', args);
            this.originalConsoleError.apply(console, args);
        };
        
        console.warn = (...args) => {
            this.addLog('warn', args);
            this.originalConsoleWarn.apply(console, args);
        };
        
        // Capture unhandled errors
        window.addEventListener('error', (event) => {
            this.addLog('error', [
                `Unhandled error: ${event.message}`,
                `File: ${event.filename}:${event.lineno}:${event.colno}`,
                `Stack: ${event.error?.stack}`
            ]);
        });
        
        // Capture unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.addLog('error', [
                `Unhandled promise rejection: ${event.reason}`,
                `Stack: ${event.reason?.stack}`
            ]);
        });
    }

    /**
     * Add log entry
     */
    addLog(level, args) {
        const timestamp = Date.now();
        const logEntry = {
            timestamp,
            level,
            message: args.map(arg => 
                typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '),
            relativeTime: timestamp - this.startTime
        };
        
        this.logs.push(logEntry);
        
        // Keep only recent logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }
    }

    /**
     * Collect comprehensive system information
     */
    async collectSystemInfo() {
        const info = {
            // Browser information
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            languages: navigator.languages,
            cookieEnabled: navigator.cookieEnabled,
            onLine: navigator.onLine,
            
            // Screen information
            screen: {
                width: screen.width,
                height: screen.height,
                availWidth: screen.availWidth,
                availHeight: screen.availHeight,
                colorDepth: screen.colorDepth,
                pixelDepth: screen.pixelDepth
            },
            
            // Window information
            window: {
                innerWidth: window.innerWidth,
                innerHeight: window.innerHeight,
                outerWidth: window.outerWidth,
                outerHeight: window.outerHeight,
                devicePixelRatio: window.devicePixelRatio
            },
            
            // Timezone
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            
            // Extension information
            extension: {
                version: chrome.runtime.getManifest().version,
                id: chrome.runtime.id
            },
            
            // Performance information
            performance: {
                memory: performance.memory ? {
                    usedJSHeapSize: performance.memory.usedJSHeapSize,
                    totalJSHeapSize: performance.memory.totalJSHeapSize,
                    jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
                } : null,
                timing: {
                    navigationStart: performance.timing.navigationStart,
                    loadEventEnd: performance.timing.loadEventEnd,
                    domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd
                }
            }
        };
        
        // Add Chrome version if available
        if (navigator.userAgentData) {
            try {
                const brands = navigator.userAgentData.brands;
                const chromeBrand = brands.find(brand => 
                    brand.brand.includes('Chrome') || brand.brand.includes('Chromium')
                );
                if (chromeBrand) {
                    info.chromeVersion = chromeBrand.version;
                }
                info.mobile = navigator.userAgentData.mobile;
            } catch (error) {
                console.warn('Could not get user agent data:', error);
            }
        }
        
        // Add current tab information
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                info.currentTab = {
                    url: tab.url,
                    title: tab.title,
                    id: tab.id,
                    windowId: tab.windowId
                };
            }
        } catch (error) {
            console.warn('Could not get tab information:', error);
        }
        
        return info;
    }

    /**
     * Collect extension settings
     */
    async collectSettings() {
        try {
            const settings = await chrome.storage.sync.get(null);
            return settings;
        } catch (error) {
            console.warn('Could not collect settings:', error);
            return {};
        }
    }

    /**
     * Get recent logs
     */
    getRecentLogs(count = 50) {
        return this.logs.slice(-count);
    }

    /**
     * Create screenshot fragment for bug report
     */
    async createScreenshotFragment() {
        try {
            // Capture a small screenshot for context
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { 
                format: 'png',
                quality: 50 
            });
            
            // Create a smaller version
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            return new Promise((resolve) => {
                img.onload = () => {
                    // Resize to max 400x300
                    const maxWidth = 400;
                    const maxHeight = 300;
                    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
                    
                    canvas.width = img.width * ratio;
                    canvas.height = img.height * ratio;
                    
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL('image/png', 0.7));
                };
                
                img.onerror = () => resolve(null);
                img.src = dataUrl;
            });
            
        } catch (error) {
            console.warn('Could not create screenshot fragment:', error);
            return null;
        }
    }

    /**
     * Generate comprehensive bug report
     */
    async generateBugReport(userDescription = '', userEmail = '') {
        const timestamp = new Date().toISOString();
        
        const report = {
            // Report metadata
            reportId: `bug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp,
            version: chrome.runtime.getManifest().version,
            
            // User input
            userDescription,
            userEmail,
            
            // System information
            systemInfo: await this.collectSystemInfo(),
            
            // Extension settings
            settings: await this.collectSettings(),
            
            // Logs
            logs: this.getRecentLogs(),
            
            // Screenshot fragment
            screenshotFragment: await this.createScreenshotFragment(),
            
            // Additional context
            context: {
                sessionDuration: Date.now() - this.startTime,
                logCount: this.logs.length,
                errorCount: this.logs.filter(log => log.level === 'error').length,
                warnCount: this.logs.filter(log => log.level === 'warn').length
            }
        };
        
        return report;
    }

    /**
     * Submit bug report
     */
    async submitBugReport(userDescription = '', userEmail = '') {
        try {
            const report = await this.generateBugReport(userDescription, userEmail);
            
            // In a real implementation, this would send to a server
            // For now, we'll log it and show to user
            console.log('Bug Report Generated:', report);
            
            // Send to background script for handling
            const response = await chrome.runtime.sendMessage({
                action: 'reportBug',
                data: report
            });
            
            return {
                success: true,
                reportId: report.reportId,
                message: 'Bug report submitted successfully'
            };
            
        } catch (error) {
            console.error('Failed to submit bug report:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Show bug report dialog
     */
    showBugReportDialog() {
        // Create modal dialog
        const modal = document.createElement('div');
        modal.className = 'bug-report-modal';
        modal.innerHTML = `
            <div class="bug-report-overlay"></div>
            <div class="bug-report-dialog">
                <div class="bug-report-header">
                    <h2>Report a Bug</h2>
                    <button class="bug-report-close">&times;</button>
                </div>
                <div class="bug-report-content">
                    <p>Help us improve Screenshot Pro by reporting bugs. Your report will include:</p>
                    <ul>
                        <li>System information</li>
                        <li>Extension logs</li>
                        <li>Current settings</li>
                        <li>A small screenshot for context</li>
                    </ul>
                    
                    <div class="bug-report-form">
                        <label for="bug-description">Describe the issue:</label>
                        <textarea id="bug-description" placeholder="What happened? What did you expect to happen?" rows="4"></textarea>
                        
                        <label for="bug-email">Email (optional):</label>
                        <input type="email" id="bug-email" placeholder="your@email.com">
                        
                        <div class="bug-report-actions">
                            <button id="bug-submit" class="primary-btn">Submit Report</button>
                            <button id="bug-cancel" class="secondary-btn">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .bug-report-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 10000;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .bug-report-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
            }
            
            .bug-report-dialog {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .bug-report-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid #e0e0e0;
            }
            
            .bug-report-header h2 {
                margin: 0;
                color: #333;
            }
            
            .bug-report-close {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #666;
            }
            
            .bug-report-content {
                padding: 20px;
            }
            
            .bug-report-form label {
                display: block;
                margin: 15px 0 5px;
                font-weight: 500;
                color: #333;
            }
            
            .bug-report-form textarea,
            .bug-report-form input {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid #ccc;
                border-radius: 4px;
                font-size: 14px;
                font-family: inherit;
            }
            
            .bug-report-actions {
                margin-top: 20px;
                display: flex;
                gap: 10px;
                justify-content: flex-end;
            }
            
            .primary-btn {
                background: #007bff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            }
            
            .secondary-btn {
                background: #6c757d;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
        
        // Event listeners
        const closeBtn = modal.querySelector('.bug-report-close');
        const cancelBtn = modal.querySelector('#bug-cancel');
        const submitBtn = modal.querySelector('#bug-submit');
        const overlay = modal.querySelector('.bug-report-overlay');
        
        const closeModal = () => {
            modal.remove();
            style.remove();
        };
        
        closeBtn.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', closeModal);
        
        submitBtn.addEventListener('click', async () => {
            const description = modal.querySelector('#bug-description').value;
            const email = modal.querySelector('#bug-email').value;
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
            
            const result = await this.submitBugReport(description, email);
            
            if (result.success) {
                alert('Bug report submitted successfully! Thank you for your feedback.');
                closeModal();
            } else {
                alert(`Failed to submit bug report: ${result.error}`);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Report';
            }
        });
    }

    /**
     * Cleanup logging
     */
    cleanup() {
        console.log = this.originalConsoleLog;
        console.error = this.originalConsoleError;
        console.warn = this.originalConsoleWarn;
    }
}

// Create global instance
if (typeof window !== 'undefined') {
    window.bugReporter = new BugReporter();
    window.BugReporter = BugReporter;
}
