// Простой тест для проверки Anthropic API
import dotenv from 'dotenv';
import path from 'path';

// Загружаем переменные окружения
dotenv.config({ path: path.join(process.cwd(), 'dnd-ai-master', '.env') });

console.log('🧪 Тестирование Anthropic API интеграции...\n');

// Проверяем переменные окружения
console.log('📋 Настройки:');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅ Установлен' : '❌ Не установлен');
console.log('ANTHROPIC_BASE_URL:', process.env.ANTHROPIC_BASE_URL);
console.log('ANTHROPIC_MODEL:', process.env.ANTHROPIC_MODEL);
console.log('USE_ANTHROPIC:', process.env.USE_ANTHROPIC);

async function testAnthropicAPI() {
  try {
    console.log('\n🔗 Тестирование прямого запроса к Anthropic API...');
    
    const response = await fetch(process.env.ANTHROPIC_BASE_URL + '/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANTHROPIC_API_KEY}`,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL,
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: 'Привет! Ты работаешь?'
          }
        ]
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Успешный ответ от Anthropic API:');
      console.log('Статус:', response.status);
      console.log('Ответ:', data.content?.[0]?.text || data);
    } else {
      console.log('❌ Ошибка Anthropic API:');
      console.log('Статус:', response.status);
      console.log('Ошибка:', data);
    }
  } catch (error) {
    console.log('❌ Ошибка при запросе:', error.message);
  }
}

// Запускаем тест
testAnthropicAPI();
