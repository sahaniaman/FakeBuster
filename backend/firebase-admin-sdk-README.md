# Firebase Admin SDK Configuration

## Required File: firebase-admin-sdk.json

You need to download the Firebase Admin SDK private key file from the Firebase Console and place it in this location.

### Steps to get the Firebase Admin SDK file:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **fakebuster-71943**
3. Go to **Project Settings** (gear icon)
4. Click on **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Rename it to `firebase-admin-sdk.json`
8. Place it in this directory (`backend/firebase-admin-sdk.json`)

### Security Note:
- **NEVER** commit this file to version control
- Keep it secure and private
- It contains sensitive credentials

### File Format:
The file should look like this:
```json
{
  "type": "service_account",
  "project_id": "fakebuster-71943",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-...@fakebuster-71943.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

### Temporary Development:
The backend will run without this file but Firebase features will be disabled.
You'll see a warning in the logs: "Firebase Admin SDK not available."
