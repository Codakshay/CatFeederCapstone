import RPi.GPIO as GPIO
import time

# Pin Definitions
IN1 = 17
IN2 = 18
IN3 = 22
IN4 = 23

# Stepper motor sequence (full-step)
sequence = [
    [1, 0, 0, 1],
    [1, 0, 0, 0],
    [1, 1, 0, 0],
    [0, 1, 0, 0],
    [0, 1, 1, 0],
    [0, 0, 1, 0],
    [0, 0, 1, 1],
    [0, 0, 0, 1]
]

def setup_gpio():
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(IN1, GPIO.OUT)
    GPIO.setup(IN2, GPIO.OUT)
    GPIO.setup(IN3, GPIO.OUT)
    GPIO.setup(IN4, GPIO.OUT)

def cleanup_gpio():
    GPIO.cleanup()

def step_motor(step: int):
    GPIO.output(IN1, sequence[step][0])
    GPIO.output(IN2, sequence[step][1])
    GPIO.output(IN3, sequence[step][2])
    GPIO.output(IN4, sequence[step][3])

def rotate_motor(steps: int, delay: float):
    for _ in range(steps):
        for step in range(8):
            step_motor(step)
            time.sleep(delay)

if __name__ == "__main__":
    setup_gpio()
    try:
        print("Rotating motor...")
        rotate_motor(50, 0.01)  # Adjust steps and delay as needed
    except KeyboardInterrupt:
        pass
    finally:
        cleanup_gpio()
