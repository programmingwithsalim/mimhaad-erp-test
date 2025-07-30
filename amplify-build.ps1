# Amplify Build Script - Optimized for AWS Amplify Deployment
Write-Host "🚀 Starting Amplify-optimized build..." -ForegroundColor Green

# Step 0: Check Node.js version
Write-Host "🔍 Checking Node.js version..." -ForegroundColor Yellow
$nodeVersion = node --version
Write-Host "Current Node.js version: $nodeVersion" -ForegroundColor Cyan

# Check if Node.js version meets requirements
if ($nodeVersion -match "v(\d+)") {
    $majorVersion = [int]$matches[1]
    if ($majorVersion -lt 19) {
        Write-Host "⚠️ Warning: Node.js version $nodeVersion detected. Some packages require Node.js 19+." -ForegroundColor Yellow
        Write-Host "Using --legacy-peer-deps to handle compatibility issues." -ForegroundColor Yellow
    }
}

# Step 1: Pre-build cleanup
Write-Host "🧹 Pre-build cleanup..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Cleared previous build cache" -ForegroundColor Green
}

# Step 2: Clear Next.js cache
Write-Host "🗑️ Clearing Next.js cache..." -ForegroundColor Yellow
npx next clear
Write-Host "✅ Next.js cache cleared" -ForegroundColor Green

# Step 3: Install dependencies with legacy peer deps (if needed)
Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
npm ci --legacy-peer-deps
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ npm ci failed, trying npm install..." -ForegroundColor Yellow
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Dependency installation failed!" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green

# Step 4: Build the application
Write-Host "🔨 Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completed successfully" -ForegroundColor Green

# Step 5: Post-build cleanup (remove cache but keep build output)
Write-Host "🧹 Post-build cleanup..." -ForegroundColor Yellow
if (Test-Path ".next/cache") {
    Remove-Item -Recurse -Force .next/cache
    Write-Host "✅ Build cache removed" -ForegroundColor Green
}

# Step 6: Show build size
$buildSize = (Get-ChildItem -Path ".next" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "📊 Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Cyan

Write-Host "🎉 Amplify build completed and optimized!" -ForegroundColor Green
Write-Host "Ready for deployment to AWS Amplify" -ForegroundColor Cyan 