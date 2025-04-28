#!/bin/bash

# --- CAMERA APP ---
source /home/CatFeeder/camera-app/venv/bin/activate
python3 /home/CatFeeder/camera-app/app.py &
deactivate

# --- SPEAKER APP ---
source /home/CatFeeder/speaker/venv/bin/activate
python3 /home/CatFeeder/speaker/app.py &
deactivate

# --- NEXT.JS FRONTEND ---
cd /home/CatFeeder/catfeeder
/home/CatFeeder/.nvm/versions/node/v22.14.0/bin/npm start

