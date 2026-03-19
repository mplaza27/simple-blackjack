FROM python:3.12-slim

RUN apt-get update && apt-get install -y nodejs npm \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install

COPY . .
