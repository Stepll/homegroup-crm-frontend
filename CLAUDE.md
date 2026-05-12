# HomeGroup CRM — Frontend

React SPA з мобайл-фьорст дизайном для CRM церковних домашніх груп.

## Tech Stack

- **Bundler**: Vite
- **Framework**: React 18 + TypeScript
- **Routing**: React Router v6
- **UI Library**: antd-mobile v5 (NavBar, List, Button, Input, Dialog, Popup, Toast, SpinLoading, etc.)
- **HTTP**: Axios (через `src/api/client.ts`, автоматично додає JWT)
- **State**: React Context (AuthContext) + useState/useEffect per page
- **Auth**: JWT в localStorage

## Actual Project Structure

```
src/
  api/
    client.ts             — Axios instance з baseURL + JWT interceptor
    people.ts             — peopleApi (getAll, getById, create, update, remove, custom fields)
    groups.ts             — groupsApi (CRUD, members, syncMembers, custom fields)
    roles.ts              — rolesApi (CRUD)
    attendance.ts         — attendanceApi
  components/
    AppLayout.tsx         — bottom tab bar (5 tabs) + <Outlet />
    ProtectedRoute.tsx    — redirect to /login if not authed
  pages/
    auth/
      LoginPage.tsx
    DashboardPage.tsx
    profile/
      ProfilePage.tsx     — аватар з ініціалами, роль, logout
    people/
      PeoplePage.tsx      — список з пошуком + colored group tag
      PersonCreatePage.tsx — форма: Name*, LastName, Group
      PersonDetailPage.tsx — inline editing per-field, custom fields block
    groups/
      GroupsPage.tsx
      GroupDetailPage.tsx
    attendance/
      AttendancePage.tsx
    settings/
      SettingsPage.tsx           — меню: Адміни, Ролі, Домашні групи
      AdminsPage.tsx
      RolesSettingsPage.tsx      — список ролей
      RoleFormPage.tsx           — форма ролі (назва, колір, permissions, isDefault)
      HomeGroupsSettingsPage.tsx — список груп
      HomeGroupFormPage.tsx      — форма групи (назва, колір, учасники, кастомні поля)
  store/
    auth.tsx              — AuthContext, useAuth hook, login/logout
  types/
    index.ts              — Person, Group, CustomField, GroupCustomField, AuthResponse, etc.
  App.tsx                 — BrowserRouter + Routes
  main.tsx
public/
  logo.svg               — SVG логотип, viewBox="320 320 640 640" (обрізаний до кола)
```

## Routing

```
/login
/                          — Dashboard
/profile
/people                    — список людей
/people/new                — створення людини
/people/:id                — деталі / редагування людини
/groups                    — список груп (перегляд)
/groups/:id                — деталі групи
/groups/:id/attendance     — відвідуваність
/settings                  — меню налаштувань
/settings/admins
/settings/roles            — список ролей
/settings/roles/:id        — форма ролі (id="new" для створення)
/settings/home-groups      — список домашніх груп (налаштування)
/settings/home-groups/:id  — форма групи (id="new" для створення)
```

## Bottom Tab Bar

5 tabs у `AppLayout.tsx`, активна вкладка визначається по `pathname`:
```
/ → Дашборд
/people → Люди
/groups → Група
/profile → Профіль
/settings → Налаштування
```
Активна вкладка: teal top-border (3px pill). Реалізовано як кастомні кнопки (не antd-mobile TabBar).

## Key Patterns

### Inline Editing (PersonDetailPage)
`EditableField` компонент: показує `label + value + іконка олівця`. По кліку на олівець — інпут + Зберегти/Скасувати. `onSave` отримує рядок і робить API call.

```tsx
<EditableField
  label="Ім'я"
  display={person.name}
  onSave={(v) => save({ name: v })}
  renderEditor={(v, onChange) => <Input value={v} onChange={onChange} />}
/>
```

### Custom Fields (Group-Scoped)
Поля визначаються на рівні `HomeGroup`, люди мають лише значення:
- Додати поле через сторінку людини → `POST /people/:id/custom-fields` → створює поле для всієї групи
- Видалити поле → видаляється для всіх учасників групи
- Редагувати значення → `PUT /people/:id/custom-fields/:fieldId` (upsert)
- Якщо людина не має групи — блок кастомних полів показує повідомлення

### Group Member Search (HomeGroupFormPage)
- При першому фокусі на інпуті — одразу завантажує всіх людей без групи (`?noGroup=true`)
- При наборі тексту — debounce 300ms, пошук тільки серед людей без групи
- В dropdown кожна людина має чорний тег "без групи"

### Bidirectional Group Sync
- Зміна "Домашня група" на сторінці людини → бекенд автоматично оновлює `HomeGroupMembers`
- Збереження учасників на сторінці групи → бекенд автоматично оновлює `PrimaryGroupId` кожної людини

### Popup замість Dialog.prompt
`antd-mobile v5` не має `Dialog.prompt`. Використовуємо `<Popup>` з `<Input>` всередині для введення тексту.

### Group Color Tag (PeoplePage)
```tsx
<span style={{ color: p.primaryGroupColor, background: `${p.primaryGroupColor}18` }}>
  {p.primaryGroupName}
</span>
```
`18` в кінці hex — 10% opacity для фону.

## CSS Design Tokens

Всі кольори та розміри через CSS змінні (визначені в `index.css`):
```css
--color-primary       /* teal */
--color-error
--color-text
--color-text-secondary
--color-text-tertiary
--color-border
--color-border-light
--radius-md
--radius-lg
--shadow-sm
--shadow-lg
--font-base
```

## Input Style (стандарт для всіх форм)

```tsx
const inputWrap: React.CSSProperties = {
  background: '#fff',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)',
  padding: '10px 14px',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'var(--color-text-secondary)', marginBottom: 8,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}
```

## Types (src/types/index.ts)

```typescript
Person: { id, name, lastName?, phone?, email?, notes?, status, oversightInfo?,
          dateOfBirth?, primaryGroupId?, primaryGroupName?, primaryGroupColor?,
          createdAt, customFields?: CustomField[] }

CustomField: { id, name, value? }   // id = HomeGroupCustomField.Id

Group: { id, name, description?, color, meetingDay?, meetingTime?,
         location?, leaderId?, leaderName?, isActive, memberCount }

GroupCustomField: { id, name }

AuthResponse: { token, name, email, role }
AttendanceRecord: { id, personId, personName, homeGroupId, meetingDate, wasPresent, notes? }
AttendanceSummary: { meetingDate, totalMembers, presentCount, attendanceRate }
```

## API Client (src/api/client.ts)

Axios instance з `baseURL = import.meta.env.VITE_API_URL`. Request interceptor додає `Authorization: Bearer <token>` з localStorage. Response interceptor: 401 → redirect до `/login`.

## Development Commands

```bash
npm install
npm run dev          # dev server
npm run build        # tsc -b && vite build
npm run preview
```

## Environment Variables

```
VITE_API_URL=https://your-api.domain.com/api/v1
```

## What's Done

- [x] Auth (login, JWT, ProtectedRoute, logout)
- [x] Bottom tab bar (5 tabs, active state)
- [x] Profile page (avatar з ініціалами, роль)
- [x] Settings menu (Адміни, Ролі, Домашні групи)
- [x] Roles CRUD (список, форма з color palette + permissions + isDefault)
- [x] HomeGroups CRUD (список, форма з member search + custom fields)
- [x] People CRUD (список з group tag, create form, detail з inline editing)
- [x] Group-scoped custom fields (add/edit/delete від людини і від групи)
- [x] Bidirectional group sync (person ↔ group members)
- [x] Group tag в списку людей (кольором групи)
- [x] No-group search у формі групи (відкривається одразу, тільки без групи)

## TODO

- [ ] Dashboard (реальна статистика)
- [ ] Groups page (перегляд, не налаштування)
- [ ] Attendance page (відмітка відвідуваності)
- [ ] Admins page (CRUD користувачів системи)
- [ ] Статуси людини — configurable список
- [ ] Опіка (Oversight) — configurable список
- [ ] Enforcement прав доступу (показувати/ховати секції по ролі)
- [ ] Pull-to-refresh
- [ ] Pagination для великих списків
