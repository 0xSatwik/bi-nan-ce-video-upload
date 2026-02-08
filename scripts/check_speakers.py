from melo.api import TTS

try:
    model = TTS(language="EN", device="cpu")
    print("Available Speaker IDs:", model.hps.data.spk2id.keys())
except Exception as e:
    print(f"Error checking speakers: {e}")
