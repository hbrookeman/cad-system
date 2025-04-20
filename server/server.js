// server.js
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs/promises');
const path = require('path');

// Data paths
const UNITS_PATH = path.join(__dirname, 'data', 'units.json');
const INCIDENTS_PATH = path.join(__dirname, 'data', 'incidents.json');
const USERS_PATH = path.join(__dirname, 'data', 'users.json');

// In-memory data store (will be persisted to JSON files)
let units = [];
let incidents = [];

// Create WebSocket server
const wss = new WebSocket.Server({ 
    host: '0.0.0.0',
    port: 8080
});

// Initialize data
async function initializeData() {
  try {
    // Create data directory if it doesn't exist
    await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
    
    // Try to load existing units
    try {
      const unitsData = await fs.readFile(UNITS_PATH, 'utf8');
      units = JSON.parse(unitsData);
      console.log(`Loaded ${units.length} units from storage`);
    } catch (err) {
      console.log('No existing units found, starting with empty units list');
      // Create sample units if none exist
      units = [
        {
          id: uuidv4(),
          name: 'Engine 1',
          status: 'AVAILABLE',
          assignedIncident: null,
          personnel: ['Capt. Johnson', 'FF Smith', 'FF Davis'],
          lastUpdated: new Date().toISOString()
        },
        {
          id: uuidv4(),
          name: 'Medic 3',
          status: 'AVAILABLE',
          assignedIncident: null,
          personnel: ['Paramedic Jones', 'EMT Brown'],
          lastUpdated: new Date().toISOString()
        }
      ];
      await persistUnits();
    }
    
    // Try to load existing incidents
    try {
      const incidentsData = await fs.readFile(INCIDENTS_PATH, 'utf8');
      incidents = JSON.parse(incidentsData);
      console.log(`Loaded ${incidents.length} incidents from storage`);
    } catch (err) {
      console.log('No existing incidents found, starting with empty incidents list');
      // Create a sample incident if none exist
      incidents = [
        {
          id: uuidv4(),
          callType: 'Structure Fire',
          location: '123 Main St',
          assignedUnits: [],
          comments: [
            {
              text: 'Initial report of smoke coming from 2nd floor',
              timestamp: new Date().toISOString(),
              author: 'Dispatch'
            }
          ],
          status: 'ACTIVE',
          actionLog: [
            {
              action: 'INCIDENT_CREATED',
              timestamp: new Date().toISOString(),
              details: 'Incident created by system'
            }
          ],
          creationTime: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        }
      ];
      await persistIncidents();
    }

    try {
          const usersData = await fs.readFile(USERS_PATH, 'utf8');
          users = JSON.parse(usersData);
          console.log(`Loaded ${users.length} users from storage`);
    } catch (err) {
      console.log('No existing users found, starting with empty users list');
      // Create sample users if none exist
      users = [
        {
          id: uuidv4(),
          firstName: 'System',
          lastName: 'Administrator',
          username: 'SAdministrator',
          createdAt: new Date().toISOString()
        }
      ];
      await persistUsers();
    }

  } catch (err) {
    console.error('Error initializing data:', err);
  }
  
  // In the initializeData function of server.js, add this after loading incidents

	try {
	  const incidentsData = await fs.readFile(INCIDENTS_PATH, 'utf8');
	  incidents = JSON.parse(incidentsData);
	  
	  // Add status field to any incidents that don't have it
	  let needsUpdate = false;
	  incidents.forEach(incident => {
		if (incident.status === undefined) {
		  console.log(`Setting default ACTIVE status for incident ${incident.id}`);
		  incident.status = 'ACTIVE';
		  needsUpdate = true;
		}
	  });
	  
	  // Save incidents if we updated any
	  if (needsUpdate) {
		await persistIncidents();
	  }
	  
	  console.log(`Loaded ${incidents.length} incidents from storage`);
	} catch (err) {
	  console.log('No existing incidents found, starting with empty incidents list');
	  // Create a sample incident if none exist
	  incidents = [
		{
		  id: uuidv4(),
		  callType: 'Structure Fire',
		  location: '123 Main St',
		  status: 'ACTIVE', // Make sure to add status field here
		  assignedUnits: [],
		  comments: [
			{
			  text: 'Initial report of smoke coming from 2nd floor',
			  timestamp: new Date().toISOString(),
			  author: 'Dispatch'
			}
		  ],
		  actionLog: [
			{
			  action: 'INCIDENT_CREATED',
			  timestamp: new Date().toISOString(),
			  details: 'Incident created by system'
			}
		  ],
		  creationTime: new Date().toISOString(),
		  lastUpdated: new Date().toISOString()
		}
	  ];
	  await persistIncidents();
	}
  
}

// Persist units to file
async function persistUnits() {
  try {
    await fs.writeFile(UNITS_PATH, JSON.stringify(units, null, 2));
  } catch (err) {
    console.error('Error saving units:', err);
  }
}

// Persist incidents to file
async function persistIncidents() {
  try {
    await fs.writeFile(INCIDENTS_PATH, JSON.stringify(incidents, null, 2));
  } catch (err) {
    console.error('Error saving incidents:', err);
  }
}

async function persistUsers() {
  try {
    await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error saving users:', err);
  }
}

// Broadcast data to all connected clients
function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// WebSocket connection handler
// Update your message handler in the WebSocket connection handler with these enhancements

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send initial data to the newly connected client
  ws.send(JSON.stringify({ type: 'units', units }));
  ws.send(JSON.stringify({ type: 'incidents', incidents }));
  ws.send(JSON.stringify({ type: 'users', users }));
  
  // Message handler
  ws.on('message', async (message) => {
    try {
      console.log("=== RECEIVED WEBSOCKET MESSAGE ===");
      const data = JSON.parse(message);
      console.log("Message type:", data.type);
      
      // For specific message types, print details
      if (data.type === 'createIncident') {
        console.log("Create incident details:", {
          callType: data.callType,
          location: data.location
        });
      } else if (data.type === 'incidentUpdate') {
        console.log("Incident update details:", {
          id: data.incident?.id,
          callType: data.incident?.callType,
          location: data.incident?.location,
          isTemp: data.incident?.id?.startsWith('temp-')
        });
      }
      
      switch (data.type) {
        // Your existing switch cases here...

        case 'getUsers':
            // Send the current users list to the client
            ws.send(JSON.stringify({
              type: 'users',
              users
            }));
          break;
            
        case 'createUser':
          // Validate required fields
          if (!data.firstName || !data.lastName) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'First name and last name are required'
            }));
            break;
          }
          
          // Generate username (first initial + last name)
          let firstName = data.firstName.trim();
          let lastName = data.lastName.trim();
          let username = firstName.charAt(0) + lastName;
          
          // Check if username already exists, if so add a number
          let counter = 1;
          let baseUsername = username;
          while (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
            username = baseUsername + counter;
            counter++;
          }
          
          // Create the new user
          const newUser = {
            id: uuidv4(),
            firstName,
            lastName, 
            username,
            createdAt: new Date().toISOString()
          };
          
          // Add to users array
          users.push(newUser);
          
          // Persist to disk
          await persistUsers();
          
          // Broadcast the updated users list
          broadcast({
            type: 'users',
            users
          });
        break;

        case 'reopenIncident':
          const incidentToReopenIndex = incidents.findIndex(i => i.id === data.incidentId);
          if (incidentToReopenIndex !== -1) {
            // Set status back to ACTIVE
            incidents[incidentToReopenIndex].status = 'ACTIVE';
            incidents[incidentToReopenIndex].lastUpdated = new Date().toISOString();
            
            // Add to action log
            incidents[incidentToReopenIndex].actionLog.push({
              action: 'INCIDENT_REOPENED',
              timestamp: new Date().toISOString(),
              details: 'Incident reopened'
            });
            
            // Broadcast updated incident
            broadcast({
              type: 'incidentUpdate',
              incident: incidents[incidentToReopenIndex]
            });
            
            // Broadcast all incidents
            broadcast({
              type: 'incidents',
              incidents
            });
            
            // Persist changes
            await persistIncidents();
          }
          break;

        case 'resetAll':
          // Reset units and incidents arrays
          units = [];
          incidents = [];
          
          // Save empty arrays to files
          await persistUnits();
          await persistIncidents();
          
          // Broadcast empty lists to all clients
          broadcast({
            type: 'units',
            units
          });
          broadcast({
            type: 'incidents',
            incidents
          });
          
          console.log('System reset - all units and incidents cleared');
          break;
          
        case 'deleteUnit':
          // Delete the unit
          const unitToDeleteIndex = units.findIndex(u => u.id === data.unitId);
          if (unitToDeleteIndex !== -1) {
            const unitToDelete = units[unitToDeleteIndex];
            
            // Check if unit is assigned to any incident
            if (unitToDelete.assignedIncident) {
              // Update the incident to remove this unit
              const incidentIndex = incidents.findIndex(i => i.id === unitToDelete.assignedIncident);
              if (incidentIndex !== -1) {
                incidents[incidentIndex].assignedUnits = 
                  incidents[incidentIndex].assignedUnits.filter(id => id !== data.unitId);
                
                // Add to action log
                incidents[incidentIndex].actionLog.push({
                  action: 'UNIT_REMOVED',
                  timestamp: new Date().toISOString(),
                  details: `Unit ${unitToDelete.name} removed from incident (unit deleted)`
                });
                
                incidents[incidentIndex].lastUpdated = new Date().toISOString();
                
                // Broadcast incident update
                broadcast({
                  type: 'incidentUpdate',
                  incident: incidents[incidentIndex]
                });
              }
            }
            
            // Remove the unit
            units.splice(unitToDeleteIndex, 1);
            
            // Broadcast the updated units list
            broadcast({
              type: 'units',
              units
            });
            
            // Persist updated units
            await persistUnits();
          }
          break;
          
        case 'deleteIncident':
          // Delete the incident
          const incidentToDeleteIndex = incidents.findIndex(i => i.id === data.incidentId);
          if (incidentToDeleteIndex !== -1) {
            const incidentToDelete = incidents[incidentToDeleteIndex];
            
            // Update any units assigned to this incident
            incidentToDelete.assignedUnits.forEach(unitId => {
              const unitIndex = units.findIndex(u => u.id === unitId);
              if (unitIndex !== -1) {
                units[unitIndex].assignedIncident = null;
                if (units[unitIndex].status !== 'OUT_OF_SERVICE') {
                  units[unitIndex].status = 'AVAILABLE';
                }
                units[unitIndex].lastUpdated = new Date().toISOString();
                
                // Broadcast unit update
                broadcast({
                  type: 'unitUpdate',
                  unit: units[unitIndex]
                });
              }
            });
            
            // Remove the incident
            incidents.splice(incidentToDeleteIndex, 1);
            
            // Broadcast the updated incidents list
            broadcast({
              type: 'incidents',
              incidents
            });
            
            // Persist updated units and incidents
            await persistUnits();
            await persistIncidents();
          }
          break;
          
        case 'createUnit':
          // Check if a unit with this name already exists
          const unitNameExists = units.some(
            unit => unit.name.toLowerCase() === (data.name || '').toLowerCase()
          );
          
          if (unitNameExists) {
            // Generate a unique name by adding a suffix
            let counter = 1;
            let uniqueName = `${data.name} (${counter})`;
            
            while (units.some(unit => unit.name.toLowerCase() === uniqueName.toLowerCase())) {
              counter++;
              uniqueName = `${data.name} (${counter})`;
            }
            
            data.name = uniqueName;
          }
          
          // Create a new unit
          const newUnit = {
            id: uuidv4(),
            name: data.name || `Unit ${units.length + 1}`,
            status: 'IN_SERVICE',
            assignedIncident: null,
            personnel: data.personnel || [],
            lastUpdated: new Date().toISOString()
          };
          
          units.push(newUnit);
          
          // Broadcast the new unit to all clients
          broadcast({
            type: 'unitUpdate',
            unit: newUnit
          });
          
          // Broadcast updated units list
          broadcast({
            type: 'units',
            units
          });
          
          // Persist updated units
          await persistUnits();
          break;
          
        // Replace your createIncident case in server.js with this:

		case 'createIncident':
		  console.log(`Creating new incident with call type: ${data.callType}, location: ${data.location}`);
		  
		  // Create a new incident
		  const newIncident = {
			id: uuidv4(),
			callType: data.callType || 'Unknown',
			location: data.location || 'Unknown',
			assignedUnits: [],
			comments: [],
			status: 'ACTIVE', // Make sure to include status
			actionLog: [
			  {
				action: 'INCIDENT_CREATED',
				timestamp: new Date().toISOString(),
				details: 'Incident created by system'
			  }
			],
			creationTime: new Date().toISOString(),
			lastUpdated: new Date().toISOString()
		  };
		  
		  console.log(`New incident created with ID: ${newIncident.id}`);
		  
		  incidents.push(newIncident);
		  
		  // Broadcast the new incident to all clients
		  broadcast({
			type: 'incidentUpdate',
			incident: newIncident
		  });
		  
		  // Broadcast updated incidents list
		  broadcast({
			type: 'incidents',
			incidents
		  });
		  
		  // Persist updated incidents
		  await persistIncidents();
		  
		  console.log('Incident creation complete');
		  break;
          
        // Add these enhanced logging statements to your clearIncident case in server.js

		// Replace the entire clearIncident case in your server.js with this code:

		// Replace your clearIncident case with this one:

		case 'clearIncident':
		  console.log(`Received clearIncident request for incident ID: ${data.incidentId}`);
		  
		  // Find the incident by ID
		  const incidentToClearIndex = incidents.findIndex(i => i.id === data.incidentId);
		  
		  if (incidentToClearIndex !== -1) {
			console.log(`Found incident at index ${incidentToClearIndex}`);
			const incidentToClear = incidents[incidentToClearIndex];
			
			// Print before state
			console.log(`Before clearing - Incident status: ${incidentToClear.status || 'undefined'}`);
			console.log(`Before clearing - Assigned units: ${JSON.stringify(incidentToClear.assignedUnits || [])}`);
			
			// 1. Explicitly set the status to INACTIVE
			incidents[incidentToClearIndex].status = 'INACTIVE';
			incidents[incidentToClearIndex].lastUpdated = new Date().toISOString();
			
			console.log(`AFTER update - Incident status: ${incidents[incidentToClearIndex].status}`);
			
			// 2. Add to action log
			if (!incidents[incidentToClearIndex].actionLog) {
			  incidents[incidentToClearIndex].actionLog = [];
			}
			
			incidents[incidentToClearIndex].actionLog.push({
			  action: 'INCIDENT_CLEARED',
			  timestamp: new Date().toISOString(),
			  details: 'Incident marked as inactive'
			});
			
			// 3. Mark all assigned units as IN_SERVICE and unassign them
			const assignedUnitIds = [...(incidentToClear.assignedUnits || [])]; // Create a copy to avoid mutation issues
			console.log(`Units to update: ${assignedUnitIds.join(', ')}`);
			
			assignedUnitIds.forEach(unitId => {
			  const unitIndex = units.findIndex(u => u.id === unitId);
			  if (unitIndex !== -1) {
				// Update unit status and remove assignment
				units[unitIndex].assignedIncident = null;
				units[unitIndex].status = 'IN_SERVICE';
				units[unitIndex].lastUpdated = new Date().toISOString();
				
				console.log(`Updated unit ${unitId} to IN_SERVICE status`);
				
				// Broadcast unit update to all clients
				broadcast({
				  type: 'unitUpdate',
				  unit: units[unitIndex]
				});
			  }
			});
			
			// 4. Clear the assigned units array in the incident
			incidents[incidentToClearIndex].assignedUnits = [];
			
			// 5. First broadcast the specific incident update
			console.log('Broadcasting incident update with INACTIVE status');
			broadcast({
			  type: 'incidentUpdate',
			  incident: incidents[incidentToClearIndex]
			});
			
			// 6. Then broadcast the complete incidents list
			console.log('Broadcasting complete incidents list');
			console.log('Incidents statuses before broadcast:');
			incidents.forEach(inc => {
			  console.log(`- Incident ${inc.id}: status=${inc.status || 'undefined'}`);
			});
			
			broadcast({
			  type: 'incidents',
			  incidents
			});
			
			// 7. Save changes to disk
			await persistUnits();
			await persistIncidents();
			
			console.log('Incident clearing complete.');
		  } else {
			console.error(`Incident to clear not found: ${data.incidentId}`);
		  }
		  break;
          
        case 'unitUpdate':
          // Update the unit
          const unitIndex = units.findIndex(u => u.id === data.unit.id);
          if (unitIndex !== -1) {
            // Check if the name is being changed to a name that already exists
            if (data.unit.name !== units[unitIndex].name) {
              const nameExists = units.some(
                u => u.id !== data.unit.id && 
                u.name.toLowerCase() === data.unit.name.toLowerCase()
              );
              
              if (nameExists) {
                // If name exists, add a suffix to make it unique
                let counter = 1;
                let uniqueName = `${data.unit.name} (${counter})`;
                
                while (units.some(u => u.id !== data.unit.id && 
                                    u.name.toLowerCase() === uniqueName.toLowerCase())) {
                  counter++;
                  uniqueName = `${data.unit.name} (${counter})`;
                }
                
                data.unit.name = uniqueName;
              }
            }
            
            // Check if unit's assigned incident has changed
            const oldUnit = units[unitIndex];
            
            // Update unit
            units[unitIndex] = data.unit;
            
            // Handle changes in unit assignment
            if (oldUnit.assignedIncident !== data.unit.assignedIncident) {
              // If unit was unassigned from an incident
              if (oldUnit.assignedIncident) {
                const oldIncidentIndex = incidents.findIndex(i => i.id === oldUnit.assignedIncident);
                if (oldIncidentIndex !== -1) {
                  incidents[oldIncidentIndex].assignedUnits = 
                    incidents[oldIncidentIndex].assignedUnits.filter(id => id !== data.unit.id);
                  
                  // Add to action log
                  incidents[oldIncidentIndex].actionLog.push({
                    action: 'UNIT_REMOVED',
                    timestamp: new Date().toISOString(),
                    details: `Unit ${data.unit.name} removed from incident`
                  });
                  
                  incidents[oldIncidentIndex].lastUpdated = new Date().toISOString();
                  
                  // Broadcast incident update
                  broadcast({
                    type: 'incidentUpdate',
                    incident: incidents[oldIncidentIndex]
                  });
                }
              }
              
              // If unit was assigned to a new incident
              if (data.unit.assignedIncident) {
                const newIncidentIndex = incidents.findIndex(i => i.id === data.unit.assignedIncident);
                if (newIncidentIndex !== -1) {
                  if (!incidents[newIncidentIndex].assignedUnits.includes(data.unit.id)) {
                    incidents[newIncidentIndex].assignedUnits.push(data.unit.id);
                  }
                  
                  // Add to action log
                  incidents[newIncidentIndex].actionLog.push({
                    action: 'UNIT_ASSIGNED',
                    timestamp: new Date().toISOString(),
                    details: `Unit ${data.unit.name} assigned to incident`
                  });
                  
                  incidents[newIncidentIndex].lastUpdated = new Date().toISOString();
                  
                  // Broadcast incident update
                  broadcast({
                    type: 'incidentUpdate',
                    incident: incidents[newIncidentIndex]
                  });
                }
              }
            }
            
            // If status changed, log it in the incident if assigned
            if (oldUnit.status !== data.unit.status && data.unit.assignedIncident) {
              const incidentIndex = incidents.findIndex(i => i.id === data.unit.assignedIncident);
              if (incidentIndex !== -1) {
                incidents[incidentIndex].actionLog.push({
                  action: 'UNIT_STATUS_CHANGED',
                  timestamp: new Date().toISOString(),
                  details: `Unit ${data.unit.name} status changed from ${oldUnit.status} to ${data.unit.status}`
                });
                
                incidents[incidentIndex].lastUpdated = new Date().toISOString();
                
                // Broadcast incident update
                broadcast({
                  type: 'incidentUpdate',
                  incident: incidents[incidentIndex]
                });
              }
            }
            
            // Broadcast the updated unit to all clients
            broadcast({
              type: 'unitUpdate',
              unit: data.unit
            });
            
            // Persist updated units
            await persistUnits();
          } else {
            console.error('Unit not found:', data.unit.id);
          }
          break;
          
        // Replace your incidentUpdate case in server.js with this improved version:

		case 'incidentUpdate':
		  // Update the incident
		  console.log(`Received incident update for: ${data.incident.id}`);
		  console.log(`New call type: ${data.incident.callType}`);
		  console.log(`New location: ${data.incident.location}`);
		  
		  const incidentIndex = incidents.findIndex(i => i.id === data.incident.id);
		  if (incidentIndex !== -1) {
			// Log the incident before update
			const oldIncident = incidents[incidentIndex];
			console.log(`Before update - Call type: ${oldIncident.callType}, Location: ${oldIncident.location}`);
			
			// Check if assigned units have changed
			const oldUnitIds = new Set(oldIncident.assignedUnits || []);
			const newUnitIds = new Set(data.incident.assignedUnits || []);
			
			// Units removed from the incident
			oldUnitIds.forEach(unitId => {
			  if (!newUnitIds.has(unitId)) {
				// Update the unit to remove incident assignment
				const unitIndex = units.findIndex(u => u.id === unitId);
				if (unitIndex !== -1 && units[unitIndex].assignedIncident === data.incident.id) {
				  units[unitIndex].assignedIncident = null;
				  
				  // Set status to IN_SERVICE instead of AVAILABLE
				  units[unitIndex].status = 'IN_SERVICE';
				  
				  units[unitIndex].lastUpdated = new Date().toISOString();
				  
				  // Broadcast unit update
				  broadcast({
					type: 'unitUpdate',
					unit: units[unitIndex]
				  });
				}
			  }
			});
			
			// Units added to the incident
			newUnitIds.forEach(unitId => {
			  if (!oldUnitIds.has(unitId)) {
				// Update the unit to add incident assignment
				const unitIndex = units.findIndex(u => u.id === unitId);
				if (unitIndex !== -1) {
				  units[unitIndex].assignedIncident = data.incident.id;
				  if (units[unitIndex].status === 'AVAILABLE' || units[unitIndex].status === 'IN_SERVICE') {
					units[unitIndex].status = 'EN_ROUTE';
				  }
				  units[unitIndex].lastUpdated = new Date().toISOString();
				  
				  // Broadcast unit update
				  broadcast({
					type: 'unitUpdate',
					unit: units[unitIndex]
				  });
				}
			  }
			});
			
			// Update the incident - make a complete replacement
			incidents[incidentIndex] = data.incident;
			
			// Add status field if it doesn't exist
			if (incidents[incidentIndex].status === undefined) {
			  incidents[incidentIndex].status = 'ACTIVE';
			}
			
			// Make sure lastUpdated is set
			incidents[incidentIndex].lastUpdated = new Date().toISOString();
			
			// Log the incident after update
			console.log(`After update - Call type: ${incidents[incidentIndex].callType}, Location: ${incidents[incidentIndex].location}`);
			
			// Broadcast the updated incident to all clients
			broadcast({
			  type: 'incidentUpdate',
			  incident: incidents[incidentIndex]
			});
			
			// Also broadcast the complete list
			broadcast({
			  type: 'incidents',
			  incidents
			});
			
			// Persist updated units and incidents
			await persistUnits();
			await persistIncidents();
			
			console.log('Incident update complete');
		  } else {
			console.error('Incident not found:', data.incident.id);
		  }
		  break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });
  
  // Handle client disconnect
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Initialize data and start the server
initializeData()
  .then(() => {
    console.log('WebSocket server running on port 8080');
  })
  .catch(err => {
    console.error('Failed to start server:', err);
  });