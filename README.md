# Fire/EMS CAD System

A web-based Computer Aided Dispatch system for tracking fire/EMS units and incidents with real-time updates across multiple sessions.

## Features

- Real-time synchronization across multiple users via WebSockets
- Unit tracking with status, personnel, and incident assignments
- Incident management with location, call type, comments, and action logs
- Color-coded status indicators for quick visual reference
- Persistent data storage that survives server restarts
- Responsive design for both desktop and mobile use

## Installation & Setup

### Prerequisites

- Node.js (v14 or newer)
- npm (comes with Node.js)

### Server Setup

1. Navigate to the `server` directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

   For development with auto-restart:
   ```
   npm run dev
   ```

The server will run on port 8080 by default and will create a `data` directory to store JSON files.

### Client Setup

1. Navigate to the `client` directory:
   ```
   cd client
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. For production build:
   ```
   npm run build
   ```

## Usage

1. Access the application through your web browser at `http://localhost:3000` (if using the default React development server)

2. **Units Management**:
   - View all units in the left column
   - Click "Add Unit" to create a new unit
   - Click on a unit to edit its details
   - Update name, status, and personnel
   - Delete units when no longer needed (with confirmation)

3. **Incidents Management**:
   - View all active incidents in the right column
   - Click "Add Incident" to create a new incident
   - Click on an incident to edit its details
   - Update call type, location, assigned units, and add comments
   - Delete incidents when resolved (with confirmation)

4. **Real-Time Updates**:
   - All changes are broadcast to all connected clients
   - New incidents and unit status changes appear immediately

## Data Persistence

All data is stored in JSON files in the `server/data` directory:
- `units.json`: Stores all unit data
- `incidents.json`: Stores all incident data

These files are updated automatically whenever changes are made, ensuring data persists between server restarts.
