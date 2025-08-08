// FakeBuster Popup JavaScript
class FakeBusterPopup {
    constructor() {
        this.apiBaseUrl = 'https://your-api-domain.com/api/v1';
        this.currentTab = null;
        this.user = null;
        this.initializeFirebase();
        this.init();
    }

    async initializeFirebase() {
        // Firebase configuration will be injected here
        const firebaseConfig = {
            // Your Firebase config object
            apiKey: "your-api-key",
            authDomain: "your-project.firebaseapp.com",
            projectId: "your-project-id",
            storageBucket: "your-project.appspot.com",
            messagingSenderId: "123456789",
            appId: "your-app-id"
        };

        try {
            // Initialize Firebase (assuming Firebase SDK is loaded)
            if (typeof firebase !== 'undefined') {
                firebase.initializeApp(firebaseConfig);
                this.auth = firebase.auth();
                this.firestore = firebase.firestore();
                
                // Listen for auth state changes
                this.auth.onAuthStateChanged((user) => {
                    this.user = user;
                    this.updateAuthUI();
                });
            }
        } catch (error) {
            console.error('Firebase initialization error:', error);
        }
    }

    async init() {
        await this.getCurrentTab();
        this.setupEventListeners();
        this.loadUserSettings();
        this.performInitialAnalysis();
    }

    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tab;
            this.updateCurrentSiteInfo();
        } catch (error) {
            console.error('Error getting current tab:', error);
        }
    }

    setupEventListeners() {
        // Refresh analysis
        document.getElementById('refreshAnalysis').addEventListener('click', () => {
            this.performSiteAnalysis();
        });

        // Feature buttons
        document.getElementById('analyzeReviews').addEventListener('click', () => {
            this.analyzeReviews();
        });

        document.getElementById('findCoupons').addEventListener('click', () => {
            this.findCoupons();
        });

        document.getElementById('checkWebsite').addEventListener('click', () => {
            this.checkWebsiteLegitimacy();
        });

        // Settings and dashboard
        document.getElementById('openSettings').addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('openDashboard').addEventListener('click', () => {
            this.openDashboard();
        });

        // Authentication
        document.getElementById('authBtn').addEventListener('click', () => {
            this.handleAuth();
        });
    }

    updateCurrentSiteInfo() {
        if (!this.currentTab) return;

        const urlElement = document.getElementById('currentUrl');
        const hostname = new URL(this.currentTab.url).hostname;
        urlElement.textContent = hostname;
    }

    async performInitialAnalysis() {
        if (!this.currentTab) return;

        this.showAnalyzing();
        
        try {
            // Perform all analyses in parallel
            const [siteAnalysis, reviewAnalysis, couponCheck] = await Promise.allSettled([
                this.performSiteAnalysis(),
                this.checkForReviews(),
                this.checkForCoupons()
            ]);

            this.updateAnalysisResults(siteAnalysis, reviewAnalysis, couponCheck);
        } catch (error) {
            console.error('Analysis error:', error);
            this.showError('Analysis failed. Please try again.');
        }
    }

    async performSiteAnalysis() {
        try {
            const response = await this.makeAPICall('/analyze/website', {
                url: this.currentTab.url,
                domain: new URL(this.currentTab.url).hostname
            });

            this.updateTrustScore(response.trust_score);
            this.updateSiteStatus(response.status, response.warnings);
            
            return response;
        } catch (error) {
            console.error('Site analysis error:', error);
            this.updateSiteStatus('error', ['Unable to analyze website']);
            return null;
        }
    }

    async analyzeReviews() {
        this.setFeatureLoading('reviewAnalysis', true);
        
        try {
            // Get page content to find reviews
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: this.extractReviewsFromPage
            });

            const reviews = result[0].result;
            
            if (reviews.length === 0) {
                this.updateFeatureStatus('reviewStatus', 'No reviews found on this page');
                return;
            }

            // Send reviews to backend for analysis
            // PLACE YOUR .PKL MODEL INTEGRATION HERE
            const response = await this.makeAPICall('/analyze/reviews', {
                reviews: reviews,
                url: this.currentTab.url
            });

            this.updateReviewAnalysis(response);
            
        } catch (error) {
            console.error('Review analysis error:', error);
            this.updateFeatureStatus('reviewStatus', 'Failed to analyze reviews');
        } finally {
            this.setFeatureLoading('reviewAnalysis', false);
        }
    }

    // Function to be injected into page to extract reviews
    extractReviewsFromPage() {
        const reviews = [];
        const reviewSelectors = [
            '[data-hook="review-body"]', // Amazon
            '.review-text', // Generic
            '.review-content',
            '.user-review',
            '[class*="review"]',
            '[class*="comment"]'
        ];

        reviewSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                const text = el.textContent.trim();
                if (text.length > 20 && text.length < 1000) {
                    reviews.push({
                        text: text,
                        rating: this.extractRating(el),
                        author: this.extractAuthor(el),
                        date: this.extractDate(el)
                    });
                }
            });
        });

        return reviews.slice(0, 50); // Limit to 50 reviews

        function extractRating(element) {
            const ratingElement = element.closest('[class*="rating"]') || 
                                element.parentElement.querySelector('[class*="star"]');
            // Extract rating logic here
            return null;
        }

        function extractAuthor(element) {
            const authorElement = element.closest('[class*="review"]').querySelector('[class*="author"], [class*="user"]');
            return authorElement ? authorElement.textContent.trim() : null;
        }

        function extractDate(element) {
            const dateElement = element.closest('[class*="review"]').querySelector('[class*="date"], time');
            return dateElement ? dateElement.textContent.trim() : null;
        }
    }

    async findCoupons() {
        this.setFeatureLoading('couponFinder', true);
        
        try {
            const domain = new URL(this.currentTab.url).hostname;
            const response = await this.makeAPICall('/coupons/find', {
                domain: domain,
                url: this.currentTab.url
            });

            this.updateCouponResults(response);
            
        } catch (error) {
            console.error('Coupon finding error:', error);
            this.updateFeatureStatus('couponStatus', 'Failed to find coupons');
        } finally {
            this.setFeatureLoading('couponFinder', false);
        }
    }

    async checkWebsiteLegitimacy() {
        this.setFeatureLoading('websiteCheck', true);
        
        try {
            const response = await this.makeAPICall('/analyze/legitimacy', {
                url: this.currentTab.url,
                domain: new URL(this.currentTab.url).hostname
            });

            this.updateWebsiteLegitimacy(response);
            
        } catch (error) {
            console.error('Website legitimacy check error:', error);
            this.updateFeatureStatus('websiteStatus', 'Failed to verify website');
        } finally {
            this.setFeatureLoading('websiteCheck', false);
        }
    }

    async checkForReviews() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const result = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const reviewSelectors = [
                        '[data-hook="review-body"]',
                        '.review-text',
                        '.review-content',
                        '[class*="review"]'
                    ];
                    
                    for (const selector of reviewSelectors) {
                        if (document.querySelector(selector)) {
                            return true;
                        }
                    }
                    return false;
                }
            });

            const hasReviews = result[0].result;
            this.updateFeatureStatus('reviewStatus', hasReviews ? 'Reviews detected' : 'No reviews found');
            
            return hasReviews;
        } catch (error) {
            console.error('Review check error:', error);
            return false;
        }
    }

    async checkForCoupons() {
        try {
            const domain = new URL(this.currentTab.url).hostname;
            const response = await this.makeAPICall('/coupons/check', { domain });
            
            const couponCount = response.available_coupons || 0;
            this.updateFeatureStatus('couponStatus', 
                couponCount > 0 ? `${couponCount} coupons available` : 'No coupons available'
            );
            
            return response;
        } catch (error) {
            console.error('Coupon check error:', error);
            return null;
        }
    }

    updateTrustScore(score) {
        const scoreElement = document.getElementById('trustScoreValue');
        const fillElement = document.getElementById('trustScoreFill');
        
        scoreElement.textContent = score ? `${score}/100` : '--';
        fillElement.style.width = score ? `${score}%` : '0%';
    }

    updateSiteStatus(status, warnings = []) {
        const statusElement = document.getElementById('siteStatus');
        const protectionStatus = document.getElementById('protectionStatus');
        
        let badgeClass, statusText, protectionText, statusDot;
        
        switch (status) {
            case 'safe':
                badgeClass = 'safe';
                statusText = 'Website appears safe';
                protectionText = 'Protected';
                statusDot = 'active';
                break;
            case 'warning':
                badgeClass = 'warning';
                statusText = 'Proceed with caution';
                protectionText = 'Warning';
                statusDot = 'inactive';
                break;
            case 'danger':
                badgeClass = 'danger';
                statusText = 'Potentially dangerous';
                protectionText = 'Blocked';
                statusDot = 'inactive';
                break;
            default:
                badgeClass = 'analyzing';
                statusText = 'Analyzing...';
                protectionText = 'Checking';
                statusDot = 'active';
        }
        
        statusElement.innerHTML = `<div class="status-badge ${badgeClass}">${statusText}</div>`;
        
        // Update protection status
        const statusDotElement = protectionStatus.querySelector('.status-dot');
        const statusTextElement = protectionStatus.querySelector('.status-text');
        statusDotElement.className = `status-dot ${statusDot}`;
        statusTextElement.textContent = protectionText;
        
        // Show warnings if any
        if (warnings.length > 0) {
            this.showNotifications(warnings);
        }
    }

    updateFeatureStatus(elementId, status) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = status;
        }
    }

    setFeatureLoading(featureId, isLoading) {
        const featureCard = document.getElementById(featureId);
        const actionBtn = featureCard.querySelector('.action-btn');
        
        if (isLoading) {
            featureCard.classList.add('loading');
            actionBtn.disabled = true;
        } else {
            featureCard.classList.remove('loading');
            actionBtn.disabled = false;
        }
    }

    showAnalyzing() {
        this.updateSiteStatus('analyzing');
        this.updateTrustScore(null);
    }

    showNotifications(notifications) {
        const notificationsSection = document.getElementById('notifications');
        const notificationList = document.getElementById('notificationList');
        
        notificationList.innerHTML = '';
        
        notifications.forEach(notification => {
            const div = document.createElement('div');
            div.className = `notification-item ${notification.type || 'warning'}`;
            div.textContent = notification.message || notification;
            notificationList.appendChild(div);
        });
        
        notificationsSection.style.display = 'block';
    }

    updateReviewAnalysis(analysisResult) {
        const fakeCount = analysisResult.fake_reviews || 0;
        const totalCount = analysisResult.total_reviews || 0;
        const confidence = analysisResult.confidence || 0;
        
        let statusText;
        if (fakeCount === 0) {
            statusText = 'Reviews appear genuine';
        } else {
            const percentage = Math.round((fakeCount / totalCount) * 100);
            statusText = `${percentage}% potentially fake (${fakeCount}/${totalCount})`;
        }
        
        this.updateFeatureStatus('reviewStatus', statusText);
        
        if (fakeCount > 0) {
            this.showNotifications([{
                type: 'warning',
                message: `Detected ${fakeCount} potentially fake reviews`
            }]);
        }
    }

    updateCouponResults(coupons) {
        const validCoupons = coupons.valid_coupons || [];
        
        if (validCoupons.length > 0) {
            this.updateFeatureStatus('couponStatus', `${validCoupons.length} valid coupons found`);
            
            // You could open a modal or new tab with coupon details
            this.showCouponModal(validCoupons);
        } else {
            this.updateFeatureStatus('couponStatus', 'No valid coupons found');
        }
    }

    updateWebsiteLegitimacy(legitimacyResult) {
        const isLegitimate = legitimacyResult.is_legitimate;
        const riskLevel = legitimacyResult.risk_level || 'low';
        
        let statusText;
        switch (riskLevel) {
            case 'low':
                statusText = 'Website appears legitimate';
                break;
            case 'medium':
                statusText = 'Some concerns detected';
                break;
            case 'high':
                statusText = 'High risk website';
                break;
            default:
                statusText = 'Unable to verify';
        }
        
        this.updateFeatureStatus('websiteStatus', statusText);
        
        if (legitimacyResult.warnings) {
            this.showNotifications(legitimacyResult.warnings);
        }
    }

    showCouponModal(coupons) {
        // Create a simple modal to display coupons
        const modal = document.createElement('div');
        modal.className = 'coupon-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Available Coupons</h3>
                <div class="coupon-list">
                    ${coupons.map(coupon => `
                        <div class="coupon-item">
                            <span class="coupon-code">${coupon.code}</span>
                            <span class="coupon-desc">${coupon.description}</span>
                            <button class="copy-coupon" data-code="${coupon.code}">Copy</button>
                        </div>
                    `).join('')}
                </div>
                <button class="close-modal">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners for copy and close
        modal.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-coupon')) {
                navigator.clipboard.writeText(e.target.dataset.code);
                e.target.textContent = 'Copied!';
                setTimeout(() => e.target.textContent = 'Copy', 2000);
            } else if (e.target.classList.contains('close-modal')) {
                modal.remove();
            }
        });
    }

    async makeAPICall(endpoint, data) {
        try {
            const token = this.user ? await this.user.getIdToken() : null;
            
            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { 'Authorization': `Bearer ${token}` })
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

    openSettings() {
        chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
    }

    openDashboard() {
        chrome.tabs.create({ url: 'https://your-dashboard-domain.com' });
    }

    async handleAuth() {
        try {
            if (this.user) {
                // Sign out
                await this.auth.signOut();
            } else {
                // Sign in with popup
                const provider = new firebase.auth.GoogleAuthProvider();
                await this.auth.signInWithPopup(provider);
            }
        } catch (error) {
            console.error('Authentication error:', error);
        }
    }

    updateAuthUI() {
        const authBtn = document.getElementById('authBtn');
        const userInfo = document.getElementById('userInfo');
        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        
        if (this.user) {
            authBtn.textContent = 'Sign Out';
            userInfo.style.display = 'flex';
            userAvatar.src = this.user.photoURL || 'https://via.placeholder.com/24';
            userName.textContent = this.user.displayName || this.user.email;
        } else {
            authBtn.textContent = 'Sign In';
            userInfo.style.display = 'none';
        }
    }

    async loadUserSettings() {
        try {
            const settings = await chrome.storage.sync.get(['fakebuster_settings']);
            this.settings = settings.fakebuster_settings || {
                auto_analyze: true,
                show_notifications: true,
                protection_level: 'medium'
            };
        } catch (error) {
            console.error('Error loading settings:', error);
            this.settings = { auto_analyze: true, show_notifications: true, protection_level: 'medium' };
        }
    }

    showError(message) {
        this.showNotifications([{ type: 'danger', message }]);
    }
}

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FakeBusterPopup();
});
