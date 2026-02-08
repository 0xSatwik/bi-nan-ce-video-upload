import os
import json
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request

def get_authenticated_service():
    # Load credentials from environment variables or file
    # For GitHub Actions, we expect these to be set as secrets and written to a file or passed directly.
    # Here we assume a file 'token.json' exists with the refresh token, 
    # created via a local auth flow previously.
    
    # We can also construct Credentials object from env vars directly to avoid files.
    
    creds = None
    if os.path.exists('youtube/token.json'):
        creds = Credentials.from_authorized_user_file('youtube/token.json', ['https://www.googleapis.com/auth/youtube.upload'])
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            raise Exception("No valid credentials found. Please run local auth first to generate token.json.")

    return build('youtube', 'v3', credentials=creds)

def upload_video():
    youtube = get_authenticated_service()

    request_body = {
        'snippet': {
            'title': 'How to Use Binance Word of the Day Solver | CryptoWalletsX',
            'description': 'Master the Binance Word of the Day with the CryptoWalletsX Solver! \n\nIn this video, we enable you to:\n- Use the Binance WOTD Solver tool\n- Select word lengths (3-8 letters)\n- Get accurate answers daily\n\nVisit: https://cryptowalletsx.com/binance-wotd-solver',
            'tags': ['Binance WOTD', 'CryptoWalletsX', 'WOTD Solver', 'Binance Answers', 'Crypto'],
            'categoryId': '22' # People & Blogs
        },
        'status': {
            'privacyStatus': 'public', # or 'private' for testing
            'selfDeclaredMadeForKids': False
        }
    }

    media_file = MediaFileUpload('youtube/output/final_video.mp4', chunksize=-1, resumable=True)

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

if __name__ == "__main__":
    if os.path.exists("youtube/output/final_video.mp4"):
        upload_video()
    else:
        print("Video file not found at youtube/output/final_video.mp4")
