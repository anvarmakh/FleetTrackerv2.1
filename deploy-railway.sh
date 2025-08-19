#!/bin/bash

# 🚂 FleetTracker Railway Deployment Script
# This script helps prepare and deploy your FleetTracker application to Railway

set -e

echo "🚂 FleetTracker Railway Deployment Script"
echo "=========================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Not in a git repository. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Check if we have a remote origin
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ No remote origin found. Please add your GitHub repository:"
    echo "   git remote add origin https://github.com/yourusername/your-repo.git"
    exit 1
fi

echo "✅ Git repository check passed"

# Check if all required files exist
required_files=("railway.json" "nixpacks.toml" "Procfile" "package.json")
missing_files=()

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    echo "❌ Missing required files: ${missing_files[*]}"
    echo "Please ensure all Railway configuration files are present."
    exit 1
fi

echo "✅ All required files found"

# Check if environment variables are documented
if [ ! -f "env.example" ]; then
    echo "⚠️  Warning: env.example file not found"
    echo "   Consider creating one for documentation"
else
    echo "✅ Environment variables documented"
fi

# Check if we have uncommitted changes
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   Consider committing them before deployment:"
    echo "   git add ."
    echo "   git commit -m 'Prepare for Railway deployment'"
else
    echo "✅ No uncommitted changes"
fi

echo ""
echo "🎯 Next Steps for Railway Deployment:"
echo "====================================="
echo ""
echo "1. 📝 Push your code to GitHub:"
echo "   git push origin main"
echo ""
echo "2. 🌐 Go to Railway Dashboard:"
echo "   https://railway.app"
echo ""
echo "3. 🚀 Create New Project:"
echo "   - Click 'New Project'"
echo "   - Select 'Deploy from GitHub repo'"
echo "   - Choose your FleetTracker repository"
echo ""
echo "4. ⚙️  Configure Environment Variables:"
echo "   - Go to 'Variables' tab in your Railway project"
echo "   - Add the required variables from env.example"
echo "   - Make sure to use production-ready secrets"
echo ""
echo "5. 🔄 Deploy:"
echo "   - Railway will automatically build and deploy"
echo "   - Monitor the build logs for any issues"
echo "   - Your app will be available at the provided URL"
echo ""
echo "📚 For detailed instructions, see: DEPLOYMENT_GUIDE.md"
echo ""
echo "🔒 Security Reminder:"
echo "   - Change all default secrets in production"
echo "   - Use strong, unique keys for all security variables"
echo "   - Never commit .env files to version control"
echo ""
echo "✅ Deployment script completed successfully!"
