#!/bin/bash

echo "🚀 Creating Portfolio OS project..."

# Root
mkdir portfolio-os && cd portfolio-os

# Backend structure
mkdir -p backend/app/{core,models,schemas,services,api/routes,utils}

touch backend/app/main.py
touch backend/app/core/{config.py,database.py}
touch backend/app/models/portfolio.py
touch backend/app/schemas/portfolio.py
touch backend/app/services/{analyzer.py,projections.py,risk.py}
touch backend/app/api/routes/portfolio.py
touch backend/app/api/deps.py
touch backend/app/utils/helpers.py

touch backend/requirements.txt
touch backend/run.py
touch backend/.env

# Frontend
mkdir frontend
cd frontend
yarn create vite . --template react
yarn
yarn add axios

cd ..

# Root files
touch README.md
touch .gitignore

# Scripts folder
mkdir scripts
touch scripts/dev.sh

echo "✅ Project structure created!"