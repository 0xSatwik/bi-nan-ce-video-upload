import os
import json
import torch
from melotts.api import TTS
from openvoice.api import ToneColorConverter

def generate_audio():
    device = "cpu"
    output_dir = "audio"
    os.makedirs(output_dir, exist_ok=True)
    
    # Load script
    with open("scripts/script.json", "r") as f:
        scenes = json.load(f)

    # Initialize MeloTTS (English)
    # Speed is slightly increased for a dynamic feel
    model = TTS(language="EN", device=device)
    speaker_ids = model.hps.data.spk2id

    # Initialize OpenVoice Tone Converter
    converter = ToneColorConverter(f'{os.path.dirname(os.path.abspath(__file__))}/../checkpoints/converter/config.json', device=device)
    converter.load_checkpoint(f'{os.path.dirname(os.path.abspath(__file__))}/../checkpoints/converter/checkpoint.pth')

    # Load Reference Speaker
    reference_speaker = "reference.mp3"
    target_se, audio_name = converter.extract_se(reference_speaker, output_dir=output_dir)

    timing = {}

    for scene in scenes:
        text = scene["text"]
        scene_id = scene["id"]
        base_wav_path = f"{output_dir}/{scene_id}_base.wav"
        final_wav_path = f"{output_dir}/{scene_id}.wav"

        print(f"Generating audio for scene: {scene_id}")

        # 1. Generate Base Audio with MeloTTS
        # Using 'EN-US' or similar default, speed 1.1 for better flow
        model.tts_to_file(text, speaker_ids['EN-US'], base_wav_path, speed=1.1)

        # 2. Clone Voice with OpenVoice V2
        # Extract source speaker embedding (from MeloTTS output - simplified here as we know the base speaker)
        # For optimization, we can pre-calculate the base speaker SE if possible, but extracting per generation is safer for quality.
        source_se, _ = converter.extract_se(base_wav_path, output_dir=output_dir)
        
        converter.convert(
            audio_src_path=base_wav_path, 
            src_se=source_se, 
            tgt_se=target_se, 
            output_path=final_wav_path,
            message=scene_id # Optional message for logging
        )

        # 3. Cleanup Base Audio
        if os.path.exists(base_wav_path):
            os.remove(base_wav_path)

        # 4. Get Duration for Timing
        # We can use librosa or just let Playwright handle it by checking file size/metadata, 
        # but storing it in a JSON is better for the Typescript side to read.
        import librosa
        duration = librosa.get_duration(filename=final_wav_path)
        timing[scene_id] = duration
        print(f"Scene {scene_id} duration: {duration:.2f}s")
    
    # Save timing configuration
    with open("scripts/timing.json", "w") as f:
        json.dump(timing, f, indent=2)

if __name__ == "__main__":
    generate_audio()
