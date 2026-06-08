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
    people.ts             — peopleApi.getAll повертає GroupMember[] з параметрами
                            includeAdmins?, myOversight?; update приймає всі розширені поля
    groups.ts             — groupsApi (CRUD, members, custom fields, cabinet,
                            events, setNextMeetingDate, skipMeeting, getStats, getStatsAll,
                            getNeeds, addNeed, updateNeed, deleteNeed,
                            getNotifSettings, updateNotifSettings)
    roles.ts              — rolesApi
    attendance.ts         — attendanceApi (getByGroup, getSummary, getMeetingDates,
                            record, recordBulk, getMeta, saveMeta, deleteMeeting,
                            getTable, getDots, export, template, importPreview,
                            importApply) + downloadBlob helper
    schedule.ts           — scheduleApi (getWeeks, cancel, uncancel, move, resetWeek)
    calendar.ts           — calendarApi (getOccurrences, CRUD events) + roomsApi
    personStatuses.ts     — personStatusesApi (getAll, create, update, delete)
    churchEvents.ts       — churchEventsApi (getAll, add, delete)
    admins.ts             — adminsApi (getMe, getAll, getById, create, update, updateProfile,
                            setMyPassword (me/set-password, no settings.admins needed),
                            setPassword (/:id/set-password, requires settings.admins),
                            remove, getDashboardConfig, saveDashboardConfig)
    planning.ts           — planningApi (getPlans, getPlan, savePlan,
                            deletePlanByDate, getTemplates, createTemplate, deleteTemplate)
  hooks/
    usePermission.ts      — usePermission(key): bool + usePermissions(keys[]): Record<string,bool>
  components/
    AppLayout.tsx         — bottom tab bar (5 tabs, фільтруються по page.* permissions) + <Outlet />
    ProtectedRoute.tsx    — redirect to /login if not authed; permission? prop → redirect / if no access
    AttendanceGrid.tsx    — shared 12-month activity grid (props: personId?, userId?,
                            group?, attendance[], loading, noGroupMessage?)
    AttendanceImportExportPopup.tsx           — dispatcher (useIsDesktop)
    AttendanceImportExportPopup.mobile.tsx    — antd-mobile Popup version
    AttendanceImportExportPopup.desktop.tsx   — antd Modal version
  pages/
    auth/
      LoginPage.tsx
    dashboard/
      DashboardPage.tsx          — завантажує конфіг з API, рендерить увімкнені віджети + "Редагувати блоки"
      DashboardSettingsPage.tsx  — drag-and-drop (HTML5) + ↑↓ кнопки, чекбокси вмикання/вимикання
      widgetRegistry.ts          — ALL_WIDGETS, WidgetConfig, mergeWithDefaults, defaultConfig
      widgets/
        AttendanceWidget.tsx     — cabinet-style картка + "Відмітити" → /cabinet/:id/attendance?date=
        GroupStatsWidget.tsx     — select групи + 1м/3м/6м + stacked bar chart
        UpcomingEventsWidget.tsx — дні народження + кастомні події своєї домашки (read-only)
    profile/
      ProfilePage.tsx            — особистий профіль поточного адміна: особиста інфо,
                                   комунікація, церква, відвідуваність (AttendanceGrid),
                                   зміна пароля, logout
    people/
      PeoplePage.tsx             — список людей + адмінів, пошук, фільтри:
                                   "Показати адмінів" (default on) / "Під моєю опікою"
                                   + фільтр по домашках (FilterPill + bottom Popup, як на Calendar)
                                   — показується лише якщо видимих груп > 1; тільки видимі групи
                                   → /people/:id або /admins/:userId
      PersonCreatePage.tsx
      PersonDetailPage.tsx       — 4 блоки з popup-редагуванням + AttendanceGrid
    admins/
      AdminProfilePage.tsx       — read-only профіль адміна (hero + особиста/комунікація/
                                   церква блоки + AttendanceGrid); /admins/:id
      AdminDetailPage.tsx        — superadmin management: ім'я, email, ролі, рідна домашка,
                                   видимі групи, особиста інфо, AttendanceGrid, пароль;
                                   /settings/admins/:id
      AdminsPage.tsx             — список адмінів (для settings)
      AdminCreatePage.tsx
    attendance/
      AttendancePage.tsx         — card-based toggle, admins + persons, guest count + info
    cabinet/
      GroupCabinetPage.tsx       — кабінет домашки: наступна зустріч, відвідуваність,
                                   події, потреби, орг команда, церковний календар, статистика
      useCabinetData.ts          — хук: cabinet, events, needs, rooms, notifSettings + CRUD actions
      PlanningPage.tsx           — планування зустрічі: блоки (view/edit mode),
                                   шаблони, минулі плани
      StatsPage.tsx              — статистика: summary, chart, person ranking, meetings
    settings/
      SettingsPage.tsx           — меню: Адміни, Ролі, Домашні групи, Статуси людей
      RolesSettingsPage.tsx
      RoleFormPage.tsx
      HomeGroupsSettingsPage.tsx
      HomeGroupFormPage.tsx
      PersonStatusesPage.tsx     — список статусів з кольоровими тегами
      PersonStatusFormPage.tsx   — форма: назва + color swatches + preview
  store/
    auth.tsx              — AuthContext, useAuth hook (login/logout + hasPermission(key), wildcard "*")
  types/
    index.ts              — всі типи
  App.tsx
  main.tsx
```

## Routing

```
/login
/                              — Dashboard (widget-based)
/dashboard/settings            — налаштування блоків дашборду
/profile                       — особистий профіль поточного адміна (editable)
/admins/:id                    — read-only профіль будь-якого адміна; потребує admins.viewProfiles
/cabinet                       — вибір групи (для адмінів) або одразу кабінет
/cabinet/:id                   — кабінет домашки
/cabinet/:id/attendance        — відмічання присутніх (?date=)
/cabinet/:id/attendance-table  — таблиця відвідуваності
/cabinet/:id/plan              — планування зустрічі (?date=, з селектом дат)
/cabinet/:id/stats             — статистика групи
/cabinet/:id/schedule          — налаштування графіку (переноси/скасування за тижнями)
                                 [groups.schedule.manage]
/people                        — список людей + адмінів
/people/new
/people/:id
/settings
/settings/admins               — управління адмінами (superadmin)
/settings/admins/new
/settings/admins/:id           — superadmin управління: ролі, групи, профіль, пароль
/settings/roles
/settings/roles/:id
/settings/home-groups
/settings/home-groups/:id
/settings/person-statuses
/settings/person-statuses/:id
/calendar                      — 3-колонковий тижневий календар
```

## Bottom Tab Bar (AppLayout.tsx)

5 tabs: Дашборд / Люди / Домашка / Профіль / Налаштування. Активна вкладка — teal top-border (3px pill). Кастомні кнопки (не antd-mobile TabBar).

## Key Pages & Patterns

### GroupCabinetPage
- **GroupSelector** — показується адміну без `:id` в URL
- **CabinetView** — основний вміст:
  - Блок 1: інфо групи (EditGroupPopup — назва, день, час, адреса, TelegramGroupId)
  - Блок 2: наступна домашка + бронювання кімнати + 3 кнопки
    - "Перенести" → popup з date picker → `groupsApi.setNextMeetingDate(id, date, oldDate)` (переміщає план)
    - "Скасувати" → Dialog confirm → опційно Dialog для видалення плану → `groupsApi.skipMeeting(id)`
    - "Повідомити" → disabled якщо !hasPlanForNextMeeting || !telegramGroupId
    - **Room picker popup**: список кімнат + автобронювання switch + MeetingTimeline
      - Зайнята кімната показує "зайнято" і блокує кнопку "Зберегти" з попередженням
      - Конфлікти тільки з Recurring/Global/Google подіями (не з іншими HomeGroup)
  - Блок 3: присутність + кнопка відмітити
  - Блок 4: birthday events (якщо є)
  - Блок 5: найближчі події групи (зелений фон якщо ≤7 днів)
  - Блок 6: потреби (GroupNeed) — статус-тег з dropdown/ActionSheet, олівчик і урна
    - Кнопка "З групи" (mobile) або Select (desktop) → вибір члена групи → заповнює ім'я + personId/userId
    - Якщо прив'язано до Person/User → ім'я на картці є посиланням → /people/:id або /admins/:id
    - Статуси: active (синій) | answered (зелений) | irrelevant (сірий)
  - Блок 7: орг команда (OrgMemberRow: ім'я + тег ролі + кількість під опікою, collapse з navigate до /people/:id)
  - Блок 8: статистика + "Деталі →" → `/cabinet/:id/stats`
  - Блок 9: Telegram сповіщення (Switch toggles, notifSettings з API)

### AttendancePage
- Card-based toggle (зелений = присутній, сірий = відсутній)
- Фільтрує `isFormer: true` членів (минулих не показує)
- **Date selector** — `<select>` зі списком меетинг-дат:
  - `attendanceApi.getMeetingDates` (union Attendance + Meta + Calendar real overrides)
  - `calendarApi.getOccurrences` (8 тижнів назад, HomeGroup) — заповнює тижні без DB-даних
  - Merging logic: fromDb має пріоритет per-week через `weekKey`, calendar заповнює лише тижні
    без DB-даних
- Pre-populate присутності — при зміні дати завантажує існуючі записи і підсвічує
- Гості block: числовий інпут + інфо textarea
- Save: `attendanceApi.record(...)` + `attendanceApi.saveMeta(...)` паралельно

### SchedulePage (`/cabinet/:id/schedule`)
- Permission: `groups.schedule.manage`. Доступ з шестерні поряд із кнопками
  "Перенести/Скасувати" в кабінеті
- Список тижнів (4 минулих + 8 майбутніх за замовчуванням, кнопка "Показати ще минулі")
- Кожен тиждень: status badge (default | cancelled | rescheduled_internal | moved_in | moved_out),
  effectiveDate, optional movedFromDate/movedToDate, hasPlan, attendanceRecordCount
- Modal/Popup на тиждень: toggle "Скасована", DatePicker, опційні чекбокси
  "Перенести план з оригінальної дати" і "Перенести N записів відвідуваності"
- Кнопка "Скинути тиждень" — викликає reset-week (двостороння очистка через MovedFrom/To
  links + опційне відновлення плану через OriginalMeetingDate)

### AttendanceTablePage
- Excel-like таблиця з sticky headers
- Active members перші, former — в кінці (червоний border + чорний divider між ними)
- Cell states: outside membership period (#E5E7EB), no data (#F3F4F6 interactive),
  присутній (зелений), відсутній (червоний), скасована зустріч (#FEF9C3 жовтий)
- Move-out shadows не з'являються як стовпчики (бекенд фільтрує)
- Cancellation toggle в column modal → саве через `saveMeta` з isCancelled
- **Кнопка Імпорт/Експорт** у NavBar (mobile: `MoreOutline`) / toolbar (desktop:
  `FileExcelOutlined`) → відкриває `AttendanceImportExportPopup` з `defaultGroupId`
  поточної групи. Після успішного імпорту викликається `reload()` що перезавантажує таблицю.

### AttendanceImportExportPopup (`src/components/`)
Split mobile/desktop через `useIsDesktop`:
- `.mobile.tsx` — antd-mobile `Popup` bottom-sheet 90vh, native HTML date inputs, рядки чекбоксів
- `.desktop.tsx` — antd `Modal` (640px для menu/upload/export, 1000px для preview),
  `RangePicker`, drag-and-drop зона, `Tabs` для вкладок, `Collapse` для конфліктів і людей,
  2-колонкова сітка на preview (ліва: група + тогли + summary, права: конфлікти + люди)

State machine: `menu → export | import-upload → import-preview → import-applying`.

Export: чекбокси груп + «Всі домашки» (з indeterminate стан на desktop), опційний період →
кнопки «Експорт» / «Шаблон». Період для шаблону = бек генерує колонки по `MeetingDay`.

Import preview: за вкладкою (`ImportSheetPreview`) → `groupId` Select, 4 тогли
(joinedAt/leftAt/status/oversight — joinedAt + leftAt default ON), changes summary,
блок конфліктів (Radio.Group файл/БД + «Всі з файлу/БД» bulk-кнопки),
блок людей (`Невпізнано` з Radio skip/create/link + Select на suggestions, `Знайдено`
з Switch include/skip).

Apply: відправляє `ImportApplyRequest`, показує success Modal з лічильниками.

Permission: меню імпорту приховується для тих в кого нема `attendance.record`.

### PlanningPage
- `BlockCard` компонент: два режими — **view** (текст + олівець/урна) та **edit** (blue border, checkmark кнопка)
- **Date selector в шапці** — antd `Select` (desktop) / native `<select>` (mobile)
  - Список з `getMeetingDates` + calendar HomeGroup + plan dates (з `planningApi.getPlans`)
  - Помітка "· план" біля дат що мають план
  - Перемикання дати reload-ить план + блоки (`useEffect [groupId, date]`)
- Шаблони: застосувати існуючий або зберегти поточний як шаблон
- Зберігає plan до бекенду, перевизначає блоки при upsert

### StatsPage
- Period selector: 1 міс / 3 міс / 6 міс
- **Summary card**: avg відвідуваність, кількість зустрічей, гостей, нових учасників
- **AttendanceChart**: custom CSS stacked bar chart без залежностей
  - Синій = члени, помаранчевий (#F97316) = гості
  - Горизонтальний скрол якщо багато зустрічей
- **PersonRow**: ім'я + % + "present/total" + progress bar (зелений ≥80%, помаранчевий ≥50%, червоний <50%)
- **MeetingRow**: дата + stat, expandable → список відсутніх

### PersonDetailPage
Сторінка людини побудована з 5 блоків-карток. Кожен блок має заголовок + один олівець який відкриває `Popup` з формою.

**Блоки:**
- **Особиста інформація** — Ім'я, Прізвище, Дата народження, Стать (Male/Female), Сімейний стан (Single/Married), Адреса, Домашня група
- **Комунікація** — Телефон (кнопка `tel:` дзвінок), Email, Telegram (кнопка `t.me/` + `autoComplete="off"`)
- **Церква** — IsBaptized (Switch), Church, Ministry, IsBaptizedWithSpirit (Switch)
- **Опіка** — Опікун (select з admins), Статус (select з personStatuses, відображається кольоровим тегом)
- **Додаткова інформація** — group-scoped custom fields (+ Додати)

**Блок відвідуваності** (shared `AttendanceGrid` компонент, `src/components/AttendanceGrid.tsx`):
- Props: `personId?`, `userId?`, `group?`, `attendance[]`, `loading`, `noGroupMessage?`
- 12 стовбців = 12 місяців (oldest→newest)
- Є записи → кольор по wasPresent (зелений/сірий); фільтрує по userId або personId
- Немає записів → розраховує очікувані зустрічі з `group.meetingDay` (укр назви днів: Понеділок..Неділя)
- Жирна лінія над стовбцями поточного року (flex: currentYearStartIdx / flex: 12-currentYearStartIdx)
- "Сьогодні" правий підпис, легенда знизу
- Завантажується окремим `useEffect` після person/admin (non-blocking)
- Використовується в: PersonDetailPage, AdminDetailPage, AdminProfilePage, ProfilePage

**Popup форми** (`PopupForm` компонент): `maxHeight: 85vh; overflowY: auto`
**Збереження**: `basePayload()` → spread з patch → `peopleApi.update()`

### CalendarPage (`src/pages/calendar/CalendarPage.tsx`)
3-колонковий тижневий календар (Пн–Нд strip + 3 дні одночасно).

**Фільтри (localStorage persistence):**
- Типи подій: Recurring, Global, HomeGroup, Google — чіпи вгорі; стан зберігається в `cal_types`
- Домашки: `<select>` груп — зберігається в `cal_groupIds`; дефолт = всі групи вибрані
- Якщо жодної групи не вибрано → HomeGroup тип виключається з запиту (не показуються)
- Завантаження: `groupsLoaded` флаг — `loadOccurrences` викликається тільки після того як
  список груп завантажився і `selectedGroupIds` встановлено (уникає зайвих запитів)
- При відновленні з localStorage: порожній масив `[]` = дефолт (всі групи), не "нічого не вибрано"

**Ghost-події (recurring HomeGroup):**
- `isGhost: true` — прозоріший фон (`color + '08'`), без лівого бордера, opacity 0.6
- Ghost пригнічується якщо є non-recurring HomeGroup подія з `IsHomeGroupMeeting != null`
  для того ж тижня (Mon–Sun) — перевіряється бекендом окремим запитом на весь тижневий діапазон

**Форма події (EventForm):**
- `isHomeGroupMeeting` чекбокс для non-recurring HomeGroup подій ("Це зустріч домашньої групи")
- Тип HomeGroup + IsRecurring=false + isHomeGroupMeeting=true → suppresses ghost for that week
- Тип HomeGroup + IsRecurring=false + isHomeGroupMeeting=false → cancellation marker (ghost suppressed,
  подія НЕ відображається в календарі)

### Dashboard (src/pages/dashboard/)

Кастомізований дашборд — кожен адмін сам вибирає і впорядковує блоки.

**Конфіг**: `WidgetConfig[] = [{id, enabled}]` — зберігається на бекенді (`GET/PUT /admins/me/dashboard`).
Порожня відповідь → `defaultConfig()` (всі увімкнені).

**Реєстр віджетів** (`widgetRegistry.ts`): `ALL_WIDGETS` — масив `{id, label, description}`.
Щоб додати новий віджет: 1) додати в `ALL_WIDGETS`, 2) додати в `WIDGET_COMPONENTS` в `DashboardPage.tsx`.

**DashboardPage**: завантажує конфіг з API → фільтрує увімкнені → рендерить компоненти по порядку.
Останній блок завжди — пунктирна картка "Редагувати блоки" → `/dashboard/settings`.

**DashboardSettingsPage**:
- Верхня секція: увімкнені блоки з drag handle (≡) + ↑↓ кнопки
- Нижня секція: всі блоки з чекбоксами
- Кнопка "Зберегти" → `PUT /admins/me/dashboard`

**Поточні віджети**:
- `attendance` — присутність своєї домашки (lastMeetingDate з cabinet + кнопка "Відмітити")
- `groupStats` — stat chart з select групи (або "всі домашки" → `/groups/stats/all`) + period toggle
- `upcomingEvents` — дні народження + кастомні події своєї домашки (read-only)

### OrgMemberRow
- Кнопка-акордеон: ім'я | тег ролі (колір ролі з бекенду) | кількість під опікою
- Collapse: список людей під опікою, `RightOutline` → navigate до `/people/:id` тільки якщо `people.view`

### Permissions system
Реалізовано повний RBAC. Permissions зберігаються в JWT claims (`"permission"` claim, один на кожен ключ).

**Frontend:**
- `useAuth().hasPermission(key)` — перевіряє наявність, wildcard `"*"` = superadmin
- `usePermission(key)` / `usePermissions(keys[])` — хуки-обгортки
- `<ProtectedRoute permission="...">` — guard на рівні роуту
- AppLayout tabs фільтруються по `page.*`
- Кнопки/блоки ховаються умовно по `people.*`, `admins.*`, `planning.*` тощо

**Permissions list:**
- `page.dashboard`, `page.people`, `page.cabinet`, `page.calendar`, `page.settings`
- `people.view`, `people.viewSensitive` (ховає блок "Комунікація" в PersonDetailPage), `people.create`, `people.edit`, `people.delete`, `people.customFields`
- `admins.viewProfiles` (guard /admins/:id, стрілочки в PeoplePage), `admins.viewSensitive` (ховає контакти в AdminProfilePage)
- `groups.members.manage`, `groups.nextMeeting.manage`, `groups.events.manage`, `groups.create`, `groups.edit`, `groups.delete`
- `attendance.view`, `attendance.record`, `attendance.stats`
- `planning.view`, `planning.edit`, `planning.sendToTelegram`, `planning.templates`
- `calendar.view`, `calendar.events.manage`, `calendar.google.sync`
- `settings.admins`, `settings.roles`, `settings.groups`, `settings.rooms`, `settings.statuses`

**PersonDetailPage special:** `adminsApi.getAll()` огорнутий в `.catch(() => [])` — юзери без `settings.admins` отримають 403, але це ок, список адмінів потрібен тільки для popup опіки.

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
Person: {
  id, name, lastName?, phone?, email?, telegram?, notes?,
  gender?,           // "Male" | "Female"
  maritalStatus?,    // "Single" | "Married"
  address?,
  dateOfBirth?,
  isBaptized,        // bool
  church?, ministry?,
  isBaptizedWithSpirit,  // bool
  status?: { id, name, color } | null,   // PersonStatusDto
  oversightInfo?, oversightUserId?, oversightUserName?,
  primaryGroupId?, primaryGroupName?, primaryGroupColor?,
  createdAt, customFields?
}

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

GroupEvent: { id, name, month, day, year?, daysUntil }
ChurchEvent: { id, name, month, day, daysUntil }

GroupNeed: { id, subjectName, description,
             status: 'active' | 'answered' | 'irrelevant',
             createdAt, personId?: number | null, userId?: number | null }

PlanBlock: { id?, order, time, title, info, responsible }
MeetingPlan: { id, homeGroupId, meetingDate, appliedTemplateName?, blocks[], updatedAt }
MeetingPlanSummary: { id, meetingDate, blockCount, appliedTemplateName? }
PlanTemplate: { id, name, blocks[], createdAt }

GroupStats: {
  summary: { avgAttendanceRate, meetingCount, totalGuests, newMembers }
  meetings: [{ date, presentCount, totalMembers, attendanceRate, guestCount, absentees[] }]
  personStats: [{ personId?, userId?, fullName, presentCount, totalMeetings, attendanceRate }]
}

AttendanceRecord: { id, personId?, userId?, memberName, homeGroupId, meetingDate, wasPresent, notes? }
AttendanceSummary: { meetingDate, totalMembers, presentCount, attendanceRate }

Admin: {
  id, name, lastName?, email,
  roles: RoleTag[], primaryGroupId?, primaryGroupName?, primaryGroupColor?,
  visibleGroups: GroupTag[],
  phone?, telegram?, notes?, gender?, maritalStatus?, address?, dateOfBirth?,
  isBaptized, church?, ministry?, isBaptizedWithSpirit,
  status?: { id, name, color } | null, createdAt
}

GroupMember: {
  id, name, lastName?, phone?, email?, notes?,
  status?, primaryGroupId?, primaryGroupName?, primaryGroupColor?,
  createdAt, isAdmin, userId?, roleTag?: { name, color } | null
}

// Attendance Import/Export
GroupOption: { id, name }
ImportPreviewResponse: { importId, expiresAt, sheets: ImportSheetPreview[], availableGroups: GroupOption[] }
ImportSheetPreview: { sheetIndex, sheetName, matchedGroupId?, matchedGroupName?,
                      dates: ImportDatePreview[], people: ImportPersonPreview[],
                      conflicts: ImportConflict[], changes: ImportChangesSummary }
ImportPersonPreview: { rowIndex, name, lastName?, fileIdHint?, matchedPersonId?,
                       matchedUserId?, matchType: 'by_id'|'by_name'|'unmatched',
                       suggestions: PersonMatchSuggestion[], statusFromFile?,
                       oversightFromFile?, joinedAtFromFile?, detectedLeftAt?,
                       filePresentCount, fileAbsentCount }
ImportConflict: { index, type: 'attendance'|'cancellation'|'guests'|'notes',
                  date, personRowIndex?, personName?, fileValue?, dbValue? }
ImportApplyRequest: { importId, sheets: ImportSheetDecision[] }
ImportSheetDecision: { sheetIndex, groupId?, personDecisions: PersonDecision[],
                       conflictResolutions: ConflictResolution[],
                       importStatus, importOversight, importJoinedAt, importLeftAt }
PersonDecision: { rowIndex, action: 'skip'|'use'|'create'|'link',
                  targetPersonId?, targetUserId? }
ConflictResolution: { type, date, personRowIndex?, useFile }
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
- [x] Person Statuses CRUD (налаштування: назва + color swatches + preview тегу)
- [x] PersonDetailPage — popup-блоки (Особиста, Комунікація, Церква, Опіка)
- [x] PersonDetailPage — розширені поля (Gender, MaritalStatus, Address, Telegram,
      IsBaptized, Church, Ministry, IsBaptizedWithSpirit)
- [x] PersonDetailPage — блок відвідуваності (12-column activity grid)
- [x] Комунікація — кнопки tel: дзвінок і t.me/ Telegram чат
- [x] Admins CRUD (AdminsPage, AdminDetailPage, AdminCreatePage)
- [x] Admin profile fields (PersonDetailPage-style blocks: Особиста/Комунікація/Церква/Безпека)
- [x] AttendanceGrid extracted to shared component (personId OR userId)
- [x] AttendanceGrid in: PersonDetailPage, AdminDetailPage, AdminProfilePage, ProfilePage
- [x] PeoplePage — показує admins + persons, filter toggles "Показати адмінів" / "Під моєю опікою"
- [x] PeoplePage — фільтр по домашках (тільки видимі, приховується якщо одна)
- [x] AdminProfilePage — read-only профіль адміна (/admins/:id) з AttendanceGrid
- [x] ProfilePage — відвідуваність блок
- [x] CalendarPage — 3-колонковий тижневий календар (Recurring/Global/HomeGroup/Google)
- [x] Calendar ghost events — прозорі recurring HomeGroup, suppression по IsHomeGroupMeeting
- [x] Calendar filter persistence — activeTypes + selectedGroupIds в localStorage
- [x] Calendar HomeGroup filter — дефолт всі групи вибрані; жодної = не показувати
- [x] Room booking в кабінеті — picker з зайнятістю, автобронювання, MeetingTimeline,
      блокування Save для зайнятої кімнати
- [x] Conflicts тільки з Recurring/Global/Google (не з іншими HomeGroup подіями)
- [x] AttendancePage — date selector зі списку реальних дат (getSummary), pre-populate відміток
- [x] lastMeetingDate — з реальних записів БД, не по розкладу
- [x] Dashboard — widget-based, конфіг на бекенді per user; 3 віджети:
      attendance (cabinet-style), groupStats (chart + group/period selectors), upcomingEvents
- [x] GroupCabinetPage — кнопка "Повідомити про план" підключена до POST /groups/:id/plans/date/:date/send-to-telegram
- [x] GroupCabinetPage — блок подій: maxHeight 280px + scroll (всі події без ліміту)
- [x] RBAC permissions enforcement — ProtectedRoute guards, UI hiding, usePermission hook
- [x] admins.viewProfiles / admins.viewSensitive permissions
- [x] ProfilePage — зміна пароля через setMyPassword → /admins/me/set-password (без settings.admins)
- [x] PeoplePage — стрілочки і навігація conditional на people.view / admins.viewProfiles
- [x] PersonDetailPage — "Комунікація" прихований без people.viewSensitive; adminsApi.getAll() graceful 403
- [x] GroupCabinetPage — блок "Потреби" (GroupNeed CRUD):
      статус-тег з dropdown (desktop: antd Dropdown; mobile: ActionSheet)
      "З групи" picker (mobile) / antd Select з showSearch (desktop) — lazy-load членів групи
      вибір члена → заповнює ім'я + зберігає personId/userId
      якщо прив'язано → ім'я = клікабельне посилання на /people/:id або /admins/:id
- [x] SchedulePage (`/cabinet/:id/schedule`) — desktop + mobile налаштування графіку:
      список тижнів з status badges, модалка з date picker + checkbox-ами
      (перенести план, перенести записи відвідуваності), reset week
      [groups.schedule.manage permission, шестерня в кабінеті]
- [x] AttendancePage використовує `getMeetingDates` (union DB + calendar) для date selector
- [x] PlanningPage — Select дати в шапці зі списком DB + calendar + plan dates,
      перемикання дати reload-ить план
- [x] AttendanceTablePage — чорний divider між active/former, червоний border для former,
      sortованих в кінець; cells outside membership period (#E5E7EB);
      no-data cells (#F3F4F6 interactive)
- [x] Attendance marking page фільтрує `isFormer: true` членів
- [x] Attendance Excel import/export popup — кнопка в NavBar AttendanceTablePage
      (mobile + desktop через `useIsDesktop`). Mobile = antd-mobile Popup bottom-sheet,
      desktop = antd Modal з табами/Collapse. Стейт-машина: menu → export/upload → preview →
      applying. Export з multi-group вибором + опційним періодом; шаблон у періоді
      генерує колонки на бекенді по `MeetingDay`. Import preview: per-sheet group select,
      тогли (joinedAt/leftAt/status/oversight, default joinedAt+leftAt ON), per-conflict
      Radio з bulk «всі з файлу/БД», вирішення невпізнаних людей (skip/create/link).
      Меню імпорту приховане для тих в кого нема `attendance.record`.
- [x] Convert Person → Admin — кнопка «Перевести в адміни» на PersonDetailPage
      (desktop + mobile, permission `people.convertToAdmin`). Модалка `ConvertToAdminModal`
      підтягує preview з бекенду (counts), email-availability check, форма email/password/
      roles/primaryGroup/visibleGroups. На успіх → редірект на `/admins/:id`.
- [x] Admin activity feed — `/admins/:id/activity` (desktop + mobile, дзеркало
      PersonActivityPage). Кнопка «Коментарі та активність» в Hero-блоці адмінів.
      Permission `admins.viewProfiles`. Системні події включають `person_converted` —
      «Конвертовано з людини: <ім'я>».
- [x] /profile page mirroring — на власному `/profile` додано блок `AdminTasksBlock` і
      кнопку «Коментарі та активність» (веде на `/admins/<myId>/activity`).
- [x] Back navigation fix — кнопки «Назад» (NavBar `onBack`, Button «Назад») у 37 файлах
      використовують `navigate(-1)` замість фіксованих шляхів. Тепер з домашки → людини
      → назад повертає в кабінет, а не на список людей.
- [x] Calendar desktop bug fixes — (1) сітка завантажує події на повний тиждень
      (Mon–Sun, не Mon–Fri); (2) сьогоднішня колонка не затирає годинну сітку
      (заміна CSS `background` shorthand на `backgroundColor`, щоб не скидати
      `backgroundImage` з repeating-linear-gradient).

## TODO
- [ ] Pull-to-refresh
- [ ] Pagination для великих списків
