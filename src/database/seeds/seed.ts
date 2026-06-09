import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from 'src/modules/users/user.entity';
import { Article } from 'src/modules/articles/article.entity';

const USERS_COUNT = 15;
const ARTICLES_COUNT = 100;

const firstNames = [
  'Александр',
  'Мария',
  'Дмитрий',
  'Анна',
  'Иван',
  'Елена',
  'Сергей',
  'Ольга',
  'Андрей',
  'Наталья',
  'Максим',
  'Татьяна',
  'Алексей',
  'Екатерина',
  'Михаил',
];

const lastNames = [
  'Иванов',
  'Петров',
  'Сидоров',
  'Смирнов',
  'Кузнецов',
  'Попов',
  'Васильев',
  'Соколов',
  'Михайлов',
  'Новиков',
  'Федоров',
  'Морозов',
  'Волков',
  'Алексеев',
  'Лебедев',
];

const articleTitles = [
  'Введение в TypeScript',
  'Основы React хуков',
  'PostgreSQL для начинающих',
  'Redis и кэширование',
  'Микросервисная архитектура',
  'Docker в продакшене',
  'Kubernetes для разработчиков',
  'GraphQL vs REST API',
  'Безопасность веб-приложений',
  'CI/CD лучшие практики',
  'Тестирование Node.js приложений',
  'WebSockets и реал-тайм',
  'Оптимизация баз данных',
  'Monitoring и логирование',
  'Авторизация и JWT',
];

const contentTemplates = [
  'В этой статье мы рассмотрим основные концепции и практические примеры использования. Начнем с базовых принципов и постепенно перейдем к более сложным сценариям.',
  'Данная технология позволяет решить множество проблем современной разработки. Давайте разберем детально все преимущества и недостатки.',
  'Пошаговое руководство для тех, кто хочет освоить эту тему с нуля. Мы пройдем путь от установки до деплоя в продакшен.',
  'Глубокое погружение в архитектурные решения и паттерны проектирования. Примеры из реальных проектов.',
  'Сравнительный анализ различных подходов и инструментов. Что выбрать для вашего проекта?',
];

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

export async function seedDatabase(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const articleRepository = dataSource.getRepository(Article);

  console.log('Starting database seed...');

  // Создаем пользователей
  console.log(`Creating ${USERS_COUNT} users...`);
  const users: User[] = [];
  const hashedPassword = await argon2.hash('password123');

  for (let i = 0; i < USERS_COUNT; i++) {
    const firstName = randomElement(firstNames);
    const lastName = randomElement(lastNames);
    const user = userRepository.create({
      email: `user${i + 1}@example.com`,
      password: hashedPassword,
      name: `${firstName} ${lastName}`,
    });
    users.push(user);
  }

  await userRepository.save(users);
  console.log(`Created ${users.length} users`);

  // Создаем статьи
  console.log(`Creating ${ARTICLES_COUNT} articles...`);
  const articles: Article[] = [];
  const startDate = new Date('2024-01-01');
  const endDate = new Date();

  for (let i = 0; i < ARTICLES_COUNT; i++) {
    const author = randomElement(users);
    const title = `${randomElement(articleTitles)} - часть ${Math.floor(Math.random() * 10) + 1}`;
    const description = `Подробное руководство по теме "${randomElement(articleTitles)}" с практическими примерами и советами экспертов.`;
    const content = `${randomElement(contentTemplates)}\n\n${randomElement(contentTemplates)}\n\n${randomElement(contentTemplates)}`;

    const article = articleRepository.create({
      title,
      description,
      content,
      authorId: author.id,
      createdAt: randomDate(startDate, endDate),
    });
    articles.push(article);
  }

  await articleRepository.save(articles);
  console.log(`Created ${articles.length} articles`);

  console.log('Database seeded successfully!');
}
