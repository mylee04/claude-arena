# Claude Arena 🏆

> Transform your Claude Code usage into a competitive, social learning experience

Claude Arena gamifies your Claude Code usage by extracting insights from your local logs and letting you compete on global leaderboards. Share your problem-solving patterns (with consent) to help others learn while maintaining full privacy control.

## ✨ What's New: Conversation Sharing!

Share your Claude conversations to help the community learn from your problem-solving patterns:
- **🔒 Privacy First** - Opt-in only with three privacy levels (Private/Friends/Public)
- **🎓 Learning Hub** - Discover how others solve similar problems
- **🔍 Searchable** - Filter by project, tools used, or keywords
- **🛡️ Full Control** - Change privacy settings anytime

## 🎯 Core Features

### 📊 Direct Claude Logs Import
No external tools needed! Automatically extracts data from `~/.claude/projects/`:
- Session metrics and duration
- Token usage (input/output/cache)
- Tool usage patterns (Bash, Read, Edit, etc.)
- Error rates and debugging efficiency
- Project-by-project analytics

### 🏅 Unique Leaderboards
Beyond just token spending - we celebrate all coding styles:
- **🎯 The Precisionist** - Lowest error rate
- **🚀 Speed Demon** - Fastest task completions
- **🦉 Night Owl** - Late night coding champion
- **🔧 Tool Master** - Most diverse tool usage
- **💪 Marathon Runner** - Longest coding sessions
- **📚 The Scholar** - Most learning-focused sessions

### 🎮 Gamification System
- **Achievements** - Unlock badges for milestones
- **Progress Tracking** - Watch your skills improve
- **Daily Streaks** - Build consistent habits
- **Team Competitions** - Coming soon!

## 🚀 Quick Start

### Prerequisites
- Claude Code with usage history in `~/.claude/projects/`
- Python 3.10+
- Node.js 18+

### Installation

```bash
# Clone and enter the repository
git clone https://github.com/mylee04/claude-arena.git
cd claude-arena

# Backend setup
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend setup
cd ../frontend
npm install
```

### Import Your Data

```bash
# Basic import (stats only)
python scripts/import_claude_logs.py

# Include conversations (with consent prompt)
python scripts/import_claude_logs.py --include-conversations

# Save to file for review
python scripts/import_claude_logs.py --output my-stats.json

# Extract conversations for personal analysis
python scripts/extract_conversations.py --format markdown --analyze
```

### Run Claude Arena

```bash
# Terminal 1: Start backend (port 8281)
cd backend
./run.sh

# Terminal 2: Start frontend (port 5173)
cd frontend
npm run dev
```

Visit http://localhost:5173 to see your dashboard!

## 📁 Project Structure

```
claude-arena/
├── backend/                 # FastAPI backend
│   ├── parsers/            # Claude log parser
│   │   └── claude_logs.py  # Extracts metrics & conversations
│   ├── routers/            # API endpoints
│   │   └── import_data.py  # Handles data imports
│   └── schemas/            # Data models
├── frontend/               # React + TypeScript frontend
│   ├── src/
│   │   ├── components/     
│   │   │   ├── ConversationDisplay.tsx  # Privacy-controlled display
│   │   │   └── pages/
│   │   │       ├── ImportData.tsx       # Import UI
│   │   │       ├── Leaderboards.tsx     # Rankings
│   │   │       └── Profile.tsx          # User dashboard
│   │   └── utils/          # Helpers and mock data
├── scripts/                # CLI tools
│   ├── import_claude_logs.py    # Main import script
│   └── extract_conversations.py # Personal analysis tool
└── supabase/              # Database migrations
```

## 🔐 Privacy & Data Handling

### What We Collect
- **Always**: Aggregated metrics (tokens, duration, tools)
- **Optional**: Conversation samples (with explicit consent)
- **Never**: Raw code, file contents, or sensitive data

### Conversation Privacy Levels
When sharing conversations, you control visibility:
- **🔒 Private** - Only you can see them
- **👥 Friends** - Visible to your connections
- **🌍 Public** - Help the community learn

### Data Flow
1. Parser reads local `.jsonl` files
2. Extracts and aggregates metrics
3. Optionally includes conversation samples
4. You review before uploading
5. Choose privacy settings on your profile

## 🛠️ Tech Stack

- **Backend**: FastAPI + PostgreSQL/Supabase
- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Charts**: Recharts
- **Auth**: Supabase Auth
- **Deployment**: Railway (backend) + Vercel (frontend)

## 📚 API Documentation

### Import Endpoint
```
POST /api/import/claude-logs
```

Request body:
```json
{
  "user_stats": {...},
  "tool_usage": {...},
  "conversations_included": true,
  "conversation_samples": [...]
}
```

### Leaderboard Endpoints
```
GET /api/leaderboards
GET /api/leaderboards/{category}
```

## 🚢 Deployment

See detailed guides:
- [Backend Deployment (Railway)](backend/RAILWAY_DEPLOYMENT_GUIDE.md)
- [Frontend Deployment (Vercel)](frontend/VERCEL_DEPLOYMENT_GUIDE.md)
- [Database Setup (Supabase)](frontend/SUPABASE_AUTH_SETUP.md)

## 🤝 Contributing

We welcome contributions! Areas of interest:
- Additional leaderboard categories
- Advanced analytics visualizations
- Team competition features
- Mobile app development

## 📜 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Acknowledgments

- Claude Code community for inspiration
- Built for developers who love data-driven improvement
- Special thanks to early testers and contributors

---

**Ready to compete?** Import your data and climb the leaderboards! 🚀

Built with ❤️ by [mylee04](https://github.com/mylee04)