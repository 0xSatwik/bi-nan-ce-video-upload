from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_audioclips, CompositeAudioClip
import json
import os

def process_video():
    video_path = "youtube/video/recording.webm"
    audio_dir = "youtube/audio"
    output_path = "youtube/output/final_video.mp4"
    os.makedirs("youtube/output", exist_ok=True)

    if not os.path.exists(video_path):
        print("Video recording not found.")
        return

    # Load Script to know order of scenes
    with open("youtube/scripts/script.json", "r") as f:
        scenes = json.load(f)
    
    # Load Timing to know when each audio starts
    # Note: Playwright recording is continuous. The 'waitForAudio' in Playwright 
    # ensures the video *length* matches the audio *length* roughly.
    # However, strict alignment requires that we know exactly when specific actions happened.
    # For this v1, we assume the Playwright script paused correctly and we just
    # concatenate the audio tracks in order, or overlay them.
    
    # Actually, since Playwright "waits" for the duration of the audio at each step,
    # the video timeline should visually match the sequence of audio clips.
    # We just need to concatenate the audio clips with the correct spacing if there were gaps,
    # or simpler: just sequence them one after another if Playwright moved immediately.
    
    # But Playwright has `waitForAudio` which *plays* (waits) for the duration.
    # So the video is effectively: [Action -> Wait(AudioLen)] -> [Action -> Wait(AudioLen)]
    # We need to place Audio 1 at the start of its Wait block.
    # This is tricky to sync perfectly without timestamps from Playwright.
    
    # Simpler approach for V1:
    # We will construct a single audio track by concatenating the scene audios.
    # BUT, we need to account for the time Playwright took to *perform* the actions (clicking, loading).
    # Since we can't easily know that post-hoc without logs, we might just overlay the audio 
    # and hope the pauses in Playwright were sufficient.
    
    # BETTER APPROACH for V2 (but implementing simpler now): 
    # The Playwright script is the master of time. 
    # It effectively stretches the video to fit the audio.
    # So we can just concatenate the audio clips? 
    # No, because Playwright actions take non-zero time *between* the audio waits.
    
    # Strategy:
    # We will just concatenate the audio files.
    # AND we will speed up or freeze the video to match? No, too complex.
    
    # Alternative: 
    # We will rely on the fact that Playwright waited `duration` seconds.
    # So if we concatenate all audios, it might be shorter than the video because of the action times.
    # We need to insert silence into the audio track equal to the action times?
    # OR we just let the audio play and if there's silence in the video (while loading), that's fine.
    
    # Let's try to just concatenate all audios and set it as the video audio.
    # It won't be perfect sync but with `waitForAudio` it should be close enough for a demo.
    
    audio_clips = []
    for scene in scenes:
        scene_id = scene["id"]
        wav_path = f"{audio_dir}/{scene_id}.wav"
        if os.path.exists(wav_path):
            audio_clips.append(AudioFileClip(wav_path))
    
    final_audio = concatenate_audioclips(audio_clips)
    
    video = VideoFileClip(video_path)
    
    # If video is longer than audio (due to loading times), the audio will finish early.
    # If audio is longer (unlikely if we waited), video stops.
    
    # We set the audio to the video.
    final_video = video.set_audio(final_audio)
    
    # Trim video to audio duration to avoid silence at end, or vice versa
    # actually, usually we want to keep the visuals.
    if final_video.duration < final_audio.duration:
        final_video = final_video.set_duration(final_audio.duration)
        
    final_video.write_videofile(output_path, codec="libx264", audio_codec="aac")
    print(f"Video saved to {output_path}")

if __name__ == "__main__":
    process_video()
