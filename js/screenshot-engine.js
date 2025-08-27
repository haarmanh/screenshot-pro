/**
 * Advanced Screenshot Engine for Screenshot Pro Extension
 * Handles complex screenshot capture scenarios with intelligent scrolling and stitching
 */

class ScreenshotEngine {
    constructor(options = {}) {
        this.options = {
            scrollDelay: 500,
            maxScrollAttempts: 50,
            stitchingQuality: 0.95,
            cacheEnabled: true,
            debugMode: false,
            ...options
        };
        
        this.cache = new Map();
        this.isCapturing = false;
        this.captureId = null;
    }

    /**
     * Main entry point for screenshot capture
     */
    async captureFullPage(captureOptions = {}) {
        if (this.isCapturing) {
            throw new Error('Capture already in progress');
        }

        this.isCapturing = true;
        this.captureId = Date.now().toString();
        
        try {
            const pageAnalysis = await this.analyzePage();
            const strategy = this.determineCaptureStrategy(pageAnalysis, captureOptions);
            
            this.log('Starting capture with strategy:', strategy.type);
            
            let result;
            switch (strategy.type) {
                case 'viewport':
                    result = await this.captureViewport();
                    break;
                case 'scroll':
                    result = await this.captureWithScrolling(strategy);
                    break;
                case 'complex':
                    result = await this.captureComplex(strategy);
                    break;
                default:
                    throw new Error(`Unknown capture strategy: ${strategy.type}`);
            }

            return await this.processResult(result, pageAnalysis, captureOptions);
            
        } finally {
            this.isCapturing = false;
            this.captureId = null;
        }
    }

    /**
     * Analyze page characteristics to determine optimal capture strategy
     */
    async analyzePage() {
        const viewport = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        const page = {
            width: Math.max(
                document.documentElement.scrollWidth,
                document.body.scrollWidth,
                document.documentElement.offsetWidth,
                document.body.offsetWidth
            ),
            height: Math.max(
                document.documentElement.scrollHeight,
                document.body.scrollHeight,
                document.documentElement.offsetHeight,
                document.body.offsetHeight
            )
        };

        const scroll = {
            x: window.pageXOffset || document.documentElement.scrollLeft,
            y: window.pageYOffset || document.documentElement.scrollTop,
            maxX: page.width - viewport.width,
            maxY: page.height - viewport.height
        };

        // Analyze scrollable elements
        const scrollableElements = this.findScrollableElements();
        
        // Analyze iframes
        const iframes = Array.from(document.querySelectorAll('iframe')).map(iframe => ({
            element: iframe,
            rect: iframe.getBoundingClientRect(),
            accessible: this.isIframeAccessible(iframe)
        }));

        // Analyze fixed elements
        const fixedElements = this.findFixedElements();

        // Check for lazy loading
        const hasLazyLoading = this.detectLazyLoading();

        return {
            viewport,
            page,
            scroll,
            scrollableElements,
            iframes,
            fixedElements,
            hasLazyLoading,
            devicePixelRatio: window.devicePixelRatio || 1,
            url: window.location.href,
            title: document.title
        };
    }

    /**
     * Determine the best capture strategy based on page analysis
     */
    determineCaptureStrategy(analysis, options) {
        const { viewport, page, scrollableElements, iframes } = analysis;
        
        // Simple viewport capture if page fits
        if (page.height <= viewport.height * 1.1 && page.width <= viewport.width * 1.1) {
            return { type: 'viewport' };
        }

        // Complex capture for pages with many scrollable elements or iframes
        if (scrollableElements.length > 3 || iframes.length > 2) {
            return {
                type: 'complex',
                scrollableElements,
                iframes: options.captureIframes ? iframes : [],
                sections: this.calculateSections(analysis)
            };
        }

        // Standard scrolling capture
        return {
            type: 'scroll',
            sections: this.calculateSections(analysis),
            scrollDirection: page.height > page.width ? 'vertical' : 'horizontal'
        };
    }

    /**
     * Calculate optimal sections for scrolling capture
     */
    calculateSections(analysis) {
        const { viewport, page } = analysis;
        const sections = [];

        if (page.height > viewport.height) {
            const overlap = Math.floor(viewport.height * 0.1); // 10% overlap
            const sectionHeight = viewport.height - overlap;
            const numSections = Math.ceil(page.height / sectionHeight);

            for (let i = 0; i < numSections; i++) {
                const y = Math.min(i * sectionHeight, page.height - viewport.height);
                sections.push({
                    x: 0,
                    y: y,
                    width: viewport.width,
                    height: viewport.height,
                    index: i
                });
            }
        } else {
            // Single section
            sections.push({
                x: 0,
                y: 0,
                width: viewport.width,
                height: viewport.height,
                index: 0
            });
        }

        return sections;
    }

    /**
     * Capture single viewport
     */
    async captureViewport() {
        this.log('Capturing viewport');
        return await this.captureVisibleArea();
    }

    /**
     * Capture with scrolling
     */
    async captureWithScrolling(strategy) {
        this.log('Capturing with scrolling, sections:', strategy.sections.length);
        
        const captures = [];
        const originalScroll = { x: window.pageXOffset, y: window.pageYOffset };

        try {
            for (let i = 0; i < strategy.sections.length; i++) {
                const section = strategy.sections[i];
                
                // Scroll to section
                await this.scrollToPosition(section.x, section.y);
                
                // Wait for content to load and settle
                await this.waitForContentStable();
                
                // Capture this section
                const capture = await this.captureVisibleArea();
                captures.push({
                    data: capture,
                    section: section,
                    timestamp: Date.now()
                });

                // Update progress
                this.updateProgress((i + 1) / strategy.sections.length);
            }

            return captures;

        } finally {
            // Restore original scroll position
            await this.scrollToPosition(originalScroll.x, originalScroll.y);
        }
    }

    /**
     * Complex capture with scrollable elements and iframes
     */
    async captureComplex(strategy) {
        this.log('Capturing complex page');
        
        const captures = [];

        // First capture main page sections
        const mainCaptures = await this.captureWithScrolling(strategy);
        captures.push(...mainCaptures);

        // Capture scrollable elements
        for (const element of strategy.scrollableElements) {
            try {
                const elementCaptures = await this.captureScrollableElement(element);
                captures.push(...elementCaptures);
            } catch (error) {
                this.log('Failed to capture scrollable element:', error);
            }
        }

        // Capture accessible iframes
        for (const iframeInfo of strategy.iframes) {
            if (iframeInfo.accessible) {
                try {
                    const iframeCapture = await this.captureIframe(iframeInfo);
                    if (iframeCapture) {
                        captures.push(iframeCapture);
                    }
                } catch (error) {
                    this.log('Failed to capture iframe:', error);
                }
            }
        }

        return captures;
    }

    /**
     * Capture visible area using Chrome API
     */
    async captureVisibleArea() {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'captureTab' }, (response) => {
                if (response && response.success) {
                    resolve(response.data);
                } else {
                    reject(new Error(response?.error || 'Failed to capture visible area'));
                }
            });
        });
    }

    /**
     * Scroll to specific position with smooth animation
     */
    async scrollToPosition(x, y) {
        return new Promise((resolve) => {
            const startX = window.pageXOffset;
            const startY = window.pageYOffset;
            const deltaX = x - startX;
            const deltaY = y - startY;
            const duration = 300; // ms
            const startTime = performance.now();

            const animateScroll = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                
                const currentX = startX + deltaX * easeProgress;
                const currentY = startY + deltaY * easeProgress;
                
                window.scrollTo(currentX, currentY);
                
                if (progress < 1) {
                    requestAnimationFrame(animateScroll);
                } else {
                    resolve();
                }
            };

            requestAnimationFrame(animateScroll);
        });
    }

    /**
     * Wait for content to stabilize after scrolling
     */
    async waitForContentStable() {
        // Wait for scroll to complete
        await this.waitForScrollComplete();
        
        // Wait for images to load
        await this.waitForImages();
        
        // Additional delay for dynamic content
        await this.sleep(this.options.scrollDelay);
    }

    /**
     * Wait for scroll position to stabilize
     */
    async waitForScrollComplete() {
        return new Promise((resolve) => {
            let lastScrollY = window.pageYOffset;
            let stableCount = 0;
            
            const checkStability = () => {
                const currentScrollY = window.pageYOffset;
                if (currentScrollY === lastScrollY) {
                    stableCount++;
                    if (stableCount >= 3) { // 3 consecutive stable checks
                        resolve();
                        return;
                    }
                } else {
                    stableCount = 0;
                    lastScrollY = currentScrollY;
                }
                
                requestAnimationFrame(checkStability);
            };
            
            requestAnimationFrame(checkStability);
        });
    }

    /**
     * Wait for images in viewport to load
     */
    async waitForImages() {
        const images = Array.from(document.querySelectorAll('img'))
            .filter(img => this.isElementInViewport(img) && !img.complete);

        if (images.length === 0) return;

        const promises = images.map(img => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    const timeout = setTimeout(() => {
                        resolve(); // Resolve anyway after timeout
                    }, 2000);
                    
                    img.onload = img.onerror = () => {
                        clearTimeout(timeout);
                        resolve();
                    };
                }
            });
        });

        await Promise.all(promises);
    }

    /**
     * Utility functions
     */

    findScrollableElements() {
        const elements = [];
        const allElements = document.querySelectorAll('*');
        
        for (const element of allElements) {
            const style = window.getComputedStyle(element);
            const hasScrollableContent = element.scrollHeight > element.clientHeight ||
                                       element.scrollWidth > element.clientWidth;
            
            if (hasScrollableContent && 
                (style.overflow === 'auto' || style.overflow === 'scroll' ||
                 style.overflowY === 'auto' || style.overflowY === 'scroll' ||
                 style.overflowX === 'auto' || style.overflowX === 'scroll')) {
                elements.push(element);
            }
        }
        
        return elements;
    }

    findFixedElements() {
        const elements = [];
        const allElements = document.querySelectorAll('*');
        
        for (const element of allElements) {
            const style = window.getComputedStyle(element);
            if (style.position === 'fixed') {
                elements.push({
                    element,
                    rect: element.getBoundingClientRect()
                });
            }
        }
        
        return elements;
    }

    isIframeAccessible(iframe) {
        try {
            // Try to access iframe content
            iframe.contentDocument;
            return true;
        } catch (error) {
            return false;
        }
    }

    detectLazyLoading() {
        // Check for common lazy loading attributes
        const lazyImages = document.querySelectorAll('img[loading="lazy"], img[data-src], img[data-lazy]');
        return lazyImages.length > 0;
    }

    isElementInViewport(element) {
        const rect = element.getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0 &&
               rect.left < window.innerWidth && rect.right > 0;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    updateProgress(progress) {
        // Dispatch progress event
        window.dispatchEvent(new CustomEvent('screenshotProgress', {
            detail: { progress, captureId: this.captureId }
        }));
    }

    log(...args) {
        if (this.options.debugMode) {
            console.log('[ScreenshotEngine]', ...args);
        }
    }

    /**
     * Process capture result into final image
     */
    async processResult(captures, analysis, options) {
        if (!Array.isArray(captures)) {
            // Single capture
            return {
                imageData: captures,
                metadata: {
                    ...analysis,
                    captureType: 'single',
                    timestamp: new Date().toISOString()
                }
            };
        }

        // Multiple captures need stitching
        const stitchedImage = await this.stitchImages(captures, analysis);
        
        return {
            imageData: stitchedImage,
            metadata: {
                ...analysis,
                captureType: 'stitched',
                sections: captures.length,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Stitch multiple captures into single image
     */
    async stitchImages(captures, analysis) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas dimensions
        canvas.width = analysis.page.width;
        canvas.height = analysis.page.height;
        
        // Fill background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw each capture
        for (const capture of captures) {
            const img = await this.loadImage(capture.data);
            const section = capture.section;
            
            ctx.drawImage(img, section.x, section.y);
        }

        return canvas.toDataURL('image/png', this.options.stitchingQuality);
    }

    /**
     * Load image from data URL
     */
    loadImage(dataUrl) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = dataUrl;
        });
    }
}

// Export for use in content script
if (typeof window !== 'undefined' && !window.ScreenshotEngine) {
    window.ScreenshotEngine = ScreenshotEngine;
}
