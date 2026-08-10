FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY agent1/requirements.txt ./agent1/requirements.txt
RUN pip install --no-cache-dir -r agent1/requirements.txt

# Copy application code
COPY agent1/ ./agent1/

EXPOSE 8001

CMD ["uvicorn", "agent1.main:app", "--host", "0.0.0.0", "--port", "8001"]
