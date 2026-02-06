# Online Shop

A complete Full-Stack sales system integrating classic e-commerce processes with content automation using Generative AI.

> **Status:** Academic Project
> This project was built as a university assignment to master Client-Server architecture.
>
> It implements the **full scope of requirements**, including:
> * **Core Logic:** Strict validation of orders, products, and status transitions (State Machine).
> * **Error Handling:** Standardized HTTP status codes & problem details.
> * **Advanced Features:** AI integration for SEO, JWT Authentication (Auth/Refresh), Bulk Data Import (CSV/JSON), and Order Reviews.

## Architecture and Technologies

The project is divided into two independent parts:

| Module | Technologies | Description |
| :--- | :--- | :--- |
| **`/backend`** | **Node.js, PostgreSQL, Knex.js** | REST API, Transactionality, Authorization (JWT), LLM Integration (Groq). |
| **`/frontend`** | **Vue** | Responsive SPA interface, Client and Administrator Panel. |

## Key Features

1. **Database Automation:** Data migration and seeding system (Knex.js).
2. **AI SEO Generator:** Automatic creation of HTML product descriptions using LLM.
3. **Security:** Full authentication (JWT) and Role-Based Access Control.
4. **Data Integrity:** Transactional order processing.

## How to run the project?

To run the entire project locally, follow the steps below in separate terminals.

### Step 1: Database and Backend

Required: Node.js, PostgreSQL.

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Environment configuration
# Copy .env.example to .env and fill in database credentials and API keys
cp .env.example .env

# 3. Database Automation (Migrations + Seed data)
npx knex migrate:latest
npx knex seed:run

# 4. Start server
node backend.js
```

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start client application
npm run dev
```