# Running laptopic locally

A quick reference for starting, using and stopping the shop on your own computer (Windows, PowerShell).

---

## 1. Start everything

**Step 1: start Docker Desktop.** It runs the database.

Open **Docker Desktop** from the Start menu and wait until it says **Engine running**.
If it isn't in the Start menu, run it from:

```
%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe
```

Check that it works (the output must include a **Server** section):

```powershell
docker version
```

**Step 2: start the backend** (database + server + worker + admin Dashboard). Use terminal 1:

```powershell
cd C:\Users\kocag\Desktop\Laptopic\backend
npm run db:up
npm run dev
```

Wait until the output stops scrolling (about 30 seconds).

**Step 3: start the shop.** Use terminal 2, a new terminal; leave terminal 1 running:

```powershell
cd C:\Users\kocag\Desktop\Laptopic\storefront
npm run dev
```

Then open **http://localhost:3001**.

---

## 2. Addresses

| What | Address |
|---|---|
| **Shop** | http://localhost:3001 |
| **Shop in English** | http://localhost:3001/en |
| **Admin Dashboard** | http://localhost:5173/dashboard |
| **Mailbox** (all emails the shop sends) | http://localhost:3000/mailbox |
| GraphQL playground (for developers) | http://localhost:3000/graphiql/shop |
| Backend health check | http://localhost:3000/health |

---

## 3. Logging in

### Admin Dashboard (staff)

- Go to http://localhost:5173/dashboard
- **Username:** the `SUPERADMIN_USERNAME` value in `backend\.env` (`superadmin`)
- **Password:** the `SUPERADMIN_PASSWORD` value in `backend\.env`

> The password in `.env` is only used when the admin account is first created (on the first `npm run seed`).
> If you changed it later and it doesn't work, reset the database (see section 7).

### Customer account (shop)

You don't need an account to order; guest checkout works. To create one:

1. Shop â†’ **Inloggen** â†’ **Registreren**
2. Open the confirmation email in the **Mailbox** (http://localhost:3000/mailbox)
3. Click **E-mailadres bevestigen**, then log in on the shop

---

## 4. Placing a test order

1. Add a product to the cart and go to **Afrekenen**.
2. Fill in any name and address, and choose **PostNL standaard**.
3. Payment method: **Testbetaling**. This always succeeds locally; no Mollie needed.
4. Click **Bestellen en betalen**.
5. You'll see the order confirmation. The email is in the **Mailbox**, and the order in the **Dashboard â†’ Orders**.

**iDEAL / in3 via Mollie** need a Mollie *test* key in `backend\.env` (`MOLLIE_API_KEY=test_...`), followed by:

```powershell
cd C:\Users\kocag\Desktop\Laptopic\backend
npm run setup:mollie
```

Mollie can't reach your computer with payment confirmations, so the order page checks with Mollie
after about 10 seconds instead. See `backend\README.md` â†’ *Mollie* for using a tunnel.

---

## 5. Emails

Locally, emails are **not really sent**: they all appear at **http://localhost:3000/mailbox**.

| Email | When |
|---|---|
| Order confirmation | After a successful payment |
| Order shipped (with track & trace) | When the order is marked as shipped in the Dashboard |
| Return request received | After the return form at http://localhost:3001/returns |
| Confirm email address | After registering a customer account |
| Reset password | After "Wachtwoord vergeten?" |

---

## 6. Database

PostgreSQL runs in Docker (container `laptopic-postgres-1`). It is only reachable from your own computer.

### Connection details

| Setting | Value |
|---|---|
| Type | PostgreSQL 16 |
| Host | `127.0.0.1` (or `localhost`) |
| Port | **`6543`** (not the default 5432) |
| Database | `vendure` |
| Username | `vendure` |
| Password | the `DB_PASSWORD` value in `backend\.env` (default: `change-me`) |
| Schema | `public` |

These come from `backend\.env` (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`, `DB_SCHEMA`).
Docker Desktop must be running and `npm run db:up` must have been run.

### pgAdmin

1. Right-click **Servers** â†’ **Register** â†’ **Serverâ€¦**
2. **General** tab: Name `laptopic`
3. **Connection** tab: fill in the details above â†’ **Save**
4. Tables: **Servers â†’ laptopic â†’ Databases â†’ vendure â†’ Schemas â†’ public â†’ Tables**
5. View data: right-click a table â†’ **View/Edit Data â†’ First 100 Rows**
6. Run SQL: **Tools â†’ Query Tool**, then **F5** to run
7. Diagram of all tables: right-click the `vendure` database â†’ **ERD For Database**

### DBeaver (best table diagrams)

1. **New Database Connection** â†’ **PostgreSQL** â†’ fill in the details above
2. Open `vendure â†’ Schemas â†’ public`, right-click **Tables â†’ View Diagram**

### Command line (no extra software, no password needed)

```powershell
docker exec -it laptopic-postgres-1 psql -U vendure -d vendure
```

Type `\dt` to list the tables, `\d order_line` to show a table's columns, and `\q` to quit.

### Things to know

- All tables were created by Vendure's migration (`backend\src\migrations\`); the data comes from `npm run seed`.
- Money is stored in **cents**: `54900` = â‚¬ 549,00.
- Column names are camelCase and need quotes in SQL: `"orderPlacedAt"`. The table `order` needs quotes too: `"order"`.
- Names and descriptions per language are in the `*_translation` tables.
- **Only look, don't edit.** Change data through the Dashboard; to start over, run `npm run db:reset` and then `npm run seed`.

| Problem | Fix |
|---|---|
| `Connection refused` | Start Docker Desktop, then `npm run db:up` in `backend` |
| `password authentication failed` | Use the password from `backend\.env`, not `.env.example`, and type it by hand |
| `connection timeout` on `::1` | Harmless; use host `127.0.0.1` to skip it |

---

## 7. Useful commands

Run these in `C:\Users\kocag\Desktop\Laptopic\backend`:

| Command | What it does |
|---|---|
| `npm run db:up` | Start the database |
| `npm run db:down` | Stop the database (data is kept) |
| `npm run db:reset` | **Delete all data** and start an empty database |
| `npm run seed` | Load the demo products (only works on an empty database) |
| `npm run setup:mollie` | Set up Mollie with the key from `.env` |
| `npm run dev` | Start server, worker and Dashboard |
| `npm test` | Unit tests |
| `npm run test:e2e` | Backend end-to-end tests |

**Start over with fresh demo data:**

```powershell
npm run db:reset
npm run seed
```

Run these in `C:\Users\kocag\Desktop\Laptopic\storefront`:

| Command | What it does |
|---|---|
| `npm run dev` | Start the shop |
| `npm test` | Storefront tests |
| `npm run test:e2e` | Browser tests (the shop and backend must be running) |
| `npm run lint` | Check code style |

---

## 8. Stopping

1. Press **Ctrl + C** in both terminals.
2. Stop the database (optional):
   ```powershell
   cd C:\Users\kocag\Desktop\Laptopic\backend
   npm run db:down
   ```
3. Close Docker Desktop (optional).

---

## 9. Problems

| Problem | Fix |
|---|---|
| `failed to connect to the docker API` | Docker Desktop isn't running; start it (step 1) |
| `ECONNREFUSED ...:6543` or "Cannot connect to the database" | Run `npm run db:up` first (Docker must be running) |
| `Database already contains products` | Not an error: the demo data is already loaded |
| Shop shows errors or no products | The backend isn't running; start it first (step 2) |
| Dashboard password doesn't work | `npm run db:reset` then `npm run seed` (deletes all data) |
| `cd storefront` fails | You're inside `backend`; use `cd ..\storefront` |
| After `git pull`: errors about missing modules | Run `npm install` in both `backend` and `storefront` |

---

## 10. Configuration files

| File | What's in it |
|---|---|
| `backend\.env` | Database, admin login, Mollie key, URLs. **Never commit it** |
| `backend\.env.example` | Template showing which settings exist |
| `storefront\.env.local` | Backend address, site URL. **Never commit it** |
| `storefront\.env.example` | Template for the above |
