import os
import time
from flask import Flask, jsonify, request
from flask_cors import CORS
from pygame import mixer
import urllib.parse

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Directory where your sound files are stored
SCRIPT_DIR = os.path.dirname(os.path.realpath(__file__))
SOUND_DIR = os.path.join(SCRIPT_DIR, "sounds")

# Create the sounds directory if it doesn't exist
if not os.path.exists(SOUND_DIR):
    os.makedirs(SOUND_DIR)
    print(f"Created sounds directory at {SOUND_DIR}")

@app.route("/api/get-sounds", methods=["GET"])
def get_sounds():
    try:
        files = [f for f in os.listdir(SOUND_DIR) if f.endswith(('.mp3', '.wav', '.ogg'))]
        sound_names = [os.path.splitext(f)[0] for f in files]
        return jsonify({"sounds": sound_names, "message": "Success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/play-sound/<sound_name>", methods=["POST"])
def play_sound(sound_name):
    try:
        # Decode the sound_name in case of special characters in the URL
        sound_name = urllib.parse.unquote(sound_name)

        # Try multiple extensions
        for ext in [".mp3", ".wav", ".ogg"]:
            sound_path = os.path.join(SOUND_DIR, f"{sound_name}{ext}")
            if os.path.exists(sound_path):
                break
        else:
            return jsonify({"error": "Sound file not found"}), 404

        mixer.init()
        mixer.music.load(sound_path)
        mixer.music.play()

        # Wait until playback is done
        while mixer.music.get_busy():
            time.sleep(0.1)

        return jsonify({"message": f"Sound '{sound_name}' played successfully"})
    except Exception as e:
        print(f"[ERROR] Could not play sound: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
