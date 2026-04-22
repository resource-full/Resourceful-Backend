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

| Method | Endpoint                       | Description                   | Auth Required            | Body                                                                        |
| ------ | ------------------------------ | ----------------------------- | ------------------------ | --------------------------------------------------------------------------- |
| POST   | `/resources`                   | Create new resource           | Yes                      | `{ title, description, link, category, country, tags }`                     |
| GET    | `/resources`                   | Get all resources (paginated) | No                       | Query: `?page=1&limit=10&category=course&search=node&sort=-confidenceScore` |
| GET    | `/resources/:id`               | Get single resource details   | No                       | -                                                                           |
| PUT    | `/resources/:id`               | Update resource               | Yes (owner/collaborator) | `{ title, description, link, category }`                                    |
| DELETE | `/resources/:id`               | Delete resource               | Yes (owner only)         | -                                                                           |
| POST   | `/resources/:id/collaborators` | Add collaborator to resource  | Yes (owner only)         | `{ email }`                                                                 |
| POST   | `/resources/:id/rate`          | Rate a resource (1-5)         | Yes                      | `{ rating }`                                                                |

---

## **Pathways** (`/pathways`)

| Method | Endpoint            | Description                       | Auth Required    | Body                                                                |
| ------ | ------------------- | --------------------------------- | ---------------- | ------------------------------------------------------------------- |
| POST   | `/pathways`         | Create new pathway                | Yes              | `{ title, description, category, difficulty, resources }`           |
| GET    | `/pathways`         | Get all pathways (paginated)      | No               | Query: `?page=1&limit=10&category=skill-development&search=backend` |
| GET    | `/pathways/:id`     | Get single pathway details        | No               | -                                                                   |
| GET    | `/pathways/user/my` | Get authenticated user's pathways | Yes              | -                                                                   |
| PUT    | `/pathways/:id`     | Update pathway                    | Yes (owner only) | `{ title, description, resources }`                                 |
| DELETE | `/pathways/:id`     | Delete pathway                    | Yes (owner only) | -                                                                   |

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

- `category`: ebook, course, video, article, tool, template, podcast, community
- `country`: Country name
- `verificationStatus`: true/false
- `owner`: User ID

### Filtering (pathways)

- `category`: career-change, skill-development, interview-prep, networking, personal-branding
- `difficulty`: beginner, intermediate, advanced
- `author`: User ID

### Sorting

- `sort`: Field to sort by (prefix with `-` for descending)
  - Resources: `-confidenceScore`, `-createdAt`, `peerRatings`
  - Pathways: `-createdAt`, `-enrolledCount`

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
Content-Type: application/json

{
  "title": "AWS Certified Solutions Architect",
  "description": "Complete AWS certification prep course",
  "link": "https://example.com/aws-course",
  "category": "course",
  "country": "USA",
  "tags": ["aws", "cloud", "certification"]
}
```

### Search Resources

```bash
GET /api/resources?search=javascript&category=course&sort=-confidenceScore&page=1&limit=20
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