import io
from flask import Flask, Response
from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder
from picamera2.outputs import FileOutput
from threading import Condition
import logging
from flask_cors import CORS  # Add CORS support

app = Flask(__name__)
CORS(app)  # This enables CORS for all routes

# Stream MJPEG
class StreamingOutput(io.BufferedIOBase):
    def __init__(self):
        self.frame = None
        self.condition = Condition()

    def write(self, buf):
        with self.condition:
            self.frame = buf
            self.condition.notify_all()

    def read(self):
        with self.condition:
            self.condition.wait()
            return self.frame


def generate_frames(output):
    while True:
        try:
            frame = output.read()
            yield (b"--frame\r\n" b"Content-Type: image/jpeg\r\n\r\n" + frame + b"\r\n")
        except Exception as e:
            logging.error(f"Error in generate_frames: {str(e)}")
            break

    print("done")


@app.route('/mjpeg')
def mjpeg():
    # Start the camera stream
    output = StreamingOutput()
    picam2.start_recording(MJPEGEncoder(), FileOutput(output))

    # Define stop function to clean up the stream when done
    def stop():
        print("Stopping recording")
        picam2.stop_recording()
        picam2.close()

    # Return MJPEG response for streaming video to the frontend
    return Response(generate_frames(output),
                    content_type="multipart/x-mixed-replace; boundary=frame")


if __name__ == '__main__':
    try:
        # Initialize the camera
        picam2 = Picamera2()
        video_config = picam2.create_video_configuration(main={"size": (1920, 1080)})
        picam2.configure(video_config)

        # Start the Flask server
        app.run(host='0.0.0.0', port=8080)
    except Exception as e:
        logging.error(f"Error during Flask app initialization: {str(e)}")
