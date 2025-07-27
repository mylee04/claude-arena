"""
Mock data generator for Claude Arena MVP demo
"""
import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
import json

# Fun usernames that reflect coding personalities
USERNAMES = [
    "night_owl_ninja", "refactor_wizard", "bug_hunter_pro", "syntax_samurai",
    "debug_deity", "merge_master", "commit_crusader", "type_titan", 
    "async_ace", "lambda_lord", "recursive_rebel", "pointer_prophet",
    "stack_sage", "heap_hero", "binary_boss", "terminal_titan",
    "vim_viking", "emacs_emperor", "vscode_victor", "git_gladiator",
    "docker_duke", "kubernetes_king", "react_ranger", "python_paladin",
    "rust_ronin", "go_guardian", "swift_sorcerer", "kotlin_knight",
    "typescript_templar", "javascript_jedi", "css_centurion", "html_hero",
    "api_architect", "database_druid", "cloud_commander", "devops_destroyer",
    "test_templar", "qa_queen", "agile_assassin", "scrum_samurai",
    "coffee_coder", "midnight_maven", "dawn_developer", "dusk_debugger",
    "error_emperor", "exception_expert", "null_ninja", "undefined_underlord",
    "semicolon_sage", "bracket_baron", "indent_inquisitor", "space_spartacus"
]

# Tool names from Claude Code
TOOLS = [
    "Edit", "Write", "Read", "Bash", "Search", "Replace", "Lint",
    "Test", "Debug", "Compile", "Run", "Deploy", "Git", "Docker",
    "Database", "API", "Terminal", "Browser", "FileSystem", "Network"
]

# Avatar styles
AVATAR_STYLES = ["adventurer", "avataaars", "bottts", "croodles", "fun-emoji", 
                 "identicon", "lorelei", "micah", "miniavs", "notionists", 
                 "open-peeps", "personas", "pixel-art"]

def generate_avatar_url(username: str) -> str:
    """Generate a fun avatar URL using DiceBear API"""
    style = random.choice(AVATAR_STYLES)
    return f"https://api.dicebear.com/7.x/{style}/svg?seed={username}"

def generate_user_stats(user_id: str, username: str) -> Dict[str, Any]:
    """Generate realistic user statistics"""
    
    # Base metrics
    total_sessions = random.randint(20, 500)
    total_commands = random.randint(100, 5000)
    total_tokens = random.randint(50000, 2000000)
    
    # Calculate derived metrics
    avg_tokens_per_task = total_tokens / max(total_commands / 5, 1)
    success_rate = random.uniform(0.65, 0.98)
    
    # Night owl percentage (some users are extreme night owls!)
    if "night" in username or "midnight" in username or "dawn" in username:
        night_owl_percentage = random.uniform(0.7, 0.95)
    else:
        night_owl_percentage = random.uniform(0.05, 0.75)
    
    # Tool usage patterns
    tools_used = random.sample(TOOLS, k=random.randint(5, 18))
    most_used_tool = random.choice(tools_used)
    
    # Fun metrics
    interruption_count = random.randint(5, 200)
    longest_session_minutes = random.randint(30, 480)
    fastest_task_completion = random.uniform(0.5, 10.0)
    average_step_length = random.uniform(2.0, 8.0)
    
    # Error rate (inverse of success rate with some variance)
    error_rate = 1 - success_rate + random.uniform(-0.1, 0.1)
    error_rate = max(0.02, min(0.35, error_rate))  # Clamp between 2% and 35%
    
    return {
        "user_id": user_id,
        "username": username,
        "avatar_url": generate_avatar_url(username),
        "total_tokens": total_tokens,
        "total_cost": round(total_tokens * 0.00015, 2),  # Rough cost estimate
        "total_sessions": total_sessions,
        "total_commands": total_commands,
        "average_tokens_per_task": round(avg_tokens_per_task, 0),
        "success_rate": round(success_rate, 2),
        "error_rate": round(error_rate, 2),
        "average_step_length": round(average_step_length, 1),
        "most_active_hour": random.randint(0, 23),
        "night_owl_percentage": round(night_owl_percentage, 2),
        "most_used_tool": most_used_tool,
        "tools_used": len(tools_used),
        "tools_diversity_score": round(len(tools_used) / len(TOOLS), 2),
        "interruption_count": interruption_count,
        "longest_session_minutes": longest_session_minutes,
        "fastest_task_completion": round(fastest_task_completion, 1),
        "joined_at": (datetime.now() - timedelta(days=random.randint(1, 365))).isoformat(),
        "last_active": (datetime.now() - timedelta(hours=random.randint(1, 72))).isoformat()
    }

def calculate_leaderboard_scores(users: List[Dict[str, Any]]) -> Dict[str, List[Dict]]:
    """Calculate rankings for each leaderboard category"""
    
    leaderboards = {
        "efficiency": [],
        "night_owl": [],
        "speed_demon": [],
        "interruptor": [],
        "tool_master": [],
        "precisionist": [],
        "marathon_runner": [],
        "early_bird": []
    }
    
    for user in users:
        # Efficiency - tokens per task (lower is better)
        leaderboards["efficiency"].append({
            "user_id": user["user_id"],
            "username": user["username"],
            "avatar_url": user["avatar_url"],
            "score": user["average_tokens_per_task"],
            "display_value": f"{int(user['average_tokens_per_task']):,} tokens/task"
        })
        
        # Night Owl - percentage of activity at night
        leaderboards["night_owl"].append({
            "user_id": user["user_id"],
            "username": user["username"],
            "avatar_url": user["avatar_url"],
            "score": user["night_owl_percentage"],
            "display_value": f"{int(user['night_owl_percentage'] * 100)}% night activity"
        })
        
        # Speed Demon - fastest task completion
        leaderboards["speed_demon"].append({
            "user_id": user["user_id"],
            "username": user["username"],
            "avatar_url": user["avatar_url"],
            "score": user["fastest_task_completion"],
            "display_value": f"{user['fastest_task_completion']} min avg"
        })
        
        # Interruptor - most interruptions
        leaderboards["interruptor"].append({
            "user_id": user["user_id"],
            "username": user["username"],
            "avatar_url": user["avatar_url"],
            "score": user["interruption_count"],
            "display_value": f"{user['interruption_count']} interruptions"
        })
        
        # Tool Master - tool diversity
        leaderboards["tool_master"].append({
            "user_id": user["user_id"],
            "username": user["username"],
            "avatar_url": user["avatar_url"],
            "score": user["tools_used"],
            "display_value": f"{user['tools_used']}/{len(TOOLS)} tools used"
        })
        
        # Precisionist - lowest error rate
        leaderboards["precisionist"].append({
            "user_id": user["user_id"],
            "username": user["username"],
            "avatar_url": user["avatar_url"],
            "score": user["error_rate"],
            "display_value": f"{int((1 - user['error_rate']) * 100)}% success rate"
        })
        
        # Marathon Runner - longest sessions
        leaderboards["marathon_runner"].append({
            "user_id": user["user_id"],
            "username": user["username"],
            "avatar_url": user["avatar_url"],
            "score": user["longest_session_minutes"],
            "display_value": f"{user['longest_session_minutes']} min session"
        })
        
        # Early Bird - most active in morning (opposite of night owl)
        early_bird_score = 1 - user["night_owl_percentage"]
        leaderboards["early_bird"].append({
            "user_id": user["user_id"],
            "username": user["username"],
            "avatar_url": user["avatar_url"],
            "score": early_bird_score,
            "display_value": f"{int(early_bird_score * 100)}% morning activity"
        })
    
    # Sort each leaderboard
    leaderboards["efficiency"].sort(key=lambda x: x["score"])  # Lower is better
    leaderboards["night_owl"].sort(key=lambda x: x["score"], reverse=True)
    leaderboards["speed_demon"].sort(key=lambda x: x["score"])  # Lower is better
    leaderboards["interruptor"].sort(key=lambda x: x["score"], reverse=True)
    leaderboards["tool_master"].sort(key=lambda x: x["score"], reverse=True)
    leaderboards["precisionist"].sort(key=lambda x: x["score"])  # Lower error is better
    leaderboards["marathon_runner"].sort(key=lambda x: x["score"], reverse=True)
    leaderboards["early_bird"].sort(key=lambda x: x["score"], reverse=True)
    
    # Add ranks
    for category, entries in leaderboards.items():
        for i, entry in enumerate(entries):
            entry["rank"] = i + 1
    
    return leaderboards

def generate_mock_data(num_users: int = 50) -> Dict[str, Any]:
    """Generate complete mock dataset for demo"""
    
    # Generate unique users
    selected_usernames = random.sample(USERNAMES, min(num_users, len(USERNAMES)))
    
    # If we need more users than available usernames, add numbers
    if num_users > len(USERNAMES):
        for i in range(num_users - len(USERNAMES)):
            selected_usernames.append(f"coder_{i+1:03d}")
    
    # Generate user stats
    users = []
    for i, username in enumerate(selected_usernames):
        user_id = f"user_{i+1}"
        users.append(generate_user_stats(user_id, username))
    
    # Calculate leaderboards
    leaderboards = calculate_leaderboard_scores(users)
    
    return {
        "users": users,
        "leaderboards": leaderboards,
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "total_users": len(users),
            "categories": list(leaderboards.keys())
        }
    }

def get_user_personality(stats: Dict[str, Any]) -> str:
    """Determine user's Claude personality type based on their stats"""
    
    personalities = []
    
    # Night/Day preference
    if stats["night_owl_percentage"] > 0.7:
        personalities.append("Night Owl")
    elif stats["night_owl_percentage"] < 0.3:
        personalities.append("Early Bird")
    
    # Efficiency
    if stats["average_tokens_per_task"] < 3000:
        personalities.append("Efficient")
    elif stats["average_tokens_per_task"] > 10000:
        personalities.append("Thorough")
    
    # Speed
    if stats["fastest_task_completion"] < 3:
        personalities.append("Speed Demon")
    
    # Precision
    if stats["error_rate"] < 0.1:
        personalities.append("Precisionist")
    
    # Interruptions
    if stats["interruption_count"] > 100:
        personalities.append("Explorer")
    
    # Tool usage
    if stats["tools_diversity_score"] > 0.7:
        personalities.append("Tool Master")
    
    # Session length
    if stats["longest_session_minutes"] > 300:
        personalities.append("Marathon Coder")
    
    # Combine top traits
    if len(personalities) >= 2:
        return f"{personalities[0]} {personalities[1]}"
    elif personalities:
        return f"{personalities[0]} Coder"
    else:
        return "Balanced Coder"

# Generate initial dataset
MOCK_DATA = generate_mock_data(50)