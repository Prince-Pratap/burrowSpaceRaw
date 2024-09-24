const WebSocket = require('ws');
const PORT = process.env.PORT || 8080;

const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    console.log('Client connected.');

    ws.on('message', (message) => {
        // Relay messages to all other clients
        wss.clients.forEach(client => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected.');
    });
});

console.log(`WebSocket server started on port ${PORT}`);
