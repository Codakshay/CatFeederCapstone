#!/bin/bash

# Activate camera virtual environment and run Flask app
source /home/CatFeeder/camera-app/venv/bin/activate
python3 /home/CatFeeder/camera-app/app.py &

# Start Next.js production server
cd /home/CatFeeder/catfeeder
/home/CatFeeder/.nvm/versions/node/v22.14.0/bin/npm start
