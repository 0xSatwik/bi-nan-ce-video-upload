# Automated YouTube Video Generator

This is a standalone project to automate the creation and upload of YouTube videos using Playwright for screen recording and MeloTTS/OpenVoice V2 for voice cloning.

## Architecture

-   **MeloTTS + OpenVoice V2**: For high-quality AI voice cloning (CPU-optimized for GitHub Actions).
-   **Playwright**: For browser-level recording of website interactions.
-   **MoviePy**: For merging audio and video tracks.
-   **Google API**: For automated YouTube uploads.

## Setup & Usage

### 1. YouTube Data API
1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **YouTube Data API v3**.
3. Generate OAuth credentials (Desktop) and run `upload.py` once locally to generate a `token.json`.
4. Add the content of `token.json` as a GitHub Secret named `YOUTUBE_TOKEN_JSON`.

### 2. GitHub Actions
This project is designed to run in `.github/workflows/youtube-generator.yml`. When you push this folder to its own repository, GitHub will detect the workflow.

## Project Structure
- `scripts/script.json`: Video narration and scene definition.
- `scripts/generate_audio.py`: The TTS engine.
- `scripts/record.ts`: The recording engine.
- `scripts/process_video.py`: The video editor.
- `scripts/upload.py`: The uploader.
- `reference.mp3`: The target voice for cloning.
