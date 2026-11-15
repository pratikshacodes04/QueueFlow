# 🚦 QueueFlow – Smart Queue Management System

**Manage queues. Streamline service. Deliver better customer experiences.**

QueueFlow is a full-stack queue management application designed to simplify customer flow and improve service operations. It enables managers to create and manage queues, register customers, generate tokens, coordinate service operations, and monitor performance through an analytics dashboard.

Built using **Next.js, React, FastAPI, and MongoDB**, QueueFlow combines a modern frontend with a modular backend architecture to provide an organized and efficient queue management experience.

---

## ✨ Key Features

### 📋 Queue Management
- Create and manage multiple queues.
- Activate and deactivate queues.
- Add customers to queues and generate unique tokens.
- Monitor waiting customers and queue statistics.
- Manage queue operations through a centralized dashboard.

### 🎫 Token & Service Desk Management
- Generate sequential customer tokens.
- Call the next waiting customer.
- Manage token status throughout the service lifecycle.
- Support priority handling and token cancellation.
- Recall tokens and manage customer service operations.
- Handle concurrent Call Next operations to help prevent duplicate token calls.

### 📊 Analytics Dashboard
- Monitor queue and customer statistics.
- Visualize operational data through charts.
- Track token distribution and service activity.
- View key queue performance indicators.
- Monitor application health.

### 🔐 Authentication & Security
- JWT-based authentication.
- Password hashing using bcrypt.
- Manager-specific data access.
- Protected application routes.
- Backend request validation and structured error handling.

---

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | Next.js 14, React 18, JavaScript |
| Styling | CSS |
| Icons | Lucide Icons |
| Backend | Python, FastAPI |
| Database | MongoDB, PyMongo |
| Data Validation | Pydantic v2 |
| Authentication | JWT, bcrypt |
| Testing | Pytest |
| Package Management | npm, pip |

---

## 🏗️ Project Architecture

```text
QueueFlow/
│
├── backend/
│   ├── config/              # Application and database configuration
│   ├── controllers/         # Request handling and controllers
│   ├── middleware/          # Error handling middleware
│   ├── models/              # Database models
│   ├── routes/              # API route definitions
│   ├── schemas/             # Request and response validation
│   ├── services/            # Application business logic
│   ├── tests/               # Backend test cases
│   ├── utils/                # Authentication and shared utilities
│   ├── main.py               # FastAPI application entry point
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend environment template
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Application pages
│   │   ├── components/       # Reusable UI components
│   │   ├── context/          # Application state management
│   │   ├── hooks/            # Custom React hooks
│   │   ├── services/         # API integration
│   │   ├── styles/           # Global styles
│   │   └── utils/            # Helper functions
│   ├── package.json          # Frontend dependencies and scripts
│   ├── package-lock.json
│   └── .env.example          # Frontend environment template
│
├── .gitignore
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites

Make sure the following are installed:

- Python 3
- Node.js and npm
- MongoDB (local installation or MongoDB Atlas)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/pratikshacodes04/QueueFlow.git

cd QueueFlow
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate the environment.

**Windows (PowerShell):**

```powershell
.\venv\Scripts\Activate.ps1
```

**macOS/Linux:**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create the environment configuration file.

**Windows:**

```powershell
Copy-Item .env.example .env
```

**macOS/Linux:**

```bash
cp .env.example .env
```

Configure the MongoDB connection string and application settings in `backend/.env`.

Start the backend server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Backend:** `http://localhost:8000`

**API Documentation:** `http://localhost:8000/docs`

### 3. Frontend Setup

Open a new terminal from the project root and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create the frontend environment file.

**Windows:**

```powershell
Copy-Item .env.example .env.local
```

**macOS/Linux:**

```bash
cp .env.example .env.local
```

Configure the API endpoint in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=QueueFlow
```

Start the frontend development server:

```bash
npm run dev
```

**Frontend:** `http://localhost:3000`

---

## 🧪 Testing & Quality Checks

### Backend Tests

From the `backend` directory:

```bash
pytest -v
```

### Frontend Linting

From the `frontend` directory:

```bash
npm run lint
```

### Production Build

```bash
npm run build
```

---

## 🔌 API Overview

QueueFlow provides RESTful APIs organized into the following modules:

| Module | Functionality |
|---|---|
| Authentication | Manager registration, login, and authentication |
| Queues | Queue creation, activation, management, and monitoring |
| Tokens | Token generation, calling, and status management |
| Analytics | Queue statistics and performance insights |
| Health | Application and service health checks |

The backend uses FastAPI for API development and Pydantic schemas for request validation and structured data handling.

Interactive API documentation is available at `/docs` when the backend server is running.

---

## 🔒 Security & Configuration

- Environment variables are used for application configuration.
- JWT is used for authentication.
- Passwords are hashed using bcrypt.
- Protected routes restrict unauthorized access.
- Manager-specific data access is enforced through backend authorization.
- Actual environment files and credentials are excluded from version control.
- Environment templates are provided through `.env.example` files.

**Note:** Use strong, randomly generated JWT secrets and secure database credentials in production.

---

## 🎯 Project Objective

QueueFlow aims to provide an efficient and structured solution for managing customer queues and service operations.

The project focuses on:

- Developing a modular full-stack application.
- Integrating frontend and backend through REST APIs.
- Managing customer tokens and queue workflows.
- Maintaining reliable database operations.
- Providing operational insights through analytics.
- Implementing authentication and access control.

---

## 👩‍💻 Author

**Pratiksha**

GitHub: [@pratikshacodes04](https://github.com/pratikshacodes04)

---

⭐ **QueueFlow – Making queue management simpler and more efficient.**
