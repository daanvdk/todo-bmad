FROM python:3.12-slim
WORKDIR /app
RUN groupadd -r appuser && useradd -r -g appuser appuser \
    && chown appuser:appuser /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
USER appuser
COPY --chown=appuser:appuser pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/tmp/uv-cache,uid=999,gid=999 \
    UV_CACHE_DIR=/tmp/uv-cache uv sync --frozen --no-dev
ENV PATH="/app/.venv/bin:$PATH"
COPY --chown=appuser:appuser . .
EXPOSE 8000
ENTRYPOINT ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
