import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Получаем путь к текущему файлу и поднимаемся к корню проекта
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '..', '..', '.env');

console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);
console.log('Trying to load .env from:', envPath);

// Проверяем, существует ли файл
if (existsSync(envPath)) {
  console.log('✅ .env file found at:', envPath);
} else {
  console.log('❌ .env file NOT found at:', envPath);
}

// Загружаем .env из корневой директории проекта  
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env:', result.error);
} else {
  console.log('✅ .env loaded successfully');
}

console.log('OPENROUTER_API_KEY exists:', !!process.env.OPENROUTER_API_KEY);

// Экспортируем функцию для проверки, что переменные загружены
export function checkEnvLoaded(): boolean {
  return !!process.env.OPENROUTER_API_KEY;
}
