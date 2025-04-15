import io
import time
import logging
from threading import Condition
from http.server import BaseHTTPRequestHandler, HTTPServer

from picamera2 import Picamera2
from picamera2.encoders import MJPEGEncoder, Quality
from picamera2.outputs import FileOutput


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

# picam2 = Picamera2()
# output = StreamingOutput()

def start_camera():
    picam2 =  Picamera2()
    video_config = picam2.create_video_configuration(main={"size": (1920, 1080)})
    picam2.configure(video_config)
    output = StreamingOutput()
    picam2.start_recording(MJPEGEncoder(), FileOutput(output), Quality.VERY_HIGH)
    return picam2, output

class MJPEGHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/mjpeg":
            self.send_response(200)
            self.send_header("Content-Type", "multipart/x-mixed-replace; boundary=frame")
            self.end_headers()

            picam2, output = start_camera()

            try:
                for frame in generate_frames(output):
                    self.wfile.write(frame)
                    time.sleep(0.1)  # Control the frame rate
            except Exception as e:
                logging.error(f"Error while streaming: {str(e)}")
            finally:
                picam2.stop_recording()
                picam2.close()
                logging.info("Camera stopped.")
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=MJPEGHandler, port=8000):
    server_address = ('', port)
    httpd = server_class(server_address, handler_class)
    logging.info(f"Starting server on port {port}...")
    httpd.serve_forever()

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    run(port=8000)
