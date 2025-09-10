FROM node:20-alpine

WORKDIR /app

# Установка pnpm
RUN npm install -g pnpm

# Копирование package.json
COPY package.json pnpm-lock.yaml* ./

# Установка зависимостей
RUN pnpm install

# Копирование исходного кода
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev"]
