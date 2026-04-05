# Intelligent Multi-Device Energy Management System ⚡

A modern, web-based AI energy management application utilizing Classical Planning (Forward Breadth-First Search) and Decision Networks. This system optimizes charging schedules for multi-device environments (e.g., intensive care units or smart homes) based on varying priorities, device consumption, and expected utility under uncertainty.

## Features

- **Decision Network AI**: Calculates the probability of success/failure across a specified horizon and compares Expected Utility for various plan permutations. Evaluates risk tolerance against potential utility drops.
- **Classical Planning**: Fast forward-BFS algorithm traversing states to reach optimal configurations using dynamically generated and constrained actions.
- **Glassmorphism UI**: A stunning, sleek dashboard built with React and Vite. It features a premium dark-mode aesthetic with micro-animations, customizable responsive grid cards, and interactive buttons.
- **Live Battery Trajectory**: Interactive and animated Chart.js layouts detailing battery levels over the generated planning horizons automatically highlighting the selected optimal charging schedule.
- **State-Space Simulation Tree**: A visually distinct interactive SVG tree graph for deep-diving into the planner's architecture. Hover over nodes and edges to inspect the step-by-step path costs and expected utility metrics computed live by the backend framework!
- **Dynamic Device Indicators**: Components that reflect device state using colored thresholds (green = safe, yellow = warning, red = penalty) ensuring status is readable at a glance.

## Tech Stack

- **Backend API**: Python 3, Flask, Flask-CORS
- **Frontend App**: Vite, React.js, Chart.js, react-chartjs-2, Lucide React
- **Architecture**: A cleanly decoupled client-server architecture serving calculated JSON data models over a robust REST API to a responsive Single Page Application.

## Getting Started

Follow the steps below to get both servers running seamlessly in your local environment.

### Prerequisites

- Node.js (and npm)
- Python 3.10+
- pip

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd path/to/Ai_classical_planner
   ```

2. **Start the Backend (Flask API Server):**
   ```bash
   # Install python dependencies for the backend
   pip install flask flask-cors
   
   # Start the planner
   python app.py
   ```
   The backend will begin serving the API on `http://127.0.0.1:8000`.

3. **Start the Frontend (React Vite App):**
   Open a new, separate terminal window:
   ```bash
   cd frontend
   
   # Install node dependencies
   npm install
   
   # Start the development server
   npm run dev
   ```
   The frontend UI will become available at `http://localhost:5173`. Open this URL in your browser to interact with the dashboard!

## How It Works

- The system initializes state based on current device statuses across an environment.
- The planner evaluates **Utility Rewards** for safely powered high-priority devices against strict **Depletion/Deficiency Penalties** if battery thresholds are compromised.
- Every node in the interactive **State-Space Tree** provides a unique tooltip detailing exactly how the Decision Network maps the horizon progression step-by-step.
