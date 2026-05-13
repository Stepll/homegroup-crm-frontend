# HomeGroup CRM — Frontend

React SPA з мобайл-фьорст дизайном для CRM церковних домашніх груп.

## Tech Stack

- **Bundler**: Vite
- **Framework**: React 18 + TypeScript
- **Routing**: React Router v6
- **UI Library**: antd-mobile v5 (NavBar, List, Button, Input, Dialog, Popup, Toast, SpinLoading, etc.)
- **Icons**: antd-mobile-icons (EditSOutline, CheckOutline, DeleteOutline, AddOutline, RightOutline, UpOutline, DownOutline, CheckCircleOutline, CloseCircleOutline)
- **HTTP**: Axios (через `src/api/client.ts`, автоматично додає JWT)
- **State**: React Context (AuthContext) + useState/useEffect per page
- **Auth**: JWT в localStorage

## Actual Project Structure

```
src/
  api/
    client.ts             — Axios instance з baseURL + JWT interceptor
    people.ts             — peopleApi
    groups.ts             — groupsApi (CRUD, members, custom fields, cabinet,
                            events, setNextMeetingDate, skipMeeting, getStats)
    roles.ts              — rolesApi
    attendance.ts         — attendanceApi (record, getMeta, saveMeta)
    churchEvents.ts       — churchEventsApi (getAll, add, delete)
    planning.ts           — planningApi (getPlans, getPlan, savePlan,
                            deletePlanByDate, getTemplates, createTemplate, deleteTemplate)
  components/
    AppLayout.tsx         — bottom tab bar (5 tabs) + <Outlet />
    ProtectedRoute.tsx    — redirect to /login if not authed
  pages/
    auth/
      LoginPage.tsx
    DashboardPage.tsx
    profile/
      ProfilePage.tsx
    people/
      PeoplePage.tsx             — список з пошуком + colored group tag
      PersonCreatePage.tsx
      PersonDetailPage.tsx       — inline editing, custom fields
    attendance/
      AttendancePage.tsx         — card-based toggle, guest count + info, date picker
    cabinet/
      GroupCabinetPage.tsx       — кабінет домашки: наступна зустріч, відвідуваність,
                                   події, орг команда, церковний календар, статистика
      PlanningPage.tsx           — планування зустрічі: блоки (view/edit mode),
                                   шаблони, минулі плани
      StatsPage.tsx              — статистика: summary, chart, person ranking, meetings
    settings/
      SettingsPage.tsx
      AdminsPage.tsx
      AdminDetailPage.tsx
      AdminCreatePage.tsx
      RolesSettingsPage.tsx
      RoleFormPage.tsx
      HomeGroupsSettingsPage.tsx
      HomeGroupFormPage.tsx
  store/
    auth.tsx              — AuthContext, useAuth hook, login/logout
  types/
    index.ts              — всі типи
  App.tsx
  main.tsx
```

## Routing

```
/login
/                              — Dashboard
/profile
/cabinet                       — вибір групи (для адмінів) або одразу кабінет
/cabinet/:id                   — кабінет домашки
/cabinet/:id/attendance        — відмічання присутніх
/cabinet/:id/plan              — планування зустрічі (?date=yyyy-MM-dd)
/cabinet/:id/stats             — статистика групи
/people
/people/new
/people/:id
/settings
/settings/admins
/settings/admins/new
/settings/admins/:id
/settings/roles
/settings/roles/:id
/settings/home-groups
/settings/home-groups/:id
```

## Bottom Tab Bar (AppLayout.tsx)

5 tabs: Дашборд / Люди / Домашка / Профіль / Налаштування. Активна вкладка — teal top-border (3px pill). Кастомні кнопки (не antd-mobile TabBar).

## Key Pages & Patterns

### GroupCabinetPage
- **GroupSelector** — показується адміну без `:id` в URL
- **CabinetView** — основний вміст:
  - Блок 1: інфо групи (EditGroupPopup — назва, день, час, адреса, TelegramGroupId)
  - Блок 2: наступна домашка + 3 кнопки (Перенести, Скасувати, Повідомити про план)
    - "Перенести" → popup з date picker → `groupsApi.setNextMeetingDate(id, date, oldDate)` (переміщає план)
    - "Скасувати" → Dialog confirm → опційно Dialog для видалення плану → `groupsApi.skipMeeting(id)`
    - "Повідомити" → disabled якщо !hasPlanForNextMeeting || !telegramGroupId
  - Блок 3: присутність + кнопка відмітити
  - Блок 4: birthday events (якщо є)
  - Блок 5: орг команда (OrgMemberRow: ім'я + тег ролі + кількість під опікою, collapse з navigate до /people/:id)
  - Блок 6: найближчі події (зелений фон якщо ≤7 днів)
  - Блок 7: церковний календар (зелений фон якщо ≤7 днів)
  - Блок 8: статистика + "Деталі →" → `/cabinet/:id/stats`

### AttendancePage
- Card-based toggle (зелений = присутній, сірий = відсутній)
- Date picker вгорі (читає `?date=` query param)
- Гості block: числовий інпут + "Вказати інформацію про гостей" link → textarea
- Save: `attendanceApi.record(...)` + `attendanceApi.saveMeta(...)` паралельно
- Зберігає назад до `/cabinet/:id`

### PlanningPage
- `BlockCard` компонент: два режими — **view** (текст + олівець/урна) та **edit** (blue border, checkmark кнопка)
  - `defaultEditing` prop → нові блоки одразу в edit mode (`newBlockKeys` state)
  - Відповідальний з орг команди — підкреслене посилання, клік → `/settings/admins/:id`
- Шаблони: застосувати існуючий (popup) або зберегти поточний план як шаблон
- PastPlansDrawer — список минулих планів з expandable деталями
- Зберігає plan до бекенду, перевизначає блоки при upsert

### StatsPage
- Period selector: 1 міс / 3 міс / 6 міс
- **Summary card**: avg відвідуваність, кількість зустрічей, гостей, нових учасників
- **AttendanceChart**: custom CSS stacked bar chart без залежностей
  - Синій = члени, помаранчевий (#F97316) = гості
  - Горизонтальний скрол якщо багато зустрічей
- **PersonRow**: ім'я + % + "present/total" + progress bar (зелений ≥80%, помаранчевий ≥50%, червоний <50%)
- **MeetingRow**: дата + stat, expandable → список відсутніх

### Inline Editing (PersonDetailPage)
`EditableField` компонент: label + value + pencil icon. По кліку — input + Зберегти/Скасувати.

### OrgMemberRow
- Кнопка-акордеон: ім'я | тег ролі (колір ролі з бекенду) | кількість під опікою
- Collapse: список людей під опікою, кожна людина з `RightOutline` → navigate до `/people/:id`

## CSS Design Tokens

```css
--color-primary       /* teal #2AAFCA */
--color-error
--color-text / --color-text-secondary / --color-text-tertiary
--color-border / --color-border-light
--color-bg
--radius-md / --radius-lg
--shadow-sm / --shadow-lg
```

Opacity для фонів тегів: `${color}18` = ~10%, `${color}20` = ~12%.

## Types (src/types/index.ts)

```typescript
Person: { id, name, lastName?, phone?, email?, notes?, status, oversightInfo?,
          oversightUserId?, oversightUserName?, dateOfBirth?, primaryGroupId?,
          primaryGroupName?, primaryGroupColor?, createdAt, customFields? }

Group: { id, name, description?, color, meetingDay?, meetingTime?,
         location?, leaderId?, leaderName?, isActive, memberCount, telegramGroupId? }

GroupCabinet: {
  group: { id, name, color, meetingDay?, meetingTime?, location?, telegramGroupId? }
  nextMeetingDate?, lastMeetingDate?
  lastAttendance?: { present, total }
  upcomingEvents: [{ personId, fullName, dateOfBirth, daysUntil }]
  orgTeam: [{ id, name, lastName?, email, overseeCount, oversees: [{id, fullName}],
              role?: { name, color } }]
  stats: { avgAttendanceRate, newMembersThisMonth, totalMembers }
  hasPlanForNextMeeting: boolean
}

GroupEvent: { id, name, month, day, daysUntil }
ChurchEvent: { id, name, month, day, daysUntil }

PlanBlock: { id?, order, time, title, info, responsible }
MeetingPlan: { id, homeGroupId, meetingDate, appliedTemplateName?, blocks[], updatedAt }
MeetingPlanSummary: { id, meetingDate, blockCount, appliedTemplateName? }
PlanTemplate: { id, name, blocks[], createdAt }

GroupStats: {
  summary: { avgAttendanceRate, meetingCount, totalGuests, newMembers }
  meetings: [{ date, presentCount, totalMembers, attendanceRate, guestCount, absentees[] }]
  personStats: [{ personId, fullName, presentCount, totalMeetings, attendanceRate }]
}

AttendanceRecord, AttendanceSummary
```

## API Client

Axios з `baseURL = import.meta.env.VITE_API_URL`. JWT з localStorage. 401 → redirect `/login`.

## Development Commands

```bash
npm install
npm run dev          # dev server
npm run build        # tsc -b && vite build
npm run type-check   # tsc --noEmit
```

## Environment Variables

```
VITE_API_URL=https://your-api.domain.com/api/v1
```

Vercel: `vercel.json` з rewrite `"source": "/(.*)", "destination": "/index.html"` для SPA routing.

## What's Done

- [x] Auth (login, JWT, ProtectedRoute, logout)
- [x] Bottom tab bar (5 tabs, active state)
- [x] Profile page
- [x] Settings menu (Адміни, Ролі, Домашні групи)
- [x] Roles CRUD
- [x] HomeGroups CRUD (members, custom fields)
- [x] People CRUD (inline editing, custom fields, group tag)
- [x] Bidirectional group sync
- [x] AttendancePage (card toggle, date picker, guest count + info, saves meta)
- [x] GroupCabinetPage (інфо групи, наступна/остання зустріч, події, орг команда, статистика)
- [x] Reschedule/cancel next meeting (override date + skip-meeting, переміщення плану)
- [x] Group Events (custom events per group, green highlight ≤7 days)
- [x] Church Calendar (read-only global events, green highlight ≤7 days)
- [x] PlanningPage (block builder, view/edit mode, templates, past plans)
- [x] StatsPage (stacked bar chart, person ranking, meeting history, period filter)

## TODO

- [ ] Dashboard (реальна статистика)
- [ ] Admins page (CRUD користувачів системи)
- [ ] Статуси людини — configurable список
- [ ] Опіка (Oversight) — configurable список
- [ ] Enforcement прав доступу (показувати/ховати секції по ролі)
- [ ] Telegram notify (кнопка "Повідомити про план" — поки заглушка)
- [ ] Pull-to-refresh
- [ ] Pagination для великих списків
