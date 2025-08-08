# FakeBuster - Comprehensive Browser Security Extension

## 🛡️ Project Overview

FakeBuster is a comprehensive browser security extension that provides real-time protection against fake reviews, malicious websites, and online threats. The project includes a Chrome/Firefox extension, FastAPI backend with advanced ML models, and a Next.js dashboard for analytics and management.

## � Key Features

- **Fake Review Detection**: Uses XGBoost ML model to identify fraudulent reviews with high accuracy
- **Malicious Website Detection**: Warns users when visiting potentially harmful sites
- **Safe Browsing Protection**: Real-time analysis of website security features
- **Performance Optimized**: Efficient codebase with fallback mechanisms for offline use
- **Dashboard Analytics**: Track security threats and review analysis

## �📁 Project Structure

```
FakeBuster/
├── browser-extension/       # Browser Extension (Chrome/Firefox)
│   ├── manifest.json       # Extension configuration
│   ├── popup/              # Extension popup UI
│   ├── content-scripts/    # Content scripts for web page integration
│   └── background/         # Service worker for background processing
├── backend/                # FastAPI Backend
│   ├── app/               # API server code
│   │   ├── main.py        # Core API implementation
│   │   └── features.py    # Feature extraction for ML models
│   ├── models/            # ML model files
│   │   ├── xgboost_model.pkl   # Advanced review classifier
│   │   └── processed_reviews.pkl # Preprocessed review data
│   └── requirements.txt   # Python dependencies
├── frontend/              # Next.js Dashboard
│   ├── app/              # Next.js 14 app directory
│   ├── components/       # React components
│   └── package.json      # Node.js dependencies
└── scripts/              # Utility scripts
    ├── start-fakebuster.ps1  # PowerShell launcher
    ├── start-fakebuster.bat  # Windows batch launcher
    └── verify_models.ps1     # Model verification script
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- Docker (optional)

### 1. Using the Launcher (Recommended)
```bash
# On Windows
./start-fakebuster.bat
# OR using PowerShell
./start-fakebuster.ps1
```

This launcher provides a menu to:
- Set up the project (install dependencies)
- Start the backend server
- Start the frontend server
- Start both servers in separate windows
- Load the browser extension

### 2. Manual Setup

#### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cd app
uvicorn main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Browser Extension
1. Open Chrome/Firefox
2. Go to extensions page
3. Enable developer mode
4. Load unpacked extension from `browser-extension` folder

## 🧠 Machine Learning Models

FakeBuster uses advanced machine learning models for detecting fake reviews:

- **XGBoost Model**: High-accuracy gradient boosted trees model that analyzes text features
- **Feature Engineering**: Custom feature extraction from review text (see `features.py`)
- **Model Verification**: Run `verify_models.ps1` or `verify_models.sh` to validate models

## 📚 API Documentation

When running the backend, access the interactive API docs at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 🛠️ Development

### Verify Models
```bash
# PowerShell
./verify_models.ps1

# Bash
./verify_models.sh
```

### Environment Variables
The project uses environment variables for configuration:
- Backend: `.env` file in the backend directory
- Frontend: `.env.local` file in the frontend directory

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

- XGBoost library for the machine learning models
- FastAPI for the efficient backend
- Next.js for the modern frontend
- Chrome and Firefox for extension support

### 2. Automated Setup
```bash
chmod +x build.sh
./build.sh
```

### 2. Manual Setup

#### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

#### Extension Installation
1. Open Chrome/Firefox Extensions page
2. Enable "Developer mode"
3. Click "Load unpacked" and select `extension/` folder

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
FIREBASE_ADMIN_SDK_PATH=path/to/firebase-admin-sdk.json
FIREBASE_PROJECT_ID=fakebuster-71943
REDIS_URL=redis://localhost:6379
ML_MODEL_PATH=models/xgboost_model.pkl
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyCXHmc1EYmN89MCzMU7lsOp_lVuoQ774YI
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=fakebuster-71943.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=fakebuster-71943
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=fakebuster-71943.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=428789568345
NEXT_PUBLIC_FIREBASE_APP_ID=1:428789568345:web:f95ee1874c268a3330f248
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-G0XX58Z5LM
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Firebase Setup
1. ✅ Firebase project already created: `fakebuster-71943`
2. ✅ Configuration keys integrated in environment files
3. Enable Authentication in Firebase Console
4. Enable Firestore Database in Firebase Console
5. Download admin SDK JSON for backend and place in `backend/firebase-admin-sdk.json`

### Firebase Services Used
- **Authentication**: User login and registration
- **Firestore Database**: Store review analyses, threat detections, user activity
- **Analytics**: Track extension usage and security events
- **Storage**: Store ML models and user data (optional)

## 🤖 ML Model Integration

### Training Your Model
```python
# Example training script (add to backend/train_model.py)
import pandas as pd
import numpy as np
from xgboost import XGBClassifier
import joblib

# Load and prepare your review dataset
df = pd.read_csv('reviews_dataset.csv')

# Feature extraction function
def extract_features(texts):
    features = []
    for text in texts:
        # Extract features from text
        features.append([
            len(text),                                     # text length
            len(text.split()),                            # word count
            sum(len(w) for w in text.split())/max(len(text.split()), 1),  # avg word length
            sum(1 for c in text if c.isupper())/max(len(text), 1),  # uppercase ratio
            sum(1 for c in text if c.isdigit())/max(len(text), 1),  # digit ratio
            text.count('!'),                              # exclamation count
            text.count('?'),                              # question count
            1 if '@' in text else 0,                      # has email
            1 if 'http' in text else 0                    # has url
        ])
    return np.array(features)

# Extract features and prepare data
X = extract_features(df['review_text'])
y = df['is_fake']
processed_data = {'features': X, 'labels': y}

# Train XGBoost model
model = XGBClassifier(n_estimators=200, max_depth=5, learning_rate=0.1)
model.fit(X, y)

# Save model and processed data
joblib.dump(model, 'models/xgboost_model.pkl')
joblib.dump(processed_data, 'models/processed_reviews.pkl')
```

### Model Files Required
- `backend/models/xgboost_model.pkl` - XGBoost classification model 
- `backend/models/processed_reviews.pkl` - Preprocessed review data

## 🌐 API Endpoints

### Review Analysis
- `POST /analyze-reviews` - Analyze review authenticity
- `GET /review-stats` - Get review analysis statistics

### Website Security
- `POST /check-website` - Check website legitimacy
- `GET /threat-intelligence` - Get latest threat data

### Coupon/Deal Verification
- `POST /find-coupons` - Find legitimate coupons
- `POST /verify-deal` - Verify deal authenticity

## 🎨 Frontend Components

### Dashboard Components
- `Dashboard.tsx` - Main dashboard layout
- `ActivityFeed.tsx` - Recent activity display
- `AnalyticsCharts.tsx` - Data visualization
- `ThreatMap.tsx` - Threat intelligence display
- `ReviewAnalyzer.tsx` - Review analysis interface
- `SecurityScan.tsx` - Security scanning tools
- `QuickActions.tsx` - Quick action buttons

### Authentication
- Firebase Authentication integration
- Protected routes with auth guards
- User profile management

## 🔌 Browser Extension Features

### Content Scripts
- Real-time review analysis on e-commerce sites
- Phishing detection on web pages
- Coupon finder and validator
- Form protection warnings

### Popup Interface
- Quick security scan
- Extension settings
- Threat notifications
- Review analysis summary

### Background Service
- Continuous threat monitoring
- API communication
- Data synchronization
- Browser event handling

## 🐳 Docker Deployment

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

Services:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- Firebase: Cloud-hosted database and auth
- Cache: Redis on port 6379 (optional)

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Extension Testing
1. Load extension in developer mode
2. Visit test websites
3. Check console for logs
4. Verify popup functionality

## 📈 Analytics & Monitoring

### Metrics Tracked
- Reviews analyzed
- Threats detected
- Websites scanned
- User interactions
- Extension usage

### Dashboard Features
- Real-time threat map
- Analysis charts
- Activity timeline
- Performance metrics

## 🔒 Security Features

### ML-Powered Detection
- Fake review identification
- Phishing website detection
- Malicious URL analysis
- Deal authenticity verification

### Real-Time Protection
- Content script monitoring
- Background threat detection
- Instant user notifications
- Automatic blocking

## 🛠️ Development

### Code Structure
- TypeScript throughout
- React/Next.js for frontend
- FastAPI for backend
- Chrome Extension APIs
- Firebase for auth/data

### Build Process
1. Frontend: Next.js build
2. Backend: Python package
3. Extension: Webpack bundle
4. Docker: Multi-stage builds

## 📦 Dependencies

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Firebase SDK
- Recharts

### Backend
- FastAPI
- scikit-learn
- pandas
- Firebase Admin SDK
- Redis (optional)

### Extension
- Chrome APIs
- Firebase SDK
- Webpack

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

## 🐛 Troubleshooting

### Common Issues

#### Extension Not Loading
- Check manifest.json syntax
- Verify permissions
- Check console errors

#### API Connection Failed
- Verify backend is running
- Check CORS settings
- Confirm environment variables

#### ML Model Not Found
- Ensure model files exist in `backend/models/`
- Check file permissions
- Verify model format

### Support
- Create GitHub issues for bugs
- Check documentation for guides
- Join community discussions

## 🚀 Deployment Checklist

- [ ] Environment variables configured
- [ ] ML models trained and saved
- [ ] Firebase project setup
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Domain DNS configured
- [ ] Extension store submission
- [ ] Analytics configured
- [ ] Monitoring setup

---

Built with ❤️ for a safer internet browsing experience.
