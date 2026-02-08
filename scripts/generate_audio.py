import os
import json
import torch
from melo.api import TTS

def generate_audio():
    device = "cpu"
    output_dir = "audio"
    os.makedirs(output_dir, exist_ok=True)
    
    # Load script
    with open("scripts/script.json", "r") as f:
        scenes = json.load(f)

    # Initialize MeloTTS (English)
    # Speed is slightly increased for a dynamic feel
    # EN-Default or EN-US is usually standard american accent.
    # EN-BR is British. EN-AU is Australian. EN-IN is Indian.
    # The user asked for a "boy" voice - MeloTTS EN-US default is often female sounding but clear.
    # We can try to use a specific speaker ID if available, but for now stick to default 'EN'.
    model = TTS(language="EN", device=device)
    speaker_ids = model.hps.data.spk2id

    timing = {}

    for scene in scenes:
        text = scene["text"]
        scene_id = scene["id"]
        final_wav_path = f"{output_dir}/{scene_id}.wav"

        print(f"Generating audio for scene: {scene_id}")

        # Generate Audio with MeloTTS directly
        # Using 'EN-US' or similar default, speed 1.1 for better flow
        # This writes directly to the final file
        model.tts_to_file(text, speaker_ids['EN-US'], final_wav_path, speed=1.1)

        # Get Duration for Timing
        import librosa
        duration = librosa.get_duration(filename=final_wav_path)
        timing[scene_id] = duration
        print(f"Scene {scene_id} duration: {duration:.2f}s")
    
    # Save timing configuration
    with open("scripts/timing.json", "w") as f:
        json.dump(timing, f, indent=2)

if __name__ == "__main__":
    generate_audio()
