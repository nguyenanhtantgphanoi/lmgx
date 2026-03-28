# Fastify MongoDB Modular API

This project is a Fastify API scaffold with a modular structure and MongoDB integration through Mongoose.

## Structure

- `src/models`: Mongoose models
- `src/modules`: Business logic grouped by domain
- `src/plugins`: Fastify plugins (env config, database)
- `src/routes`: Route registration and endpoint definitions
- `src/views`: Shared server-rendered templates for admin layout and pages

## Prerequisites

- Node.js 18+
- MongoDB running locally or remote URI

## Setup

1. Copy environment template:

```bash
cp .env.example .env
```

2. Update `.env` with your MongoDB URI.

3. Install dependencies:

```bash
npm install
```

## Run

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Base URL: `http://localhost:3000`

## API Endpoints

- `GET /api/health`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`

## Admin Page

- Open `http://localhost:3000/user-manager` to list users and update user profile data.
- Open `http://localhost:3000/admin-dashboard` for admin function links:
  - User Manage: `/user-manager`
  - Priest Manager: `/priest-manager`
  - Particular Priest Profile: `/priest-manager/:id`
  - Parish Manage: `/parish-manage`
  - Local Ordinary Manager: `/local-ordinary-manager`

## Priest API Endpoints

- `GET /api/priests`
- `POST /api/priests`
- `GET /api/priests/:id`
- `PUT /api/priests/:id`
- `DELETE /api/priests/:id`

Example POST body:

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```
