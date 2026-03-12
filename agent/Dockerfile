FROM python:3.12-slim

WORKDIR /app

# System dependencies for Pillow + audio
RUN apt-get update && apt-get install -y --no-install-recommends \
    libjpeg-dev \
    libpng-dev \
    libopus-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent source
COPY agent.py tools.py state.py ./

# Download LiveKit plugin models (if required by livekit-agents)
RUN python -c "import livekit.agents" || true

ENV PYTHONUNBUFFERED=1

CMD ["python", "agent.py", "start"]
