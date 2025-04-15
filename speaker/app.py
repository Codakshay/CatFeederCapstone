from flask import Flask, jsonify, request
import os
import subprocess
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Allow all origins temporarily

# Use absolute path for reliability
SOUND_DIR = os.path.abspath("./sounds")

# Ensure the sounds directory exists
if not os.path.exists(SOUND_DIR):
    os.makedirs(SOUND_DIR)
    print(f"Created sounds directory at {SOUND_DIR}")

@app.route("/api/get-sounds", methods=["GET"])
def get_sounds():
    try:
        files = [f for f in os.listdir(SOUND_DIR) 
                if f.endswith(('.wav', '.mp3', '.ogg'))]  # Only audio files
        # Remove extensions for cleaner frontend display
        sound_names = [os.path.splitext(f)[0] for f in files]
        if not files:
            return jsonify({"error": "No sound files found in the directory"}), 404
        return jsonify({"sounds": sound_names})
    except Exception as e:
        print(f"Error fetching sounds: {str(e)}")  # Log error
        return jsonify({"error": str(e)}), 500

@app.route("/api/play-sound/<sound>", methods=["POST"])
def play_sound(sound):
    # Find the actual file with any supported extension
    matching_files = [f for f in os.listdir(SOUND_DIR) 
                    if f.startswith(sound) and f.endswith(('.wav', '.mp3', '.ogg'))]
    
    if not matching_files:
        return jsonify({"error": "Sound file not found"}), 404
    
    sound_file = matching_files[0]  # Take the first match
    sound_path = os.path.join(SOUND_DIR, sound_file)

    try:
        # Determine appropriate player
        if sound_file.endswith(".mp3"):
            command = ["mpg123", "-q", sound_path]  # -q for quiet mode
        else:
            command = ["aplay", "-q", sound_path]  # -q for quiet mode
        
        # Run in background so it doesn't block the API response
        subprocess.Popen(command)
        print(f"Playing sound: {sound_file}")  # Log that the sound is being played
        return jsonify({"message": f"Playing {sound_file}"}), 200
    except Exception as e:
        print(f"Failed to play sound: {str(e)}")  # Log error
        return jsonify({"error": f"Failed to play sound: {str(e)}"}), 500

if __name__ == '__main__':
    # Verify audio players are available
    try:
        subprocess.run(["aplay", "--version"], check=True, capture_output=True)
        print("aplay is available")
    except:
        print("Warning: aplay not found - WAV files won't play")
    
    try:
        subprocess.run(["mpg123", "--version"], check=True, capture_output=True)
        print("mpg123 is available")
    except:
        print("Warning: mpg123 not found - MP3 files won't play")
    
    app.run(host="0.0.0.0", port=5001, debug=True)