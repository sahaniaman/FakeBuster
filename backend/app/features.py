from typing import List, Dict, Any
import re
import string
import numpy as np

def extract_features_for_xgboost(text: str) -> List[float]:
    """Extract features for XGBoost model prediction"""
    # This function extracts features in the same format that the XGBoost model was trained on
    
    # Basic features for review text analysis
    features = {
        'text_length': len(text),
        'word_count': len(text.split()),
        'avg_word_length': sum(len(word) for word in text.split()) / len(text.split()) if text.split() else 0,
        'uppercase_ratio': sum(1 for c in text if c.isupper()) / len(text) if text else 0,
        'digit_ratio': sum(1 for c in text if c.isdigit()) / len(text) if text else 0,
        'punctuation_ratio': sum(1 for c in text if c in string.punctuation) / len(text) if text else 0,
        'exclamation_count': text.count('!'),
        'question_count': text.count('?'),
        'has_email': 1 if re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text) else 0,
        'has_url': 1 if re.search(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text) else 0,
    }
    
    # Convert to a numpy array or list in the correct order
    # This order must match the order used during training
    feature_array = [
        features['text_length'],
        features['word_count'],
        features['avg_word_length'],
        features['uppercase_ratio'],
        features['digit_ratio'],
        features['punctuation_ratio'],
        features['exclamation_count'],
        features['question_count'],
        features['has_email'],
        features['has_url']
    ]
    
    return feature_array

def extract_additional_features(text: str) -> Dict[str, Any]:
    """Extract additional features for display and explanation purposes"""
    features = {
        'text_length': len(text),
        'word_count': len(text.split()),
        'uppercase_ratio': sum(1 for c in text if c.isupper()) / len(text) if text else 0,
        'exclamation_count': text.count('!'),
        'question_count': text.count('?'),
        'has_email': bool(re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)),
        'has_url': bool(re.search(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', text)),
        'caps_words_count': sum(1 for word in text.split() if word.isupper() and len(word) > 1),
        'digit_ratio': sum(1 for c in text if c.isdigit()) / len(text) if text else 0,
    }
    
    # Add sentiment-related features if TextBlob is available
    try:
        from textblob import TextBlob
        blob = TextBlob(text)
        features['sentiment_polarity'] = blob.sentiment.polarity
        features['sentiment_subjectivity'] = blob.sentiment.subjectivity
    except ImportError:
        features['sentiment_polarity'] = 0.0
        features['sentiment_subjectivity'] = 0.0
    
    return features
