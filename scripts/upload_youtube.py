import os
import json
import datetime
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

# Scopes required for uploading
SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

def get_authenticated_service():
    """
    Authenticates with YouTube API.
    
    1. Checks for environment variables (CI/CD mode).
    2. Checks for local files (Local mode).
    3. If local files exist but no token, runs interactive flow to generate token.
    """
    creds = None
    
    # Check if running in CI/CD with secrets
    env_token = os.environ.get("YOUTUBE_TOKEN")
    
    if env_token:
        print("Using token from environment variable...")
        try:
            token_data = json.loads(env_token)
            creds = Credentials.from_authorized_user_info(token_data, SCOPES)
        except json.JSONDecodeError:
            print("Error decoding YOUTUBE_TOKEN environment variable.")
            return None
        
    elif os.path.exists("token.json"):
        print("Using local token.json...")
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    # Refresh if expired
    if creds and creds.expired and creds.refresh_token:
        print("Refreshing expired token...")
        try:
            creds.refresh(Request())
        except Exception as e:
            print(f"Error refreshing token: {e}")
            # If refresh fails and we are local, we can try re-auth.
            # If CI, we are stuck.
            if not env_token:
                creds = None 

    # If no valid credentials, try interactive flow (ONLY if local client_secret exists)
    if not creds or not creds.valid:
        if env_token:
             print("Error: valid token not found in environment and cannot refresh. Please update YOUTUBE_TOKEN secret.")
             return None
        elif os.path.exists("client_secret.json"):
            print("Starting interactive authentication flow...")
            flow = InstalledAppFlow.from_client_secrets_file("client_secret.json", SCOPES)
            # Use run_local_server() with open_browser=False.
            # This prints the URL, so you can copy-paste it into any browser.
            # The browser will then redirect to localhost, which this script listens for.
            creds = flow.run_local_server(port=0, open_browser=False)
            
            # Save the credentials for the next run
            with open("token.json", "w") as token:
                token.write(creds.to_json())
            print("Token saved to token.json. Copy this content to your GitHub Secret 'YOUTUBE_TOKEN'.")
        else:
            print("No credentials found. Please provide client_secret.json locally or set YOUTUBE_TOKEN environment variable.")
            return None

    return build("youtube", "v3", credentials=creds)

def generate_metadata():
    """Generates the title and description for the video."""
    today = datetime.date.today()
    date_str = today.strftime("%Y-%m-%d") # e.g. 2023-10-27
    
    title = f"Binance word of the day answer for {date_str} | binance wodl answer today"
    
    # SEO Keywords (Huge text block requested)
    seo_keywords = """
Binance Word of the Day Answer Today
Binance WODL Answer Today
Binance Word of the Day Solver
Binance WODL Solver
Binance Crypto WODL Answers
Binance Word of the Day Answers
Binance WODL Innovation
Binance Word of the Day Theme
Binance WODL 3 Letter Words
Binance WODL 4 Letter Words
Binance WODL 5 Letter Words
Binance WODL 6 Letter Words
Binance WODL 7 Letter Words
Binance WODL 8 Letter Words
Crypto Wallets X
Binance WODL Quiz Answers
Binance Learn and Earn
Binance WODL Today
Binance Word of the Day Solution
"""
    
    description = f"""Binance word of the day solver- http://bit.ly/4kpVk4p
Binance word of the day answers - https://bit.ly/4qolKok

{title}

{seo_keywords}

#binance #wodl #crypto #binancewodl #wordoftheday"""

    return title, description

def upload_video(youtube, file_path):
    """Uploads the video to YouTube."""
    if not os.path.exists(file_path):
        print(f"Video file not found: {file_path}")
        return

    title, description = generate_metadata()
    print(f"Uploading with Title: {title}")
    
    body = {
        "snippet": {
            "title": title,
            "description": description,
            "tags": ["Binance", "WODL", "Word of the Day", "Crypto", "Bitcoin", "Answers", "Solver", "Binance WODL Answer Today"],
            "categoryId": "28" # Science & Technology
        },
        "status": {
            "privacyStatus": "public",
            "selfDeclaredMadeForKids": False
        }
    }
    
    # Use chunksize -1 to upload the whole file at once if small enough, or specify size
    # For GitHub Actions, we might want resumable just in case.
    media = MediaFileUpload(file_path, chunksize=-1, resumable=True)
    
    request = youtube.videos().insert(
        part="snippet,status",
        body=body,
        media_body=media
    )
    
    response = None
    while response is None:
        status, response = request.next_chunk()
        if status:
            print(f"Uploaded {int(status.progress() * 100)}%")
            
    print(f"Upload Complete! Video ID: {response.get('id')}")

if __name__ == "__main__":
    # Check for video files in priority order
    # Prioritize the one generated by record.spec.ts in 'video/' folder
    video_files = [
        "video/recording.webm",
        "output/final_video.webm", 
        "output/final_video.mp4"
    ]
    
    video_path = None
    for p in video_files:
         if os.path.exists(p):
             video_path = p
             break
    
    if video_path:
        print(f"Found video at: {video_path}")
        youtube = get_authenticated_service()
        if youtube:
            try:
                upload_video(youtube, video_path)
            except Exception as e:
                print(f"Failed to upload video: {e}")
    else:
        print("No video file found to upload.")
        print("Running authentication only (to generate token)...")
        get_authenticated_service()
