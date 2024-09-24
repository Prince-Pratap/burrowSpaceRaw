const WebSocket = require('ws');
const wrtc = require('wrtc'); // Import wrtc for WebRTC

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

wss.on('connection', (ws) => {
    console.log('Client connected.');

    // Create a new RTCPeerConnection for each client
    const peerConnection = new wrtc.RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] // STUN server
    });

    // Create offer and set it as local description
    peerConnection.createOffer()
        .then(offer => {
            return peerConnection.setLocalDescription(offer);
        })
        .then(() => {
            console.log('Sending offer to client:', peerConnection.localDescription);
            ws.send(JSON.stringify({ offer: peerConnection.localDescription }));
        })
        .catch(error => {
            console.error('Error creating offer:', error);
        });

    // Handle incoming messages
    ws.on('message', async (message) => {
        const msg = JSON.parse(message);
        console.log('Received message:', msg);

        if (msg.answer) {
            // Set remote description for the answer
            await peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(msg.answer));
        } else if (msg.candidate) {
            // Add ICE candidate
            await peerConnection.addIceCandidate(new wrtc.RTCIceCandidate(msg.candidate));
        }
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            console.log('Sending ICE candidate:', event.candidate);
            ws.send(JSON.stringify({ candidate: event.candidate }));
        }
    };

    ws.on('close', () => {
        console.log('Client disconnected.');
    });
});

console.log(`WebSocket server started on port ${PORT}`);
