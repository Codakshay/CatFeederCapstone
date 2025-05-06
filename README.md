# CatFeeder Application - User Guide

Developed by the Cat Feeder Capstone Group at Penn State University  
In collaboration with AstroLabe LLC  
**Date**: May 6, 2025

---

## Getting Started

### Quick Start

1. Plug in the feeder. The device boots and starts its built-in Wi-Fi hotspot: `ClaudeNet`.
2. Connect to `ClaudeNet` using WPA2 password: `StrongPassword123`.
3. Open a browser and go to [http://10.42.0.1:3000](http://10.42.0.1:3000) to access the CatFeeder dashboard.

### Scheduling Feeds

- Use the 24-hour grid to tick checkboxes and schedule hourly feeds.
- Use **Add Time** to input custom hour/minute feed times.
- All schedules are persistent across power cycles.

### Feeding History

- The **History** tab logs all feed events, including time.
- CSV file can be cleared or exported.

### Camera & Audio

- Select **Camera** to view a live preview.
- Press **Play Sound** to trigger a set sound in the drop down. The sound also plays on every feed.

### Instant Dispense

- Press **Dispense Now** for immediate feeding. This is logged in **History**.

### Restarting the Feeder

- Unplug the device, wait 5 seconds, then plug it back in.
- `ClaudeNet` should reappear in approximately 30 seconds.

---

## Advanced Use for Further Development

### SSH Access

1. Ensure your computer is on the same network or connected to `ClaudeNet`.
2. Connect via:
   ```bash
   ssh CatFeeder@raspberrypi.local
   ```
   or fallback to:
   ```bash
   ssh CatFeeder@10.42.0.1
   ```
3. Default user is `CatFeeder`. Use the password configured when flashing the SD card.

### Common SSH Issues

- **Host Key Changed Error**:  
  If you re-flash the Pi and get a warning:
  ```bash
  ssh-keygen -R raspberrypi.local
  ssh-keygen -R 10.42.0.1
  ```

- **Timeouts**:  
  Ensure `ClaudeNet` is active and SSH (port 22) is allowed through your firewall.

### Troubleshooting

- **App not loading**: Verify you're connected to `ClaudeNet`. Restart the device if needed.
- **Lost schedule settings**: Check that **Save** was clicked. If still broken, verify SD card space or restart.
- **Camera not streaming**: Try refreshing the browser or closing other clients accessing the feed.

---

## Codebase Overview

The repository is divided into:

### Frontend (Next.js 14)

- `src/app/page.tsx`: Root layout that handles route display.
- `src/components/controlsTest.tsx`: UI logic for dashboard features.
- `src/app/api/py/brightness/[brightness]/route.ts`: Forwards PUT requests to motor control backend.
- Static assets live in `public/`.

### Hardware Services (Flask)

- `camera/`: Streams MJPEG frames at `/stream` and `/snapshot`.
- `audio/`: Plays audio over onboard speaker.
- `gpio/main.py`: Receives commands to control the stepper motor.

### Service Lifecycle

- `start-hotspot.service` starts fallback Wi-Fi.
- `catfeeder.service` launches the app from `.next/`.

Logs:
```bash
sudo journalctl -u catfeeder.service -f
```

---

## Inter-Service Flow

1. UI dispatches:
   ```js
   fetch('/api/py/brightness/200', { method: 'PUT' })
   ```
2. Next.js API route forwards request to Flask `gpio/main.py`.
3. `gpio/` toggles GPIO pins using `gpiozero.LGPIOFactory` and responds `200 OK`.
4. UI updates based on backend response.

---

## Redeploying the Web App (systemd)

1. **Reboot**:
   ```bash
   sudo reboot
   ```
   or unplug and replug after 5 seconds.

2. **Reconnect**:
   - Join `ClaudeNet` again after ~30 seconds.

3. **Check for update**:
   - Open [http://10.42.0.1:3000](http://10.42.0.1:3000)

4. **Manual Deployment** (if changes did not appear):
   ```bash
   ssh CatFeeder@10.42.0.1
   rm -rf .next
   npm run build
   sudo systemctl restart catfeeder.service
   ```

---
