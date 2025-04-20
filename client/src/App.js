import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import './App.css';
import React, { useState, useEffect, useRef } from 'react';
export default App;

// Main App Component
function App() {
  const [units, setUnits] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [showUnitEditor, setShowUnitEditor] = useState(false);
  const [showIncidentEditor, setShowIncidentEditor] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const [showClearedIncidents, setShowClearedIncidents] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);


  // Connect to WebSocket on component mount
  useEffect(() => {
    // In a real application, this would point to your websocket server
    const newSocket = new WebSocket('ws://bmeoanbk.mooo.com:8080');
    socketRef.current = newSocket;
    
    newSocket.onopen = () => {
      console.log('WebSocket Connected');
      setIsConnected(true);

      setTimeout(() => {
            if (newSocket.readyState === WebSocket.OPEN) {
              newSocket.send(JSON.stringify({ type: 'getUsers' }));
            }
          }, 500); // Small delay to ensure connection is fully established
    };
    
    newSocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received message:', data);
      
      if (data.type === 'units') {
        // Replace entire units array when receiving a full list
        console.log('Received complete units list:', data.units);
        setUnits(data.units);
      } else if (data.type === 'incidents') {
        // Replace entire incidents array when receiving a full list
        console.log('Received complete incidents list:', data.incidents);
        console.log('Inactive incidents in list:', data.incidents.filter(i => i.status === 'INACTIVE').length);
        console.log('Active incidents in list:', data.incidents.filter(i => i.status !== 'INACTIVE').length);
        setIncidents(data.incidents);
      } else if (data.type === 'unitUpdate') {
        // Check if this unit already exists in our array
        console.log('Received unit update:', data.unit);
        console.log('Unit status:', data.unit.status);
        console.log('Unit assigned incident:', data.unit.assignedIncident);
        
        setUnits(prevUnits => {
          const existingIndex = prevUnits.findIndex(u => u.id === data.unit.id);
          if (existingIndex >= 0) {
            // Replace the unit at its current position
            console.log(`Updating existing unit at index ${existingIndex}`);
            return [
              ...prevUnits.slice(0, existingIndex),
              data.unit,
              ...prevUnits.slice(existingIndex + 1)
            ];
          } else {
            // Add as new unit
            console.log('Adding new unit to array');
            return [...prevUnits, data.unit];
          }
        });
      } else if (data.type === 'incidentUpdate') {
        // Check if this incident already exists in our array
        console.log('Received incident update:', data.incident);
        console.log('Incident status:', data.incident.status);
        console.log('Incident assigned units:', data.incident.assignedUnits);
        
        setIncidents(prevIncidents => {
          const existingIndex = prevIncidents.findIndex(i => i.id === data.incident.id);
          
          if (existingIndex >= 0) {
            // Replace the incident at its current position
            console.log(`Updating existing incident at index ${existingIndex}`);
            return [
              ...prevIncidents.slice(0, existingIndex),
              data.incident,
              ...prevIncidents.slice(existingIndex + 1)
            ];
          } else {
            // Add as new incident
            console.log('Adding new incident to array');
            return [...prevIncidents, data.incident];
          }
        });
      } else if (data.type === 'users') {
          console.log('Received users list:', data.users);
          if (Array.isArray(data.users)) {
            setUsers(data.users);
            
            // Try to find previously selected user in the new list
            if (selectedUser) {
              const updatedUser = data.users.find(u => u.id === selectedUser.id);
              if (updatedUser) {
                setSelectedUser(updatedUser);
                saveUserToLocalStorage(updatedUser);  // Save the updated user
              } else if (data.users.length > 0) {
                setSelectedUser(data.users[0]);
                saveUserToLocalStorage(data.users[0]);
              }
            } else {
              // Load from localStorage if no user is selected
              const savedUser = loadUserFromLocalStorage();
              if (savedUser) {
                const updatedUser = data.users.find(u => u.id === savedUser.id);
                if (updatedUser) {
                  setSelectedUser(updatedUser);
                } else if (data.users.length > 0) {
                  setSelectedUser(data.users[0]);
                  saveUserToLocalStorage(data.users[0]);
                }
              } else if (data.users.length > 0) {
                setSelectedUser(data.users[0]);
                saveUserToLocalStorage(data.users[0]);
              }
            }
          }
        }
    };
    
    newSocket.onclose = () => {
      console.log('WebSocket Disconnected');
      setIsConnected(false);
    };
    
    newSocket.onerror = (error) => {
      console.error('WebSocket Error:', error);
      setIsConnected(false);
    };
    
    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      newSocket.close();
    };
  }, []); // Empty dependency array to run once on mount

  useEffect(() => {
    const savedUser = loadUserFromLocalStorage();
    if (savedUser) {
      console.log('Loaded saved user from localStorage:', savedUser);
      setSelectedUser(savedUser);
    }
  }, []);

  // Safe function to send WebSocket messages
  const sendSocketMessage = (message) => {
    if (socketRef.current && isConnected) {
      socketRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected. Cannot send message:', message);
      return false;
    }
  };

  // Function to handle unit click
  const handleUnitClick = (unit) => {
    setSelectedUnit(unit);
    setShowUnitEditor(true);
  };

  // Function to handle incident click
  const handleIncidentClick = (incident) => {
    setSelectedIncident(incident);
    setShowIncidentEditor(true);
  };
  
  // Function to delete a unit
  const handleDeleteUnit = (unitId) => {
    sendSocketMessage({
      type: 'deleteUnit',
      unitId: unitId
    });
  };
  
  // Function to delete an incident
  const handleDeleteIncident = (incidentId) => {
    sendSocketMessage({
      type: 'deleteIncident',
      incidentId: incidentId
    });
  };

  // Function to update unit
  const updateUnit = (updatedUnit) => {
    sendSocketMessage({
      type: 'unitUpdate',
      unit: updatedUnit
    });
    // Close the modal regardless of connection status
    setShowUnitEditor(false);
  };

  const assignUnitToIncident = (unitId, incidentId) => {
  console.log(`DIRECT ASSIGNMENT: Assigning unit ${unitId} to incident ${incidentId}`);

  // Get latest incident and unit data
  const incident = incidents.find(inc => inc.id === incidentId);
  const unit = units.find(u => u.id === unitId);
  
  if (!incident || !unit) {
    console.error('Cannot find incident or unit');
    return false;
  }
  
  // Check if unit is already assigned to this incident
  if (incident.assignedUnits && incident.assignedUnits.includes(unitId)) {
    console.log(`Unit ${unitId} is already assigned to incident ${incidentId}`);
    return true; // Nothing to do
  }
  
  console.log('Current incident assignedUnits:', incident.assignedUnits || []);
  
  // Create new assigned units array, ensuring we don't lose existing units
  const newAssignedUnits = incident.assignedUnits ? [...incident.assignedUnits] : [];
  
  // Add the new unit ID if it's not already included
  if (!newAssignedUnits.includes(unitId)) {
    newAssignedUnits.push(unitId);
  }
  
  console.log('New assignedUnits array:', newAssignedUnits);
  
  // Update the unit first
  const updatedUnit = {
    ...unit,
    status: 'DISPATCHED',
    assignedIncident: incidentId,
    lastUpdated: new Date().toISOString()
  };
  
  // Update the incident
  const updatedIncident = {
    ...incident,
    assignedUnits: newAssignedUnits,
    actionLog: [
      ...(incident.actionLog || []),
      {
        action: 'UNIT_ASSIGNED',
        timestamp: new Date().toISOString(),
        details: `Unit ${unit.name} assigned to incident via drag and drop`
      }
    ],
    lastUpdated: new Date().toISOString()
  };
  
  // Important: Send the unit update FIRST
  sendSocketMessage({
    type: 'unitUpdate',
    unit: updatedUnit
  });
  
  // Then send the incident update SECOND
  sendSocketMessage({
    type: 'incidentUpdate',
    incident: updatedIncident
  });
  
  return true;
};

  const saveUserToLocalStorage = (user) => {
    if (user) {
      localStorage.setItem('selectedUser', JSON.stringify(user));
    }
  };

  // Function to load user from localStorage
  const loadUserFromLocalStorage = () => {
    const savedUser = localStorage.getItem('selectedUser');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Error parsing saved user:', e);
        return null;
      }
    }
    return null;
  };

  // Modify your setSelectedUser calls to save to localStorage
  const handleUserSelect = (user) => {
    setSelectedUser(user);
    saveUserToLocalStorage(user);
  };

  // Function to update incident
  // Enhanced updateIncident function to transfer unit assignments
  const updateIncident = (updatedIncident) => {
    console.log("=== APP - UPDATE INCIDENT CALLED ===");
    console.log("Updating incident:", updatedIncident);
    console.log("Incident call type:", updatedIncident.callType);
    console.log("Incident location:", updatedIncident.location);
    console.log("Incident assigned units:", updatedIncident.assignedUnits || []);
    
    // Check if this is a temporary incident
    if (updatedIncident.id && updatedIncident.id.startsWith('temp-')) {
      console.log("This is a temporary incident - need to update the most recently created real incident");
      
      // Find the most recently created incident
      const recentIncidents = [...incidents].sort((a, b) => {
        return new Date(b.creationTime) - new Date(a.creationTime);
      });
      
      if (recentIncidents.length > 0 && !recentIncidents[0].id.startsWith('temp-')) {
        const targetIncident = recentIncidents[0];
        console.log("Found recent incident to update:", targetIncident.id);
        
        // Get the assigned units from the temporary incident
        const tempAssignedUnits = updatedIncident.assignedUnits || [];
        console.log("Temporary incident assigned units:", tempAssignedUnits);
        
        // Create an updated version with the edited fields
        const realUpdatedIncident = {
          ...targetIncident,
          callType: updatedIncident.callType,
          location: updatedIncident.location,
          // Transfer assigned units from temp incident
          assignedUnits: tempAssignedUnits,
          comments: updatedIncident.comments || [],
          actionLog: [
            ...(targetIncident.actionLog || []),
            {
              action: 'INCIDENT_UPDATED',
              timestamp: new Date().toISOString(),
              details: 'Initial incident details updated'
            }
          ],
          lastUpdated: new Date().toISOString()
        };
        
        console.log("Sending update for real incident:", realUpdatedIncident);
        console.log("Transferring units:", tempAssignedUnits);
        
        // Update any units that were assigned to the temp incident
        // so they point to the real incident instead
        tempAssignedUnits.forEach(unitId => {
          const unitToUpdate = units.find(u => u.id === unitId);
          if (unitToUpdate) {
            console.log(`Updating unit ${unitId} to point to real incident ${targetIncident.id}`);
            
            // Send unitUpdate to update the assignedIncident field
            sendSocketMessage({
              type: 'unitUpdate',
              unit: {
                ...unitToUpdate,
                assignedIncident: targetIncident.id,
                lastUpdated: new Date().toISOString()
              }
            });
          }
        });
        
        // Send the update to the server
        sendSocketMessage({
          type: 'incidentUpdate',
          incident: realUpdatedIncident
        });
      } else {
        console.error("Could not find a real incident to update");
        alert("Error: Could not find the incident to update. Please try again.");
      }
    } else {
      // Normal update for existing incident
      console.log("Regular incident update - sending to server");
      sendSocketMessage({
        type: 'incidentUpdate',
        incident: updatedIncident
      });
    }
    
    // Close the modal regardless of connection status
    setShowIncidentEditor(false);
    console.log("=== APP - UPDATE INCIDENT COMPLETE ===");
  };

  const reopenIncident = (incidentId) => {
    console.log(`Reopening incident: ${incidentId}`);
    
    // Find the incident to reopen
    const incidentToReopen = incidents.find(incident => incident.id === incidentId);
    
    if (incidentToReopen) {
      // Create an updated version with status set to ACTIVE
      const updatedIncident = {
        ...incidentToReopen,
        status: 'ACTIVE',
        actionLog: [
          ...(incidentToReopen.actionLog || []), 
          {
            action: 'INCIDENT_REOPENED',
            timestamp: new Date().toISOString(),
            details: 'Incident reopened'
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      
      // Send update to server
      sendSocketMessage({
        type: 'incidentUpdate',
        incident: updatedIncident
      });
    } else {
      console.error(`Could not find incident to reopen: ${incidentId}`);
    }
  };

// Replace your existing toggleUnitAssignment function with this improved version

const toggleUnitAssignment = (unitId, incidentId, shouldAssign = true) => {
  console.log(`${shouldAssign ? 'Assigning' : 'Removing'} unit ${unitId} to/from incident ${incidentId}`);

  // Always get the very latest incident data from the state to avoid stale data
  const incident = incidents.find(inc => inc.id === incidentId);
  if (!incident) {
    console.error(`Incident ${incidentId} not found`);
    return false;
  }

  // Find the unit
  const unit = units.find(u => u.id === unitId);
  if (!unit) {
    console.error(`Unit ${unitId} not found`);
    return false;
  }

  console.log('Current incident data:', {
    id: incident.id,
    callType: incident.callType,
    location: incident.location,
    assignedUnits: incident.assignedUnits || []
  });

  // Start with a fresh array, not a reference to the existing one
  // This ensures we don't have any unexpected side effects from array mutations
  let newAssignedUnits = [];
  
  // If the incident has assigned units, create a new array with those values
  if (incident.assignedUnits && Array.isArray(incident.assignedUnits)) {
    // Make a proper deep copy to avoid reference issues
    newAssignedUnits = [...incident.assignedUnits];
  }
  
  // For debugging
  console.log('Initial newAssignedUnits array:', [...newAssignedUnits]);
  
  // If assigning, add unit to incident if not already present
  if (shouldAssign && !newAssignedUnits.includes(unitId)) {
    newAssignedUnits.push(unitId);
    console.log(`Added unit ${unitId} to assignedUnits array`);
  } 
  // If removing, filter out the unit
  else if (!shouldAssign && newAssignedUnits.includes(unitId)) {
    newAssignedUnits = newAssignedUnits.filter(id => id !== unitId);
    console.log(`Removed unit ${unitId} from assignedUnits array`);
  }
  
  console.log('Final newAssignedUnits array:', [...newAssignedUnits]);

  // Set appropriate status for the unit
  const newStatus = shouldAssign ? 'DISPATCHED' : 'IN_SERVICE';
  
  // Update the unit
  const updatedUnit = {
    ...unit,
    status: newStatus,
    assignedIncident: shouldAssign ? incidentId : null,
    lastUpdated: new Date().toISOString()
  };
  
  // Send unit update
  sendSocketMessage({
    type: 'unitUpdate',
    unit: updatedUnit
  });
  
  // Update the incident with the freshly created array
  const updatedIncident = {
    ...incident,
    assignedUnits: newAssignedUnits,  // Use our clean array
    actionLog: [...(incident.actionLog || []), {
      action: shouldAssign ? 'UNIT_ASSIGNED' : 'UNIT_REMOVED',
      timestamp: new Date().toISOString(),
      details: `Unit ${unit.name} ${shouldAssign ? 'assigned to' : 'removed from'} incident`
    }],
    lastUpdated: new Date().toISOString()
  };
  
  // For debugging - log the final incident state
  console.log('Updated incident data to send:', {
    id: updatedIncident.id,
    callType: updatedIncident.callType,
    location: updatedIncident.location,
    assignedUnits: updatedIncident.assignedUnits
  });
  
  // Send incident update
  sendSocketMessage({
    type: 'incidentUpdate',
    incident: updatedIncident
  });

  return true;
};


  // Function to handle adding a new user
  const createNewUser = (firstName, lastName) => {
    if (!firstName || !lastName || !isConnected) return;
    
    sendSocketMessage({
      type: 'createUser',
      firstName,
      lastName
    });
    
    // Close the modal
    setShowUserModal(false);
  };

  // Function to create a new unit
  const createNewUnit = () => {
    // Generate a unique name
    let counter = 1;
    let defaultUnitName = `Unit ${units.length + 1}`;
    
    // Check if the name already exists and find a unique one
    while (units.some(unit => unit.name === defaultUnitName)) {
      counter++;
      defaultUnitName = `Unit ${units.length + counter}`;
    }
    
    // Create a temporary local unit to edit - but don't send to server yet
    const tempUnit = {
      id: 'temp-' + Date.now(),
      name: defaultUnitName,
      status: 'IN_SERVICE',
      assignedIncident: null,
      personnel: [],
      lastUpdated: new Date().toISOString(),
      isNew: true // Flag to indicate this is a new unit that hasn't been saved
    };
    
    // Set selected unit and open editor
    setSelectedUnit(tempUnit);
    setShowUnitEditor(true);
  };
  
  // Function to create a new incident
  const createNewIncident = () => {
    console.log("=== NEW INCIDENT FLOW START ===");
    console.log("Creating new temporary incident");
    
    // Create a temporary local incident to immediately open the editor
    const tempIncident = {
      id: 'temp-' + Date.now(),
      callType: 'New Incident',
      location: 'Enter address...',
      assignedUnits: [],
      comments: [],
      actionLog: [],
      status: 'ACTIVE', // Make sure status is set
      creationTime: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    console.log("Temporary incident created:", tempIncident);
    
    // Set selected incident and open editor first
    console.log("Setting selected incident and opening editor");
    setSelectedIncident(tempIncident);
    setShowIncidentEditor(true);
    
    // Then send the request to create on the server
    console.log("Sending createIncident request to server");
    const success = sendSocketMessage({
      type: 'createIncident',
      callType: 'New Incident',
      location: 'Enter address...'
    });
    
    if (!success) {
      console.error("Failed to send createIncident message - WebSocket not connected");
      alert("WebSocket not connected. Please try again in a moment.");
    } else {
      console.log("createIncident message sent successfully");
    }
    
    console.log("=== NEW INCIDENT FLOW INITIALIZED ===");
  };

  // Function to reset the system
  const resetSystem = () => {
    const success = sendSocketMessage({
      type: 'resetAll'
    });
    
    if (success) {
      // Clear local state
      setUnits([]);
      setIncidents([]);
      setSelectedUnit(null);
      setSelectedIncident(null);
      setShowUnitEditor(false);
      setShowIncidentEditor(false);
      
      // Show confirmation to user
      alert('System reset successfully. All units and incidents have been removed.');
    } else {
      alert('Failed to reset system. Please try again when connected.');
    }
  };
  
  // Function to get the latest incident data
  const getLatestIncidentData = (incidentId) => {
    return incidents.find(inc => inc.id === incidentId);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>CARS CAD System</h1>
        <div className="header-controls">
          <UserDropdown 
            users={users}
            selectedUser={selectedUser}
            onSelectUser={handleUserSelect}  // Use the new handler here
            onAddNewUser={() => setShowUserModal(true)}
            isConnected={isConnected}
          />
          <div className="connection-status">
            {isConnected ? 
              <span className="status-connected">Connected</span> : 
              <span className="status-disconnected">Disconnected</span>
            }
          </div>
        </div>
      </header>
      <DndProvider backend={HTML5Backend}>
        <main className="app-main">
          <div className="column units-column">
            <div className="column-header">
              <h2>Units</h2>
              <button 
                className="add-button" 
                onClick={() => createNewUnit()}
                disabled={!isConnected}
              >
                + Add Unit
              </button>
            </div>
            <UnitList 
              units={units} 
              incidents={incidents} 
              onUnitClick={handleUnitClick} 
              isConnected={isConnected}
            />
          </div>
          <div className="column incidents-column">
            <div className="column-header">
              <h2>Active Incidents</h2>
              <button 
                className="add-button" 
                onClick={() => createNewIncident()}
                disabled={!isConnected}
              >
                + Add Incident
              </button>
            </div>
            <IncidentList 
              incidents={incidents} 
              units={units} 
              onIncidentClick={handleIncidentClick}
              isConnected={isConnected}
              socket={socket}
              assignUnitToIncident={assignUnitToIncident}
            />
          </div>
        </main>
      </DndProvider>
      
      {/* Admin controls for system reset */}
      <div className="admin-controls">
        <button 
          className="view-cleared-button"
          onClick={() => setShowClearedIncidents(true)}
          disabled={!isConnected}
        >
          View Cleared Incidents
        </button>
        <button 
          className="reset-button"
          onClick={() => {
            if (window.confirm('WARNING: This will delete ALL units and incidents. This action cannot be undone. Are you sure you want to reset the system?')) {
              if (window.confirm('FINAL WARNING: All data will be permanently deleted. Proceed?')) {
                resetSystem();
              }
            }
          }}
          disabled={!isConnected}
        >
          Reset System
        </button>
      </div>

      {showUserModal && (
        <NewUserModal 
          onClose={() => setShowUserModal(false)}
          onSave={createNewUser}
          isConnected={isConnected}
        />
      )}
      
      {showUnitEditor && selectedUnit && (
        <UnitEditor 
          unit={selectedUnit}
          units={units}
          onSave={updateUnit}
          onCancel={() => setShowUnitEditor(false)}
          onDelete={handleDeleteUnit}
          isConnected={isConnected}
          socket={socket}
        />
      )}
      
      {showIncidentEditor && selectedIncident && (
        <IncidentEditor 
          incident={selectedIncident}
          units={units}
          onSave={updateIncident}
          onCancel={() => setShowIncidentEditor(false)}
          onDelete={handleDeleteIncident}
          isConnected={isConnected}
          socket={socket}
          toggleUnitAssignment={toggleUnitAssignment}
          selectedUser={selectedUser} // Pass the selected user
        />
      )}

      {showClearedIncidents && (
        <ClearedIncidentsList 
          incidents={incidents}
          onReopen={reopenIncident}
          onClose={() => setShowClearedIncidents(false)}
        />
      )}
    </div>
  );
}


// Add this new component
function UserDropdown({ users, selectedUser, onSelectUser, onAddNewUser, isConnected }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleDropdown = () => {
    if (isConnected) {
      setIsOpen(!isOpen);
    }
  };
  
  const handleSelectUser = (user) => {
    onSelectUser(user);
    setIsOpen(false);
  };
  
  const handleAddNew = () => {
    onAddNewUser();
    setIsOpen(false);
  };
  
  return (
    <div className="user-dropdown">
      <div 
        className="user-dropdown-header"
        onClick={toggleDropdown}
      >
        <span className="user-icon">👤</span>
        <span className="user-name">
          {selectedUser ? selectedUser.username : 'Select User'}
        </span>
        <span className="dropdown-arrow">▼</span>
      </div>
      
      {isOpen && (
        <div className="user-dropdown-menu">
          {users.map(user => (
            <div 
              key={user.id}
              className={`user-dropdown-item ${selectedUser && selectedUser.id === user.id ? 'selected' : ''}`}
              onClick={() => handleSelectUser(user)}
            >
              {user.firstName} {user.lastName} ({user.username})
            </div>
          ))}
          <div className="user-dropdown-divider"></div>
          <div 
            className="user-dropdown-item add-new"
            onClick={handleAddNew}
          >
            + Add new...
          </div>
        </div>
      )}
    </div>
  );
}


// Add this new component
function NewUserModal({ onClose, onSave, isConnected }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errors, setErrors] = useState({});
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Reset errors
    const newErrors = {};
    
    // Validate fields
    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Call the save function
    onSave(firstName, lastName);
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>Add New User</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>First Name:</label>
            <input 
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={errors.firstName ? 'input-error' : ''}
              disabled={!isConnected}
            />
            {errors.firstName && <div className="error-message">{errors.firstName}</div>}
          </div>
          
          <div className="form-group">
            <label>Last Name:</label>
            <input 
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={errors.lastName ? 'input-error' : ''}
              disabled={!isConnected}
            />
            {errors.lastName && <div className="error-message">{errors.lastName}</div>}
          </div>
          
          <div className="form-group">
            <label>Username (generated):</label>
            <input 
              type="text"
              value={firstName && lastName ? firstName.charAt(0) + lastName : ''}
              disabled={true}
              className="input-disabled"
            />
            <div className="help-text">Username will be created automatically</div>
          </div>
          
          <div className="form-actions">
            <button 
              type="submit" 
              className="save-button"
              disabled={!isConnected}
            >
              Create User
            </button>
            <button 
              type="button" 
              className="cancel-button" 
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


// Helper function to format status values for display
function formatStatus(status) {
  if (!status) return 'Unknown';
  
  // Convert from UPPER_CASE to "Title Case"
  return status
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// DraggableUnit Component
function DraggableUnit({ unit, incidents, onClick, isConnected }) {
  const incidentDetails = unit.assignedIncident ? 
    incidents.find(inc => inc.id === unit.assignedIncident) : null;
  
  // Added dependency array to ensure the drag hook updates when unit changes
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'UNIT',
    item: { unitId: unit.id, unitData: unit },
    canDrag: () => isConnected && !unit.assignedIncident, // Only allow dragging if connected and unit is not already assigned
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }), [unit, isConnected]); // This dependency array is critical
  
  return (
    <div 
      ref={drag}
      className={`unit-item status-${unit.status.toLowerCase()} ${isDragging ? 'dragging' : ''}`}
      onClick={onClick}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      data-assigned={unit.assignedIncident ? "true" : "false"} // Add this for styling
    >
      <div className="unit-header">
        <div className="unit-name">{unit.name}</div>
        <div className="unit-status">{formatStatus(unit.status)}</div>
      </div>
      {incidentDetails && (
        <div className="unit-assignment">
          {incidentDetails.callType} - {incidentDetails.location}
        </div>
      )}
    </div>
  );
}

// UnitList Component
function UnitList({ units, incidents, onUnitClick, isConnected }) {
  // Filter out any temporary units that haven't been saved
  const filteredUnits = units.filter(unit => !unit.id.startsWith('temp-') && !unit.isNew);
  
  // Remove any duplicates (keeping the last occurrence)
  const uniqueUnits = filteredUnits.reduce((acc, unit) => {
    acc[unit.id] = unit;
    return acc;
  }, {});
  
  // Convert back to array and sort by name
  // In UnitList, ensure displayUnits is recalculated on every render
const displayUnits = React.useMemo(() => {
  const filteredUnits = units.filter(unit => !unit.id.startsWith('temp-') && !unit.isNew);
  
  // Remove any duplicates (keeping the last occurrence)
  const uniqueUnits = filteredUnits.reduce((acc, unit) => {
    acc[unit.id] = unit;
    return acc;
  }, {});
  
  // Convert back to array and sort by name
  return Object.values(uniqueUnits).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
}, [units]); // Dependency array ensures recalculation when units change

  return (
    <div className="unit-list">
      {displayUnits.length > 0 ? (
        displayUnits.map(unit => (
          <DraggableUnit
            key={unit.id}
            unit={unit}
            incidents={incidents}
            onClick={() => onUnitClick(unit)}
            isConnected={isConnected}
          />
        ))
      ) : (
        <div className="no-units-message">No units available. Click "Add Unit" to create one.</div>
      )}
    </div>
  );
}

// DroppableIncident Component

function DroppableIncident({ incident, units, onClick, isConnected, socket, assignUnitToIncident }) {
  const assignedUnits = units.filter(unit => 
    incident.assignedUnits && incident.assignedUnits.includes(unit.id)
  );
  
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'UNIT',
    canDrop: () => isConnected && incident.status === 'ACTIVE',
    drop: (item) => {
      // Call the direct assignment function
      assignUnitToIncident(item.unitId, incident.id);
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
      canDrop: !!monitor.canDrop(),
    }),
  }), [isConnected, incident, assignUnitToIncident]); // Add dependencies
  
  return (
    <div 
      ref={drop}
      className={`incident-item ${isOver && canDrop ? 'drop-hover' : ''}`}
      onClick={onClick}
    >
      <div className="incident-header">
        <span className="incident-type">{incident.callType}</span>
      </div>
      <div className="incident-location">{incident.location}</div>
      
      <div className="incident-units-container">
        {assignedUnits.length > 0 ? (
          <>
            <div className="incident-units-label">Assigned Units:</div>
            <div className="incident-units-list">
              {assignedUnits.map(unit => (
                <span 
                  key={unit.id} 
                  className={`incident-unit-tag status-${unit.status.toLowerCase()}`}
                >
                  {unit.name}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="incident-units-label">No units assigned</div>
        )}
      </div>
      
      <div className="incident-time">
        Created: {new Date(incident.creationTime).toLocaleString()}
      </div>
    </div>
  );
}

// IncidentList Component
function IncidentList({ incidents, units, onIncidentClick, isConnected, socket, assignUnitToIncident }) {
  // Filter out any temporary incidents and inactive incidents
  const filteredIncidents = incidents.filter(incident => {
    // Check for temp incidents
    if (incident.id && incident.id.startsWith('temp-')) {
      return false;
    }
    
    // Check for inactive incidents
    if (incident.status === 'INACTIVE') {
      return false;
    }
    
    return true;
  });
  
  // Remove any duplicates (keeping the last occurrence)
  const uniqueIncidents = filteredIncidents.reduce((acc, incident) => {
    acc[incident.id] = incident;
    return acc;
  }, {});
  
  // Convert back to array and sort by creation time (newest first)
  const displayIncidents = Object.values(uniqueIncidents).sort((a, b) => 
    new Date(b.creationTime) - new Date(a.creationTime)
  );
  
  return (
    <div className="incident-list">
      {displayIncidents.length > 0 ? (
        displayIncidents.map(incident => (
          <DroppableIncident
            key={incident.id}
            incident={incident}
            units={units}
            onClick={() => onIncidentClick(incident)}
            isConnected={isConnected}
            socket={socket}
            assignUnitToIncident={assignUnitToIncident}
          />
        ))
      ) : (
        <div className="no-incidents-message">No active incidents. Click "Add Incident" to create one.</div>
      )}
    </div>
  );
}

// ClearedIncidentsList component
function ClearedIncidentsList({ incidents, onReopen, onClose }) {
  // Filter to show only inactive incidents
  const clearedIncidents = incidents.filter(incident => 
    incident.status === 'INACTIVE' && !incident.id.startsWith('temp-')
  );
  
  // Sort by last updated time (most recent first)
  const sortedIncidents = [...clearedIncidents].sort((a, b) => 
    new Date(b.lastUpdated) - new Date(a.lastUpdated)
  );
  
  return (
    <div className="modal-overlay">
      <div className="modal cleared-incidents-modal">
        <div className="modal-header">
          <h3>Cleared Incidents</h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        <div className="cleared-incidents-list">
          {sortedIncidents.length > 0 ? (
            sortedIncidents.map(incident => (
              <div key={incident.id} className="cleared-incident-item">
                <div className="cleared-incident-details">
                  <div className="cleared-incident-type">{incident.callType}</div>
                  <div className="cleared-incident-location">{incident.location}</div>
                  <div className="cleared-incident-time">
                    Cleared: {new Date(incident.lastUpdated).toLocaleString()}
                  </div>
                </div>
                <button 
                  className="reopen-button"
                  onClick={() => onReopen(incident.id)}
                >
                  Reopen Call
                </button>
              </div>
            ))
          ) : (
            <div className="no-cleared-incidents">
              No cleared incidents available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// UnitEditor Component
function UnitEditor({ unit, units, onSave, onCancel, onDelete, isConnected, socket }) {
  const [editedUnit, setEditedUnit] = useState({ ...unit });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [nameError, setNameError] = useState('');
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedUnit(prev => ({ ...prev, [name]: value }));
    
    // Clear error when name is changed
    if (name === 'name') {
      setNameError('');
    }
  };
  
  const handlePersonnelChange = (e) => {
    const personnel = e.target.value.split(',').map(p => p.trim());
    setEditedUnit(prev => ({ ...prev, personnel }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate name is not empty
    if (!editedUnit.name.trim()) {
      setNameError('Unit name cannot be empty.');
      return;
    }
    
    // Check if name is already taken by another unit
    const nameExists = units.some(
      existingUnit => 
        existingUnit.name.toLowerCase() === editedUnit.name.toLowerCase() && 
        existingUnit.id !== unit.id
    );
    
    if (nameExists) {
      setNameError('Unit name already exists. Please choose a different name.');
      return;
    }
    
    const updatedUnit = {
      ...editedUnit,
      lastUpdated: new Date().toISOString()
    };
    
    // If it's a new unit, we're creating it for the first time
    if (unit.isNew) {
      delete updatedUnit.isNew; // Remove the temp flag
      // Use 'createUnit' type instead of 'updateUnit'
      if (isConnected) {
        socket.send(JSON.stringify({
          type: 'createUnit',
          name: updatedUnit.name,
          status: updatedUnit.status,
          personnel: updatedUnit.personnel
        }));
      }
    } else {
      // Normal update for existing unit
      onSave(updatedUnit);
    }
    
    // Close the modal
    onCancel();
  };
  
  const confirmDelete = () => {
    setShowDeleteConfirm(true);
  };
  
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };
  
  const handleDelete = () => {
    // Only try to delete from server if it's not a new unit
    if (!unit.isNew) {
      onDelete(unit.id);
    }
    onCancel();
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>{unit.isNew ? 'Add New Unit' : 'Edit Unit'}</h3>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        {showDeleteConfirm ? (
          <div className="delete-confirmation">
            <h4>Are you sure you want to delete this unit?</h4>
            <p>This action cannot be undone.</p>
            <div className="confirmation-actions">
              <button className="delete-confirm-button" onClick={handleDelete}>
                Yes, Delete Unit
              </button>
              <button className="cancel-button" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Unit Name:</label>
              <input 
                type="text" 
                name="name" 
                value={editedUnit.name} 
                onChange={handleChange} 
                required 
                className={nameError ? 'input-error' : ''}
              />
              {nameError && <div className="error-message">{nameError}</div>}
            </div>
            
            <div className="form-group">
              <label>Status:</label>
              <select 
                name="status" 
                value={editedUnit.status} 
                onChange={handleChange}
                disabled={!isConnected}
              >
                <option value="IN_SERVICE">In Service</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="EN_ROUTE">En Route</option>
                <option value="STAGED">Staged</option>
                <option value="ON_SCENE">On Scene</option>
                <option value="TO_CARE_CENTER">To Care Center</option>
                <option value="AT_CARE_CENTER">At Care Center</option>
                <option value="TO_HOSPITAL">To Hospital</option>
                <option value="AT_HOSPITAL">At Hospital</option>
                <option value="NOT_AVAILABLE">Not Available</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Personnel (comma separated):</label>
              <input 
                type="text" 
                name="personnel" 
                value={editedUnit.personnel.join(', ')} 
                onChange={handlePersonnelChange} 
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="save-button" disabled={!isConnected}>
                {unit.isNew ? 'Create Unit' : 'Save Changes'}
              </button>
              {!unit.isNew && (
                <button type="button" className="delete-button" onClick={confirmDelete} disabled={!isConnected}>
                  Delete Unit
                </button>
              )}
              <button type="button" className="cancel-button" onClick={onCancel}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// IncidentEditor Component
function IncidentEditor({ incident, units, onSave, onCancel, onDelete, isConnected, socket, toggleUnitAssignment, selectedUser }) {
  console.log("=== INCIDENT EDITOR INITIALIZED ===");
  console.log("Received incident:", incident);
  console.log("Incident ID:", incident.id);
  console.log("Call Type:", incident.callType);
  console.log("Location:", incident.location);
  console.log("Is temporary:", incident.id.startsWith('temp-'));
  
  const [editedIncident, setEditedIncident] = useState({ ...incident });
  const [newComment, setNewComment] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [showUnitStatusModal, setShowUnitStatusModal] = useState(false);
  
  // Filter out any temporary units
  const availableUnits = units.filter(unit => !unit.id.startsWith('temp-') && !unit.isNew);

  // Sort units by name
  const sortedUnits = [...availableUnits].sort((a, b) => a.name.localeCompare(b.name));
  
  // Get currently assigned units
  const assignedUnits = sortedUnits.filter(unit => 
    editedIncident.assignedUnits && editedIncident.assignedUnits.includes(unit.id)
  );
  
  // Get unassigned units
  const unassignedUnits = sortedUnits.filter(unit => 
    !editedIncident.assignedUnits || !editedIncident.assignedUnits.includes(unit.id)
  );
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Field changed: ${name}, New value: ${value}`);
    
    setEditedIncident(prev => {
      const updated = { ...prev, [name]: value };
      console.log(`Updated incident state:`, updated);
      return updated;
    });
  };
  
  const addComment = () => {
    if (!newComment.trim() || !selectedUser) return;
    
    const comment = {
      text: newComment,
      timestamp: new Date().toISOString(),
      author: `${selectedUser.firstName} ${selectedUser.lastName}`,
      username: selectedUser.username
    };
    
    setEditedIncident(prev => ({
      ...prev,
      comments: [...(prev.comments || []), comment],
      actionLog: [...(prev.actionLog || []), {
        action: 'COMMENT_ADDED',
        timestamp: new Date().toISOString(),
        details: `Comment added by ${selectedUser.username}: "${newComment.substring(0, 20)}${newComment.length > 20 ? '...' : ''}"`
      }]
    }));
    
    setNewComment('');
  };
  
  // Modified handleUnitToggle function to update local state with log entries
  const handleUnitToggle = (unitId) => {
    const isAssigned = editedIncident.assignedUnits && editedIncident.assignedUnits.includes(unitId);
    const unit = units.find(u => u.id === unitId);
    
    if (!unit) return;
    
    // First update the local state to show immediate changes in the UI
    setEditedIncident(prev => {
      // Create new assigned units array
      let newAssignedUnits;
      if (isAssigned) {
        // Remove unit
        newAssignedUnits = prev.assignedUnits.filter(id => id !== unitId);
      } else {
        // Add unit
        newAssignedUnits = [...(prev.assignedUnits || []), unitId];
      }
      
      // Create a new action log entry
      const newLogEntry = {
        action: isAssigned ? 'UNIT_REMOVED' : 'UNIT_ASSIGNED',
        timestamp: new Date().toISOString(),
        details: `Unit ${unit.name} ${isAssigned ? 'removed from' : 'assigned to'} incident`
      };
      
      // Return updated incident state with new units array and log entry
      return {
        ...prev,
        assignedUnits: newAssignedUnits,
        actionLog: [...(prev.actionLog || []), newLogEntry]
      };
    });
    
    // Then call the shared function to update server state
    toggleUnitAssignment(unitId, editedIncident.id, !isAssigned);
  };
  
  const openUnitStatusModal = (unitId) => {
    setSelectedUnitId(unitId);
    setShowUnitStatusModal(true);
  };
  
  const closeUnitStatusModal = () => {
    setSelectedUnitId(null);
    setShowUnitStatusModal(false);
  };
  
  const updateUnitStatus = (newStatus) => {
    if (!selectedUnitId || !socket || !isConnected) return;
    
    const unitToUpdate = units.find(unit => unit.id === selectedUnitId);
    if (!unitToUpdate) return;
    
    // First update the local state with the action log entry
    setEditedIncident(prev => ({
      ...prev,
      actionLog: [...(prev.actionLog || []), {
        action: 'UNIT_STATUS_CHANGED',
        timestamp: new Date().toISOString(),
        details: `Unit ${unitToUpdate.name} status changed to ${formatStatus(newStatus)}`
      }]
    }));
    
    // Then send the update to the server
    socket.send(JSON.stringify({
      type: 'unitUpdate',
      unit: {
        ...unitToUpdate,
        status: newStatus,
        lastUpdated: new Date().toISOString()
      }
    }));
    
    closeUnitStatusModal();
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("=== FORM SUBMITTED ===");
    
    console.log("Current edited incident state:", editedIncident);
    console.log("Call Type:", editedIncident.callType);
    console.log("Location:", editedIncident.location);
    console.log("Is temporary:", editedIncident.id.startsWith('temp-'));
    
    // Check for empty fields
    if (!editedIncident.callType.trim()) {
      console.error("Call Type is empty!");
      alert("Call Type cannot be empty");
      return;
    }
    
    if (!editedIncident.location.trim()) {
      console.error("Location is empty!");
      alert("Location cannot be empty");
      return;
    }
    
    const updatedIncident = {
      ...editedIncident,
      lastUpdated: new Date().toISOString()
    };
    
    // Make sure it has a status
    if (!updatedIncident.status) {
      updatedIncident.status = 'ACTIVE';
      console.log("Added missing status field: ACTIVE");
    }
    
    // Add action log entry for the update
    if (!updatedIncident.actionLog) {
      updatedIncident.actionLog = [];
      console.log("Created missing actionLog array");
    }
    
    updatedIncident.actionLog.push({
      action: 'INCIDENT_UPDATED',
      timestamp: new Date().toISOString(),
      details: 'Incident details updated'
    });
    
    console.log("Sending updated incident to server:", updatedIncident);
    
    // Call the parent component's onSave function
    onSave(updatedIncident);
    
    console.log("=== FORM SUBMISSION COMPLETE ===");
  };
  
  const confirmDelete = () => {
    setShowDeleteConfirm(true);
  };
  
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };
  
  const handleDelete = () => {
    onDelete(incident.id);
    onCancel();
  };
  
  // Clear incident function
  const clearIncident = () => {
    if (window.confirm('Are you sure you want to clear this incident? This will unassign all units and mark the incident as inactive.')) {
      if (socket && isConnected) {
        console.log(`Clearing incident: ${incident.id}`);
        console.log(`Current incident status: ${incident.status}`);
        console.log(`Assigned units: ${incident.assignedUnits ? incident.assignedUnits.join(', ') : 'none'}`);
        
        // Send the clear command to server
        const message = {
          type: 'clearIncident',
          incidentId: incident.id
        };
        
        console.log('Sending message to server:', message);
        socket.send(JSON.stringify(message));
        
        console.log(`Sent clearIncident for incident ${incident.id}`);
        
        // Close the modal
        onCancel();
      } else {
        alert('Unable to clear incident. Please check your connection.');
        console.error('Socket not connected. isConnected:', isConnected);
      }
    }
  };
  
  return (
    <div className="modal-overlay">
      <div className="modal incident-modal">
        <div className="modal-header">
          <h3>Edit Incident</h3>
          <button className="close-button" onClick={onCancel}>×</button>
        </div>
        {showDeleteConfirm ? (
          <div className="delete-confirmation">
            <h4>Are you sure you want to delete this incident?</h4>
            <p>This action cannot be undone.</p>
            <div className="confirmation-actions">
              <button className="delete-confirm-button" onClick={handleDelete}>
                Yes, Delete Incident
              </button>
              <button className="cancel-button" onClick={cancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        ) : showUnitStatusModal && selectedUnitId ? (
          <div className="unit-status-modal">
            <h4>Update Unit Status</h4>
            <p>Select new status for {units.find(u => u.id === selectedUnitId)?.name || 'Unit'}</p>
            <div className="status-buttons">
              <button onClick={() => updateUnitStatus('IN_SERVICE')} className="status-btn status-in_service">In Service</button>
              <button onClick={() => updateUnitStatus('DISPATCHED')} className="status-btn status-dispatched">Dispatched</button>
              <button onClick={() => updateUnitStatus('EN_ROUTE')} className="status-btn status-en_route">En Route</button>
              <button onClick={() => updateUnitStatus('STAGED')} className="status-btn status-staged">Staged</button>
              <button onClick={() => updateUnitStatus('ON_SCENE')} className="status-btn status-on_scene">On Scene</button>
              <button onClick={() => updateUnitStatus('TO_CARE_CENTER')} className="status-btn status-to_care_center">To Care Center</button>
              <button onClick={() => updateUnitStatus('AT_CARE_CENTER')} className="status-btn status-at_care_center">At Care Center</button>
              <button onClick={() => updateUnitStatus('TO_HOSPITAL')} className="status-btn status-to_hospital">To Hospital</button>
              <button onClick={() => updateUnitStatus('AT_HOSPITAL')} className="status-btn status-at_hospital">At Hospital</button>
              <button onClick={() => updateUnitStatus('NOT_AVAILABLE')} className="status-btn status-not_available">Not Available</button>
            </div>
            <div className="status-modal-actions">
              <button onClick={closeUnitStatusModal} className="cancel-button">Cancel</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group form-row">
              <div>
                <label>Call Type:</label>
                <input 
                  type="text" 
                  name="callType" 
                  value={editedIncident.callType} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div>
                <label>Location:</label>
                <input 
                  type="text" 
                  name="location" 
                  value={editedIncident.location} 
                  onChange={handleChange} 
                  required 
                />
              </div>
            </div>
            
            <div className="form-group">
              <label>Units:</label>
              <div className="units-container">
                <div className="units-column">
                  <h4>Available Units:</h4>
                  {unassignedUnits.length > 0 ? (
                    <div className="unassigned-units-list">
                      {unassignedUnits.map(unit => (
                        <div key={unit.id} className="unit-list-item">
                          <div className="unit-info">
                            <span className="unit-name">{unit.name}</span>
                            <span className={`unit-status status-${unit.status.toLowerCase()}`}>
                              {formatStatus(unit.status)}
                            </span>
                          </div>
                          <button 
                            type="button"
                            className="add-unit-button"
                            onClick={() => handleUnitToggle(unit.id)}
                            disabled={!isConnected}
                          >
                            Assign
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-units-message">No additional units available.</p>
                  )}
                </div>
                
                <div className="units-column">
                  <h4>Assigned Units:</h4>
                  {assignedUnits.length > 0 ? (
                    <div className="assigned-units-list">
                      {assignedUnits.map(unit => (
                        <div key={unit.id} className="unit-list-item">
                          <div 
                            className="unit-info clickable" 
                            onClick={() => openUnitStatusModal(unit.id)}
                          >
                            <span className="unit-name">{unit.name}</span>
                            <span className={`unit-status status-${unit.status.toLowerCase()}`}>
                              {formatStatus(unit.status)}
                            </span>
                            <span className="unit-status-tip">(Click to change status)</span>
                          </div>
                          <button 
                            type="button"
                            className="remove-unit-button"
                            onClick={() => handleUnitToggle(unit.id)}
                            disabled={!isConnected}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="no-units-message">No units currently assigned to this incident.</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="form-group">
              <label>Comments:</label>
              <div className="comments-container">
                {editedIncident.comments && editedIncident.comments.length > 0 ? (
                  // Create a copy of the array, then reverse it to show newest first
                  [...editedIncident.comments]
                    .reverse()
                    .map((comment, index) => (
                      <div key={index} className="comment">
                        <div className="comment-header">
                          <span className="comment-author">
                            {comment.author} 
                            {comment.username && ` (${comment.username})`}
                          </span>
                          <span className="comment-time">
                            {new Date(comment.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="comment-text">{comment.text}</div>
                      </div>
                    ))
                ) : (
                  <p className="no-comments-message">No comments yet.</p>
                )}
              </div>
              <div className="add-comment">
                <textarea 
                  value={newComment} 
                  onChange={(e) => setNewComment(e.target.value)} 
                  placeholder="Add a new comment..." 
                />
                <button type="button" onClick={addComment} disabled={!isConnected}>Add Comment</button>
              </div>
            </div>
            
            <div className="form-group">
              <label>Action Log:</label>
              <div className="action-log">
                {editedIncident.actionLog && editedIncident.actionLog.length > 0 ? (
                  // Create a copy of the array, then reverse it to show newest first
                  [...editedIncident.actionLog]
                    .reverse()
                    .map((log, index) => (
                      <div key={index} className="log-entry">
                        <span className="log-time">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        <span className="log-action">{log.action}</span>
                        <span className="log-details">{log.details}</span>
                      </div>
                    ))
                ) : (
                  <p className="no-logs-message">No action logs yet.</p>
                )}
              </div>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="save-button" disabled={!isConnected}>Save Changes</button>
              <button 
                type="button" 
                className="clear-button" 
                onClick={clearIncident} 
                disabled={!isConnected}
              >
                Clear Incident
              </button>
              <button type="button" className="delete-button" onClick={confirmDelete} disabled={!isConnected}>Delete Incident</button>
              <button type="button" className="cancel-button" onClick={onCancel}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}