FROM node:18-slim

# 필수 라이브러리 설치
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  xdg-utils \
  --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# package.json 관련 복사 및 설치
COPY package*.json ./
RUN npm install

# credentials.json 복사
COPY credentials.json ./credentials.json
COPY .env .env

# 앱 코드 복사
COPY . .

ENV PORT=8080

CMD ["node", "index.js"]
