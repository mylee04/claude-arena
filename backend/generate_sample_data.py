#!/usr/bin/env python3
"""Generate sample data for testing the Claude Arena leaderboard."""

import json
import random
from datetime import datetime, timedelta

# Sample usernames
USERNAMES = [
    "CodeMaster2024", "PythonPro", "ReactRockstar", "BackendBoss",
    "FullStackFury", "DebugDetective", "RefactorRanger", "TestingTitan",
    "SecuritySage", "PerformanceGuru", "GitGuru", "DocDynamo"
]

# Categories with reasonable score ranges
CATEGORY_RANGES = {
    "file_operations": (50, 300),
    "git_operations": (30, 200),
    "testing": (20, 150),
    "debugging": (40, 250),
    "refactoring": (25, 180),
    "documentation": (15, 120),
    "performance": (10, 100),
    "security": (5, 80)
}

def generate_sample_data():
    """Generate sample leaderboard data."""
    entries = []
    
    for username in USERNAMES:
        # Generate random scores for each category
        category_scores = {}
        total_score = 0
        
        for category, (min_score, max_score) in CATEGORY_RANGES.items():
            score = random.randint(min_score, max_score)
            category_scores[category] = score
            total_score += score
        
        # Generate a random last updated time within the past 30 days
        days_ago = random.randint(0, 30)
        last_updated = datetime.utcnow() - timedelta(days=days_ago)
        
        entry = {
            "username": username,
            "total_score": total_score,
            "category_scores": category_scores,
            "last_updated": last_updated.isoformat() + "Z"
        }
        
        entries.append(entry)
    
    # Sort by total score descending
    entries.sort(key=lambda x: x["total_score"], reverse=True)
    
    # Add ranks
    for i, entry in enumerate(entries):
        entry["rank"] = i + 1
    
    return entries

def main():
    """Generate and save sample data."""
    data = generate_sample_data()
    
    # Save to file
    filename = "sample_leaderboard_data.json"
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Generated sample data with {len(data)} entries")
    print(f"Saved to: {filename}")
    print("\nTop 5 users:")
    for entry in data[:5]:
        print(f"  {entry['rank']}. {entry['username']} - {entry['total_score']} points")

if __name__ == "__main__":
    main()