"""
FakeBuster FastAPI Backend
A comprehensive API for detecting fake reviews, malicious websites, and finding valid coupons.
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
import uvicorn
import pickle
import logging
import asyncio
import aiohttp
import hashlib
import re
import os
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

# Local imports
from .features import extract_features_for_xgboost

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Firebase Admin SDK
try:
    import firebase_admin
    from firebase_admin import credentials, firestore, auth as firebase_auth
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("Firebase Admin SDK not available. Database features will be limited.")

# Optional ML imports - will work without them
try:
    import pandas as pd
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.naive_bayes import MultinomialNB
    import joblib
    ML_AVAILABLE = True
except ImportError:
    ML_AVAILABLE = False
    logger.warning("ML libraries not available. Some features will be disabled.")

# Initialize FastAPI app
app = FastAPI(
    title="FakeBuster API",
    description="Advanced API for detecting fake reviews, malicious websites, and finding coupons",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Global variables for ML models
review_model = None
vectorizer = None
website_analyzer = None
email_model = None

# Firebase initialization
db = None

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class ReviewData(BaseModel):
    text: str
    rating: Optional[float] = None
    author: Optional[str] = None
    date: Optional[str] = None

class ReviewAnalysisRequest(BaseModel):
    reviews: List[ReviewData]
    url: HttpUrl

class SingleReviewRequest(BaseModel):
    review_text: str
    url: HttpUrl

class WebsiteAnalysisRequest(BaseModel):
    url: HttpUrl
    domain: str
    local_analysis: Optional[Dict[str, Any]] = None

class PageAnalysisRequest(BaseModel):
    url: HttpUrl
    domain: str
    title: str
    has_ssl: bool
    has_contact_info: bool
    has_privacy_policy: bool
    has_terms_of_service: bool
    suspicious_elements: List[str]
    page_text: str

class CouponRequest(BaseModel):
    domain: str
    url: Optional[HttpUrl] = None
    page_content: Optional[List[str]] = None

class TrustScoreRequest(BaseModel):
    domain: str

class FormSecurityRequest(BaseModel):
    url: HttpUrl
    has_ssl: bool
    form_fields: List[Dict[str, Any]]

class TextAnalysisRequest(BaseModel):
    text: str
    url: HttpUrl

class MaliciousReportRequest(BaseModel):
    url: HttpUrl
    reason: str
    reported_at: int

# Response models
class ReviewAnalysisResponse(BaseModel):
    fake_reviews: int
    total_reviews: int
    confidence: float
    fake_review_indicators: List[str]
    detailed_analysis: List[Dict[str, Any]]

class SingleReviewResponse(BaseModel):
    is_fake_probability: float
    confidence: float
    indicators: List[str]

class WebsiteAnalysisResponse(BaseModel):
    trust_score: int
    status: str  # safe, warning, danger
    warnings: List[str]
    is_legitimate: bool
    risk_level: str  # low, medium, high

class CouponResponse(BaseModel):
    available_coupons: int
    valid_coupons: List[Dict[str, str]]

# ============================================================================
# ML MODEL LOADING
# ============================================================================

async def load_models():
    """Load machine learning models on startup"""
    global review_model, vectorizer, website_analyzer, email_model
    
    # Skip model loading if ML libraries aren't available
    if not ML_AVAILABLE:
        logger.info("ML libraries not available. Using rule-based fallback only.")
        review_model = None
        vectorizer = None
        website_analyzer = None
        email_model = None
        return
    
    try:
        # Load XGBoost model for advanced review analysis
        with open('models/xgboost_model.pkl', 'rb') as f:
            review_model = pickle.load(f)
        
        # Load the preprocessed reviews data for comparison
        with open('models/processed_reviews.pkl', 'rb') as f:
            vectorizer = pickle.load(f)
            
        # If you have a separate website analysis model, load it here
        # with open('models/website_analyzer.pkl', 'rb') as f:
        #     website_analyzer = pickle.load(f)
        
        logger.info("ML models loaded successfully")
        
    except FileNotFoundError as e:
        logger.warning(f"Model file not found: {e}. Using fallback algorithms.")
        # Initialize fallback models if ML is available
        if ML_AVAILABLE:
            try:
                review_model = FallbackReviewClassifier()
                vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')
            except Exception as fallback_error:
                logger.error(f"Failed to initialize fallback models: {fallback_error}")
                review_model = None
                vectorizer = None
        else:
            review_model = None
            vectorizer = None
        
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        raise

class FallbackReviewClassifier:
    """Fallback classifier when ML model is not available"""
    
    def predict_proba(self, X):
        # Simple rule-based fake review detection
        fake_probs = []
        
        for text in X:
            if isinstance(text, np.ndarray):
                text = " ".join(map(str, text))
            
            fake_indicators = [
                'amazing', 'perfect', 'best ever', 'life changing',
                'highly recommend', 'must buy', 'incredible',
                'outstanding', 'excellent quality', 'fast shipping'
            ]
            
            # Simple scoring based on fake indicators
            text_lower = str(text).lower()
            fake_score = sum(1 for indicator in fake_indicators if indicator in text_lower)
            
            # Normalize score (0-1 probability)
            fake_prob = min(fake_score / 5.0, 0.9)  # Cap at 90%
            fake_probs.append([1 - fake_prob, fake_prob])
        
        return np.array(fake_probs)

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def extract_features_from_review(review: ReviewData) -> Dict[str, Any]:
    """Extract features from a review for analysis"""
    text = review.text
    
    features = {
        'length': len(text),
        'word_count': len(text.split()),
        'exclamation_count': text.count('!'),
        'caps_ratio': sum(1 for c in text if c.isupper()) / len(text) if text else 0,
        'punctuation_ratio': sum(1 for c in text if c in '!.,?;:') / len(text) if text else 0,
        'avg_word_length': np.mean([len(word) for word in text.split()]) if text.split() else 0,
    }
    
    # Sentiment indicators
    positive_words = ['amazing', 'excellent', 'perfect', 'outstanding', 'incredible']
    negative_words = ['terrible', 'awful', 'horrible', 'worst', 'disappointing']
    
    features['positive_word_count'] = sum(1 for word in positive_words if word in text.lower())
    features['negative_word_count'] = sum(1 for word in negative_words if word in text.lower())
    
    # Fake review indicators
    fake_indicators = [
        'life changing', 'best purchase ever', 'highly recommend',
        'must buy', 'changed my life', 'amazing quality'
    ]
    
    features['fake_indicator_count'] = sum(1 for indicator in fake_indicators if indicator in text.lower())
    
    return features

def calculate_website_trust_score(analysis_data: Dict[str, Any]) -> int:
    """Calculate trust score based on website analysis"""
    score = 50  # Base score
    
    # SSL certificate
    if analysis_data.get('has_ssl', False):
        score += 20
    else:
        score -= 20
    
    # Contact information
    if analysis_data.get('has_contact_info', False):
        score += 15
    
    # Privacy policy
    if analysis_data.get('has_privacy_policy', False):
        score += 10
    
    # Terms of service
    if analysis_data.get('has_terms_of_service', False):
        score += 10
    
    # Suspicious elements
    suspicious_count = len(analysis_data.get('suspicious_elements', []))
    score -= suspicious_count * 10
    
    # Domain age (if available)
    domain_age = analysis_data.get('domain_age_days', 0)
    if domain_age > 365:
        score += 15
    elif domain_age > 90:
        score += 5
    else:
        score -= 10
    
    # URL length penalty
    url_length = analysis_data.get('url_length', 0)
    if url_length > 100:
        score -= 5
    
    return max(0, min(100, score))

def analyze_website_legitimacy(data: Dict[str, Any]) -> Dict[str, Any]:
    """Analyze website legitimacy using various indicators"""
    trust_score = calculate_website_trust_score(data)
    
    warnings = []
    
    # Check for common scam indicators
    if not data.get('has_ssl', False):
        warnings.append("Website does not use HTTPS encryption")
    
    if not data.get('has_contact_info', False):
        warnings.append("No contact information found")
    
    if 'excessive_popups' in data.get('suspicious_elements', []):
        warnings.append("Excessive popup advertisements detected")
    
    if 'urgency_tactics' in data.get('suspicious_elements', []):
        warnings.append("Urgency pressure tactics detected")
    
    # Determine risk level
    if trust_score >= 70:
        risk_level = 'low'
        status = 'safe'
        is_legitimate = True
    elif trust_score >= 40:
        risk_level = 'medium'
        status = 'warning'
        is_legitimate = True
    else:
        risk_level = 'high'
        status = 'danger'
        is_legitimate = False
    
    return {
        'trust_score': trust_score,
        'status': status,
        'warnings': warnings,
        'is_legitimate': is_legitimate,
        'risk_level': risk_level
    }

# ============================================================================
# AUTHENTICATION
# ============================================================================

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Verify JWT token (implement your Firebase Auth verification here)"""
    try:
        # TODO: Implement Firebase Auth token verification
        # For now, we'll allow all requests
        return {"user_id": "anonymous"}
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Initialize the application"""
    await load_models()
    await init_firebase()

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "FakeBuster API",
        "version": "1.0.0",
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/api/v1/analyze/reviews", response_model=ReviewAnalysisResponse)
async def analyze_reviews(
    request: ReviewAnalysisRequest,
    background_tasks: BackgroundTasks,
    user=Depends(verify_token)
):
    """
    Analyze multiple reviews for fake content using ML model
    
    HERE IS WHERE YOUR .PKL MODEL IS INTEGRATED
    """
    try:
        reviews = request.reviews
        
        if not reviews:
            raise HTTPException(status_code=400, detail="No reviews provided")
        
        fake_count = 0
        detailed_analysis = []
        
        # Check if ML libraries are available
        if not ML_AVAILABLE:
            # Fallback: Simple rule-based analysis
            for i, review in enumerate(reviews):
                features = extract_features_from_review(review)
                fake_probability = min(features['fake_indicator_count'] * 0.2, 0.9)
                is_fake = fake_probability > 0.5
                
                if is_fake:
                    fake_count += 1
                
                indicators = []
                if features['fake_indicator_count'] > 2:
                    indicators.append("Contains multiple fake review phrases")
                if features['caps_ratio'] > 0.3:
                    indicators.append("Excessive capitalization")
                if features['exclamation_count'] > 3:
                    indicators.append("Excessive exclamation marks")
                if features['positive_word_count'] > 5:
                    indicators.append("Unnaturally positive language")
                
                detailed_analysis.append({
                    'review_index': i,
                    'fake_probability': float(fake_probability),
                    'is_fake': is_fake,
                    'confidence': float(fake_probability if fake_probability > 0.5 else 1 - fake_probability),
                    'indicators': indicators,
                    'features': features
                })
            
            avg_confidence = sum([analysis['confidence'] for analysis in detailed_analysis]) / len(detailed_analysis)
        else:
            # ML-based analysis
            review_texts = [review.text for review in reviews]
            
            if review_model:
                # Process the reviews using the XGBoost model
                try:
                    # For XGBoost model that takes extracted features
                    for i, review_text in enumerate(review_texts):
                        # Extract features using our dedicated function
                        features = extract_features_for_xgboost(review_text)
                        
                        # Get prediction probability from XGBoost model
                        pred = review_model.predict_proba([features])[0]
                        fake_probability = float(pred[1]) if len(pred) > 1 else float(pred[0])
                        is_fake = fake_probability > 0.7
                        
                        if is_fake:
                            fake_count += 1
                        
                        # Generate indicators based on features
                        indicators = []
                        review_features = extract_additional_features(review_text)
                        
                        if review_features.get('has_email', False):
                            indicators.append("Contains email address")
                        if review_features.get('has_url', False):
                            indicators.append("Contains URL or link")
                        if review_features.get('exclamation_count', 0) > 3:
                            indicators.append("Excessive exclamation marks")
                        if review_features.get('uppercase_ratio', 0) > 0.3:
                            indicators.append("Excessive capitalization")
                        
                        confidence = float(fake_probability if fake_probability > 0.5 else 1 - fake_probability)
                        
                        detailed_analysis.append({
                            'review_index': i,
                            'fake_probability': fake_probability,
                            'is_fake': is_fake,
                            'confidence': confidence,
                            'indicators': indicators,
                            'features': features
                        })
                    
                    # Calculate overall confidence
                    avg_confidence = sum([analysis['confidence'] for analysis in detailed_analysis]) / len(detailed_analysis) if detailed_analysis else 0.0
                    
                except Exception as e:
                    logger.error(f"Error processing reviews with ML model: {e}")
                    # Fall back to rule-based analysis
                    return {"error": f"Model prediction failed: {str(e)}"}
                    
                if not detailed_analysis:
                    raise HTTPException(status_code=500, detail="Failed to analyze reviews")
            else:
                raise HTTPException(status_code=500, detail="ML model not loaded")
        
        # Background task to log analysis
        background_tasks.add_task(log_review_analysis, str(request.url), len(reviews), fake_count)
        
        return ReviewAnalysisResponse(
            fake_reviews=fake_count,
            total_reviews=len(reviews),
            confidence=float(avg_confidence),
            fake_review_indicators=[
                indicator for analysis in detailed_analysis 
                for indicator in analysis['indicators']
            ],
            detailed_analysis=detailed_analysis
        )
        
    except Exception as e:
        logger.error(f"Review analysis error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.post("/api/v1/analyze/single-review", response_model=SingleReviewResponse)
async def analyze_single_review(
    request: SingleReviewRequest,
    user=Depends(verify_token)
):
    """Analyze a single review for fake content"""
    try:
        review_data = ReviewData(text=request.review_text)
        
        # Use the XGBoost model for review analysis
        if review_model:
            # Prepare features for XGBoost model
            features_array = extract_features_for_xgboost(request.review_text)
            prediction = review_model.predict_proba([features_array])[0]
            fake_probability = prediction[1] if len(prediction) > 1 else prediction[0]
        else:
            # Fallback analysis
            fake_probability = 0.5
        
        features = extract_features_from_review(review_data)
        
        indicators = []
        if features.get('fake_indicator_count', 0) > 1:
            indicators.append("Contains fake review phrases")
        if features.get('caps_ratio', 0) > 0.2:
            indicators.append("Excessive capitalization")
        if features.get('exclamation_count', 0) > 2:
            indicators.append("Too many exclamation marks")
        
        confidence = max(fake_probability, 1 - fake_probability)
        
        return SingleReviewResponse(
            is_fake_probability=float(fake_probability),
            confidence=float(confidence),
            indicators=indicators
        )
        
    except Exception as e:
        logger.error(f"Single review analysis error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.post("/api/v1/analyze/website", response_model=WebsiteAnalysisResponse)
async def analyze_website(
    request: WebsiteAnalysisRequest,
    background_tasks: BackgroundTasks,
    user=Depends(verify_token)
):
    """Analyze website legitimacy and safety"""
    try:
        # Combine local analysis with server-side checks
        analysis_data = request.local_analysis or {}
        analysis_data.update({
            'url': str(request.url),
            'domain': request.domain
        })
        
        # Perform additional server-side analysis
        background_tasks.add_task(perform_deep_website_analysis, str(request.url))
        
        # Analyze legitimacy
        legitimacy_result = analyze_website_legitimacy(analysis_data)
        
        return WebsiteAnalysisResponse(**legitimacy_result)
        
    except Exception as e:
        logger.error(f"Website analysis error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.post("/api/v1/analyze/page")
async def analyze_page(
    request: PageAnalysisRequest,
    user=Depends(verify_token)
):
    """Comprehensive page analysis"""
    try:
        analysis_data = request.dict()
        legitimacy_result = analyze_website_legitimacy(analysis_data)
        
        # Add page-specific analysis
        alerts = []
        
        # Check for scam indicators in page text
        scam_keywords = [
            'limited time offer', 'act now', 'exclusive deal',
            'guaranteed income', 'work from home', 'make money fast'
        ]
        
        page_text_lower = request.page_text.lower()
        for keyword in scam_keywords:
            if keyword in page_text_lower:
                alerts.append({
                    'type': 'warning',
                    'message': f'Potential scam indicator detected: "{keyword}"'
                })
        
        return {
            **legitimacy_result,
            'alerts': alerts,
            'page_analysis': {
                'title': request.title,
                'text_length': len(request.page_text),
                'suspicious_elements': request.suspicious_elements
            }
        }
        
    except Exception as e:
        logger.error(f"Page analysis error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.post("/api/v1/analyze/legitimacy", response_model=WebsiteAnalysisResponse)
async def analyze_legitimacy(
    request: WebsiteAnalysisRequest,
    user=Depends(verify_token)
):
    """Analyze website legitimacy"""
    return await analyze_website(request, BackgroundTasks(), user)

@app.post("/api/v1/analyze/trust-score")
async def get_trust_score(
    request: TrustScoreRequest,
    user=Depends(verify_token)
):
    """Get trust score for a domain"""
    try:
        # Simple trust score calculation
        # In production, this would use historical data, reputation services, etc.
        
        # Check domain age, SSL, etc.
        trust_score = 50  # Base score
        
        # Add domain-specific logic
        known_safe_domains = {
            'amazon.com': 95, 'google.com': 100, 'microsoft.com': 98,
            'apple.com': 98, 'facebook.com': 85, 'twitter.com': 85
        }
        
        if request.domain in known_safe_domains:
            trust_score = known_safe_domains[request.domain]
        
        return {'trust_score': trust_score}
        
    except Exception as e:
        logger.error(f"Trust score error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.post("/api/v1/coupons/find", response_model=CouponResponse)
async def find_coupons(
    request: CouponRequest,
    background_tasks: BackgroundTasks,
    user=Depends(verify_token)
):
    """Find valid coupons for a domain"""
    try:
        # Mock coupon data - replace with real coupon aggregation service
        mock_coupons = {
            'amazon.com': [
                {'code': 'SAVE10', 'description': '10% off electronics', 'savings': '10%'},
                {'code': 'FREESHIP', 'description': 'Free shipping on orders $25+', 'savings': 'Free Shipping'}
            ],
            'walmart.com': [
                {'code': 'WELCOME5', 'description': '5% off first order', 'savings': '5%'}
            ]
        }
        
        valid_coupons = mock_coupons.get(request.domain, [])
        
        # Background task to verify coupon validity
        background_tasks.add_task(verify_coupons, request.domain, valid_coupons)
        
        return CouponResponse(
            available_coupons=len(valid_coupons),
            valid_coupons=valid_coupons
        )
        
    except Exception as e:
        logger.error(f"Coupon finding error: {e}")
        raise HTTPException(status_code=500, detail="Coupon search failed")

@app.post("/api/v1/coupons/check")
async def check_coupons(
    request: CouponRequest,
    user=Depends(verify_token)
):
    """Check if coupons are available for a domain"""
    try:
        # Quick check for coupon availability
        coupon_count = 0
        
        # Simple mock - replace with real implementation
        if request.domain in ['amazon.com', 'walmart.com', 'target.com']:
            coupon_count = 2
        
        return {'available_coupons': coupon_count}
        
    except Exception as e:
        logger.error(f"Coupon check error: {e}")
        return {'available_coupons': 0}

@app.post("/api/v1/analyze/form-security")
async def analyze_form_security(
    request: FormSecurityRequest,
    user=Depends(verify_token)
):
    """Analyze form security"""
    try:
        is_secure = True
        warnings = []
        
        if not request.has_ssl:
            is_secure = False
            warnings.append("Form is not using HTTPS encryption")
        
        # Check for suspicious form fields
        for field in request.form_fields:
            if 'ssn' in field.get('name', '').lower():
                warnings.append("Form requests Social Security Number")
            if 'admin' in field.get('name', '').lower() and field.get('type') == 'password':
                warnings.append("Suspicious admin password field detected")
        
        return {
            'is_secure': is_secure,
            'warnings': warnings,
            'recommendations': [
                "Verify the website's legitimacy before entering personal information",
                "Check for HTTPS encryption in the URL",
                "Look for privacy policy and terms of service"
            ]
        }
        
    except Exception as e:
        logger.error(f"Form security analysis error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.post("/api/v1/analyze/text")
async def analyze_text(
    request: TextAnalysisRequest,
    user=Depends(verify_token)
):
    """Analyze selected text for scam indicators"""
    try:
        text = request.text.lower()
        
        scam_indicators = []
        scam_patterns = {
            'urgency': ['limited time', 'act now', 'expires today', 'hurry'],
            'money_promises': ['guaranteed income', 'make money fast', 'easy money'],
            'fake_urgency': ['only today', 'last chance', 'don\'t miss out'],
            'personal_info': ['ssn', 'social security', 'bank account', 'routing number']
        }
        
        for category, patterns in scam_patterns.items():
            for pattern in patterns:
                if pattern in text:
                    scam_indicators.append({
                        'category': category,
                        'pattern': pattern,
                        'severity': 'high' if category == 'personal_info' else 'medium'
                    })
        
        risk_level = 'high' if any(i['severity'] == 'high' for i in scam_indicators) else \
                    'medium' if scam_indicators else 'low'
        
        return {
            'risk_level': risk_level,
            'scam_indicators': scam_indicators,
            'is_suspicious': len(scam_indicators) > 0
        }
        
    except Exception as e:
        logger.error(f"Text analysis error: {e}")
        raise HTTPException(status_code=500, detail="Analysis failed")

@app.get("/api/v1/security/malicious-domains")
async def get_malicious_domains():
    """Get list of known malicious domains"""
    try:
        # Mock malicious domains - replace with real threat intelligence
        malicious_domains = [
            'fakeshop-scam.com',
            'phishing-site.net',
            'malware-download.org'
        ]
        
        # Add more domains to the list for testing
        additional_domains = [
            'scam-crypto.com',
            'fake-login.net',
            'trojan-installer.site',
            'data-stealer.xyz',
            'bank-phishing.info',
            'free-virus.com',
            'spam-center.net',
            'malicious-downloads.co',
            'credential-theft.org',
            'ransomware-host.com'
        ]
        
        malicious_domains.extend(additional_domains)
        
        return {'domains': malicious_domains}
        
        
    except Exception as e:
        logger.error(f"Error getting malicious domains: {e}")
        return {'domains': []}

@app.post("/api/v1/security/report-malicious")
async def report_malicious(
    request: MaliciousReportRequest,
    background_tasks: BackgroundTasks,
    user=Depends(verify_token)
):
    """Report a malicious site"""
    try:
        # Process the report
        background_tasks.add_task(process_malicious_report, request.dict())
        
        return {'success': True, 'message': 'Report submitted successfully'}
        
    except Exception as e:
        logger.error(f"Error reporting malicious site: {e}")
        raise HTTPException(status_code=500, detail="Report submission failed")

@app.post("/api/v1/security/report-suspicious")
async def report_suspicious(
    data: Dict[str, Any],
    background_tasks: BackgroundTasks,
    user=Depends(verify_token)
):
    """Report suspicious activity"""
    try:
        background_tasks.add_task(process_suspicious_report, data)
        return {'success': True}
        
    except Exception as e:
        logger.error(f"Error reporting suspicious activity: {e}")
        return {'success': False}

@app.post("/api/v1/user/sync")
async def sync_user_data(
    data: Dict[str, Any],
    user=Depends(verify_token)
):
    """Sync user data with server"""
    try:
        # Process user data sync
        # In production, save to database
        return {'success': True, 'synced_at': datetime.utcnow().isoformat()}
        
    except Exception as e:
        logger.error(f"User sync error: {e}")
        raise HTTPException(status_code=500, detail="Sync failed")

# ============================================================================
# BACKGROUND TASKS
# ============================================================================

async def log_review_analysis(url: str, total_reviews: int, fake_count: int):
    """Log review analysis for analytics"""
    logger.info(f"Review analysis: {url} - {fake_count}/{total_reviews} fake reviews detected")

async def perform_deep_website_analysis(url: str):
    """Perform deep analysis of website in background"""
    logger.info(f"Performing deep analysis of {url}")

async def verify_coupons(domain: str, coupons: List[Dict[str, str]]):
    """Verify coupon validity in background"""
    logger.info(f"Verifying {len(coupons)} coupons for {domain}")

async def process_malicious_report(report_data: Dict[str, Any]):
    """Process malicious site report"""
    logger.info(f"Processing malicious site report: {report_data}")

async def process_suspicious_report(report_data: Dict[str, Any]):
    """Process suspicious activity report"""
    logger.info(f"Processing suspicious activity report: {report_data}")

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    logger.error(f"HTTP exception: {exc.detail}")
    return {"error": exc.detail, "status_code": exc.status_code}

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unexpected error: {str(exc)}")
    return {"error": "Internal server error", "status_code": 500}

# ============================================================================
# FIREBASE INITIALIZATION
# ============================================================================

async def init_firebase():
    """Initialize Firebase Admin SDK"""
    global db
    
    if not FIREBASE_AVAILABLE:
        logger.info("Firebase Admin SDK not available. Skipping Firebase initialization.")
        return
    
    try:
        # Check if Firebase app is already initialized
        try:
            firebase_admin.get_app()
            logger.info("Firebase app already initialized")
        except ValueError:
            # Initialize Firebase Admin SDK
            sdk_path = os.getenv('FIREBASE_ADMIN_SDK_PATH', './firebase-admin-sdk.json')
            
            if os.path.exists(sdk_path):
                cred = credentials.Certificate(sdk_path)
                firebase_admin.initialize_app(cred, {
                    'projectId': os.getenv('FIREBASE_PROJECT_ID', 'fakebuster-71943')
                })
                logger.info("Firebase Admin SDK initialized successfully")
            else:
                # Try to initialize with default credentials
                firebase_admin.initialize_app()
                logger.info("Firebase initialized with default credentials")
        
        # Initialize Firestore
        db = firestore.client()
        logger.info("Firestore client initialized")
        
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        db = None

# ============================================================================
# FIREBASE DATABASE OPERATIONS
# ============================================================================

async def save_review_analysis(url: str, analysis_result: dict):
    """Save review analysis to Firebase Firestore"""
    if db is None:
        logger.warning("Firestore not available. Skipping save operation.")
        return
    
    try:
        doc_ref = db.collection('review_analyses').document()
        doc_ref.set({
            'url': url,
            'analysis': analysis_result,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'user_id': analysis_result.get('user_id', 'anonymous')
        })
        logger.info(f"Review analysis saved to Firestore for URL: {url}")
    except Exception as e:
        logger.error(f"Failed to save review analysis to Firestore: {e}")

async def save_threat_detection(url: str, threat_type: str, details: dict):
    """Save threat detection to Firebase Firestore"""
    if db is None:
        logger.warning("Firestore not available. Skipping save operation.")
        return
    
    try:
        doc_ref = db.collection('threat_detections').document()
        doc_ref.set({
            'url': url,
            'threat_type': threat_type,
            'details': details,
            'timestamp': firestore.SERVER_TIMESTAMP,
            'status': 'detected'
        })
        logger.info(f"Threat detection saved to Firestore: {threat_type} at {url}")
    except Exception as e:
        logger.error(f"Failed to save threat detection to Firestore: {e}")

async def get_user_activity(user_id: str, limit: int = 50):
    """Get user activity from Firebase Firestore"""
    if db is None:
        return []
    
    try:
        query = db.collection('review_analyses').where('user_id', '==', user_id).order_by('timestamp', direction=firestore.Query.DESCENDING).limit(limit)
        docs = query.stream()
        
        activities = []
        for doc in docs:
            data = doc.to_dict()
            activities.append({
                'id': doc.id,
                'url': data.get('url'),
                'analysis': data.get('analysis'),
                'timestamp': data.get('timestamp')
            })
        
        return activities
    except Exception as e:
        logger.error(f"Failed to get user activity from Firestore: {e}")
        return []

async def get_threat_statistics():
    """Get threat statistics from Firebase Firestore"""
    if db is None:
        return {'total_threats': 0, 'threats_by_type': {}}
    
    try:
        docs = db.collection('threat_detections').stream()
        
        total_threats = 0
        threats_by_type = {}
        
        for doc in docs:
            data = doc.to_dict()
            threat_type = data.get('threat_type', 'unknown')
            
            total_threats += 1
            threats_by_type[threat_type] = threats_by_type.get(threat_type, 0) + 1
        
        return {
            'total_threats': total_threats,
            'threats_by_type': threats_by_type
        }
    except Exception as e:
        logger.error(f"Failed to get threat statistics from Firestore: {e}")
        return {'total_threats': 0, 'threats_by_type': {}}

# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
