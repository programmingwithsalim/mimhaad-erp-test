#!/bin/bash

# Amplify Build Script - Linux Version for AWS Amplify Deployment
echo "🚀 Starting Amplify-optimized build..."

# Step 0: Check Node.js version
echo "🔍 Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "Current Node.js version: $NODE_VERSION"

# Check if Node.js version meets requirements
if [[ $NODE_VERSION =~ v([0-9]+) ]]; then
    MAJOR_VERSION=${BASH_REMATCH[1]}
    if [ "$MAJOR_VERSION" -lt 19 ]; then
        echo "⚠️ Warning: Node.js version $NODE_VERSION detected. Some packages require Node.js 19+."
        echo "Using --legacy-peer-deps to handle compatibility issues."
    fi
fi

# Step 1: Pre-build cleanup
echo "🧹 Pre-build cleanup..."
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ Cleared previous build cache"
fi

# Step 2: Clear Next.js cache
echo "🗑️ Clearing Next.js cache..."
npx next clear
echo "✅ Next.js cache cleared"

# Step 3: Install dependencies with legacy peer deps (if needed)
echo "📦 Installing dependencies..."
npm ci --legacy-peer-deps
if [ $? -ne 0 ]; then
    echo "⚠️ npm ci failed, trying npm install..."
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo "❌ Dependency installation failed!"
        exit 1
    fi
fi
echo "✅ Dependencies installed successfully"

# Step 4: Build the application
echo "🔨 Building application..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build completed successfully"

# Step 4.5: Manual cache cleanup (in case the post-build script fails)
echo "🧹 Manual cache cleanup..."
if [ -d ".next/cache" ]; then
    rm -rf .next/cache
    echo "✅ Build cache removed manually"
fi

# Step 5: Post-build cleanup (remove cache but keep build output)
echo "🧹 Post-build cleanup..."
if [ -d ".next/cache" ]; then
    rm -rf .next/cache
    echo "✅ Build cache removed"
fi

# Step 6: Show build size
BUILD_SIZE=$(du -sh .next | cut -f1)
echo "📊 Build size: $BUILD_SIZE"

echo "🎉 Amplify build completed and optimized!"
echo "Ready for deployment to AWS Amplify" 