#!/usr/bin/env python3
import sys
import time
from gpiozero import DigitalOutputDevice, Device
from gpiozero.pins.lgpio import LGPIOFactory

# Set LGPIO as the default pin factory
Device.pin_factory = LGPIOFactory()

# Define your output devices for each pin
in1 = DigitalOutputDevice(17)
in2 = DigitalOutputDevice(18)
in3 = DigitalOutputDevice(22)
in4 = DigitalOutputDevice(23)

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

def step_motor(step):
    # Update the value of each device based on the sequence step
    in1.value = sequence[step][0]
    in2.value = sequence[step][1]
    in3.value = sequence[step][2]
    in4.value = sequence[step][3]

def rotate_motor(steps, delay):
    for _ in range(steps):
        for step in range(8):
            step_motor(step)
            time.sleep(delay)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 main.py <steps> [<delay>]")
        sys.exit(1)
    
    try:
        steps = int(sys.argv[1])
        delay = float(sys.argv[2]) if len(sys.argv) > 2 else 0.01
    except ValueError:
        print("Invalid parameters. Ensure steps is an integer and delay is a float.")
        sys.exit(1)
    
    try:
        print(f"Rotating motor for {steps} steps with {delay}s delay between steps...")
        rotate_motor(steps, delay)
        print("Rotation complete.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Clean up by closing the devices
        in1.close()
        in2.close()
        in3.close()
        in4.close()








