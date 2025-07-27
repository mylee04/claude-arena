#!/bin/bash

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run the application
echo "Starting Claude Arena API on port 8282..."
# Option 1: Use uvicorn directly (recommended)
uvicorn main:app --reload --host 0.0.0.0 --port 8282

# Option 2: Use python main.py (alternative - will use config.py settings)
# python main.py