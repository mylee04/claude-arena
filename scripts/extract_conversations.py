#!/usr/bin/env python3
"""
Extract conversations from Claude Code logs for learning purposes
This is for personal/research use only - not for public sharing
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path

# Add parent directory to path to import backend modules
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend'))

from parsers.claude_logs import extract_conversations_for_learning


def save_conversations_as_jsonl(conversations, output_path):
    """Save conversations in JSONL format for easy processing"""
    with open(output_path, 'w') as f:
        for conv in conversations:
            f.write(json.dumps(conv) + '\n')


def save_conversations_as_markdown(conversations, output_path):
    """Save conversations in readable markdown format"""
    with open(output_path, 'w') as f:
        f.write("# Claude Code Conversations\n\n")
        
        current_session = None
        for conv in conversations:
            # New session header
            if conv['session_id'] != current_session:
                current_session = conv['session_id']
                f.write(f"\n## Session: {current_session[:8]}...\n")
                f.write(f"**Project**: {conv['project']}\n\n")
            
            # Write conversation
            timestamp = conv['timestamp'][:19] if conv['timestamp'] else 'Unknown'
            role_emoji = "👤" if conv['role'] == 'user' else "🤖"
            
            f.write(f"### {role_emoji} {conv['role'].title()} - {timestamp}\n\n")
            f.write(f"{conv['content']}\n\n")
            
            if conv.get('tools_used'):
                f.write(f"**Tools used**: {', '.join(conv['tools_used'])}\n\n")
            
            f.write("---\n\n")


def analyze_conversation_patterns(conversations):
    """Analyze patterns in conversations"""
    stats = {
        "total_conversations": len(conversations),
        "user_messages": sum(1 for c in conversations if c['role'] == 'user'),
        "assistant_messages": sum(1 for c in conversations if c['role'] == 'assistant'),
        "tools_by_frequency": {},
        "common_user_patterns": {},
        "projects": set()
    }
    
    # Count tool usage
    for conv in conversations:
        if conv['role'] == 'assistant' and conv.get('tools_used'):
            for tool in conv['tools_used']:
                stats['tools_by_frequency'][tool] = stats['tools_by_frequency'].get(tool, 0) + 1
        
        # Track projects
        if conv.get('project'):
            stats['projects'].add(conv['project'])
    
    # Find common patterns in user messages
    user_messages = [c['content'].lower() for c in conversations if c['role'] == 'user']
    
    # Common starting phrases
    common_starts = {}
    for msg in user_messages:
        words = msg.split()[:3]  # First 3 words
        if len(words) >= 2:
            phrase = ' '.join(words[:2])
            common_starts[phrase] = common_starts.get(phrase, 0) + 1
    
    # Sort and get top patterns
    stats['common_user_patterns'] = dict(sorted(common_starts.items(), key=lambda x: x[1], reverse=True)[:10])
    stats['projects'] = list(stats['projects'])
    
    return stats


def main():
    parser = argparse.ArgumentParser(description="Extract Claude Code conversations for learning")
    parser.add_argument(
        "--logs-dir",
        type=str,
        default=os.path.expanduser("~/.claude/projects"),
        help="Path to Claude logs directory"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="claude_conversations.jsonl",
        help="Output file path"
    )
    parser.add_argument(
        "--format",
        choices=["jsonl", "markdown", "both"],
        default="jsonl",
        help="Output format"
    )
    parser.add_argument(
        "--analyze",
        action="store_true",
        help="Show conversation analysis"
    )
    
    args = parser.parse_args()
    
    print(f"📂 Extracting conversations from: {args.logs_dir}")
    
    try:
        conversations = extract_conversations_for_learning(args.logs_dir)
        
        if not conversations:
            print("\n❌ No conversations found!")
            return 1
        
        print(f"\n✅ Found {len(conversations)} conversation turns")
        
        # Save in requested format
        if args.format in ["jsonl", "both"]:
            save_conversations_as_jsonl(conversations, args.output)
            print(f"💾 Saved to: {args.output}")
        
        if args.format in ["markdown", "both"]:
            md_path = args.output.replace('.jsonl', '.md')
            save_conversations_as_markdown(conversations, md_path)
            print(f"📝 Saved markdown to: {md_path}")
        
        # Show analysis if requested
        if args.analyze:
            print("\n📊 Conversation Analysis")
            print("=" * 50)
            
            stats = analyze_conversation_patterns(conversations)
            
            print(f"Total conversations: {stats['total_conversations']}")
            print(f"User messages: {stats['user_messages']}")
            print(f"Assistant messages: {stats['assistant_messages']}")
            print(f"Projects: {len(stats['projects'])}")
            
            print("\n🔧 Most Used Tools:")
            for tool, count in sorted(stats['tools_by_frequency'].items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  {tool}: {count} uses")
            
            print("\n💬 Common User Patterns:")
            for pattern, count in stats['common_user_patterns'].items():
                print(f"  '{pattern}...': {count} times")
        
        print("\n⚠️  Remember: This data is for personal/research use only!")
        print("   Do not share conversation content without proper anonymization.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())