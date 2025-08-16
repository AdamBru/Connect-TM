// server.js
import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

let gamePIN = Math.floor(1000 + Math.random() * 9000).toString();
let screenSocket = null;
let controllerSocket = null;

app.get('/main/display.html', (req, res) => {
    const filePath = path.join(__dirname, 'main', 'display.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if(err){ res.status(500).send('Błąd serwera'); return; }
        const htmlWithPIN = data.replace('{{PIN}}', gamePIN);
        res.send(htmlWithPIN);
    });
});

app.use(express.static(__dirname));

wss.on('connection', ws => {
    ws.on('message', message => {
        const data = JSON.parse(message);

        if(data.type === 'registerScreen'){
            screenSocket = ws;
            ws.send(JSON.stringify({type:'pin', pin:gamePIN}));
        }

        if(data.type === 'joinGame'){ 
            if(data.pin === gamePIN){
                ws.send(JSON.stringify({type:'joined', success:true, pin:gamePIN}));
                controllerSocket = ws;
            } else {
                ws.send(JSON.stringify({type:'joined', success:false, message:'Niepoprawny PIN!'}));
            }
        }

        if(data.type === 'startGame'){
            if(screenSocket){
                screenSocket.send(JSON.stringify({type:'startGame'}));
            }
            if(controllerSocket){
                controllerSocket.send(JSON.stringify({type:'controllerStart'}));
            }
        }

        if(data.type === 'move' && screenSocket){
            screenSocket.send(JSON.stringify({type:'move', direction:data.direction, distance:30}));
        }
    });

    ws.on('close', () => {
        if(ws === controllerSocket) controllerSocket = null;
        if(ws === screenSocket) screenSocket = null;
    });
});

function getLocalIP(){
    const interfaces = os.networkInterfaces();
    for(const name of Object.keys(interfaces)){
        for(const iface of interfaces[name]){
            if(iface.family==='IPv4' && !iface.internal) return iface.address;
        }
    }
    return 'localhost';
}

const PORT = 8080;
server.listen(PORT, ()=>{
    const localIP = getLocalIP();
    console.log(`Serwer działa na http://localhost:${PORT} oraz http://${localIP}:${PORT} z PINem: ${gamePIN}`);
});