# FakeBuster

> An applied ML and browser-extension prototype for helping users evaluate potentially misleading content.

## Overview

FakeBuster is a full-stack prototype designed to explore how machine learning and browser-based workflows can assist users in reviewing potentially misleading online content.

The project is organized into three primary components:

- **Frontend** — User-facing web interface
- **Backend** — API and model-inference service layer
- **Browser Extension** — In-browser interaction surface

The project includes an XGBoost-based model integration in its development history. It is a research and portfolio prototype—not a production fact-checking system—and should not be used as the sole basis for high-stakes decisions.

## Problem Statement

Online content can be difficult to assess quickly, especially when information is incomplete, emotionally persuasive, or lacks reliable sources.

FakeBuster explores a workflow where a user submits or selects content, the system applies its implemented analysis pipeline, and the interface returns an interpretable model-assisted result.

The tool is intended to support:

- Critical review of online information
- Early-stage content screening
- Experimentation with applied ML workflows
- Browser-extension and API integration research

It does **not** replace human verification, editorial judgment, source checking, or authoritative fact-checking.

## Architecture

```text
User
  |
  +--> Browser Extension / Web Frontend
             |
             v
         Backend API
             |
             v
     Validation + Feature Processing
             |
             v
        Model Inference Layer
             |
             v
      Result / Confidence Display
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| Frontend | Presents the product interface, captures user input, and displays results |
| Browser Extension | Enables users to access the workflow from their browsing context |
| Backend | Validates requests, runs feature processing, invokes inference, and returns structured responses |
| Model Layer | Loads the ML artifact and produces a prediction or score from processed input |

## Repository Structure

```text
FakeBuster/
├── backend/             # API and inference service
├── frontend/            # Web application
├── browser-extension/   # Browser-extension client
└── README.md
```

## Local Setup

> The exact setup commands depend on the dependency manifests and runtime configuration inside each component directory.

### Prerequisites

- Git
- Node.js and npm, if required by the frontend or extension
- Python and pip, if required by the backend or ML inference service
- A Chromium-based browser for local browser-extension testing

### Steps

1. Clone the repository:

   ```bash
   git clone https://github.com/sahaniaman/FakeBuster.git
   cd FakeBuster
   ```

2. Review the individual component directories:

   ```text
   backend/
   frontend/
   browser-extension/
   ```

3. Install and start the FastAPI backend:

   ~~~bash
   cd backend
   python -m venv .venv
   # Activate the virtual environment for your shell.
   pip install -r requirements.txt
   uvicorn app.main:app --reload --port 8000
   ~~~

4. Install and start the Next.js frontend in another terminal:

   ~~~bash
   cd frontend
   npm ci
   npm run dev
   ~~~

   The backend expects Firebase Admin credentials (service-account file via `FIREBASE_ADMIN_SDK_PATH` or Application Default Credentials) for authenticated API routes. Protected endpoints require a valid Firebase ID bearer token; requests are rejected when verification is unavailable or fails.

   **Model limitation:** `backend/app/main.py` references `models/xgboost_model.pkl` and `models/processed_reviews.pkl`, but these artifacts are not committed here. The backend may use rule-based fallback behavior; do not interpret fallback scores as validated ML predictions.

5. If the browser extension includes a valid extension manifest:

   - Open your browser’s extensions page
   - Enable Developer Mode
   - Choose **Load unpacked**
   - Select the `browser-extension/` directory

## Model and Evaluation Notes

FakeBuster includes an XGBoost-based model integration in its development history.

This repository currently does **not** publish verified benchmark metrics such as:

- Accuracy
- Precision
- Recall
- F1 score
- ROC-AUC
- Confusion matrix

No performance claim should be made until the project includes a reproducible evaluation protocol.

A future evaluation should document:

1. Dataset source and licensing
2. Data collection and preprocessing methodology
3. Train, validation, and test split strategy
4. Class distribution and imbalance handling
5. Baseline model comparison
6. Precision, recall, F1 score, and confusion matrix
7. Known failure cases and bias risks
8. Model and preprocessing versioning

## Security and Privacy Considerations

This project processes potentially sensitive user-submitted text or URLs. Contributors should follow these practices:

- Do not commit API keys, tokens, passwords, or credentials
- Do not commit proprietary, confidential, or personally identifiable data
- Validate all user-provided input on the backend
- Enforce input-size limits and safe error handling
- Avoid logging raw submitted content unless required and documented
- Keep browser-extension permissions minimal
- Restrict CORS to explicitly trusted origins
- Review third-party dependencies regularly
- Use environment variables for configuration and secrets

## Testing Priorities

Recommended testing coverage for future development:

### Unit Tests

- Feature preprocessing for known inputs
- Empty, malformed, oversized, and adversarial input handling
- Model-loading failure behavior
- Stable inference-response schema
- Confidence/result formatting behavior

### API Tests

- Health-check endpoint
- Valid inference request
- Invalid request rejection
- Safe error messages
- CORS configuration
- Rate-limiting behavior, if implemented

### Integration Tests

- Frontend-to-backend request flow
- Mocked inference response rendering
- Browser-extension request flow
- Browser-extension permission review

### ML Evaluation

Before publishing model performance:

- Version datasets and model artifacts
- Keep test data separate from training data
- Compare against a simple baseline
- Document limitations and failure cases
- Avoid presenting predictions as factual determinations

## Contributing

Contributions are welcome when they are focused, reproducible, and well documented.

Before opening a pull request:

1. Clearly explain the user problem being addressed
2. Keep changes scoped and reviewable
3. Avoid committing secrets or sensitive data
4. Add or update tests where practical
5. Update documentation when behavior changes
6. Document technical limitations honestly

## Roadmap

- [x] Document basic backend and frontend launch commands (service configuration still required)
- [ ] Add `.env.example` without secrets
- [ ] Add API schema validation
- [ ] Add automated unit and API tests
- [ ] Add browser-extension integration tests
- [ ] Document model dataset and feature pipeline
- [ ] Establish reproducible model evaluation
- [ ] Add architecture and threat-model documentation
- [ ] Add secure deployment guidance

## Status

**Prototype / portfolio project**

FakeBuster is being maintained as an applied AI, full-stack, and browser-extension engineering project. The immediate goal is to make the system reproducible, testable, security-aware, and transparent about its model limitations.

## License

Add a license before accepting external code contributions or deploying the project publicly.
