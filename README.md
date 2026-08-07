# ResourceFull Backend API

A production-ready backend for a career resource marketplace.

## Tech Stack

- Node.js & Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- bcryptjs for password hashing
- Paystack for payment processing
- Cloudinary for file storage
- BullMQ with Redis for background job processing (replaces node-cron)

## Getting Started

The deployed backend url: https://backend-ta1r.onrender.com/api

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and fill in your credentials
4. Start the server

```bash
npm run dev
```

## **ResourceFull API Endpoints**

### **Base URL:** `http://localhost:5000/api`

---

## **Authentication** (`/auth`)

| Method | Endpoint                | Description               | Auth Required | Body                               |
| ------ | ----------------------- | ------------------------- | ------------- | ---------------------------------- |
| POST   | `/auth/register`        | Register new user         | No            | `{ name, email, password }`        |
| POST   | `/auth/login`           | Login user                | No            | `{ email, password }`              |
| POST   | `/auth/refresh-token`   | Get new access token      | No            | `{ refreshToken }`                 |
| POST   | `/auth/forgot-password` | Request password reset    | No            | `{ email }`                        |
| POST   | `/auth/reset-password`  | Reset password with token | No            | `{ token, newPassword }`           |
| POST   | `/auth/logout`          | Logout user               | Yes           | -                                  |
| POST   | `/auth/change-password` | Change password           | Yes           | `{ currentPassword, newPassword }` |
| GET    | `/auth/me`              | Get current user profile  | Yes           | -                                  |

---

## **Users** (`/users`)

| Method | Endpoint                  | Description                    | Auth Required | Body                                             |
| ------ | ------------------------- | ------------------------------ | ------------- | ------------------------------------------------ |
| GET    | `/users/profile`          | Get authenticated user profile | Yes           | -                                                |
| PUT    | `/users/profile`          | Update user profile            | Yes           | `{ name, location, currentCareer, skills, bio }` |
| GET    | `/users/:userId`          | Get public profile of any user | Yes           | -                                                |
| POST   | `/users/follow/:userId`   | Follow a user                  | Yes           | -                                                |
| POST   | `/users/unfollow/:userId` | Unfollow a user                | Yes           | -                                                |
| GET    | `/users/search?q=query`   | Search users by name/skills    | Yes           | Query params                                     |

---

## **Resources** (`/resources`)

| Method | Endpoint                       | Description                        | Auth Required               | Body                                                                                                                                        |
| ------ | ------------------------------ | ---------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/resources`                   | Create new resource                | Yes                         | FormData: `{ name, description, resourceFile, coverPhoto, applicableLocation, experience, industry, isFree, price, currency, tags, hubId }` |
| GET    | `/resources`                   | Get all resources (paginated)      | No                          | Query: `?page=1&limit=10&industry=Software Development&experience=Professional&isFree=true&search=javascript&sort=-confidenceScore`         |
| GET    | `/resources/filters`           | Get filter options with counts     | No                          | Query: `?country=Nigeria&industry=Software Development&experience=Undergraduate` (all optional)                                            |
| GET    | `/resources/my`                | Get authenticated user's resources | Yes                         | Query: `?page=1&limit=10&status=draft`                                                                                                      |
| GET    | `/resources/:id`               | Get single resource details        | No (public) / Yes (private) | -                                                                                                                                           |
| PUT    | `/resources/:id`               | Update resource                    | Yes (owner/collaborator)    | FormData: `{ name, description, resourceFile, coverPhoto, applicableLocation, experience, industry, isFree, price, currency, tags, hubId }` |
| DELETE | `/resources/:id`               | Delete resource                    | Yes (owner only)            | -                                                                                                                                           |
| PATCH  | `/resources/:id/status`        | Change resource status             | Yes (owner only)            | `{ status: "draft" \| "private" \| "shared" \| "public" }`                                                                                  |
| POST   | `/resources/:id/share`         | Share resource with user           | Yes (owner only)            | `{ email }`                                                                                                                                |
| DELETE | `/resources/:id/share`         | Remove share access                | Yes (owner only)            | `{ userId }`                                                                                                                                |
| POST   | `/resources/:id/collaborators` | Add collaborator                   | Yes (owner only)            | `{ userId, permission: "view" \| "edit" \| "admin" }`                                                                                       |
| DELETE | `/resources/:id/collaborators` | Remove collaborator                | Yes (owner only)            | `{ userId }`                                                                                                                                |
| POST   | `/resources/:id/rate`          | Rate a resource (1-5)              | Yes                         | `{ rating }`                                                                                                                                |
| GET    | `/resources/:id/download`      | Download resource file             | Yes (must have purchased)   | -                                                                                                                                           |

---

## **Pathways** (`/pathways`)

| Method | Endpoint                        | Description                       | Auth Required               | Body                                                                                                            |
| ------ | ------------------------------- | --------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| POST   | `/pathways`                     | Create new pathway                | Yes                         | `{ name, description, blocks, applicableLocation, experience, industry, isFree, price, currency, tags, hubId }` |
| GET    | `/pathways`                     | Get all pathways (paginated)      | No                          | Query: `?page=1&limit=10&industry=Software Development&experience=Professional&search=backend`                  |
| GET    | `/pathways/filters`             | Get filter options with counts    | No                          | Query: `?country=Nigeria&industry=Software Development&experience=Undergraduate` (all optional)                 |
| GET    | `/pathways/:id`                 | Get single pathway details        | No (public) / Yes (private) | -                                                                                                               |
| GET    | `/pathways/user/my`             | Get authenticated user's pathways | Yes                         | Query: `?page=1&limit=10&status=draft`                                                                          |
| PUT    | `/pathways/:id`                 | Update pathway                    | Yes (owner only)            | `{ name, description, blocks, applicableLocation, experience, industry, isFree, price, currency, tags, hubId }` |
| DELETE | `/pathways/:id`                 | Delete pathway                    | Yes (owner only)            | -                                                                                                               |
| PATCH  | `/pathways/:id/status`          | Change pathway status             | Yes (owner only)            | `{ status: "draft" \| "public" }`                                                                               |
| POST   | `/pathways/:id/blocks`          | Add block to pathway              | Yes (owner only)            | `{ type: "text" \| "resource", name, shortDescription, resource, notes }`                                       |
| DELETE | `/pathways/:id/blocks/:blockId` | Remove block from pathway         | Yes (owner only)            | -                                                                                                               |
| PUT    | `/pathways/:id/blocks/reorder`  | Reorder pathway blocks            | Yes (owner only)            | `{ blockOrders: [{ id, order }] }`                                                                              |

---

## **Hubs** (`/hubs`)

| Method | Endpoint                          | Description                   | Auth Required               | Body                                                                                   |
| ------ | --------------------------------- | ----------------------------- | --------------------------- | -------------------------------------------------------------------------------------- |
| POST   | `/hubs`                           | Create new hub                | Yes                         | `{ name, description, applicableLocation, experience, industry, resources, pathways }` |
| GET    | `/hubs`                           | Get all hubs (paginated)      | No                          | Query: `?page=1&limit=10&industry=Software Development&search=career`                  |
| GET    | `/hubs/filters`                   | Get filter options with counts| No                          | Query: `?country=Nigeria&industry=Software Development&experience=Undergraduate` (all optional) |
| GET    | `/hubs/my`                        | Get authenticated user's hubs | Yes                         | Query: `?page=1&limit=10&status=draft`                                                 |
| GET    | `/hubs/:id`                       | Get single hub details        | No (public) / Yes (private) | -                                                                                      |
| PUT    | `/hubs/:id`                       | Update hub                    | Yes (owner only)            | `{ name, description, applicableLocation, experience, industry }`                      |
| DELETE | `/hubs/:id`                       | Delete hub                    | Yes (owner only)            | -                                                                                      |
| PATCH  | `/hubs/:id/status`                | Change hub status             | Yes (owner only)            | `{ status: "draft" \| "public" }`                                                      |
| POST   | `/hubs/:id/resources/:resourceId` | Add resource to hub           | Yes (owner only)            | -                                                                                      |
| DELETE | `/hubs/:id/resources/:resourceId` | Remove resource from hub      | Yes (owner only)            | -                                                                                      |
| POST   | `/hubs/:id/pathways/:pathwayId`   | Add pathway to hub            | Yes (owner only)            | -                                                                                      |
| DELETE | `/hubs/:id/pathways/:pathwayId`   | Remove pathway from hub       | Yes (owner only)            | -                                                                                      |

---

## **Explore** (`/explore`)

Single dashboard/feed endpoint that fetches publicly available resources, pathways, and hubs in one request, along with filter options. Designed for infinite scroll on the frontend.

| Method | Endpoint    | Description                            | Auth Required | Query Params |
| ------ | ----------- | -------------------------------------- | ------------- | ------------ |
| GET    | `/explore`  | Get public feed (resources, pathways, hubs, filters) | No            | `limit`, `cursor`, `country`, `industry`, `experience`, `isFree`, `search` |

**Query Parameters:**

| Parameter  | Type    | Description                                        |
| ---------- | ------- | -------------------------------------------------- |
| `limit`    | number  | Items per collection per request (default: 50, max: 100) |
| `cursor`   | string  | ISO timestamp from `nextCursor` for the next scroll (omit for first page) |
| `country`  | string  | Filter by applicable location (e.g. `Nigeria`)     |
| `industry` | string  | Filter by industry (e.g. `Software Development`)   |
| `experience` | string | Filter by experience level (e.g. `Undergraduate`)  |
| `isFree`   | boolean | `true` (free) or `false` (paid)                    |
| `search`   | string  | Text search across names/descriptions/tags         |

**Example:**
```bash
GET /api/v1/explore?limit=50&industry=Software Development&isFree=true
```

**Response:**

```json
{
  "success": true,
  "data": {
    "resources": [{ ... }],
    "pathways": [{ ... }],
    "hubs": [{ ... }],
    "filters": {
      "countries": [{ "value": "Worldwide", "count": 12 }],
      "industries": [{ "value": "Software Development", "count": 12 }],
      "experiences": [{ "value": "Undergraduate", "count": 8 }],
      "pricing": [{ "value": "Free", "count": 9 }, { "value": "Paid", "count": 3 }]
    },
    "nextCursor": "2026-08-07T10:00:00.000Z"
  }
}
```

**Notes:**
- Each collection (`resources`, `pathways`, `hubs`) returns up to `limit` items, newest first. For a merged feed, combine them client-side and sort by `createdAt`.
- `filters` is only returned on the first request (no `cursor`); it contains counts aggregated across all three collections, scoped to any `country`/`industry`/`experience`/`isFree` params.
- For infinite scroll, pass the returned `nextCursor` as the `cursor` param on subsequent requests. When `nextCursor` is `null`, there is no more data.
- `pricing` applies to resources and pathways only (hubs have no pricing field).

---

## **Interactions** (`/interactions`)

| Method | Endpoint                                       | Description                    | Auth Required    | Body                           |
| ------ | ---------------------------------------------- | ------------------------------ | ---------------- | ------------------------------ |
| POST   | `/interactions/resources/:resourceId/like`     | Like/unlike resource           | Yes              | -                              |
| POST   | `/interactions/resources/:resourceId/save`     | Save/unsave resource           | Yes              | -                              |
| POST   | `/interactions/resources/:resourceId/comments` | Add comment on resource        | Yes              | `{ comment }`                  |
| GET    | `/interactions/resources/:resourceId/comments` | Get resource comments          | No               | Query: `?page=1&limit=20`      |
| GET    | `/interactions/resources/:resourceId/stats`    | Get resource interaction stats | No               | -                              |
| DELETE | `/interactions/comments/:commentId`            | Delete a comment               | Yes (owner only) | -                              |
| GET    | `/interactions/user/me`                        | Get user's interactions        | Yes              | Query: `?type=like` (optional) |

---

## **Payments** (`/payments`)

| Method | Endpoint                                    | Description                 | Auth Required | Body |
| ------ | ------------------------------------------- | --------------------------- | ------------- | ---- |
| POST   | `/payments/initialize/:itemType/:itemId`    | Initialize Paystack payment | Yes           | -    |
| GET    | `/payments/verify/:reference`               | Verify payment by reference | Yes           | -    |
| GET    | `/payments/status/:itemType/:itemId`        | Check purchase status       | Yes           | -    |

### Payment Flow

1. User calls `POST /payments/initialize/:itemType/:itemId` to initialize payment
2. System validates the item exists, is not free, and user hasn't already purchased it
3. System creates a Paystack transaction and a local `Payment` record (`status: pending`)
4. System returns `authorizationUrl` for the user to complete payment on Paystack
5. After payment, Paystack sends a `charge.success` webhook
6. Webhook verifies the payment and updates the `Payment` record to `status: success`
7. System credits 90% of the payment amount to the item owner's wallet

### Payment Reconciliation (Background Process)

A `BullMQ` worker with Redis processes pending payments every 5 minutes to:

- Checks all `pending` payments against Paystack's API
- If Paystack confirms success, updates payment to `success` and credits the seller's wallet
- If Paystack confirms failure, marks payment as `failed`
- Implements retry logic with exponential backoff (1min, 2min, 4min) for transient failures
- After 3 failed retries, marks payment as `failed`

### Payment Reversal (Bank Chargeback)

When a bank reverses a charge, Paystack sends `charge.failed` or `charge.reversed` webhooks:

- System updates the `Payment` record to `status: failed`
- System debits the seller's wallet (reverses the 90% credit)
- Creates a `refund` transaction record in the wallet

### Idempotency

Payment initialization uses an idempotency key (`SHA256(userId:itemId:itemType)`) to prevent duplicate pending payments. If a user clicks "Buy" again while a pending payment exists, the system returns the existing payment reference instead of creating a new one.

---

## **Analytics** (`/analytics`)

The analytics module provides three sections of user analytics:

### 1. Stats Overview (`GET /analytics/stats`)

Returns 4 summary cards with trend data for a selected time period.

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `period` | string | Time range: `7days`, `30days`, `90days`, `all` | `30days` |

**Request:**

```bash
GET /api/v1/analytics/stats?period=30days
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "earnings": 45000.00,
    "downloads": 128,
    "saves": 34,
    "confidence": 0.78,
    "period": "30days"
  }
}
```

**Field Descriptions:**

- `earnings` — Total revenue from successful payments for your resources in the selected period
- `downloads` — Total download count across your resources (for `7days` period, counts downloads of resources created in that window; for other periods, it's cumulative)
- `saves` — Number of times users saved your resources in the selected period
- `confidence` — Average confidence score across your resources in the selected period (0 to 1)

---

### 2. Overall Performance (`GET /analytics/performance`)

Returns monthly aggregated data for a line graph showing Earnings, Downloads, and Saves over time.

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `period` | string | Time range: `7days`, `30days`, `90days`, `all` | `30days` |

**Request:**

```bash
GET /api/v1/analytics/performance?period=90days
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "labels": ["Jul 2026", "Aug 2026"],
    "earnings": [15000.00, 30000.00],
    "downloads": [45, 83],
    "saves": [12, 22]
  }
}
```

**Field Descriptions:**

- `labels` — Month labels for the x-axis of the line graph
- `earnings` — Total earnings per month (matches the order of `labels`)
- `downloads` — Total downloads per month (matches the order of `labels`)
- `saves` — Total saves per month (matches the order of `labels`)

**Note:** For the `7days` period, labels are daily (e.g., `"Jul 28"`, `"Jul 29"`) and data is aggregated by day. For `30days`, `90days`, and `all`, labels are monthly and data is aggregated by month.

---

### 3. Product Performance (`GET /analytics/products`)

Returns a paginated table of your resources with key metrics for each product. Supports search and sorting.

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `search` | string | Search by resource name (case-insensitive) | - |
| `sortBy` | string | Sort field: `downloads` | `downloads` |
| `order` | string | Sort order: `desc` or `asc` | `desc` |
| `page` | number | Page number | `1` |
| `limit` | number | Items per page | `20` |

**Request:**

```bash
GET /api/v1/analytics/products?search=AWS&sortBy=downloads&order=desc&page=1&limit=10
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "type": "Resource",
        "name": "AWS Certified Solutions Architect",
        "category": "Software Development",
        "earnings": 25000.00,
        "downloads": 85,
        "saves": 18,
        "views": 320,
        "confidence": 0.85
      },
      {
        "type": "Resource",
        "name": "React Performance Optimization",
        "category": "Software Development",
        "earnings": 12000.00,
        "downloads": 43,
        "saves": 12,
        "views": 156,
        "confidence": 0.72
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 2,
      "pages": 1
    }
  }
}
```

**Field Descriptions:**

- `type` — Always `"Resource"` (for future pathway support)
- `name` — Resource title
- `category` — Resource category/industry
- `earnings` — Total revenue from successful payments for this resource
- `downloads` — Total download count for this resource
- `saves` — Number of times users saved this resource
- `views` — Total view count for this resource
- `confidence` — Confidence score (0 to 1) based on ratings, verification, and recency

**Sorting:**

- `sortBy=downloads&order=desc` — Highest downloads first
- `sortBy=downloads&order=asc` — Least downloads first

---

### 4. Export PDF Report (`GET /analytics/export/pdf`)

Generates and downloads a PDF report containing all analytics data for the selected period.

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `period` | string | Time range: `7days`, `30days`, `90days`, `all` | `30days` |

**Request:**

```bash
GET /api/v1/analytics/export/pdf?period=30days
Authorization: Bearer <access_token>
```

**Response:** PDF file download with the following sections:
1. **Stats Overview** — Earnings, Downloads, Saves, Avg. Confidence
2. **Overall Performance** — Monthly breakdown of Earnings, Downloads, and Saves
3. **Product Performance** — Table of all resources with metrics

---

### Analytics Flow Diagram

```
User requests analytics
        │
        ▼
┌───────────────────────────────────────────────────┐
│              Analytics Service                     │
│                                                    │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │   Stats      │  │  Performance │  │ Products │ │
│  │   (cards)    │  │  (line graph)│  │ (table)  │ │
│  └──────┬───────┘  └──────┬───────┘  └────┬─────┘ │
│         │                  │                │        │
│         ▼                  ▼                ▼        │
│  ┌─────────────────────────────────────────────────┐ │
│  │              MongoDB Aggregations                │ │
│  │  • Payment collection (earnings)                │ │
│  │  • Resource collection (downloads, confidence)  │ │
│  │  • Interaction collection (saves)               │ │
│  └─────────────────────────────────────────────────┘ │
│                                                    │
│  ┌─────────────────────────────────────────────────┐ │
│  │              PDF Export (pdfkit)                 │ │
│  │  Generates a downloadable PDF report            │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

### 4. Export PDF Report (`GET /analytics/export/pdf`)

Generates and downloads a PDF report containing all analytics data for the selected period.

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `period` | string | Time range: `7days`, `30days`, `90days`, `all` | `30days` |

**Request:**

```bash
GET /api/v1/analytics/export/pdf?period=30days
Authorization: Bearer <access_token>
```

**Response:** PDF file download with the following sections:
1. **Stats Overview** — Earnings, Downloads, Saves, Avg. Confidence
2. **Overall Performance** — Monthly breakdown of Earnings, Downloads, and Saves
3. **Product Performance** — Table of all resources with metrics

---

### 5. Export PNG Chart (`GET /analytics/export/png`)

Generates and downloads a PNG image of the overall performance line graph for the selected period.

**Query Parameters:**

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `period` | string | Time range: `7days`, `30days`, `90days`, `all` | `30days` |

**Request:**

```bash
GET /api/v1/analytics/export/png?period=90days
Authorization: Bearer <access_token>
```

**Response:** PNG image file containing a line graph with three datasets:
- **Earnings ($)** — left y-axis (green line)
- **Downloads** — right y-axis (red line)
- **Saves** — right y-axis (blue line)

The chart includes a title, legend, and dual y-axes for earnings (left) and downloads/saves (right).

---

## **Notifications** (`/notifications`)

| Method | Endpoint                  | Description                    | Auth Required | Body                                   |
| ------ | ------------------------- | ------------------------------ | ------------- | -------------------------------------- |
| GET    | `/notifications`          | Get user notifications         | Yes           | Query: `?page=1&limit=20&isRead=false` |
| PATCH  | `/notifications/:id/read` | Mark notification as read      | Yes           | -                                      |
| PATCH  | `/notifications/read-all` | Mark all notifications as read | Yes           | -                                      |

---

## **Wallet** (`/api/v1/wallet`)

| Method | Endpoint | Description | Auth Required | Body |
| ------ | -------- | ----------- | ------------- | ---- |
| GET | `/wallet` | Get wallet overview (balance, earnings, stats) | Yes | - |
| GET | `/wallet/banks` | Get list of supported banks | Yes | - |
| GET | `/wallet/accounts` | Get user withdrawal accounts | Yes | - |
| POST | `/wallet/accounts` | Add withdrawal account | Yes | `{ accountName, accountNumber, bankName }` |
| DELETE | `/wallet/accounts/:accountId` | Remove withdrawal account | Yes | - |
| PUT | `/wallet/accounts/:accountId/default` | Set default withdrawal account | Yes | - |
| POST | `/wallet/withdraw` | Request withdrawal to bank | Yes | `{ amount, accountId? }` |
| GET | `/wallet/transactions` | Get transaction history | Yes | Query: `page, limit, category, type, status, startDate, endDate, month, year` |
| GET | `/wallet/transactions/summary/:year/:month` | Get monthly transaction summary | Yes | - |
| GET | `/wallet/transactions/export/csv` | Export transactions as CSV | Yes | Query: `startDate, endDate, month, year` |
| GET | `/wallet/transactions/export/pdf` | Export transactions as PDF | Yes | Query: `startDate, endDate, month, year` |

---

## **System**

| Method | Endpoint  | Description             | Auth Required |
| ------ | --------- | ----------------------- | ------------- |
| GET    | `/health` | Health check (base URL) | No            |

---

## **Authentication Header**

For protected routes, include:

```
Authorization: Bearer <your_access_token>
```

**Note:** After login, use `accessToken` for API calls. When it expires, use `/auth/refresh-token` with your `refreshToken` to get a new `accessToken`.

---

## **Query Parameters Common Options**

### Pagination (all list endpoints)

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Filtering (resources)

- `status`: draft, private, shared, public
- `industry`: Law, Agriculture, Nursing, Medicine, Software Development
- `experience`: Undergraduate, Recent graduate (0-2 years), Experienced level (3-6 years), Professional (above 6 years)
- `applicableLocation`: Worldwide, Nigeria, United States, United Kingdom, etc.
- `isFree`: true/false
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter
- `hub`: Hub ID
- `owner`: User ID

### Filtering (pathways)

- `status`: draft, public
- `industry`: Law, Agriculture, Nursing, Medicine, Software Development
- `experience`: Undergraduate, Recent graduate (0-2 years), Experienced level (3-6 years), Professional (above 6 years)
- `applicableLocation`: Worldwide, Nigeria, United States, United Kingdom, etc.
- `isFree`: true/false
- `minPrice`: Minimum price filter
- `maxPrice`: Maximum price filter
- `hub`: Hub ID
- `author`: User ID

### Filtering (hubs)

- `status`: draft, public
- `industry`: Law, Agriculture, Nursing, Medicine, Software Development
- `experience`: Undergraduate, Recent graduate (0-2 years), Experienced level (3-6 years), Professional (above 6 years)
- `applicableLocation`: Worldwide, Nigeria, United States, United Kingdom, etc.

### Sorting

- `sort`: Field to sort by (prefix with `-` for descending)
  - Resources: `-confidenceScore`, `-createdAt`, `peerRatings`, `-publishedAt`
  - Pathways: `-createdAt`, `-publishedAt`
  - Hubs: `-createdAt`

---

## **Example Requests**

### Register User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "secure123"
}
```

### Login (Returns both tokens)

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "jane@example.com",
  "password": "secure123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {...},
    "accessToken": "eyJ...",
    "refreshToken": "eyJ..."
  }
}
```

### Refresh Access Token

```bash
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "your_refresh_token_here"
}
```

### Change Password

```bash
POST /api/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "old_password",
  "newPassword": "new_secure_password"
}
```

### Forgot Password

```bash
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Create Resource

```bash
POST /api/resources
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

name: "AWS Certified Solutions Architect"
description: "Complete AWS certification prep course"
resourceFile: <file>
coverPhoto: <file>
applicableLocation: "Worldwide"
experience: "Professional (above 6 years)"
industry: "Software Development"
isFree: false
price: 15000
currency: "NGN"
tags: ["aws", "cloud", "certification"]
hubId: "60d21b4667d0d8992e610c85"
status: "draft"
```

### Publish Resource

```bash
PATCH /api/resources/60d21b4667d0d8992e610c85/status
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "status": "public"
}
```

### Share Resource

```bash
POST /api/resources/60d21b4667d0d8992e610c85/share
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "user2@example.com"
}
```

### Search Resources

```bash
GET /api/resources?search=javascript&industry=Software Development&experience=Professional&isFree=true&sort=-confidenceScore&page=1&limit=20
```

### Get Resource Details (Payment-Gated)

```bash
GET /api/resources/60d21b4667d0d8992e610c85
Authorization: Bearer <access_token>
```

**Note:** For non-free public resources, the user must have a successful payment record. Free resources and the user's own resources are accessible without payment.

### Download Resource (Payment-Gated)

```bash
GET /api/resources/60d21b4667d0d8992e610c85/download
Authorization: Bearer <access_token>
```

**Note:** Requires a successful payment for non-free resources.

### Add Comment

```bash
POST /api/interactions/resources/69e115a235a1b4e0a31c0f6a/comments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "comment": "This resource helped me land my first dev job!"
}
```

### Like Resource

```bash
POST /api/interactions/resources/69e115a235a1b4e0a31c0f6a/like
Authorization: Bearer <access_token>
```

### Create Pathway

```bash
POST /api/pathways
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "From Beginner to Full Stack Developer",
  "description": "Complete roadmap to become a full stack developer",
  "blocks": [
    {
      "type": "text",
      "name": "Introduction",
      "shortDescription": "Getting started with web development"
    },
    {
      "type": "resource",
      "resource": "60d21b4667d0d8992e610c85"
    },
    {
      "type": "text",
      "name": "Advanced Concepts",
      "shortDescription": "Deep dive into advanced topics"
    }
  ],
  "applicableLocation": "Worldwide",
  "experience": "Undergraduate",
  "industry": "Software Development",
  "isFree": true,
  "tags": ["webdev", "fullstack", "javascript"]
}
```

### Add Block to Pathway

```bash
POST /api/pathways/60d21b4667d0d8992e610c90/blocks
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "type": "resource",
  "resource": "60d21b4667d0d8992e610c91",
  "notes": "Complete this before moving to next section"
}
```

### Create Hub

```bash
POST /api/hubs
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Software Engineering Career Hub",
  "description": "Curated resources for software engineers",
  "applicableLocation": "Worldwide",
  "experience": "Experienced level (3-6 years)",
  "industry": "Software Development",
  "resources": ["60d21b4667d0d8992e610c85"],
  "pathways": ["60d21b4667d0d8992e610c90"]
}
```

### Add Resource to Hub

```bash
POST /api/hubs/60d21b4667d0d8992e610c95/resources/60d21b4667d0d8992e610c85
Authorization: Bearer <access_token>
```

### Initialize Payment

```bash
POST /api/payments/initialize/Resource/60d21b4667d0d8992e610c85
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "authorizationUrl": "https://checkout.paystack.com/...",
    "reference": "TXN_1623456789_abc123"
  }
}
```

### Verify Payment

```bash
GET /api/payments/verify/TXN_1623456789_abc123
Authorization: Bearer <access_token>
```

### Check Purchase Status

```bash
GET /api/payments/status/Resource/60d21b4667d0d8992e610c85
Authorization: Bearer <access_token>
```

### Get Notifications

```bash
GET /api/notifications?page=1&limit=20&isRead=false
Authorization: Bearer <access_token>
```

### Mark Notification as Read

```bash
PATCH /api/notifications/60d21b4667d0d8992e610c99/read
Authorization: Bearer <access_token>
```

### Mark All Notifications as Read

```bash
PATCH /api/notifications/read-all
Authorization: Bearer <access_token>
```

### Add Withdrawal Account

```bash
POST /api/wallet/accounts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "accountName": "John Doe",
  "accountNumber": "1234567890",
  "bankName": "GTBank"
}
```

### Request Withdrawal

```bash
POST /api/wallet/withdraw
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "amount": 5000,
  "accountId": "60d21b4667d0d8992e610c99"
}
```

---

## **Response Format**

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Paginated Response

```json
{
  "success": true,
  "data": {
    "resources": [...],
    "counts": {
      "resources": 45,
      "pathways": 12,
      "hubs": 8
    },
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    }
  }
}
```

**Note:** The `counts` field is returned by the `GET /resources`, `GET /pathways`, and `GET /hubs` list endpoints. It contains the total counts of publicly available resources, pathways, and hubs (filtered to `status: "public"` and not deleted), regardless of pagination or other filters applied to the list itself.

### Filter Endpoints (`/resources/filters`, `/pathways/filters`, `/hubs/filters`)

Returns the distinct filter options available for publicly available items, each with its count. Query params are optional and narrow the counts for the other options:

- `country` — Filters by applicable location (e.g. `Nigeria`)
- `industry` — Filters by industry (e.g. `Software Development`)
- `experience` — Filters by experience level (e.g. `Undergraduate`)
- `isFree` — Filters by pricing: `true` (free) or `false` (paid) — resources and pathways only (hubs have no pricing field)

**Example:**
```bash
GET /api/resources/filters?industry=Software Development&isFree=true
```

**Response:**

```json
{
  "success": true,
  "data": {
    "countries": [
      { "value": "Worldwide", "count": 12 },
      { "value": "Nigeria", "count": 5 }
    ],
    "industries": [
      { "value": "Software Development", "count": 12 }
    ],
    "experiences": [
      { "value": "Undergraduate", "count": 8 },
      { "value": "Professional (above 6 years)", "count": 4 }
    ],
    "pricing": [
      { "value": "Free", "count": 9 },
      { "value": "Paid", "count": 3 }
    ]
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error description",
  "stack": "..." // Only in development
}
```

---

## **HTTP Status Codes**

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (includes payment required)
- `404` - Not Found
- `500` - Server Error

---

## **Payment-Gated Access**

Non-free resources and pathways are protected by payment verification. To access a paid item:

1. The user must have a `Payment` record with `status: 'success'` for that item
2. The system checks this automatically when accessing resource details or downloading files
3. Free items are accessible to everyone
4. Owners and collaborators always have access regardless of payment status

---

## **Payment Reconciliation**

A background reconciliation service runs every 5 minutes to:

- Verify pending payments against Paystack's API
- Update payment statuses to `success` or `failed`
- Credit seller wallets for successful payments
- Retry transient failures with exponential backoff (1min, 2min, 4min)
- Mark payments as `failed` after 3 unsuccessful retries

When a bank reversal occurs:

- Paystack sends `charge.failed` or `charge.reversed` webhooks
- The system updates the payment to `failed`
- The seller's wallet is debited (reversed)
- A refund transaction is created in the wallet

---

## **Environment Variables**

See `.env.example` for all required environment variables. Key variables include:

- `PORT` - Server port (default: 5000)
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `JWT_REFRESH_SECRET` - Secret for refresh token signing
- `PAYSTACK_SECRET_KEY` - Paystack secret key
- `PAYSTACK_PUBLIC_KEY` - Paystack public key
- `PAYSTACK_WEBHOOK_SECRET` - Paystack webhook signature secret
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `CLIENT_URL` - Frontend URL for OAuth callbacks
- `CLIENT_URLS` - Comma-separated list of allowed CORS origins
- `NODE_ENV` - Environment (development/production)
