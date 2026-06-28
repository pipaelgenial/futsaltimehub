#!/bin/bash

echo "🚀 A iniciar backend..."

cd backend

source venv/bin/activate

pip install -r requirements.txt

uvicorn server:app --reload &
BACKEND_PID=$!

cd ..

echo "🚀 A iniciar frontend..."

cd frontend

npm install

npm start &
FRONTEND_PID=$!

echo "✅ Tudo a correr!"
echo "Backend: http://127.0.0.1:8000"
echo "Frontend: http://localhost:3000"

wait $BACKEND_PID $FRONTEND_PID
