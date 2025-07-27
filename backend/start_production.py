#!/usr/bin/env python3
"""
Production startup script for Claude Arena API
"""
import os
import sys
import multiprocessing

# Ensure we're in the right directory
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Set production environment
os.environ["ENVIRONMENT"] = "production"

# Get configuration from environment
bind = f"{os.getenv('API_HOST', '0.0.0.0')}:{os.getenv('API_PORT', '8281')}"
workers = int(os.getenv("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info").lower()

# Start command
if __name__ == "__main__":
    # For direct execution
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=os.getenv("API_HOST", "0.0.0.0"),
        port=int(os.getenv("API_PORT", "8281")),
        log_level=loglevel,
        access_log=True
    )