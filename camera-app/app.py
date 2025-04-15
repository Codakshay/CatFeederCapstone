import io
from flask import Flask, Response
from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder
from picamera2.outputs import FileOutput
from threading import Condition
import logging

app = Flask(__name__)

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
    output = StreamingOutput()
    picam2.start_recording(MJPEGEncoder(), FileOutput(output))

    def stop():
        print("Stopping recording")
        picam2.stop_recording()
        picam2.close()

    return Response(generate_frames(output),
                    content_type="multipart/x-mixed-replace; boundary=frame")

if __name__ == '__main__':
    picam2 = Picamera2()
    video_config = picam2.create_video_configuration(main={"size": (1920, 1080)})
    picam2.configure(video_config)
    app.run(host='0.0.0.0', port=8080)

