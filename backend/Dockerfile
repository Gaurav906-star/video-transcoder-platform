FROM python:3.12-slim

# Install FFmpeg + system deps
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# IMPORTANT: set Flask app
ENV FLASK_APP=run:app

EXPOSE 5000

# Run migrations before starting app
CMD sh -c "flask db upgrade && gunicorn -w 4 -b 0.0.0.0:5000 run:app"