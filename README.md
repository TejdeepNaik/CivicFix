# CivicFix

CivicFix is a full-stack web application designed to help communities report and manage civic issues. The project includes a modern frontend built with Next.js, a robust backend powered by FastAPI, and uses PostgreSQL and Redis for data and caching.

##  Features

- **User Authentication**: Secure JWT-based authentication.
- **Issue Reporting**: Users can report and track civic issues in their community.
- **AI Integration**: Optional OpenAI integration to assist with issue categorization or summarization (with a built-in mock provider for local development without an API key).
- **Containerized Environment**: Fully containerized using Docker and Docker Compose for seamless local development and deployment.

##  Tech Stack

### Frontend
- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Language**: TypeScript

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python)
- **Database ORM**: SQLAlchemy & Alembic (Migrations)
- **Testing**: Pytest

### Infrastructure
- **Database**: PostgreSQL 16
- **Cache / Task Queue**: Redis 7
- **Containerization**: Docker Compose

##  Prerequisites

Make sure you have the following installed on your machine:
- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

##  Getting Started

Follow these steps to run CivicFix locally using Docker Compose.

### 1. Clone the repository

```bash
git clone <repository-url>
cd CivicFix
```

### 2. Set up Environment Variables

The project requires an environment file to run successfully. Copy the example environment file to `.env`:

```bash
cp .env.example .env
```

Open the `.env` file and fill in the required variables:
- `POSTGRES_PASSWORD`: Choose a strong password for your local database.
- `JWT_SECRET_KEY`: Generate a secure key (e.g., run `python -c "import secrets; print(secrets.token_hex(32))"`).
- `OPENAI_API_KEY` (Optional): Add this if you want to use real OpenAI features. Leave it blank to use the mock AI provider.

### 3. Start the Application

Build and start the containers in detached mode:

```bash
docker compose up --build -d
```

### 4. Access the Services

Once the containers are up and running, you can access the services at the following URLs:

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API Docs (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend API Root**: [http://localhost:8000/api/v1](http://localhost:8000/api/v1)

## 📁 Project Structure

```text
CivicFix/
├── backend/            # FastAPI backend application
│   ├── app/            # Application source code
│   ├── tests/          # Pytest test suite
│   ├── alembic/        # Database migrations
│   └── Dockerfile      # Backend container definition
├── frontend/           # Next.js frontend application
│   ├── app/            # Next.js App Router source code
│   ├── components/     # Reusable React components
│   └── Dockerfile      # Frontend container definition
├── compose.yml         # Docker Compose configuration
└── .env.example        # Template for environment variables
```

##  Stopping the Application

To stop the running containers, execute:

```bash
docker compose down
```

If you also want to remove the database and redis volumes (this will erase all local data), run:

```bash
docker compose down -v
```
