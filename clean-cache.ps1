# Cache Cleanup Script for Next.js Project
Write-Host "🧹 Cleaning up cache directories..." -ForegroundColor Green

# Remove Next.js build cache
if (Test-Path ".next") {
    Write-Host "Removing .next directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force .next
    Write-Host "✅ .next directory removed" -ForegroundColor Green
}

# Remove node_modules (optional - will need npm install after)
if (Test-Path "node_modules") {
    Write-Host "Removing node_modules directory..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force node_modules
    Write-Host "✅ node_modules directory removed" -ForegroundColor Green
}

# Clear npm cache
Write-Host "Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "✅ npm cache cleared" -ForegroundColor Green

# Clear Next.js cache
Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow
npx next clear
Write-Host "✅ Next.js cache cleared" -ForegroundColor Green

Write-Host "🎉 Cache cleanup completed!" -ForegroundColor Green
Write-Host "Run 'npm install' to reinstall dependencies if needed" -ForegroundColor Cyan 