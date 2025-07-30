# Amplify Build Script - Optimized for AWS Amplify Deployment
Write-Host "🚀 Starting Amplify-optimized build..." -ForegroundColor Green

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

# Step 3: Build the application
Write-Host "🔨 Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completed successfully" -ForegroundColor Green

# Step 4: Post-build cleanup (remove cache but keep build output)
Write-Host "🧹 Post-build cleanup..." -ForegroundColor Yellow
if (Test-Path ".next/cache") {
    Remove-Item -Recurse -Force .next/cache
    Write-Host "✅ Build cache removed" -ForegroundColor Green
}

# Step 5: Show build size
$buildSize = (Get-ChildItem -Path ".next" -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "📊 Build size: $([math]::Round($buildSize, 2)) MB" -ForegroundColor Cyan

Write-Host "🎉 Amplify build completed and optimized!" -ForegroundColor Green
Write-Host "Ready for deployment to AWS Amplify" -ForegroundColor Cyan 