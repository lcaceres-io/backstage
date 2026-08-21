const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/lower-third/control', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'lower-third', 'control.html'));
});

app.get('/lower-third/overlay', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'lower-third', 'overlay.html'));
});

app.get('/health', (req, res) => res.send('ok'));

let state = {
  text: '',
  visible: false
};

io.on('connection', (socket) => {
  socket.emit('state', state);

  socket.on('show', (payload) => {
    state = {
      text: String(payload && payload.text ? payload.text : '').slice(0, 120),
      visible: true
    };
    io.emit('state', state);
  });

  socket.on('hide', () => {
    state = { ...state, visible: false };
    io.emit('state', state);
  });
});

server.listen(PORT, () => {
  console.log(`Backstage listening on port ${PORT}`);
});
