
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install fastapi==0.115.0 uvicorn[standard]==0.30.0 pydantic==2.9.0 numpy==2.1.0
EXPOSE 8000
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8000"]
