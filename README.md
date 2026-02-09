# Automated YouTube Video Generator

This is a standalone project to automate the creation and upload of YouTube videos using Playwright for screen recording and MeloTTS/OpenVoice V2 for voice cloning.

## Architecture

-   **MeloTTS + OpenVoice V2**: For high-quality AI voice cloning (CPU-optimized for GitHub Actions).
-   **Playwright**: For browser-level recording of website interactions.
-   **MoviePy**: For merging audio and video tracks.
-   **Google API**: For automated YouTube uploads.

## Setup & Usage

### 1. YouTube Upload Automation Setup
To enable automatic YouTube uploads, you need to provide a valid OAuth2 token to GitHub Secrets.

#### Step 1: Google Cloud Console
1.  Go to [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project or select an existing one.
3.  Enable **YouTube Data API v3**.
4.  Go to **Credentials** -> **Create Credentials** -> **OAuth client ID**.
5.  Select **Desktop App**.
6.  Download the JSON file and save it as `client_secret.json` in the `binance-word-of-the-day` folder.

#### Step 2: Generate Token Locally
1.  Open your terminal.
2.  Navigate to the project folder:
    ```bash
    cd binance-word-of-the-day
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the upload script locally to authenticate:
    ```bash
    python scripts/upload_youtube.py
    ```
5.  A link will be displayed in the terminal. **Copy and paste it into your browser.**
6.  Log in with your YouTube/Google account and allow access.
7.  The browser will attempt to redirect to `localhost`. **This is normal.**
8.  The script will detect the authorization and automatically generate a `token.json` file.

#### Step 3: Configure GitHub Secrets
1.  Open the `token.json` file and copy its entire content.
2.  Go to your GitHub Repository -> **Settings** -> **Secrets and variables** -> **Actions**.
3.  Click **New repository secret**.
4.  Name: `YOUTUBE_TOKEN_JSON`
5.  Value: Paste the content of `token.json`.
6.  Click **Add secret**.

Now the workflow will automatically upload videos to your channel!

### 2. GitHub Actions
This project is designed to run in `.github/workflows/youtube-generator.yml`. When you push this folder to its own repository, GitHub will detect the workflow.

## Project Structure
- `scripts/script.json`: Video narration and scene definition.
- `scripts/generate_audio.py`: The TTS engine.
- `scripts/record.ts`: The recording engine.
- `scripts/process_video.py`: The video editor.
- `scripts/upload.py`: The uploader.
- `reference.mp3`: The target voice for cloning.
