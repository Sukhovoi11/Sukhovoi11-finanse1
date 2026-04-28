# Finanse+

Finanse+ to aplikacja do codziennego ogarniania budzetu: przychody, wydatki, cele i przypomnienia w jednym miejscu.
Projekt ma mobilny frontend (Expo/React Native) i backend API (Node.js + Express + SQLite).

## O co chodzi w projekcie

Aplikacja powstala po to, zeby szybko odpowiadac na proste pytania:
- ile mam teraz na koncie,
- na co najwiecej wydaje,
- czy mieszcze sie w limicie miesiecznym,
- jakie platnosci mam do zrobienia,
- jak idzie realizacja celow oszczednosciowych.

Dodatkowo jest ekran spolecznosciowy z rankingiem userow (wydatki/przychody).

---

## Najwazniejsze funkcje

### Konto i logowanie
- rejestracja i logowanie,
- autoryzacja przez JWT,
- prywatne endpointy zabezpieczone tokenem.

### Portfel i transakcje
- dodawanie przychodu (PLN),
- dodawanie wydatku z kategoria,
- historia operacji,
- usuwanie transakcji z poprawnym cofnieciem zmian w saldzie.

### Cele i przypomnienia
- tworzenie celow oszczednosciowych,
- odkladanie srodkow na cel,
- usuwanie celow,
- tworzenie przypomnien platnosci,
- oznaczanie przypomnienia jako oplacone/nieoplacone,
- usuwanie przypomnien.

### Profil i personalizacja
- zmiana nicku, nazwy wyswietlanej i bio,
- zmiana hasla,
- wlaczanie/wylaczanie powiadomien in-app,
- motywy: `pink`, `blue`, `green`, `aurora`,
- tryb nocny,
- miesieczny limit budzetu,
- wlasne kategorie wydatkow (dodawanie/usuwanie).

### Statystyki
- wykres wydatkow po kategoriach,
- podsumowanie na dashboardzie,
- leaderboard globalny (top wydatki lub top przychody).

---

## Stos technologiczny

### Mobile (`mobile/`)
- React Native (Expo)
- React Navigation
- Axios
- react-native-svg

### Backend (`server/`)
- Node.js
- Express
- SQLite (`sqlite3`)
- JWT (`jsonwebtoken`)
- bcrypt
- dotenv
- cors

---

## Struktura projektu

```text
finanse+/
  mobile/
    App.js
    src/
      api/
      components/
      navigation/
      screens/
      styles/ (moduly styli per ekran/komponent)
      theme/
  server/
    app.js
    db.js
    middleware/
    routes/
    elitekantor.db
  README.md
```

---

## Jak uruchomic lokalnie

### 1) Backend

```bash
cd server
npm install
node app.js
```

Domyslnie backend dziala na `http://localhost:3000`.

### 2) Mobile

```bash
cd mobile
npm install
npm start
```

Przydatne komendy:

```bash
npm run web
npm run android
npm run ios
```

---

## API (skrot)

Bazowy URL: `http://localhost:3000/api`

### Publiczne
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`

### Chronione (Bearer token)

- Wallet:
  - `POST /wallet/topup`
  - `GET /wallet/portfolio`
- Transactions:
  - `POST /transactions/expense`
  - `POST /transactions/buy`
  - `POST /transactions/sell`
  - `GET /transactions/history`
  - `DELETE /transactions/:transactionId`
- Goals:
  - `GET /goals`
  - `POST /goals`
  - `POST /goals/:goalId/contribute`
  - `DELETE /goals/:goalId`
- Reminders:
  - `GET /reminders`
  - `POST /reminders`
  - `PATCH /reminders/:reminderId`
  - `DELETE /reminders/:reminderId`
- Profile:
  - `GET /profile/me`
  - `PUT /profile/me`
  - `PUT /profile/password`
- Stats:
  - `GET /stats/leaderboard?metric=expenses|income`

---
