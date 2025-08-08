// FakeBuster Content Script - Injected into all web pages
class FakeBusterContentScript {
    constructor() {
        this.apiBaseUrl = 'https://your-api-domain.com/api/v1';
        this.settings = {};
        this.observers = [];
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupPageObserver();
        this.setupReviewDetection();
        this.setupCouponDetection();
        this.setupFormProtection();
        this.createFloatingWidget();
        
        // Listen for messages from popup/background
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
        
        // Auto-analyze if enabled
        if (this.settings.auto_analyze) {
            this.performPageAnalysis();
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['fakebuster_settings']);
            this.settings = result.fakebuster_settings || {
                auto_analyze: true,
                show_notifications: true,
                protection_level: 'medium',
                block_suspicious: false
            };
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    setupPageObserver() {
        // Observe DOM changes for dynamically loaded content
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    this.checkForNewReviews(mutation.addedNodes);
                    this.checkForNewForms(mutation.addedNodes);
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.observers.push(observer);
    }

    setupReviewDetection() {
        const reviewSelectors = [
            '[data-hook="review-body"]', // Amazon
            '.review-text',
            '.review-content',
            '.user-review',
            '[class*="review"]:not([class*="preview"])',
            '[class*="comment"]',
            '.feedback-item',
            '.testimonial'
        ];

        const reviews = this.findElementsBySelectors(reviewSelectors);
        
        if (reviews.length > 0) {
            this.addReviewAnalysisButtons(reviews);
            
            // Auto-analyze if setting is enabled
            if (this.settings.auto_analyze) {
                this.analyzeReviewsInBackground(reviews);
            }
        }
    }

    setupCouponDetection() {
        const couponSelectors = [
            '[class*="coupon"]',
            '[class*="promo"]',
            '[class*="discount"]',
            'input[placeholder*="coupon" i]',
            'input[placeholder*="promo" i]',
            'input[placeholder*="discount" i]'
        ];

        const couponElements = this.findElementsBySelectors(couponSelectors);
        
        if (couponElements.length > 0) {
            this.addCouponFinderButton();
        }
    }

    setupFormProtection() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            // Check for payment or personal info forms
            const hasPaymentFields = form.querySelector('input[type="password"], input[name*="card"], input[name*="payment"]');
            
            if (hasPaymentFields) {
                this.addFormProtection(form);
            }
        });
    }

    createFloatingWidget() {
        // Create a floating widget for quick access
        const widget = document.createElement('div');
        widget.id = 'fakebuster-widget';
        widget.innerHTML = `
            <div class="fb-widget-container">
                <button class="fb-widget-toggle" id="fbWidgetToggle">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L13.09 8.26L22 9L16 14.74L17.18 21.02L12 17.77L6.82 21.02L8 14.74L2 9L10.91 8.26L12 2Z" fill="currentColor"/>
                    </svg>
                </button>
                <div class="fb-widget-panel" id="fbWidgetPanel" style="display: none;">
                    <div class="fb-widget-header">
                        <span>FakeBuster</span>
                        <button class="fb-widget-close" id="fbWidgetClose">×</button>
                    </div>
                    <div class="fb-widget-content">
                        <div class="fb-trust-score">
                            <span>Trust Score: </span>
                            <span id="fbTrustScore">--</span>
                        </div>
                        <div class="fb-quick-actions">
                            <button class="fb-action-btn" id="fbAnalyzeReviews">Analyze Reviews</button>
                            <button class="fb-action-btn" id="fbFindCoupons">Find Coupons</button>
                            <button class="fb-action-btn" id="fbCheckSite">Check Site</button>
                        </div>
                        <div class="fb-alerts" id="fbAlerts"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(widget);
        this.setupWidgetEvents();
    }

    setupWidgetEvents() {
        const toggle = document.getElementById('fbWidgetToggle');
        const panel = document.getElementById('fbWidgetPanel');
        const close = document.getElementById('fbWidgetClose');

        toggle.addEventListener('click', () => {
            panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
        });

        close.addEventListener('click', () => {
            panel.style.display = 'none';
        });

        // Quick action buttons
        document.getElementById('fbAnalyzeReviews').addEventListener('click', () => {
            this.analyzePageReviews();
        });

        document.getElementById('fbFindCoupons').addEventListener('click', () => {
            this.findPageCoupons();
        });

        document.getElementById('fbCheckSite').addEventListener('click', () => {
            this.checkCurrentSite();
        });
    }

    findElementsBySelectors(selectors) {
        const elements = [];
        selectors.forEach(selector => {
            try {
                const found = document.querySelectorAll(selector);
                elements.push(...found);
            } catch (e) {
                // Invalid selector, skip
            }
        });
        return [...new Set(elements)]; // Remove duplicates
    }

    addReviewAnalysisButtons(reviews) {
        reviews.forEach((review, index) => {
            if (review.querySelector('.fb-review-analysis')) return; // Already added

            const button = document.createElement('button');
            button.className = 'fb-review-analysis';
            button.innerHTML = '🔍 Analyze';
            button.style.cssText = `
                position: absolute;
                top: 5px;
                right: 5px;
                background: #667eea;
                color: white;
                border: none;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                z-index: 10000;
                opacity: 0.8;
                transition: opacity 0.2s;
            `;

            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.analyzeIndividualReview(review, button);
            });

            // Make parent relative if not already positioned
            const parent = review.parentElement;
            const parentStyle = window.getComputedStyle(parent);
            if (parentStyle.position === 'static') {
                parent.style.position = 'relative';
            }

            parent.appendChild(button);
        });
    }

    addCouponFinderButton() {
        if (document.getElementById('fb-coupon-finder')) return; // Already added

        const button = document.createElement('div');
        button.id = 'fb-coupon-finder';
        button.innerHTML = `
            <button class="fb-coupon-btn">
                🎫 Find Coupons
            </button>
        `;
        button.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            z-index: 10000;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;

        button.querySelector('.fb-coupon-btn').style.cssText = `
            background: none;
            border: none;
            color: white;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
        `;

        button.addEventListener('click', () => {
            this.findPageCoupons();
        });

        document.body.appendChild(button);
    }

    addFormProtection(form) {
        if (form.querySelector('.fb-form-protection')) return; // Already added

        const warning = document.createElement('div');
        warning.className = 'fb-form-protection';
        warning.innerHTML = `
            <div class="fb-security-warning">
                🛡️ FakeBuster is protecting this form
                <button class="fb-verify-site">Verify Site Security</button>
            </div>
        `;
        warning.style.cssText = `
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 8px 12px;
            margin-bottom: 10px;
            font-size: 12px;
            color: #92400e;
        `;

        warning.querySelector('.fb-verify-site').style.cssText = `
            background: #f59e0b;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            margin-left: 8px;
            cursor: pointer;
        `;

        warning.querySelector('.fb-verify-site').addEventListener('click', () => {
            this.verifyFormSecurity(form);
        });

        form.insertBefore(warning, form.firstChild);
    }

    async performPageAnalysis() {
        try {
            const pageData = this.extractPageData();
            const response = await this.makeAPICall('/analyze/page', pageData);
            
            this.updateWidgetTrustScore(response.trust_score);
            
            if (response.alerts && response.alerts.length > 0) {
                this.showWidgetAlerts(response.alerts);
            }
            
            // Store analysis for popup
            chrome.storage.local.set({
                'current_page_analysis': response,
                'analysis_timestamp': Date.now()
            });
            
        } catch (error) {
            console.error('Page analysis error:', error);
        }
    }

    extractPageData() {
        const url = window.location.href;
        const domain = window.location.hostname;
        const title = document.title;
        
        // Extract various page indicators
        const hasSSL = window.location.protocol === 'https:';
        const hasContactInfo = this.checkForContactInfo();
        const hasPrivacyPolicy = this.checkForPrivacyPolicy();
        const hasTermsOfService = this.checkForTermsOfService();
        const suspiciousElements = this.detectSuspiciousElements();
        
        return {
            url,
            domain,
            title,
            has_ssl: hasSSL,
            has_contact_info: hasContactInfo,
            has_privacy_policy: hasPrivacyPolicy,
            has_terms_of_service: hasTermsOfService,
            suspicious_elements: suspiciousElements,
            page_text: document.body.innerText.substring(0, 5000) // First 5000 chars
        };
    }

    checkForContactInfo() {
        const contactIndicators = [
            'contact', 'email', 'phone', 'address', 'support'
        ];
        
        return contactIndicators.some(indicator => 
            document.body.innerText.toLowerCase().includes(indicator)
        );
    }

    checkForPrivacyPolicy() {
        const privacyLinks = document.querySelectorAll('a[href*="privacy"], a[href*="policy"]');
        return privacyLinks.length > 0;
    }

    checkForTermsOfService() {
        const termsLinks = document.querySelectorAll('a[href*="terms"], a[href*="service"]');
        return termsLinks.length > 0;
    }

    detectSuspiciousElements() {
        const suspicious = [];
        
        // Check for popup overlays
        const popups = document.querySelectorAll('[style*="position: fixed"], [style*="position: absolute"]');
        if (popups.length > 5) {
            suspicious.push('excessive_popups');
        }
        
        // Check for suspicious form fields
        const suspiciousInputs = document.querySelectorAll('input[type="password"][name*="admin"], input[name*="ssn"], input[name*="social"]');
        if (suspiciousInputs.length > 0) {
            suspicious.push('suspicious_form_fields');
        }
        
        // Check for fake urgency indicators
        const urgencyText = document.body.innerText.toLowerCase();
        const urgencyKeywords = ['limited time', 'act now', 'expires today', 'only today'];
        if (urgencyKeywords.some(keyword => urgencyText.includes(keyword))) {
            suspicious.push('urgency_tactics');
        }
        
        return suspicious;
    }

    async analyzePageReviews() {
        const reviews = this.extractAllReviews();
        
        if (reviews.length === 0) {
            this.showNotification('No reviews found on this page', 'info');
            return;
        }

        try {
            // HERE IS WHERE YOU INTEGRATE YOUR .PKL MODEL
            // Send reviews to your FastAPI backend for ML analysis
            const response = await this.makeAPICall('/analyze/reviews', {
                reviews: reviews,
                url: window.location.href
            });

            this.displayReviewAnalysisResults(response);
            
        } catch (error) {
            console.error('Review analysis error:', error);
            this.showNotification('Failed to analyze reviews', 'error');
        }
    }

    extractAllReviews() {
        const reviews = [];
        const reviewSelectors = [
            '[data-hook="review-body"]',
            '.review-text',
            '.review-content',
            '.user-review',
            '[class*="review"]:not([class*="preview"])'
        ];

        reviewSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const text = el.textContent.trim();
                if (text.length > 20 && text.length < 2000) {
                    reviews.push({
                        text: text,
                        rating: this.extractRatingFromElement(el),
                        author: this.extractAuthorFromElement(el),
                        date: this.extractDateFromElement(el),
                        element: el
                    });
                }
            });
        });

        return reviews.slice(0, 100); // Limit processing
    }

    extractRatingFromElement(element) {
        // Look for star ratings, numeric ratings, etc.
        const ratingElement = element.closest('[class*="rating"]') || 
                            element.closest('[class*="star"]') ||
                            element.parentElement.querySelector('[class*="rating"], [class*="star"]');
        
        if (ratingElement) {
            const ratingText = ratingElement.textContent;
            const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)\s*\/?\s*(?:out of|of)?\s*(\d+)/);
            if (ratingMatch) {
                return parseFloat(ratingMatch[1]);
            }
        }
        
        return null;
    }

    extractAuthorFromElement(element) {
        const authorElement = element.closest('[class*="review"]')?.querySelector('[class*="author"], [class*="user"], [class*="name"]');
        return authorElement ? authorElement.textContent.trim() : null;
    }

    extractDateFromElement(element) {
        const dateElement = element.closest('[class*="review"]')?.querySelector('[class*="date"], time, [datetime]');
        return dateElement ? dateElement.textContent.trim() || dateElement.getAttribute('datetime') : null;
    }

    async analyzeIndividualReview(reviewElement, button) {
        const originalText = button.innerHTML;
        button.innerHTML = '⏳';
        button.disabled = true;

        try {
            const reviewText = reviewElement.textContent.trim();
            const response = await this.makeAPICall('/analyze/single-review', {
                review_text: reviewText,
                url: window.location.href
            });

            this.showReviewAnalysisResult(reviewElement, response);
            
        } catch (error) {
            console.error('Individual review analysis error:', error);
        } finally {
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    showReviewAnalysisResult(reviewElement, result) {
        const existing = reviewElement.parentElement.querySelector('.fb-review-result');
        if (existing) existing.remove();

        const resultDiv = document.createElement('div');
        resultDiv.className = 'fb-review-result';
        
        const isFake = result.is_fake_probability > 0.7;
        const confidence = Math.round(result.confidence * 100);
        
        resultDiv.innerHTML = `
            <div class="fb-analysis-badge ${isFake ? 'fake' : 'genuine'}">
                ${isFake ? '⚠️ Likely Fake' : '✅ Appears Genuine'} (${confidence}% confidence)
            </div>
        `;
        
        resultDiv.style.cssText = `
            position: absolute;
            top: 30px;
            right: 5px;
            z-index: 10001;
            background: ${isFake ? '#fee2e2' : '#dcfce7'};
            border: 1px solid ${isFake ? '#fca5a5' : '#86efac'};
            border-radius: 6px;
            padding: 4px 8px;
            font-size: 11px;
            color: ${isFake ? '#dc2626' : '#16a34a'};
            max-width: 150px;
        `;

        reviewElement.parentElement.appendChild(resultDiv);
        
        // Auto-hide after 10 seconds
        setTimeout(() => {
            if (resultDiv.parentElement) {
                resultDiv.remove();
            }
        }, 10000);
    }

    async findPageCoupons() {
        try {
            const domain = window.location.hostname;
            const response = await this.makeAPICall('/coupons/find', {
                domain: domain,
                url: window.location.href,
                page_content: this.extractCouponRelevantContent()
            });

            this.displayCouponResults(response);
            
        } catch (error) {
            console.error('Coupon finding error:', error);
            this.showNotification('Failed to find coupons', 'error');
        }
    }

    extractCouponRelevantContent() {
        // Look for product names, prices, categories
        const productSelectors = [
            '[class*="product"]',
            '[class*="item"]',
            '[class*="title"]',
            'h1', 'h2', 'h3'
        ];
        
        const content = [];
        productSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const text = el.textContent.trim();
                if (text.length > 5 && text.length < 200) {
                    content.push(text);
                }
            });
        });
        
        return content.slice(0, 20); // Limit to 20 items
    }

    displayCouponResults(results) {
        const validCoupons = results.valid_coupons || [];
        
        if (validCoupons.length === 0) {
            this.showNotification('No valid coupons found for this site', 'info');
            return;
        }

        // Create coupon overlay
        this.createCouponOverlay(validCoupons);
    }

    createCouponOverlay(coupons) {
        // Remove existing overlay
        const existing = document.getElementById('fb-coupon-overlay');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'fb-coupon-overlay';
        overlay.innerHTML = `
            <div class="fb-coupon-modal">
                <div class="fb-coupon-header">
                    <h3>🎫 Found ${coupons.length} Valid Coupons!</h3>
                    <button class="fb-close-coupons">×</button>
                </div>
                <div class="fb-coupon-list">
                    ${coupons.map(coupon => `
                        <div class="fb-coupon-item">
                            <div class="fb-coupon-code">${coupon.code}</div>
                            <div class="fb-coupon-desc">${coupon.description}</div>
                            <div class="fb-coupon-savings">${coupon.savings || 'Savings Vary'}</div>
                            <button class="fb-copy-coupon" data-code="${coupon.code}">Copy Code</button>
                        </div>
                    `).join('')}
                </div>
                <div class="fb-coupon-footer">
                    <small>Automatically verified and tested ✓</small>
                </div>
            </div>
        `;

        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Add event listeners
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.classList.contains('fb-close-coupons')) {
                overlay.remove();
            } else if (e.target.classList.contains('fb-copy-coupon')) {
                const code = e.target.dataset.code;
                navigator.clipboard.writeText(code).then(() => {
                    e.target.textContent = 'Copied!';
                    setTimeout(() => e.target.textContent = 'Copy Code', 2000);
                });
            }
        });

        document.body.appendChild(overlay);
    }

    async checkCurrentSite() {
        try {
            const siteData = this.extractPageData();
            const response = await this.makeAPICall('/analyze/legitimacy', siteData);
            
            this.displaySiteCheckResults(response);
            
        } catch (error) {
            console.error('Site check error:', error);
            this.showNotification('Failed to check site legitimacy', 'error');
        }
    }

    displaySiteCheckResults(results) {
        const isLegitimate = results.is_legitimate;
        const riskLevel = results.risk_level;
        const trustScore = results.trust_score;
        
        let message, type;
        if (isLegitimate && riskLevel === 'low') {
            message = `✅ Site appears legitimate (Trust Score: ${trustScore}/100)`;
            type = 'success';
        } else if (riskLevel === 'medium') {
            message = `⚠️ Proceed with caution (Trust Score: ${trustScore}/100)`;
            type = 'warning';
        } else {
            message = `🚨 High risk site detected (Trust Score: ${trustScore}/100)`;
            type = 'error';
        }
        
        this.showNotification(message, type);
        this.updateWidgetTrustScore(trustScore);
        
        if (results.warnings && results.warnings.length > 0) {
            this.showWidgetAlerts(results.warnings);
        }
    }

    updateWidgetTrustScore(score) {
        const scoreElement = document.getElementById('fbTrustScore');
        if (scoreElement) {
            scoreElement.textContent = score ? `${score}/100` : '--';
            scoreElement.style.color = score >= 70 ? '#16a34a' : score >= 40 ? '#f59e0b' : '#dc2626';
        }
    }

    showWidgetAlerts(alerts) {
        const alertsContainer = document.getElementById('fbAlerts');
        if (!alertsContainer) return;
        
        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="fb-alert ${alert.type || 'warning'}">
                ${alert.message}
            </div>
        `).join('');
    }

    showNotification(message, type = 'info') {
        if (!this.settings.show_notifications) return;

        const notification = document.createElement('div');
        notification.className = 'fb-notification';
        notification.innerHTML = `
            <div class="fb-notification-content ${type}">
                ${message}
                <button class="fb-notification-close">×</button>
            </div>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;

        notification.querySelector('.fb-notification-close').addEventListener('click', () => {
            notification.remove();
        });

        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    getNotificationColor(type) {
        switch (type) {
            case 'success': return '#16a34a';
            case 'warning': return '#f59e0b';
            case 'error': return '#dc2626';
            default: return '#3b82f6';
        }
    }

    async makeAPICall(endpoint, data) {
        try {
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Extension-Origin': 'fakebuster'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API call error for ${endpoint}:`, error);
            throw error;
        }
    }

    handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'analyze_reviews':
                this.analyzePageReviews().then(sendResponse);
                return true; // Indicates async response
                
            case 'find_coupons':
                this.findPageCoupons().then(sendResponse);
                return true;
                
            case 'check_site':
                this.checkCurrentSite().then(sendResponse);
                return true;
                
            case 'get_page_data':
                sendResponse(this.extractPageData());
                break;
                
            case 'extract_reviews':
                sendResponse(this.extractAllReviews());
                break;
        }
    }

    checkForNewReviews(addedNodes) {
        addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const reviewSelectors = [
                    '[data-hook="review-body"]',
                    '.review-text',
                    '.review-content'
                ];
                
                reviewSelectors.forEach(selector => {
                    const reviews = node.querySelectorAll ? node.querySelectorAll(selector) : [];
                    if (reviews.length > 0) {
                        this.addReviewAnalysisButtons(Array.from(reviews));
                    }
                });
            }
        });
    }

    checkForNewForms(addedNodes) {
        addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const forms = node.querySelectorAll ? node.querySelectorAll('form') : [];
                forms.forEach(form => {
                    const hasPaymentFields = form.querySelector('input[type="password"], input[name*="card"]');
                    if (hasPaymentFields) {
                        this.addFormProtection(form);
                    }
                });
            }
        });
    }

    async verifyFormSecurity(form) {
        try {
            const formData = {
                url: window.location.href,
                has_ssl: window.location.protocol === 'https:',
                form_fields: Array.from(form.querySelectorAll('input')).map(input => ({
                    type: input.type,
                    name: input.name,
                    required: input.required
                }))
            };

            const response = await this.makeAPICall('/analyze/form-security', formData);
            
            if (response.is_secure) {
                this.showNotification('✅ Form security verified', 'success');
            } else {
                this.showNotification('⚠️ Security concerns detected', 'warning');
            }
            
        } catch (error) {
            console.error('Form security check error:', error);
            this.showNotification('Failed to verify form security', 'error');
        }
    }

    // Cleanup method
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        const widget = document.getElementById('fakebuster-widget');
        if (widget) widget.remove();
    }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FakeBusterContentScript();
    });
} else {
    new FakeBusterContentScript();
}

// Inject CSS for the content script
const css = `
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

#fakebuster-widget {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    font-family: 'Inter', sans-serif;
}

.fb-widget-toggle {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    color: white;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: transform 0.2s;
}

.fb-widget-toggle:hover {
    transform: scale(1.05);
}

.fb-widget-panel {
    position: absolute;
    bottom: 70px;
    right: 0;
    width: 280px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.12);
    border: 1px solid rgba(0,0,0,0.1);
}

.fb-widget-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e5e7eb;
    font-weight: 600;
    color: #374151;
}

.fb-widget-close {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #6b7280;
}

.fb-widget-content {
    padding: 16px;
}

.fb-trust-score {
    margin-bottom: 12px;
    font-size: 14px;
    color: #374151;
}

.fb-quick-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
}

.fb-action-btn {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    padding: 8px 12px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 12px;
}

.fb-action-btn:hover {
    background: #e5e7eb;
}

.fb-alerts {
    font-size: 12px;
}

.fb-alert {
    padding: 6px 8px;
    border-radius: 4px;
    margin-bottom: 4px;
}

.fb-alert.warning {
    background: #fef3c7;
    color: #92400e;
    border: 1px solid #f59e0b;
}

.fb-alert.error {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fca5a5;
}

.fb-coupon-modal {
    background: white;
    border-radius: 12px;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}

.fb-coupon-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
}

.fb-coupon-header h3 {
    margin: 0;
    color: #374151;
}

.fb-close-coupons {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #6b7280;
}

.fb-coupon-list {
    padding: 20px;
}

.fb-coupon-item {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.fb-coupon-code {
    font-family: monospace;
    font-weight: bold;
    background: #f3f4f6;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px;
}

.fb-coupon-desc {
    flex: 1;
    margin: 0 12px;
    font-size: 14px;
    color: #374151;
}

.fb-copy-coupon {
    background: #667eea;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
}

.fb-coupon-footer {
    padding: 16px 20px;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
    text-align: center;
    color: #6b7280;
}
`;

const style = document.createElement('style');
style.textContent = css;
document.head.appendChild(style);
