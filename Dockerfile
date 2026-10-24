FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN useradd --system --uid 10001 --user-group --create-home appuser \
    && mkdir -p /app_data \
    && chown appuser:appuser /app_data

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appuser . .

USER 10001:10001

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
