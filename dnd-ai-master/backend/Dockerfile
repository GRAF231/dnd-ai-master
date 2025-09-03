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

# Создание директории для базы данных
RUN mkdir -p database

EXPOSE 8000

CMD ["pnpm", "dev"]
