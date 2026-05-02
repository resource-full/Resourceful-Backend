# ResourceFull Backend API

A production-ready backend for a career resource marketplace.

## Tech Stack

- Node.js & Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- bcryptjs for password hashing

## Getting Started

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
3. Start the server

```bash
npm run dev
```


## **ResourceFull API Endpoints**

### **Base URL:** `http://localhost:5000/api`

---

## **Authentication** (`/auth`)

| Method | Endpoint                 | Description                 | Auth Required | Body                                             |
| ------ | ------------------------ | --------------------------- | ------------- | ------------------------------------------------ |
| POST   | `/auth/register`         | Register new user           | No            | `{ name, email, password }`                      |
| POST   | `/auth/login`            | Login user                  | No            | `{ email, password }`                            |
| POST   | `/auth/refresh-token`    | Get new access token        | No            | `{ refreshToken }`                               |
| POST   | `/auth/forgot-password`  | Request password reset      | No            | `{ email }`                                      |
| POST   | `/auth/reset-password`   | Reset password with token   | No            | `{ token, newPassword }`                         |
| POST   | `/auth/logout`           | Logout user                 | Yes           | -                                                |
| POST   | `/auth/change-password`  | Change password             | Yes           | `{ currentPassword, newPassword }`               |
| GET    | `/auth/me`               | Get current user profile    | Yes           | -                                                |

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

| Method | Endpoint                            | Description                     | Auth Required            | Body                                                                                            |
| ------ | ----------------------------------- | ------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------- |
| POST   | `/resources`                        | Create new resource             | Yes                      | FormData: `{ name, description, resourceFile, coverPhoto, applicableLocation, experience, industry, isFree, price, currency, tags, hubId }` |
| GET    | `/resources`                        | Get all resources (paginated)   | No                       | Query: `?page=1&limit=10&industry=Software Development&experience=Professional&isFree=true&search=javascript&sort=-confidenceScore` |
| GET    | `/resources/my`                     | Get authenticated user's resources | Yes                   | Query: `?page=1&limit=10&status=draft`                                                          |
| GET    | `/resources/:id`                    | Get single resource details     | No (public) / Yes (private) | -                                                                                              |
| PUT    | `/resources/:id`                    | Update resource                 | Yes (owner/collaborator) | FormData: `{ name, description, resourceFile, coverPhoto, applicableLocation, experience, industry, isFree, price, currency, tags, hubId }` |
| DELETE | `/resources/:id`                    | Delete resource                 | Yes (owner only)         | -                                                                                               |
| PATCH  | `/resources/:id/status`             | Change resource status          | Yes (owner only)         | `{ status: "draft" \| "private" \| "shared" \| "public" }`                                     |
| POST   | `/resources/:id/share`              | Share resource with user        | Yes (owner only)         | `{ userId }`                                                                                    |
| DELETE | `/resources/:id/share`              | Remove share access             | Yes (owner only)         | `{ userId }`                                                                                    |
| POST   | `/resources/:id/collaborators`      | Add collaborator                | Yes (owner only)         | `{ userId, permission: "view" \| "edit" \| "admin" }`                                           |
| DELETE | `/resources/:id/collaborators`      | Remove collaborator             | Yes (owner only)         | `{ userId }`                                                                                    |
| POST   | `/resources/:id/rate`               | Rate a resource (1-5)           | Yes                      | `{ rating }`                                                                                    |
| GET    | `/resources/:id/download`           | Download resource file          | Yes                      | -                                                                                               |

---

## **Pathways** (`/pathways`)

| Method | Endpoint                        | Description                     | Auth Required    | Body                                                                                            |
| ------ | ------------------------------- | ------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| POST   | `/pathways`                     | Create new pathway              | Yes              | `{ name, description, blocks, applicableLocation, experience, industry, isFree, price, currency, tags, hubId }` |
| GET    | `/pathways`                     | Get all pathways (paginated)    | No               | Query: `?page=1&limit=10&industry=Software Development&experience=Professional&search=backend`  |
| GET    | `/pathways/:id`                 | Get single pathway details      | No (public) / Yes (private) | -                                                                                     |
| GET    | `/pathways/user/my`             | Get authenticated user's pathways | Yes            | Query: `?page=1&limit=10&status=draft`                                                          |
| PUT    | `/pathways/:id`                 | Update pathway                  | Yes (owner only) | `{ name, description, blocks, applicableLocation, experience, industry, isFree, price, currency, tags, hubId }` |
| DELETE | `/pathways/:id`                 | Delete pathway                  | Yes (owner only) | -                                                                                               |
| PATCH  | `/pathways/:id/status`          | Change pathway status           | Yes (owner only) | `{ status: "draft" \| "public" }`                                                              |
| POST   | `/pathways/:id/blocks`          | Add block to pathway            | Yes (owner only) | `{ type: "text" \| "resource", name, shortDescription, resource, notes }`                      |
| DELETE | `/pathways/:id/blocks/:blockId` | Remove block from pathway       | Yes (owner only) | -                                                                                               |
| PUT    | `/pathways/:id/blocks/reorder`  | Reorder pathway blocks          | Yes (owner only) | `{ blockOrders: [{ id, order }] }`                                                              |

---

## **Hubs** (`/hubs`)

| Method | Endpoint                              | Description                  | Auth Required    | Body                                                                                            |
| ------ | ------------------------------------- | ---------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| POST   | `/hubs`                               | Create new hub               | Yes              | `{ name, description, applicableLocation, experience, industry, resources, pathways }`         |
| GET    | `/hubs`                               | Get all hubs (paginated)     | No               | Query: `?page=1&limit=10&industry=Software Development&search=career`                           |
| GET    | `/hubs/my`                            | Get authenticated user's hubs | Yes             | Query: `?page=1&limit=10&status=draft`                                                          |
| GET    | `/hubs/:id`                           | Get single hub details       | No (public) / Yes (private) | -                                                                                     |
| PUT    | `/hubs/:id`                           | Update hub                   | Yes (owner only) | `{ name, description, applicableLocation, experience, industry }`                              |
| DELETE | `/hubs/:id`                           | Delete hub                   | Yes (owner only) | -                                                                                               |
| PATCH  | `/hubs/:id/status`                    | Change hub status            | Yes (owner only) | `{ status: "draft" \| "public" }`                                                              |
| POST   | `/hubs/:id/resources/:resourceId`     | Add resource to hub          | Yes (owner only) | -                                                                                               |
| DELETE | `/hubs/:id/resources/:resourceId`     | Remove resource from hub     | Yes (owner only) | -                                                                                               |
| POST   | `/hubs/:id/pathways/:pathwayId`       | Add pathway to hub           | Yes (owner only) | -                                                                                               |
| DELETE | `/hubs/:id/pathways/:pathwayId`       | Remove pathway from hub      | Yes (owner only) | -                                                                                               |

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

| Method | Endpoint                                   | Description                     | Auth Required | Body |
| ------ | ------------------------------------------ | ------------------------------- | ------------- | ---- |
| POST   | `/payments/initialize/:itemType/:itemId`   | Initialize Paystack payment     | Yes           | -    |
| GET    | `/payments/verify/:reference`              | Verify payment by reference     | Yes           | -    |
| GET    | `/payments/status/:itemType/:itemId`       | Check purchase status           | Yes           | -    |

---

## **Notifications** (`/notifications`)

| Method | Endpoint                   | Description                    | Auth Required | Body |
| ------ | -------------------------- | ------------------------------ | ------------- | ---- |
| GET    | `/notifications`           | Get user notifications         | Yes           | Query: `?page=1&limit=20&isRead=false` |
| PATCH  | `/notifications/:id/read`  | Mark notification as read      | Yes           | -    |
| PATCH  | `/notifications/read-all`  | Mark all notifications as read | Yes           | -    |

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
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "pages": 5
    }
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
- `403` - Forbidden
- `404` - Not Found
- `500` - Server Error