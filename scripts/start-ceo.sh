#!/bin/bash

##
# CEO Discovery System - Startup Script
#
# Starts the CEO Discovery daemon with dashboard server
##

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting CEO Discovery System...${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if build exists
if [ ! -d "dist" ]; then
    echo -e "${BLUE}📦 Building project...${NC}"
    npm run build
fi

# Check for config file
if [ ! -f "ceo-config.json" ]; then
    echo -e "${BLUE}⚙️  Creating default configuration...${NC}"
    cat > ceo-config.json << EOF
{
  "daemon": {
    "discoveryInterval": 24,
    "optimizationInterval": 168,
    "autoStart": true,
    "autoPropose": true,
    "budgetRange": {
      "min": 100,
      "max": 500
    },
    "roiTarget": 3.0,
    "minConfidence": 0.7,
    "analysisWindow": 168
  },
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  }
}
EOF
    echo -e "${GREEN}✅ Created ceo-config.json${NC}"
fi

# Start the dashboard server
echo -e "${BLUE}🌐 Starting dashboard server...${NC}"

# Check if running in production or development
if [ "$NODE_ENV" == "production" ]; then
    echo -e "${GREEN}▶️  Starting in production mode${NC}"
    node dist/server/dashboard-cli.js
else
    echo -e "${GREEN}▶️  Starting in development mode${NC}"
    node dist/server/dashboard-cli.js
fi
