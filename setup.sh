#!/bin/bash

echo "🏆 Claude Arena Setup Script"
echo "=========================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.10 or higher."
    exit 1
fi

# Check Node
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

echo "✅ Prerequisites satisfied"
echo ""

# Backend setup
echo "Setting up backend..."
cd backend

# Create virtual environment
python3 -m venv venv
echo "✅ Virtual environment created"

# Activate and install dependencies
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    source venv/Scripts/activate
else
    # Unix-like (macOS, Linux)
    source venv/bin/activate
fi

pip install -r requirements.txt
echo "✅ Backend dependencies installed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file..."
    echo "# Claude Arena Backend Configuration" > .env
    echo "DATABASE_URL=postgresql://user:password@localhost/claude_arena" >> .env
    echo "SECRET_KEY=your-secret-key-here" >> .env
    echo "✅ Created .env file (please update with your values)"
fi

cd ..

# Frontend setup
echo ""
echo "Setting up frontend..."
cd frontend

npm install
echo "✅ Frontend dependencies installed"

# Create .env.local if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    echo "# Claude Arena Frontend Configuration" > .env.local
    echo "VITE_SUPABASE_URL=your-supabase-url" >> .env.local
    echo "VITE_SUPABASE_ANON_KEY=your-supabase-anon-key" >> .env.local
    echo "VITE_API_URL=http://localhost:8281" >> .env.local
    echo "✅ Created .env.local file (please update with your values)"
fi

cd ..

# Make scripts executable
chmod +x scripts/*.py
chmod +x backend/run.sh

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your database credentials"
echo "2. Update frontend/.env.local with your Supabase credentials"
echo "3. Run 'python scripts/import_claude_logs.py' to import your data"
echo "4. Start the backend: cd backend && ./run.sh"
echo "5. Start the frontend: cd frontend && npm run dev"
echo ""
echo "Happy competing! 🚀"