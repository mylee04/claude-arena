#!/usr/bin/env python3
"""
Claude Code Logs Parser
Parses .jsonl files from ~/.claude/projects/ to extract usage metrics
"""

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Any
from collections import defaultdict
import re


class ClaudeLogsParser:
    def __init__(self, base_path: str = None):
        """Initialize parser with base path to Claude logs"""
        self.base_path = Path(base_path or os.path.expanduser("~/.claude/projects"))
        self.sessions = defaultdict(lambda: {
            "messages": [],
            "tool_uses": [],
            "token_usage": {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0},
            "errors": [],
            "start_time": None,
            "end_time": None,
            "project": None,
            "model": None,
            "git_branch": None
        })
        
    def parse_all_projects(self, include_conversations: bool = False) -> Dict[str, Any]:
        """Parse all project logs and return aggregated data"""
        all_data = {
            "sessions": {},
            "aggregate_stats": {},
            "projects": {},
            "tool_usage": defaultdict(int),
            "models_used": defaultdict(int),
            "daily_usage": defaultdict(lambda: {
                "sessions": 0,
                "tokens": {"input": 0, "output": 0},
                "errors": 0
            })
        }
        
        if not self.base_path.exists():
            print(f"Warning: Claude logs directory not found at {self.base_path}")
            return all_data
            
        # Iterate through all project directories
        for project_dir in self.base_path.iterdir():
            if project_dir.is_dir():
                project_name = self._extract_project_name(project_dir.name)
                project_data = self._parse_project_logs(project_dir, include_conversations)
                
                if project_data["sessions"]:
                    all_data["projects"][project_name] = project_data
                    
                    # Merge session data
                    all_data["sessions"].update(project_data["sessions"])
                    
                    # Aggregate tool usage
                    for tool, count in project_data["tool_usage"].items():
                        all_data["tool_usage"][tool] += count
                        
                    # Aggregate model usage
                    for model, count in project_data["models_used"].items():
                        all_data["models_used"][model] += count
        
        # Calculate aggregate statistics
        all_data["aggregate_stats"] = self._calculate_aggregate_stats(all_data)
        
        return all_data
    
    def _parse_project_logs(self, project_dir: Path, include_conversations: bool = False) -> Dict[str, Any]:
        """Parse all .jsonl files in a project directory"""
        project_data = {
            "sessions": {},
            "tool_usage": defaultdict(int),
            "models_used": defaultdict(int),
            "total_tokens": {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0},
            "error_count": 0
        }
        
        # Parse each .jsonl file
        for jsonl_file in project_dir.glob("*.jsonl"):
            session_id = jsonl_file.stem
            session_data = self._parse_session_file(jsonl_file, include_conversations)
            
            if session_data:
                project_data["sessions"][session_id] = session_data
                
                # Aggregate tool usage
                for tool in session_data["tools_used"]:
                    project_data["tool_usage"][tool] += 1
                    
                # Track model usage
                if session_data["model"]:
                    project_data["models_used"][session_data["model"]] += 1
                    
                # Sum tokens
                for token_type in ["input", "output", "cache_read", "cache_creation"]:
                    project_data["total_tokens"][token_type] += session_data["token_usage"].get(token_type, 0)
                    
                # Count errors
                project_data["error_count"] += len(session_data["errors"])
        
        return project_data
    
    def _parse_session_file(self, file_path: Path, include_conversations: bool = False) -> Optional[Dict[str, Any]]:
        """Parse a single .jsonl session file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                
            if not lines:
                return None
                
            session_data = {
                "session_id": file_path.stem,
                "messages": [],
                "conversations": [] if include_conversations else None,
                "tools_used": set(),
                "token_usage": {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0},
                "errors": [],
                "model": None,
                "project": None,
                "git_branch": None,
                "start_time": None,
                "end_time": None,
                "duration_seconds": 0
            }
            
            for line in lines:
                try:
                    entry = json.loads(line.strip())
                    self._process_log_entry(entry, session_data, include_conversations)
                except json.JSONDecodeError:
                    continue
                    
            # Calculate session duration
            if session_data["start_time"] and session_data["end_time"]:
                start = datetime.fromisoformat(session_data["start_time"].replace('Z', '+00:00'))
                end = datetime.fromisoformat(session_data["end_time"].replace('Z', '+00:00'))
                session_data["duration_seconds"] = (end - start).total_seconds()
                
            # Convert tools_used set to list for JSON serialization
            session_data["tools_used"] = list(session_data["tools_used"])
            
            return session_data
            
        except Exception as e:
            print(f"Error parsing file {file_path}: {e}")
            return None
    
    def _process_log_entry(self, entry: Dict[str, Any], session_data: Dict[str, Any], include_conversations: bool = False):
        """Process a single log entry and update session data"""
        # Extract timestamp
        if "timestamp" in entry:
            timestamp = entry["timestamp"]
            if not session_data["start_time"]:
                session_data["start_time"] = timestamp
            session_data["end_time"] = timestamp
            
        # Extract project info
        if "cwd" in entry and not session_data["project"]:
            session_data["project"] = self._extract_project_name(entry["cwd"])
            
        # Extract git branch
        if "gitBranch" in entry and not session_data["git_branch"]:
            session_data["git_branch"] = entry["gitBranch"]
            
        # Process different entry types
        entry_type = entry.get("type", "")
        
        if entry_type == "assistant":
            self._process_assistant_entry(entry, session_data)
            if include_conversations and session_data["conversations"] is not None:
                self._extract_conversation(entry, session_data, "assistant")
        elif entry_type == "user":
            self._process_user_entry(entry, session_data)
            if include_conversations and session_data["conversations"] is not None:
                self._extract_conversation(entry, session_data, "user")
        elif entry_type == "system":
            self._process_system_entry(entry, session_data)
            
    def _process_assistant_entry(self, entry: Dict[str, Any], session_data: Dict[str, Any]):
        """Process assistant response entries"""
        message = entry.get("message", {})
        
        # Extract model
        if "model" in message and not session_data["model"]:
            session_data["model"] = message["model"]
            
        # Extract token usage
        if "usage" in message:
            usage = message["usage"]
            session_data["token_usage"]["input"] += usage.get("input_tokens", 0)
            session_data["token_usage"]["output"] += usage.get("output_tokens", 0)
            session_data["token_usage"]["cache_read"] += usage.get("cache_read_input_tokens", 0)
            session_data["token_usage"]["cache_creation"] += usage.get("cache_creation_input_tokens", 0)
            
        # Extract tool uses
        if "content" in message:
            for content_item in message["content"]:
                if content_item.get("type") == "tool_use":
                    tool_name = content_item.get("name", "unknown")
                    session_data["tools_used"].add(tool_name)
                    
    def _process_user_entry(self, entry: Dict[str, Any], session_data: Dict[str, Any]):
        """Process user message entries"""
        # Check for tool results with errors
        message = entry.get("message", {})
        if "content" in message:
            for content_item in message.get("content", []):
                if isinstance(content_item, dict):
                    if content_item.get("type") == "tool_result" and content_item.get("is_error"):
                        session_data["errors"].append({
                            "timestamp": entry.get("timestamp"),
                            "error": content_item.get("content", "Unknown error")
                        })
                        
        # Also check toolUseResult for errors
        tool_result = entry.get("toolUseResult")
        if isinstance(tool_result, str) and tool_result.startswith("Error:"):
            session_data["errors"].append({
                "timestamp": entry.get("timestamp"),
                "error": tool_result
            })
            
    def _process_system_entry(self, entry: Dict[str, Any], session_data: Dict[str, Any]):
        """Process system entries (notifications, hooks, etc.)"""
        # Track system events if needed
        pass
        
    def _extract_conversation(self, entry: Dict[str, Any], session_data: Dict[str, Any], role: str):
        """Extract conversation content for learning purposes"""
        message = entry.get("message", {})
        content = message.get("content", "")
        
        # Extract text content based on role
        text_content = ""
        if role == "user":
            # User messages can be string or array
            if isinstance(content, str):
                text_content = content
            elif isinstance(content, list):
                for item in content:
                    if isinstance(item, dict) and item.get("type") == "text":
                        text_content = item.get("text", "")
                        break
        elif role == "assistant":
            # Assistant messages are usually in content array
            if isinstance(content, list):
                for item in content:
                    if isinstance(item, dict) and item.get("type") == "text":
                        text_content = item.get("text", "")
                        break
        
        if text_content:
            conversation_entry = {
                "timestamp": entry.get("timestamp"),
                "role": role,
                "content": text_content[:1000],  # Limit to first 1000 chars
                "model": message.get("model") if role == "assistant" else None,
                "tools_used": []
            }
            
            # Track tools used in this response
            if role == "assistant" and isinstance(content, list):
                for item in content:
                    if isinstance(item, dict) and item.get("type") == "tool_use":
                        conversation_entry["tools_used"].append(item.get("name", "unknown"))
            
            session_data["conversations"].append(conversation_entry)
        
    def _extract_project_name(self, path_str: str) -> str:
        """Extract clean project name from path"""
        # Remove leading dashes and path separators
        clean_name = path_str.strip("-/")
        
        # Handle paths like "-Users-mylee-Desktop-mylee-project-claude-arena"
        if clean_name.startswith("Users-"):
            parts = clean_name.split("-")
            # Find the project name part (usually after "project")
            for i, part in enumerate(parts):
                if part == "project" and i + 1 < len(parts):
                    return "-".join(parts[i+1:])
                    
        # If no standard pattern, return the last meaningful part
        parts = clean_name.split("-")
        return "-".join(parts[-3:]) if len(parts) > 3 else clean_name
        
    def _calculate_aggregate_stats(self, all_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate aggregate statistics across all sessions"""
        stats = {
            "total_sessions": len(all_data["sessions"]),
            "total_projects": len(all_data["projects"]),
            "total_tokens": {"input": 0, "output": 0, "cache_read": 0, "cache_creation": 0},
            "total_errors": 0,
            "total_duration_hours": 0,
            "average_session_duration_minutes": 0,
            "most_used_tools": [],
            "most_used_models": [],
            "error_rate": 0
        }
        
        total_duration = 0
        total_tool_calls = sum(all_data["tool_usage"].values())  # Total tool uses across all sessions
        
        for session in all_data["sessions"].values():
            # Sum tokens
            for token_type in ["input", "output", "cache_read", "cache_creation"]:
                stats["total_tokens"][token_type] += session["token_usage"].get(token_type, 0)
                
            # Count errors
            stats["total_errors"] += len(session["errors"])
            
            # Sum duration
            total_duration += session.get("duration_seconds", 0)
            
        # Calculate derived stats
        if stats["total_sessions"] > 0:
            stats["total_duration_hours"] = round(total_duration / 3600, 2)
            stats["average_session_duration_minutes"] = round((total_duration / stats["total_sessions"]) / 60, 2)
            # Calculate error rate, but cap at 100% (can't have more errors than attempts)
            if total_tool_calls > 0:
                raw_error_rate = (stats["total_errors"] / total_tool_calls * 100)
                stats["error_rate"] = min(100.0, round(raw_error_rate, 2))
            else:
                stats["error_rate"] = 0
            
        # Get top tools and models
        stats["most_used_tools"] = sorted(
            all_data["tool_usage"].items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:10]
        
        stats["most_used_models"] = sorted(
            all_data["models_used"].items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        return stats
        

def export_for_arena(parsed_data: Dict[str, Any], include_conversations: bool = False) -> Dict[str, Any]:
    """Convert parsed data to Arena-compatible format"""
    arena_data = {
        "user_stats": {
            "total_sessions": parsed_data["aggregate_stats"]["total_sessions"],
            "total_tokens_used": sum(parsed_data["aggregate_stats"]["total_tokens"].values()),
            "total_hours": parsed_data["aggregate_stats"]["total_duration_hours"],
            "error_rate": parsed_data["aggregate_stats"]["error_rate"],
            "projects_count": parsed_data["aggregate_stats"]["total_projects"]
        },
        "tool_usage": dict(parsed_data["tool_usage"]),
        "daily_activity": {},
        "achievements": [],
        "leaderboard_stats": {
            "precisionist_score": max(0, 100 - parsed_data["aggregate_stats"]["error_rate"]),
            "speed_demon_score": 0,  # To be calculated based on task completion times
            "night_owl_score": 0,    # To be calculated based on timestamps
            "tool_master_score": len(parsed_data["tool_usage"]),
            "marathon_score": parsed_data["aggregate_stats"]["total_duration_hours"]
        },
        "conversations_included": include_conversations,
        "conversation_samples": []
    }
    
    # Calculate daily activity
    daily_tokens = defaultdict(int)
    daily_sessions = defaultdict(int)
    
    for session in parsed_data["sessions"].values():
        if session["start_time"]:
            date = session["start_time"][:10]  # Extract YYYY-MM-DD
            daily_sessions[date] += 1
            daily_tokens[date] += sum(session["token_usage"].values())
            
    arena_data["daily_activity"] = {
        date: {
            "sessions": daily_sessions[date],
            "tokens": daily_tokens[date]
        }
        for date in sorted(daily_sessions.keys())
    }
    
    # Calculate achievements based on stats
    achievements = []
    
    if parsed_data["aggregate_stats"]["total_sessions"] >= 1:
        achievements.append("first_session")
    if parsed_data["aggregate_stats"]["total_sessions"] >= 10:
        achievements.append("getting_started")
    if parsed_data["aggregate_stats"]["total_sessions"] >= 100:
        achievements.append("power_user")
    if parsed_data["aggregate_stats"]["error_rate"] < 5:
        achievements.append("precision_coder")
    if len(parsed_data["tool_usage"]) >= 10:
        achievements.append("tool_master")
    if parsed_data["aggregate_stats"]["total_duration_hours"] >= 24:
        achievements.append("day_warrior")
        
    arena_data["achievements"] = achievements
    
    # Include conversation samples if requested
    if include_conversations:
        all_conversations = []
        for session in parsed_data["sessions"].values():
            if session.get("conversations"):
                for conv in session["conversations"]:
                    # Add project context
                    conv_sample = {
                        "timestamp": conv["timestamp"],
                        "role": conv["role"],
                        "content": conv["content"],
                        "project": session["project"],
                        "tools_used": conv.get("tools_used", [])
                    }
                    all_conversations.append(conv_sample)
        
        # Sort by timestamp and include a sample (latest 50 conversations)
        all_conversations.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        arena_data["conversation_samples"] = all_conversations[:50]
        arena_data["total_conversations"] = len(all_conversations)
    
    return arena_data


def extract_conversations_for_learning(base_path: str = None) -> List[Dict[str, Any]]:
    """Extract conversations for agent learning purposes (private use only)"""
    parser = ClaudeLogsParser(base_path)
    data = parser.parse_all_projects(include_conversations=True)
    
    all_conversations = []
    for session_data in data["sessions"].values():
        if session_data.get("conversations"):
            for conv in session_data["conversations"]:
                # Add session context
                conv["session_id"] = session_data["session_id"]
                conv["project"] = session_data["project"]
                all_conversations.append(conv)
    
    # Sort by timestamp
    all_conversations.sort(key=lambda x: x.get("timestamp", ""))
    
    return all_conversations


if __name__ == "__main__":
    # Test the parser
    parser = ClaudeLogsParser()
    print("Parsing Claude Code logs...")
    
    data = parser.parse_all_projects()
    
    print(f"\nFound {data['aggregate_stats']['total_sessions']} sessions across {data['aggregate_stats']['total_projects']} projects")
    print(f"Total tokens used: {sum(data['aggregate_stats']['total_tokens'].values()):,}")
    print(f"Total duration: {data['aggregate_stats']['total_duration_hours']} hours")
    print(f"Error rate: {data['aggregate_stats']['error_rate']}%")
    
    print("\nTop 5 most used tools:")
    for tool, count in data["aggregate_stats"]["most_used_tools"][:5]:
        print(f"  - {tool}: {count} uses")
        
    # Export for Arena
    arena_data = export_for_arena(data)
    print(f"\nExported data ready for Arena with {len(arena_data['achievements'])} achievements unlocked!")
    
    # Test conversation extraction (for personal use)
    # conversations = extract_conversations_for_learning()
    # print(f"\nExtracted {len(conversations)} conversation turns for learning")