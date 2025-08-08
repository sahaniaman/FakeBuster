// FakeBuster Background Service Worker
class FakeBusterBackground {
    constructor() {
        this.apiBaseUrl = 'http://localhost:8000/api/v1';
        this.maliciousDomains = new Set();
        this.trustedDomains = new Set();
        this.setupEventListeners();
        this.loadMaliciousDomains();
        
        // Set up offline fallback data
        this.offlineMaliciousDomains = [
            'fakeshop-scam.com',
            'phishing-site.net',
            'malware-download.org',
            'scam-crypto.com',
            'fake-login.net',
            'trojan-installer.site'
        ];
    }

    setupEventListeners() {
        // Extension installation
        chrome.runtime.onInstalled.addListener(this.handleInstall.bind(this));
        
        // Tab updates
        chrome.tabs.onUpdated.addListener(this.handleTabUpdate.bind(this));
        
        // Message handling
        chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
        
        // Context menu creation
        chrome.contextMenus.onClicked.addListener(this.handleContextMenu.bind(this));
        
        // Alarm for periodic tasks
        chrome.alarms.onAlarm.addListener(this.handleAlarm.bind(this));
    }

    async handleInstall(details) {
        if (details.reason === 'install') {
            // First installation
            await this.initializeExtension();
        } else if (details.reason === 'update') {
            // Extension updated
            await this.handleUpdate(details.previousVersion);
        }
    }

    async initializeExtension() {
        // Set default settings
        const defaultSettings = {
            auto_analyze: true,
            show_notifications: true,
            protection_level: 'medium',
            block_suspicious: false,
            coupon_finder_enabled: true,
            review_analysis_enabled: true
        };

        await chrome.storage.sync.set({ fakebuster_settings: defaultSettings });

        // Create context menus
        this.createContextMenus();
        
        // Set up periodic tasks
        chrome.alarms.create('updateMaliciousDomains', { 
            delayInMinutes: 1, 
            periodInMinutes: 60 
        });
        
        chrome.alarms.create('syncUserData', { 
            delayInMinutes: 5, 
            periodInMinutes: 30 
        });

        // Open welcome page
        chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
        
        console.log('FakeBuster extension initialized');
    }

    createContextMenus() {
        chrome.contextMenus.create({
            id: 'analyzePage',
            title: 'Analyze this page with FakeBuster',
            contexts: ['page']
        });

        chrome.contextMenus.create({
            id: 'analyzeSelection',
            title: 'Analyze selected text',
            contexts: ['selection']
        });

        chrome.contextMenus.create({
            id: 'findCoupons',
            title: 'Find coupons for this site',
            contexts: ['page']
        });

        chrome.contextMenus.create({
            id: 'reportSite',
            title: 'Report suspicious site',
            contexts: ['page']
        });
    }

    async handleTabUpdate(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.url) {
            const url = new URL(tab.url);
            
            // Skip internal pages
            if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
                return;
            }

            // Check against malicious domains
            if (this.maliciousDomains.has(url.hostname)) {
                await this.blockMaliciousPage(tabId, tab.url);
                return;
            }

            // Perform automatic analysis if enabled
            const settings = await this.getSettings();
            if (settings.auto_analyze) {
                this.schedulePageAnalysis(tabId, tab.url);
            }

            // Update badge based on site status
            this.updateBadge(tabId, url.hostname);
        }
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'analyzeWebsite':
                    const analysis = await this.analyzeWebsite(request.url);
                    sendResponse(analysis);
                    break;

                case 'getTrustScore':
                    const trustScore = await this.getTrustScore(request.domain);
                    sendResponse({ trustScore });
                    break;

                case 'reportMalicious':
                    await this.reportMaliciousSite(request.url, request.reason);
                    sendResponse({ success: true });
                    break;

                case 'getUserData':
                    const userData = await this.getUserData();
                    sendResponse(userData);
                    break;

                case 'updateSettings':
                    await this.updateSettings(request.settings);
                    sendResponse({ success: true });
                    break;

                default:
                    sendResponse({ error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Message handling error:', error);
            sendResponse({ error: error.message });
        }
        
        return true; // Indicates async response
    }

    async handleContextMenu(info, tab) {
        switch (info.menuItemId) {
            case 'analyzePage':
                await this.analyzePageFromContextMenu(tab);
                break;

            case 'analyzeSelection':
                await this.analyzeSelectedText(info.selectionText, tab);
                break;

            case 'findCoupons':
                await this.findCouponsFromContextMenu(tab);
                break;

            case 'reportSite':
                await this.reportSiteFromContextMenu(tab);
                break;
        }
    }

    async handleAlarm(alarm) {
        switch (alarm.name) {
            case 'updateMaliciousDomains':
                await this.updateMaliciousDomainsList();
                break;

            case 'syncUserData':
                await this.syncUserDataWithServer();
                break;
        }
    }

    async loadMaliciousDomains() {
        try {
            // Load from local storage first
            const stored = await chrome.storage.local.get(['malicious_domains']);
            if (stored.malicious_domains) {
                this.maliciousDomains = new Set(stored.malicious_domains);
            }

            // Update from server
            await this.updateMaliciousDomainsList();
        } catch (error) {
            console.error('Error loading malicious domains:', error);
        }
    }

    async updateMaliciousDomainsList() {
        try {
            const response = await this.makeAPICall('/security/malicious-domains', {}, 'GET');
            const domains = response.domains || [];
            
            this.maliciousDomains = new Set(domains);
            
            // Store locally for offline access
            await chrome.storage.local.set({ 
                malicious_domains: domains,
                last_updated: Date.now()
            });
            
            console.log(`Updated malicious domains list: ${domains.length} domains`);
        } catch (error) {
            console.error('Error updating malicious domains:', error);
            
            // Use offline fallback data
            this.maliciousDomains = new Set(this.offlineMaliciousDomains);
            console.log('Using offline malicious domains list');
        }
    }

    async blockMaliciousPage(tabId, url) {
        const blockPageUrl = chrome.runtime.getURL('blocked/blocked.html') + 
                             '?url=' + encodeURIComponent(url);
        
        try {
            await chrome.tabs.update(tabId, { url: blockPageUrl });
            
            // Show notification (check if notifications permission is available)
            if (chrome.notifications) {
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: chrome.runtime.getURL('popup/popup.html'), // Use popup as fallback
                    title: 'FakeBuster - Malicious Site Blocked',
                    message: 'This website has been identified as potentially malicious and has been blocked.'
                });
            }
            
        } catch (error) {
            console.error('Error blocking malicious page:', error);
        }
    }

    async schedulePageAnalysis(tabId, url) {
        // Debounce rapid tab changes
        if (this.analysisTimeouts && this.analysisTimeouts[tabId]) {
            clearTimeout(this.analysisTimeouts[tabId]);
        }
        
        if (!this.analysisTimeouts) this.analysisTimeouts = {};
        
        this.analysisTimeouts[tabId] = setTimeout(async () => {
            try {
                const analysis = await this.analyzeWebsite(url);
                
                // Store analysis result
                await chrome.storage.local.set({
                    [`analysis_${tabId}`]: {
                        ...analysis,
                        timestamp: Date.now(),
                        url: url
                    }
                });
                
                // Update badge based on analysis
                this.updateBadgeFromAnalysis(tabId, analysis);
                
            } catch (error) {
                console.error('Scheduled page analysis error:', error);
            }
        }, 2000); // 2 second delay
    }

    async analyzeWebsite(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            
            // Quick local checks first
            const localAnalysis = this.performLocalAnalysis(urlObj);
            
            try {
                // Server-side analysis
                const serverAnalysis = await this.makeAPICall('/analyze/website', {
                    url: url,
                    domain: domain,
                    local_analysis: localAnalysis
                }, 'POST');
                
                return {
                    ...localAnalysis,
                    ...serverAnalysis,
                    analyzed_at: Date.now(),
                    source: 'server'
                };
            } catch (serverError) {
                console.log('Server analysis failed, using local analysis only');
                
                // Enhanced local analysis when server is unavailable
                const enhancedLocalAnalysis = {
                    ...localAnalysis,
                    trust_score: localAnalysis.local_trust_score || 50,
                    status: localAnalysis.local_trust_score >= 70 ? 'safe' : 
                           localAnalysis.local_trust_score >= 40 ? 'warning' : 'danger',
                    warnings: this.generateLocalWarnings(localAnalysis),
                    is_legitimate: localAnalysis.local_trust_score >= 50,
                    risk_level: localAnalysis.local_trust_score >= 70 ? 'low' :
                               localAnalysis.local_trust_score >= 40 ? 'medium' : 'high',
                    analyzed_at: Date.now(),
                    source: 'local'
                };
                
                return enhancedLocalAnalysis;
            }
            
        } catch (error) {
            console.error('Website analysis error:', error);
            return {
                trust_score: 50,
                status: 'unknown',
                warnings: ['Unable to complete analysis'],
                is_legitimate: true,
                risk_level: 'medium',
                analyzed_at: Date.now(),
                source: 'fallback'
            };
        }
    }

    generateLocalWarnings(analysis) {
        const warnings = [];
        
        if (!analysis.has_ssl) {
            warnings.push('Website does not use HTTPS encryption');
        }
        
        if (analysis.suspicious_tld) {
            warnings.push('Uses a suspicious top-level domain');
        }
        
        if (analysis.url_length > 100) {
            warnings.push('Unusually long URL');
        }
        
        if (analysis.subdomain_count > 3) {
            warnings.push('Multiple subdomains detected');
        }
        
        return warnings;
    }

    performLocalAnalysis(urlObj) {
        const analysis = {
            has_ssl: urlObj.protocol === 'https:',
            domain_age: null, // Would need external service
            suspicious_tld: this.checkSuspiciousTLD(urlObj.hostname),
            url_length: urlObj.href.length,
            subdomain_count: urlObj.hostname.split('.').length - 2
        };
        
        // Basic scoring
        let localScore = 50;
        if (analysis.has_ssl) localScore += 20;
        if (analysis.suspicious_tld) localScore -= 30;
        if (analysis.url_length > 100) localScore -= 10;
        if (analysis.subdomain_count > 3) localScore -= 15;
        
        analysis.local_trust_score = Math.max(0, Math.min(100, localScore));
        
        return analysis;
    }

    checkSuspiciousTLD(domain) {
        const suspiciousTLDs = [
            '.tk', '.ml', '.ga', '.cf', '.click', '.download', 
            '.stream', '.science', '.racing', '.win'
        ];
        
        return suspiciousTLDs.some(tld => domain.endsWith(tld));
    }

    async getTrustScore(domain) {
        try {
            // Check cache first
            const cached = await chrome.storage.local.get([`trust_${domain}`]);
            if (cached[`trust_${domain}`]) {
                const cacheData = cached[`trust_${domain}`];
                const cacheAge = Date.now() - cacheData.timestamp;
                
                // Use cache if less than 1 hour old
                if (cacheAge < 3600000) {
                    return cacheData.score;
                }
            }
            
            // Fetch from server
            const response = await this.makeAPICall('/analyze/trust-score', { domain }, 'POST');
            const score = response.trust_score;
            
            // Cache the result
            await chrome.storage.local.set({
                [`trust_${domain}`]: {
                    score: score,
                    timestamp: Date.now()
                }
            });
            
            return score;
            
        } catch (error) {
            console.error('Trust score error:', error);
            return 50; // Default neutral score
        }
    }

    updateBadge(tabId, domain) {
        if (this.maliciousDomains.has(domain)) {
            chrome.action.setBadgeText({ text: '!', tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#dc2626', tabId });
        } else if (this.trustedDomains.has(domain)) {
            chrome.action.setBadgeText({ text: '✓', tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#16a34a', tabId });
        } else {
            chrome.action.setBadgeText({ text: '', tabId });
        }
    }

    updateBadgeFromAnalysis(tabId, analysis) {
        const trustScore = analysis.trust_score;
        
        if (trustScore >= 80) {
            chrome.action.setBadgeText({ text: '✓', tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#16a34a', tabId });
        } else if (trustScore >= 60) {
            chrome.action.setBadgeText({ text: '?', tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#f59e0b', tabId });
        } else {
            chrome.action.setBadgeText({ text: '!', tabId });
            chrome.action.setBadgeBackgroundColor({ color: '#dc2626', tabId });
        }
    }

    async analyzePageFromContextMenu(tab) {
        try {
            const analysis = await this.analyzeWebsite(tab.url);
            
            // Send to content script to display results
            chrome.tabs.sendMessage(tab.id, {
                action: 'showAnalysisResults',
                analysis: analysis
            });
            
        } catch (error) {
            console.error('Context menu analysis error:', error);
        }
    }

    async analyzeSelectedText(text, tab) {
        try {
            // Analyze selected text for scam patterns
            const response = await this.makeAPICall('/analyze/text', {
                text: text,
                url: tab.url
            }, 'POST');
            
            chrome.tabs.sendMessage(tab.id, {
                action: 'showTextAnalysis',
                analysis: response
            });
            
        } catch (error) {
            console.error('Text analysis error:', error);
        }
    }

    async findCouponsFromContextMenu(tab) {
        try {
            const domain = new URL(tab.url).hostname;
            const response = await this.makeAPICall('/coupons/find', {
                domain: domain,
                url: tab.url
            }, 'POST');
            
            chrome.tabs.sendMessage(tab.id, {
                action: 'showCoupons',
                coupons: response.valid_coupons || []
            });
            
        } catch (error) {
            console.error('Coupon finding error:', error);
        }
    }

    async reportSiteFromContextMenu(tab) {
        // Open reporting form in the extension popup
        try {
            // Send message to content script to show reporting interface
            chrome.tabs.sendMessage(tab.id, {
                action: 'showReportDialog',
                url: tab.url
            });
        } catch (error) {
            console.error('Error showing report dialog:', error);
            // Fallback: open popup
            chrome.action.openPopup();
        }
    }

    async reportMaliciousSite(url, reason) {
        try {
            await this.makeAPICall('/security/report-malicious', {
                url: url,
                reason: reason,
                reported_at: Date.now()
            }, 'POST');
            
            // Add to local list immediately
            const domain = new URL(url).hostname;
            this.maliciousDomains.add(domain);
            
            console.log('Reported malicious site:', url);
            
        } catch (error) {
            console.error('Error reporting malicious site:', error);
        }
    }

    async reportSuspiciousActivity(details) {
        try {
            await this.makeAPICall('/security/report-suspicious', {
                url: details.url,
                type: details.type,
                timestamp: details.timeStamp,
                tab_id: details.tabId
            }, 'POST');
            
        } catch (error) {
            console.error('Error reporting suspicious activity:', error);
        }
    }

    async getSettings() {
        const result = await chrome.storage.sync.get(['fakebuster_settings']);
        return result.fakebuster_settings || {
            auto_analyze: true,
            show_notifications: true,
            protection_level: 'medium'
        };
    }

    async updateSettings(newSettings) {
        const currentSettings = await this.getSettings();
        const updatedSettings = { ...currentSettings, ...newSettings };
        await chrome.storage.sync.set({ fakebuster_settings: updatedSettings });
    }

    async getUserData() {
        try {
            // Get stored user data
            const stored = await chrome.storage.sync.get(['user_data', 'user_stats']);
            
            return {
                userData: stored.user_data || null,
                stats: stored.user_stats || {
                    sites_analyzed: 0,
                    threats_blocked: 0,
                    coupons_found: 0,
                    fake_reviews_detected: 0
                }
            };
        } catch (error) {
            console.error('Error getting user data:', error);
            return {
                userData: null,
                stats: {
                    sites_analyzed: 0,
                    threats_blocked: 0,
                    coupons_found: 0,
                    fake_reviews_detected: 0
                },
                error: 'Failed to retrieve user data'
            };
        }
    }

    async syncUserDataWithServer() {
        try {
            const userData = await this.getUserData();
            if (!userData.userData) return; // User not logged in
            
            // Sync with server
            await this.makeAPICall('/user/sync', userData, 'POST');
            
            console.log('User data synced with server');
            
        } catch (error) {
            console.error('Error syncing user data:', error);
        }
    }

    async makeAPICall(endpoint, data = {}, method = 'POST') {
        try {
            const requestOptions = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Extension-Version': chrome.runtime.getManifest().version
                }
            };

            // Only add body for POST requests
            if (method === 'POST' && Object.keys(data).length > 0) {
                requestOptions.body = JSON.stringify(data);
            } else if (method === 'GET' && Object.keys(data).length > 0) {
                // For GET requests, add query parameters
                const queryParams = new URLSearchParams(data).toString();
                endpoint += queryParams ? `?${queryParams}` : '';
            }

            // Add timeout for fetch requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout (increased from 5s)
            requestOptions.signal = controller.signal;

            const response = await fetch(`${this.apiBaseUrl}${endpoint}`, requestOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`API call to ${endpoint} failed: ${response.status}`, errorText);
                
                // Check if we have offline fallback data for this endpoint
                if (endpoint === '/security/malicious-domains' && method === 'GET') {
                    console.log("Using offline malicious domains fallback data");
                    return { domains: this.offlineMaliciousDomains };
                }
                
                throw new Error(`API call failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API call to ${endpoint} failed:`, error);
            
            // Handle timeout or network errors with fallbacks for critical endpoints
            if (endpoint === '/security/malicious-domains' && method === 'GET') {
                console.log("Connection failed, using offline malicious domains data");
                return { domains: this.offlineMaliciousDomains };
            }
            
            // Return fallback responses for different endpoints
            return this.getFallbackResponse(endpoint, error);
        }
    }

    getFallbackResponse(endpoint, error) {
        console.log(`Using fallback response for ${endpoint}`);
        
        switch (true) {
            case endpoint.includes('/security/malicious-domains'):
                return { domains: this.offlineMaliciousDomains };
                
            case endpoint.includes('/analyze/website'):
                return {
                    trust_score: 70,
                    status: 'safe',
                    warnings: ["Using offline analysis - limited functionality"],
                    is_legitimate: true,
                    risk_level: 'low'
                };
                
            case endpoint.includes('/analyze/trust-score'):
                return { trust_score: 70 };
                
            case endpoint.includes('/coupons/find'):
                return { 
                    available_coupons: 0, 
                    valid_coupons: [] 
                };
                
            case endpoint.includes('/analyze/text'):
                return {
                    risk_level: 'low',
                    scam_indicators: [],
                    is_suspicious: false
                };
                
            default:
                return { 
                    success: false, 
                    error: 'Server unavailable - using fallback mode',
                    fallback: true 
                };
        }
    }

    async handleUpdate(previousVersion) {
        console.log(`FakeBuster updated from ${previousVersion} to ${chrome.runtime.getManifest().version}`);
        
        // Perform any necessary migrations
        if (this.shouldMigrate(previousVersion)) {
            await this.performMigration(previousVersion);
        }
    }

    shouldMigrate(previousVersion) {
        const currentVersion = chrome.runtime.getManifest().version;
        // Add version comparison logic here
        return previousVersion !== currentVersion;
    }

    async performMigration(previousVersion) {
        // Add migration logic for different versions
        console.log('Performing migration...');
    }
}

// Initialize the background script
const fakeBusterBackground = new FakeBusterBackground();
