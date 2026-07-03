FROM python:3.10-slim

WORKDIR /app

# Install dependencies needed for some Python packages (e.g., GCC if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY src/utils/requirements_emotion_ml.txt ./requirements.txt

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML API code
COPY src/utils/ ./src/utils/

# Expose port
EXPOSE 5001

# Run the ML API Server
CMD ["python", "src/utils/start_ml_server.py", "--port", "5001"]
