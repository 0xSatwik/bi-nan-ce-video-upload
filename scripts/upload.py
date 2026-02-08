import os
import json
import shutil
from datetime import datetime

# Video paths - try both local and workflow paths
VIDEO_SOURCE_PATH = "output/final_video.mp4"
VIDEO_BACKUP_DIR = "saved_videos"

def ensure_video_saved():
    """Always save a backup of the final video with timestamp."""
    if not os.path.exists(VIDEO_SOURCE_PATH):
        print(f"Video file not found at {VIDEO_SOURCE_PATH}")
        return False
    
    # Create backup directory if it doesn't exist
    os.makedirs(VIDEO_BACKUP_DIR, exist_ok=True)
    
    # Create timestamped backup
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(VIDEO_BACKUP_DIR, f"video_{timestamp}.mp4")
    
    shutil.copy2(VIDEO_SOURCE_PATH, backup_path)
    print(f"Video saved to: {backup_path}")
    return True

def get_authenticated_service():
    """Get YouTube API service if credentials are available."""
    try:
        from googleapiclient.discovery import build
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
    except ImportError:
        print("Google API libraries not installed. Skipping YouTube upload.")
        return None
    
    creds = None
    token_path = 'token.json'
    
    if not os.path.exists(token_path):
        print(f"Token file not found at {token_path}. YouTube upload skipped.")
        print("The video has been generated and saved locally.")
        return None
    
    try:
        creds = Credentials.from_authorized_user_file(token_path, ['https://www.googleapis.com/auth/youtube.upload'])
        
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                print("Credentials expired and no refresh token available. YouTube upload skipped.")
                return None
        
        return build('youtube', 'v3', credentials=creds)
    except Exception as e:
        print(f"Error authenticating with YouTube: {e}")
        print("YouTube upload skipped. Video saved locally.")
        return None

def upload_video(youtube):
    """Upload video to YouTube."""
    from googleapiclient.http import MediaFileUpload
    
    request_body = {
        'snippet': {
            'title': 'How to Use Binance Word of the Day Solver | CryptoWalletsX',
            'description': '''Master the Binance Word of the Day with the CryptoWalletsX Solver! 

In this video, we enable you to:
- Use the Binance WOTD Solver tool
- Select word lengths (3-8 letters)
- Get accurate answers daily

Visit: https://cryptowalletsx.com/binance-wotd-solver''',
            'tags': ['Binance WOTD', 'CryptoWalletsX', 'WOTD Solver', 'Binance Answers', 'Crypto'],
            'categoryId': '22'  # People & Blogs
        },
        'status': {
            'privacyStatus': 'public',
            'selfDeclaredMadeForKids': False
        }
    }

    media_file = MediaFileUpload(VIDEO_SOURCE_PATH, chunksize=-1, resumable=True)

    request = youtube.videos().insert(
        part='snippet,status',
        body=request_body,
        media_body=media_file
    )

    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Uploaded {int(status.progress() * 100)}%")

    print(f"Upload Complete! Video ID: {response.get('id')}")
    return True

def main():
    # Always try to save the video first
    video_exists = ensure_video_saved()
    
    if not video_exists:
        print("No video to upload. Exiting.")
        return
    
    # Try to upload to YouTube
    youtube = get_authenticated_service()
    
    if youtube:
        try:
            upload_video(youtube)
        except Exception as e:
            print(f"YouTube upload failed: {e}")
            print("Video has been saved locally and as GitHub artifact.")
    else:
        print("YouTube API not configured. Video saved locally and as GitHub artifact.")

if __name__ == "__main__":
    main()
