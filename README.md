# Claude Arena 🏆

> Compete, Learn, and Monetize Your Claude Code Usage

Claude Arena transforms your Claude Code usage data into a fun, competitive, and potentially profitable experience. Import your Sniffly analytics and join the global leaderboard!

## 🎯 Features

### Current
- 📊 **Import Sniffly Data** - Seamlessly import your analytics
- 🏅 **Fun Leaderboards** - Multiple categories beyond just spending
- 👤 **User Profiles** - Track your achievements and patterns
- 🎮 **Gamification** - Badges, streaks, and milestones

### Coming Soon
- 💰 **Data Marketplace** - Monetize your anonymized usage patterns
- 👥 **Team Competitions** - Compete with your organization
- 🤝 **Mentorship Matching** - Learn from the best performers
- 📈 **Advanced Analytics** - Deep insights into your coding patterns

## 🏆 Leaderboard Categories

Unlike other leaderboards that only track spending, we celebrate all types of Claude Code usage:

- **🎯 The Precisionist** - Lowest error rate
- **🚀 Speed Demon** - Fastest task completions  
- **🦉 Night Owl** - Most active during late hours
- **🔧 Tool Master** - Most diverse tool usage
- **💪 Marathon Runner** - Longest coding sessions
- **🛑 The Interruptor** - Most interruptions (wear it with pride!)
- **📚 The Scholar** - Most learning-focused sessions

## 🚀 Getting Started

### Prerequisites
- Sniffly installed and configured
- Claude Code usage data to import
- Node.js 18+ and Python 3.10+

### Installation

```bash
# Clone the repository
git clone https://github.com/mylee04/claude-arena.git
cd claude-arena

# Install backend dependencies
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

### Usage

1. Export your Sniffly data:
   ```bash
   sniffly export --format json > my-stats.json
   ```

2. Import to Claude Arena:
   ```bash
   python scripts/import_sniffly.py my-stats.json
   ```

3. View your rankings at http://localhost:3000

## 🤝 Works With Sniffly!

Claude Arena is designed to complement [Sniffly](https://github.com/chiphuyen/sniffly), not replace it. Use Sniffly for analytics, then import to Claude Arena for social features and gamification.

## 🛠️ Tech Stack

- **Backend**: FastAPI + PostgreSQL
- **Frontend**: React + TypeScript + Tailwind CSS
- **Database**: Supabase
- **Charts**: Recharts
- **Auth**: Supabase Auth

## 📜 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Thanks to [Chip Huyen](https://github.com/chiphuyen) for creating Sniffly
- Inspired by the Claude Code community's desire for social features

---

Built with ❤️ by [mylee04](https://github.com/mylee04)