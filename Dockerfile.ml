FROM python:3.10-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY ml/requirements_emotion_ml.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ml/ ./ml/

EXPOSE 5001

CMD ["python", "ml/start_ml_server.py", "--port", "5001"]
