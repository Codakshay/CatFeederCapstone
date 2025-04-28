from gpiozero import DigitalOutputDevice, Device
from gpiozero.pins.lgpio import LGPIOFactory
from time import sleep

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
    # Update the value of each output device according to the step sequence
    in1.value = sequence[step][0]
    in2.value = sequence[step][1]
    in3.value = sequence[step][2]
    in4.value = sequence[step][3]

def rotate_motor(steps, delay):
    for _ in range(steps):
        for step in range(len(sequence)):
            step_motor(step)
            sleep(delay)

if __name__ == "__main__":
    try:
        print("Rotating motor...")
        rotate_motor(500, 0.01)  # Rotate 50 cycles with 10ms delay between steps
    except KeyboardInterrupt:
        pass
    finally:
        # Always close your devices when finished
        in1.close()
        in2.close()
        in3.close()
        in4.close()
