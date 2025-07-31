#!/usr/bin/env python3
"""
Import Claude Code logs directly from ~/.claude/projects/
Extract rich usage metrics without any external tools.
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import backend modules
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from parsers.claude_logs import ClaudeLogsParser, export_for_arena


def print_banner():
    """Print a nice banner"""
    print("""
╔═══════════════════════════════════════════════════════════╗
║            🏆 Claude Arena - Log Importer 🏆              ║
║                                                           ║
║   Import your Claude Code usage data directly - no        ║
║   Sniffly required! Just point and shoot.                 ║
╚═══════════════════════════════════════════════════════════╝
    """)


def format_duration(seconds: float) -> str:
    """Format duration in human-readable format"""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    
    if hours > 0:
        return f"{hours}h {minutes}m"
    else:
        return f"{minutes}m"


def print_stats(data: dict):
    """Print statistics summary"""
    stats = data["aggregate_stats"]
    
    print("\n📊 Usage Summary")
    print("=" * 50)
    print(f"Sessions found:      {stats['total_sessions']}")
    print(f"Projects tracked:    {stats['total_projects']}")
    print(f"Total duration:      {stats['total_duration_hours']} hours")
    print(f"Average session:     {stats['average_session_duration_minutes']} minutes")
    print(f"Error rate:          {stats['error_rate']}%")
    
    print(f"\n💰 Token Usage")
    print("=" * 50)
    tokens = stats["total_tokens"]
    total_tokens = sum(tokens.values())
    print(f"Total tokens:        {total_tokens:,}")
    print(f"  Input tokens:      {tokens['input']:,}")
    print(f"  Output tokens:     {tokens['output']:,}")
    print(f"  Cache read:        {tokens['cache_read']:,}")
    print(f"  Cache creation:    {tokens['cache_creation']:,}")
    
    print(f"\n🔧 Top Tools Used")
    print("=" * 50)
    for tool, count in stats["most_used_tools"][:5]:
        print(f"{tool:<20} {count:>5} uses")
        
    print(f"\n🤖 Models Used")
    print("=" * 50)
    for model, count in stats["most_used_models"]:
        print(f"{model:<30} {count:>5} sessions")


def calculate_leaderboard_scores(data: dict) -> dict:
    """Calculate additional leaderboard scores based on session data"""
    scores = data["leaderboard_stats"]
    
    # Calculate Speed Demon score (based on short successful sessions)
    quick_sessions = 0
    night_sessions = 0
    
    for session in data["sessions"].values():
        # Speed demon: sessions under 5 minutes with no errors
        if session["duration_seconds"] < 300 and len(session["errors"]) == 0:
            quick_sessions += 1
            
        # Night owl: sessions between 10 PM and 4 AM
        if session["start_time"]:
            hour = datetime.fromisoformat(session["start_time"].replace('Z', '+00:00')).hour
            if hour >= 22 or hour < 4:
                night_sessions += 1
                
    total_sessions = len(data["sessions"])
    if total_sessions > 0:
        scores["speed_demon_score"] = round((quick_sessions / total_sessions) * 100, 2)
        scores["night_owl_score"] = round((night_sessions / total_sessions) * 100, 2)
    
    return scores


def save_to_file(data: dict, output_path: str):
    """Save parsed data to JSON file"""
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\n✅ Data saved to: {output_path}")


def upload_to_arena(data: dict, api_url: str, token: str = None):
    """Upload data to Claude Arena API"""
    # TODO: Implement actual API upload
    print("\n🚀 Uploading to Claude Arena...")
    print("⚠️  API upload not yet implemented")
    print("   For now, use the saved JSON file to manually import")


def main():
    parser = argparse.ArgumentParser(description="Import Claude Code logs to Arena")
    parser.add_argument(
        "--logs-dir",
        type=str,
        default=os.path.expanduser("~/.claude/projects"),
        help="Path to Claude logs directory (default: ~/.claude/projects)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="claude_arena_data.json",
        help="Output file path (default: claude_arena_data.json)"
    )
    parser.add_argument(
        "--upload",
        action="store_true",
        help="Upload to Claude Arena API (requires --token)"
    )
    parser.add_argument(
        "--token",
        type=str,
        help="Claude Arena API token for upload"
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Minimal output"
    )
    parser.add_argument(
        "--include-conversations",
        action="store_true",
        help="Include conversation history (with your consent)"
    )
    
    args = parser.parse_args()
    
    if not args.quiet:
        print_banner()
    
    # Check if user wants to include conversations
    if args.include_conversations and not args.quiet:
        print("\n⚠️  PRIVACY NOTICE:")
        print("You've chosen to include conversation history.")
        print("This will include:")
        print("  - Your questions to Claude")
        print("  - Claude's responses")
        print("  - Tools used in each conversation")
        print("\nThis data can help others learn from your problem-solving patterns.")
        print("You can choose to make it public or keep it private on your profile.")
        
        response = input("\nDo you consent to include conversations? (yes/no): ")
        if response.lower() != 'yes':
            print("Conversations will NOT be included.")
            args.include_conversations = False
    
    # Parse logs
    print(f"\n📂 Scanning logs in: {args.logs_dir}")
    parser = ClaudeLogsParser(args.logs_dir)
    
    try:
        data = parser.parse_all_projects(include_conversations=args.include_conversations)
        
        if data["aggregate_stats"]["total_sessions"] == 0:
            print("\n❌ No Claude Code sessions found!")
            print("   Make sure you have used Claude Code and logs exist in:")
            print(f"   {args.logs_dir}")
            return 1
            
        # Export to Arena format
        arena_data = export_for_arena(data, include_conversations=args.include_conversations)
        
        # Calculate additional scores
        arena_data["leaderboard_stats"] = calculate_leaderboard_scores({
            "sessions": data["sessions"],
            "leaderboard_stats": arena_data["leaderboard_stats"]
        })
        
        if not args.quiet:
            print_stats(data)
            
            # Show achievements
            print(f"\n🏆 Achievements Unlocked: {len(arena_data['achievements'])}")
            print("=" * 50)
            for achievement in arena_data["achievements"]:
                print(f"  ✅ {achievement.replace('_', ' ').title()}")
            
            # Show conversation info if included
            if args.include_conversations and arena_data.get("conversations_included"):
                print(f"\n💬 Conversations Included: {arena_data.get('total_conversations', 0)}")
                print("=" * 50)
                print(f"  Sample size: {len(arena_data.get('conversation_samples', []))} recent conversations")
                print("  You can control visibility on your profile page")
        
        # Save to file
        save_to_file(arena_data, args.output)
        
        # Upload if requested
        if args.upload:
            if not args.token:
                print("\n❌ Error: --token required for upload")
                return 1
            upload_to_arena(arena_data, "https://claude-arena.com/api/import", args.token)
            
        if not args.quiet:
            print("\n🎉 Import complete!")
            print(f"   Sessions: {data['aggregate_stats']['total_sessions']}")
            print(f"   Projects: {data['aggregate_stats']['total_projects']}")
            print(f"   Duration: {data['aggregate_stats']['total_duration_hours']} hours")
            
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1
        
    return 0


if __name__ == "__main__":
    sys.exit(main())