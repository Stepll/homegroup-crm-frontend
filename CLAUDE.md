# HomeGroup CRM — Frontend

React SPA з мобайл-фьорст дизайном для CRM церковних домашніх груп.

## Tech Stack

- **Bundler**: Vite
- **Framework**: React 18+
- **Routing**: React Router v6
- **UI Library**: Ant Design Mobile (antd-mobile)
- **Language**: TypeScript
- **HTTP**: Axios або native fetch
- **State**: React Context + useReducer (або Zustand якщо ускладниться)
- **Auth**: JWT токени (localStorage / httpOnly cookie)

## Project Structure

```
src/
  api/              # API-клієнт, запити до бекенду
  components/       # Перевикористовувані компоненти
  pages/            # Сторінки (роути)
    auth/
    groups/
    people/
    attendance/
  hooks/            # Кастомні хуки
  store/            # Глобальний стан (auth, user)
  types/            # TypeScript типи/інтерфейси
  utils/            # Хелпери
  App.tsx
  main.tsx
public/
```

## Routing Structure

```
/login                  — авторизація
/                       — дашборд / головна
/groups                 — список домашніх груп
/groups/:id             — деталі групи + учасники
/groups/:id/attendance  — відвідуваність групи
/people                 — список людей
/people/:id             — картка людини
```

## Design Principles

- **Mobile-first**: всі компоненти проектуються для мобільних спочатку
- **Ant Design Mobile**: використовувати компоненти antd-mobile (NavBar, TabBar, List, Card, Form, etc.)
- **Offline-friendly**: мінімальна залежність від мережі де можливо
- **Touch-friendly**: достатні tap target-и, свайп-жести де доречно

## API

Бекенд: `http://localhost:5000/api/v1` (dev) / `https://api.your-domain.com/api/v1` (prod)

Авторизація: `Authorization: Bearer <token>` у всіх запитах.

## Development Commands

```bash
# Встановити залежності
npm install

# Запустити dev-сервер
npm run dev

# Build
npm run build

# Preview build
npm run preview

# TypeScript перевірка
npm run type-check
```

## Environment Variables

```
VITE_API_URL=http://localhost:5000/api/v1
```

## TODO

### Ініціалізація
- [ ] Створити Vite + React + TypeScript проект
- [ ] Встановити та налаштувати antd-mobile
- [ ] Встановити React Router v6, налаштувати роути
- [ ] Налаштувати Axios/fetch з базовим URL та interceptor для JWT
- [ ] Налаштувати `.env` файли (dev / prod)

### Auth
- [ ] Сторінка логіну `/login`
- [ ] Зберігання JWT токену
- [ ] ProtectedRoute компонент (redirect якщо не авторизований)
- [ ] Автоматичне додавання токену до запитів
- [ ] Logout + очистка токену

### Домашні групи
- [ ] Список груп `/groups` (antd-mobile List / Card)
- [ ] Сторінка деталей групи `/groups/:id`
- [ ] Список учасників групи
- [ ] Форма додавання / редагування групи

### Люди
- [ ] Список людей `/people` з пошуком
- [ ] Картка людини `/people/:id`
- [ ] Форма додавання / редагування людини
- [ ] Прив'язка людини до групи

### Відвідуваність
- [ ] Сторінка відмітки відвідуваності `/groups/:id/attendance`
- [ ] Чекбокси по учасниках для конкретної дати
- [ ] Перегляд статистики відвідуваності по групі
- [ ] Фільтр по даті

### UX / Загальне
- [ ] Bottom navigation (TabBar) — Групи / Люди / Профіль
- [ ] Дашборд з ключовими метриками
- [ ] Pull-to-refresh де потрібно
- [ ] Порожні стани (empty states) для списків
- [ ] Обробка помилок API (тости/повідомлення)
- [ ] Loading стани (Skeleton / Spinner)

### Deployment
- [ ] Build артефакт через Nginx або CDN
- [ ] Налаштувати CORS на бекенді для продакшн домену
