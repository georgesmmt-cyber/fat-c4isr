// =====================================================
// GESTION WEBSOCKET
// =====================================================
const WebSocket = require('ws');
const clients = new Set();

function setupWebSocket(server) {
    const wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws) => {
        clients.add(ws);
        console.log(`🔌 Client WebSocket connecté (${clients.size} total)`);
        
        ws.on('close', () => {
            clients.delete(ws);
            console.log(`🔌 Client déconnecté (${clients.size} restant)`);
        });
    });
    
    return wss;
}

function broadcast(type, data) {
    const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

module.exports = { setupWebSocket, broadcast };