# PowerShell script to set up local development environment
Write-Host "Setting up local WCHL Hackathon development environment..." -ForegroundColor Green

# Stop any existing dfx processes
Write-Host "Stopping any existing dfx processes..." -ForegroundColor Yellow
dfx stop

# Start dfx with clean state
Write-Host "Starting dfx with clean state..." -ForegroundColor Yellow
dfx start --clean --background

# Wait a bit for dfx to fully start
Start-Sleep -Seconds 5

# Pull dependencies (Internet Identity)
Write-Host "Pulling dependencies..." -ForegroundColor Yellow
dfx deps pull

# Deploy dependencies (Internet Identity)
Write-Host "Deploying Internet Identity dependency..." -ForegroundColor Yellow
dfx deps deploy internet-identity

# Deploy backend
Write-Host "Deploying backend canister..." -ForegroundColor Yellow
dfx deploy wchl-hackathon-backend

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Yellow
Set-Location "src/wchl-hackathon-frontend"
npm install
npm run build
Set-Location "../.."

# Deploy frontend
Write-Host "Deploying frontend..." -ForegroundColor Yellow
dfx deploy wchl-hackathon-frontend

# Generate declarations
Write-Host "Generating declarations..." -ForegroundColor Yellow
dfx generate

Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "Internet Identity URL: http://rdmx6-jaaaa-aaaaa-aaadq-cai.localhost:4943" -ForegroundColor Cyan
Write-Host "Backend Canister ID: $(dfx canister id wchl-hackathon-backend)" -ForegroundColor Cyan
Write-Host "Frontend URL: http://$(dfx canister id wchl-hackathon-frontend).localhost:4943" -ForegroundColor Cyan

Write-Host "You can now start the frontend development server with:" -ForegroundColor Yellow
Write-Host "cd src/wchl-hackathon-frontend && npm start" -ForegroundColor White
