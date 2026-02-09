import os
import json
import torch
from melo.api import TTS
import nltk

# Download required NLTK data
try:
    nltk.data.find('taggers/averaged_perceptron_tagger_eng')
except LookupError:
    nltk.download('averaged_perceptron_tagger_eng')

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

    # Fetch daily answers from API
    import requests
    try:
        print("Fetching daily answers...")
        response = requests.get("https://wodl-scraper.moneydropcrypto.workers.dev/today", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data and isinstance(data, list) and len(data) > 0:
                theme = data[0].get("theme", "Crypto")
                answer_text = f" Today's theme is {theme}. "
                
                for item in data:
                    length = item.get("word_length")
                    words_str = item.get("words", "[]")
                    try:
                        words = json.loads(words_str)
                        if words:
                            # Join words with "or" if multiple, or just list them
                            if len(words) > 1:
                                words_joined = ", ".join(words[:-1]) + " or " + words[-1]
                            else:
                                words_joined = words[0]
                            
                            answer_text += f"For {length} letters, the answer is {words_joined}. "
                    except:
                        continue
                
                print(f"Generated Answer Text: {answer_text}")
                
                # Append to revela_answers scene
                for scene in scenes:
                    if scene["id"] == "reveal_answers":
                        scene["text"] += answer_text
                        break
        else:
            print(f"Failed to fetch answers: {response.status_code}")
    except Exception as e:
        print(f"Error fetching answers: {e}")

    for scene in scenes:
        text = scene["text"]
        scene_id = scene["id"]
        final_wav_path = f"{output_dir}/{scene_id}.wav"

        print(f"Generating audio for scene: {scene_id}")

        # Generate Audio with MeloTTS directly
        # Using 'EN-BR' (British) as it is typically a male voice in this model
        # This writes directly to the final file
        model.tts_to_file(text, speaker_ids['EN-BR'], final_wav_path, speed=0.9)

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
