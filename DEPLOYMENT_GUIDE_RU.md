# 🚀 Руководство по развертыванию D&D AI Master

Это подробное руководство поможет вам развернуть ваше D&D AI приложение на различных хостинг-платформах.

## 📋 Содержание

1. [Подготовка к развертыванию](#подготовка-к-развертыванию)
2. [Переменные окружения](#переменные-окружения)
3. [Варианты хостинга](#варианты-хостинга)
4. [Развертывание с Docker](#развертывание-с-docker)
5. [Развертывание на VPS](#развертывание-на-vps)
6. [Развертывание на облачных платформах](#развертывание-на-облачных-платформах)
7. [Настройка доменов и SSL](#настройка-доменов-и-ssl)
8. [Мониторинг и обслуживание](#мониторинг-и-обслуживание)

## 🛠️ Подготовка к развертыванию

### Архитектура приложения

Ваше приложение состоит из:
- **Frontend**: Next.js приложение (порт 3000)
- **Backend**: Node.js/Fastify API (порт 8000)
- **CoTURN**: STUN/TURN сервер для WebRTC (порты 3478, 5349)
- **База данных**: SQLite (файловая)

### Минимальные системные требования

- **CPU**: 2 ядра
- **RAM**: 2 GB
- **Диск**: 10 GB SSD
- **Операционная система**: Ubuntu 20.04+ или любая поддерживающая Docker

## 🔐 Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# API ключи
OPENROUTER_API_KEY=your_openrouter_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# База данных
DATABASE_URL=./database/dnd.db

# Окружение
NODE_ENV=production

# URLs для продакшена (замените на ваши домены)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_FRONTEND_URL=https://yourdomain.com

# CoTURN настройки
TURNSERVER_REALM=yourdomain.com
TURNSERVER_USER=dnd:your_secure_password

# Безопасность
JWT_SECRET=your_very_secure_jwt_secret_here
```

## 🌐 Варианты хостинга

### 1. Бюджетные варианты (5-15$/месяц)

- **DigitalOcean Droplets**
- **Hetzner Cloud**
- **Vultr**
- **Linode**

### 2. Премиум варианты (20-50$/месяц)

- **AWS EC2**
- **Google Cloud Compute**
- **Azure Virtual Machines**

### 3. Специализированные платформы

- **Railway** (простое развертывание)
- **Render** (автоматические развертывания)
- **Fly.io** (глобальное развертывание)

## 🐳 Развертывание с Docker

### Подготовка Dockerfile для продакшена

Создайте `Dockerfile.prod` для бэкенда:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Установка pnpm
RUN npm install -g pnpm

# Копирование package.json
COPY package.json pnpm-lock.yaml* ./

# Установка только продакшен зависимостей
RUN pnpm install --frozen-lockfile --prod

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN pnpm build

# Создание директории для базы данных
RUN mkdir -p database && chown -R node:node /app

USER node

EXPOSE 8000

CMD ["pnpm", "start"]
```

Создайте `Dockerfile.prod` для фронтенда:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Установка pnpm
RUN npm install -g pnpm

# Копирование package.json
COPY package.json pnpm-lock.yaml* ./

# Установка зависимостей
RUN pnpm install --frozen-lockfile

# Копирование исходного кода
COPY . .

# Сборка приложения
RUN pnpm build

# Продакшен образ
FROM node:20-alpine AS runner

WORKDIR /app

# Установка pnpm
RUN npm install -g pnpm

# Копирование только необходимых файлов
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Установка только продакшен зависимостей
RUN pnpm install --frozen-lockfile --prod

USER node

EXPOSE 3000

CMD ["pnpm", "start"]
```

### Docker Compose для продакшена

Создайте `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    depends_on:
      - backend
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_URL=./database/dnd.db
    volumes:
      - ./backend/database:/app/database
      - ./backend/data:/app/data
    restart: unless-stopped

  coturn:
    image: coturn/coturn:4.6.2
    ports:
      - "3478:3478/udp"
      - "3478:3478/tcp"
      - "5349:5349/udp"
      - "5349:5349/tcp"
    environment:
      - TURNSERVER_REALM=${TURNSERVER_REALM}
      - TURNSERVER_USER=${TURNSERVER_USER}
    volumes:
      - ./docker/coturn.conf:/etc/coturn/turnserver.conf
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

networks:
  default:
    driver: bridge
```

## 🖥️ Развертывание на VPS

### 1. Подключение к серверу

```bash
ssh root@your_server_ip
```

### 2. Обновление системы

```bash
apt update && apt upgrade -y
```

### 3. Установка Docker и Docker Compose

```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Добавление пользователя в группу docker
usermod -aG docker $USER
```

### 4. Клонирование репозитория

```bash
git clone https://github.com/your-username/dnd-ai-master.git
cd dnd-ai-master
```

### 5. Настройка переменных окружения

```bash
cp .env.example .env
nano .env
```

### 6. Создание конфигурации Nginx

Создайте `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:3000;
    }

    upstream backend {
        server backend:8000;
    }

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /api/ {
            proxy_pass http://backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # WebSocket поддержка
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### 7. Запуск приложения

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### 8. Проверка статуса

```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs
```

## ☁️ Развертывание на облачных платформах

### Railway

1. Подключите GitHub репозиторий к Railway
2. Добавьте переменные окружения в панели управления
3. Railway автоматически развернет приложение

### Render

1. Создайте новый Web Service
2. Подключите GitHub репозиторий
3. Настройте команды сборки:
   ```bash
   # Build Command
   cd backend && pnpm install && pnpm build
   
   # Start Command
   cd backend && pnpm start
   ```

### DigitalOcean App Platform

1. Создайте новое приложение из GitHub репозитория
2. Настройте компоненты:
   - **Backend**: Node.js сервис
   - **Frontend**: Static Site
   - **Database**: Managed Database (опционально)

## 🔒 Настройка доменов и SSL

### 1. Настройка DNS

Добавьте A-записи в вашем DNS провайдере:

```
A    @           your_server_ip
A    www         your_server_ip
A    api         your_server_ip
```

### 2. Установка Certbot для SSL

```bash
apt install certbot python3-certbot-nginx
```

### 3. Получение SSL сертификата

```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com
```

### 4. Автоматическое обновление сертификатов

```bash
crontab -e

# Добавьте строку:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Мониторинг и обслуживание

### Создание скрипта мониторинга

Создайте `scripts/monitor.sh`:

```bash
#!/bin/bash

# Проверка статуса контейнеров
echo "=== Статус контейнеров ==="
docker-compose -f docker-compose.prod.yml ps

# Проверка использования ресурсов
echo "=== Использование ресурсов ==="
docker stats --no-stream

# Проверка логов на ошибки
echo "=== Последние ошибки ==="
docker-compose -f docker-compose.prod.yml logs --tail=50 | grep -i error

# Проверка дискового пространства
echo "=== Дисковое пространство ==="
df -h

# Проверка доступности сервисов
echo "=== Проверка доступности ==="
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
echo " - Frontend"
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000
echo " - Backend"
```

### Создание скрипта резервного копирования

Создайте `scripts/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/root/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Создание директории для бэкапов
mkdir -p $BACKUP_DIR

# Резервное копирование базы данных
cp ./backend/database/dnd.db $BACKUP_DIR/dnd_backup_$DATE.db

# Резервное копирование данных персонажей
tar -czf $BACKUP_DIR/characters_backup_$DATE.tar.gz ./backend/data/

# Удаление старых бэкапов (старше 7 дней)
find $BACKUP_DIR -name "*.db" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Автоматизация бэкапов

```bash
crontab -e

# Добавьте строки:
0 2 * * * /path/to/your/scripts/backup.sh
0 */6 * * * /path/to/your/scripts/monitor.sh
```

## 🚨 Устранение неполадок

### Частые проблемы

1. **Контейнеры не запускаются**
   ```bash
   docker-compose -f docker-compose.prod.yml logs
   ```

2. **Недостаточно памяти**
   ```bash
   free -h
   docker system prune -a
   ```

3. **Проблемы с базой данных**
   ```bash
   # Проверка прав доступа
   ls -la backend/database/
   
   # Восстановление из бэкапа
   cp /root/backups/dnd_backup_YYYYMMDD_HHMMSS.db ./backend/database/dnd.db
   ```

4. **SSL сертификат не работает**
   ```bash
   certbot certificates
   nginx -t
   systemctl reload nginx
   ```

### Логи и отладка

```bash
# Просмотр логов всех сервисов
docker-compose -f docker-compose.prod.yml logs -f

# Просмотр логов конкретного сервиса
docker-compose -f docker-compose.prod.yml logs -f backend

# Вход в контейнер для отладки
docker-compose -f docker-compose.prod.yml exec backend sh
```

## 📝 Чек-лист перед запуском

- [ ] Настроены все переменные окружения
- [ ] Получены SSL сертификаты
- [ ] Настроены DNS записи
- [ ] Проведено тестирование на staging окружении
- [ ] Настроены резервные копии
- [ ] Настроен мониторинг
- [ ] Проверена работа WebRTC (CoTURN)
- [ ] Протестированы все основные функции

## 📞 Поддержка

Если у вас возникли проблемы:

1. Проверьте логи: `docker-compose logs`
2. Убедитесь, что все порты открыты
3. Проверьте переменные окружения
4. Обратитесь к документации вашего хостинг провайдера

---

**Удачного развертывания! 🚀**
