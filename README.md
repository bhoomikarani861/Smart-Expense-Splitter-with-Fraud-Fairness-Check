# FairSplit - Smart Expense Splitter & Fairness Engine

**FairSplit** is a premium, full-stack expense-splitting web application (inspired by Splitwise) enhanced with a rule-based **Fairness & Fraud Detection Engine**. It calculates the minimum number of transactions needed to settle group debts, tracks recurring bills, logs immutable audit trail events, and flags billing price hikes or payment anomalies.

This project is fully self-contained and engineered to serve as a high-quality final-year engineering project or a standout feature on a software engineering resume.

---

## 🚀 Key Features

### 1. Greedy Cash Flow Simplification (Min Cash Flow)
- Computes individual member net balances: $\text{Balance} = \text{Paid} - \text{Owed}$.
- Separates members into **Debtors** (negative balance) and **Creditors** (positive balance).
- Greedily settles the largest debtor with the largest creditor to minimize transaction clutter.
- **Mathematical Guarantee**: Reduces group settlement transactions to at most $N-1$ transfers (where $N$ is the number of members).

### 2. Fairness & Fraud Audit Engine
- **Duplicate Claim Detection**: Flags identical expense amounts with fuzzy description matches added within 24 hours of each other (prevents accidental double entries).
- **Dominant Payer Alert**: Warns the group when one member pays for $>75\%$ of all expenses, recommending rotation to balance the load.
- **Zero Contribution (Free-Riding) Check**: Identifies members who owe money but have contributed ₹0 towards group expenses.
- **Outlier Expense Detection**: Uses standard deviation ($\sigma$) to flag expenses that are $>1.2$ standard deviations above the group mean (catches typos or massive unexpected expenses).
- **Subscription Overcharge Alerts**: Compares utility/subscription bills against recurring baseline templates and raises warning flags if a new bill increases by $>10\%$ (detects price-gouging or leakages).

### 3. Write-Back Settlement History
- Instead of just showing transaction suggestions, users can click **"Settled"** to log an actual transfer, which updates the SQLite database and adjusts everyone's net balance dynamically.

### 4. Immutable Group Audit Logs
- Automatically logs all activity events (expense additions, template configuration, payment settle-ups, and deletions) in a chronological log feed to prevent disputes.

### 5. Interactive SVG Visualizations
- **Visual Cash Flow Graph**: Custom-draws an interactive SVG network map of nodes (members) and arrows showing cash transfers.
- **Category Breakdown Chart**: Built using responsive React SVGs (no bulky charting packages) to display spending shares.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: React.js, Vite, Lucide React (Icons).
- **Styling**: Premium, responsive Glassmorphic Dark UI styled using custom Vanilla CSS (`index.css`) with micro-animations.
- **Backend**: Node.js, Express.js (REST API, ES Modules).
- **Database**: SQLite (Promise-based asynchronous driver). 
  - *Why SQLite?* It is completely self-contained in a local file (`database.sqlite`), requiring **zero installation or setup** for local evaluators, while still supporting full relational schemas, foreign-key cascades, and ACID transactions.

---

## 📂 Project Structure

```
├── backend/
│   ├── database.js          # SQLite connection and schema creation
│   ├── database.sqlite      # Local SQLite database file (ignored in git)
│   ├── debtSimplifier.js    # Greedy Min-Cash-Flow algorithm logic
│   ├── fairnessCheck.js     # Duplicate, outlier, and overcharge check rules
│   ├── server.js            # Express routing, transactions, and REST endpoints
│   ├── package.json         # Backend dependencies (express, cors, sqlite3)
│   └── tests/
│       └── test_logic.js    # Automated logic test runner (17 assertions)
├── frontend/
│   ├── index.html           # Main HTML entry point
│   ├── vite.config.js       # Vite configuration
│   ├── package.json         # React + Vite dependencies (lucide-react)
│   └── src/
│       ├── api.js           # API request wrappers connecting to backend
│       ├── index.css        # Premium custom CSS system & animations
│       ├── main.jsx         # React initialization
│       └── App.jsx          # React state, views, SVG graphs, and modals
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) installed (v16+ recommended).

### 1. Run the Backend API Server
Navigate to the `backend/` folder, install dependencies, and start the server:
```bash
cd backend
npm install
node server.js
```
The backend server will initialize the SQLite database tables and run on **`http://localhost:5000`**.

### 2. Run the React Frontend
Open a new terminal tab, navigate to the `frontend/` folder, install dependencies, and start the development server:
```bash
cd frontend
npm install
npm run dev
```
Open **`http://localhost:5173/`** in your browser to view the application.

---

## 🧪 Running Automated Tests

You can run the backend logic unit test suite (which validates debt simplification balances, overcharge checks, and outlier math against mock data):
```bash
node backend/tests/test_logic.js


