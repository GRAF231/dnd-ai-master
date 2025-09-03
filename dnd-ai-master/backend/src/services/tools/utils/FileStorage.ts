import fs from 'fs';
import path from 'path';

/**
 * Утилита для работы с JSON файлами данных
 * Обеспечивает персистентность данных между сессиями
 */
export class FileStorage {
  private dataDir: string;

  constructor(dataDir: string = './data') {
    this.dataDir = dataDir;
    this.ensureDataDir();
  }

  /**
   * Создает директорию для данных если её нет
   */
  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Сохраняет данные в JSON файл
   * @param filename Имя файла (без расширения)
   * @param data Данные для сохранения
   */
  save(filename: string, data: any): void {
    try {
      const filepath = path.join(this.dataDir, `${filename}.json`);
      const jsonData = JSON.stringify(data, null, 2);
      fs.writeFileSync(filepath, jsonData, 'utf8');
    } catch (error) {
      console.error(`Ошибка сохранения ${filename}:`, error);
      throw new Error(`Не удалось сохранить данные в ${filename}`);
    }
  }

  /**
   * Загружает данные из JSON файла
   * @param filename Имя файла (без расширения)
   * @returns Загруженные данные или null если файл не существует
   */
  load<T>(filename: string): T | null {
    try {
      const filepath = path.join(this.dataDir, `${filename}.json`);
      if (!fs.existsSync(filepath)) {
        return null;
      }
      const jsonData = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(jsonData) as T;
    } catch (error) {
      console.error(`Ошибка загрузки ${filename}:`, error);
      return null;
    }
  }

  /**
   * Проверяет существование файла
   * @param filename Имя файла (без расширения)
   */
  exists(filename: string): boolean {
    const filepath = path.join(this.dataDir, `${filename}.json`);
    return fs.existsSync(filepath);
  }

  /**
   * Удаляет файл
   * @param filename Имя файла (без расширения)
   */
  delete(filename: string): boolean {
    try {
      const filepath = path.join(this.dataDir, `${filename}.json`);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Ошибка удаления ${filename}:`, error);
      return false;
    }
  }

  /**
   * Возвращает список всех файлов в директории данных
   */
  listFiles(): string[] {
    try {
      return fs.readdirSync(this.dataDir)
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.error('Ошибка получения списка файлов:', error);
      return [];
    }
  }

  /**
   * Добавляет элемент в массив в файле
   * @param filename Имя файла
   * @param item Элемент для добавления
   */
  appendToArray<T>(filename: string, item: T): void {
    const data = this.load<T[]>(filename) || [];
    data.push(item);
    this.save(filename, data);
  }

  /**
   * Обновляет элемент в массиве по условию
   * @param filename Имя файла
   * @param condition Функция для поиска элемента
   * @param updates Объект с обновлениями
   */
  updateInArray<T>(filename: string, condition: (item: T) => boolean, updates: Partial<T>): boolean {
    const data = this.load<T[]>(filename);
    if (!data) return false;

    const index = data.findIndex(condition);
    if (index === -1) return false;

    data[index] = { ...data[index], ...updates };
    this.save(filename, data);
    return true;
  }

  /**
   * Удаляет элемент из массива по условию
   * @param filename Имя файла
   * @param condition Функция для поиска элемента
   */
  removeFromArray<T>(filename: string, condition: (item: T) => boolean): boolean {
    const data = this.load<T[]>(filename);
    if (!data) return false;

    const initialLength = data.length;
    const filteredData = data.filter(item => !condition(item));
    
    if (filteredData.length !== initialLength) {
      this.save(filename, filteredData);
      return true;
    }
    return false;
  }
}

// Экспортируем готовый экземпляр для использования в сервисах
export const fileStorage = new FileStorage();
