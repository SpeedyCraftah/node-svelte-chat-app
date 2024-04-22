const websockets = new Map();
module.exports.websockets = websockets;

function sendToSocket(ws, data) {
    return ws.send(JSON.stringify(data));
}
module.exports.sendToSocket = sendToSocket;