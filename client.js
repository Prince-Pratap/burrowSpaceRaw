const WebSocket = require('ws');
const wrtc = require('wrtc');
const chokidar = require('chokidar');
const fs = require('fs');
const path = require('path');

const SERVER_URL = 'ws://localhost:8080'; // Replace with cloud server URL after deployment
const SYNC_FOLDER = './sync-folder'; // Create this folder to sync files

const ws = new WebSocket(SERVER_URL);

let peerConnection;
let dataChannel;

ws.on('open', () => {
    console.log('Connected to server.');
    setupPeerConnection();
});

ws.on('message', async (data) => {
    const message = JSON.parse(data);

    if (message.offer) {
        await peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(message.offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        ws.send(JSON.stringify({ answer }));
    } else if (message.answer) {
        await peerConnection.setRemoteDescription(new wrtc.RTCSessionDescription(message.answer));
    } else if (message.candidate) {
        await peerConnection.addIceCandidate(new wrtc.RTCIceCandidate(message.candidate));
    }
});

function setupPeerConnection() {
    peerConnection = new wrtc.RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({ candidate: event.candidate }));
        }
    };

    dataChannel = peerConnection.createDataChannel('fileTransfer');
    dataChannel.onopen = () => console.log('Data channel open');

    dataChannel.onmessage = (event) => {
        const { fileName, fileContent } = JSON.parse(event.data);
        const filePath = path.join(SYNC_FOLDER, fileName);
        fs.writeFileSync(filePath, fileContent, 'utf-8');
        console.log(`Received and saved ${fileName} via WebRTC.`);
    };

    chokidar.watch(SYNC_FOLDER).on('all', (event, filePath) => {
        if (event === 'add' || event === 'change') {
            const fileName = path.basename(filePath);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            dataChannel.send(JSON.stringify({ fileName, fileContent }));
            console.log(`Sent ${fileName} via WebRTC.`);
        }
    });
}
