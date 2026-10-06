const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let jugadores = {};
let elecciones = {};
let scores = { p1: 0, p2: 0 };

io.on('connection', (socket) => {
    // Asignar rol a los jugadores que se conectan
    if (!jugadores.p1) {
        jugadores.p1 = socket.id;
        socket.emit('asignarRol', { jugador: 1 });
    } else if (!jugadores.p2) {
        jugadores.p2 = socket.id;
        socket.emit('asignarRol', { jugador: 2 });
    } else {
        socket.emit('asignarRol', { jugador: 0 }); // Espectador si la sala está llena
    }

    // Notificar si la partida está lista (2 jugadores conectados)
    if (jugadores.p1 && jugadores.p2) {
        io.emit('estadoPartida', { lista: true });
    }

    // Manejar cuando un jugador hace su elección
    socket.on('hacerJugada', (data) => {
        elecciones[data.jugador] = data.eleccion;

        // Si ambos eligieron, evaluar el resultado
        if (elecciones[1] && elecciones[2]) {
            let resultado = evaluar(elecciones[1], elecciones[2]);
            if (resultado === 1) scores.p1++;
            if (resultado === 2) scores.p2++;

            io.emit('resultadoRonda', {
                elecciones: elecciones,
                ganador: resultado,
                scores: scores
            });

            // Reiniciar elecciones para la siguiente ronda
            elecciones = {};
        } else {
            // Notificar que un jugador ya eligió sin revelar la jugada
            socket.broadcast.emit('jugadorListo', { jugador: data.jugador });
        }
    });

    socket.on('disconnect', () => {
        if (socket.id === jugadores.p1) delete jugadores.p1;
        if (socket.id === jugadores.p2) delete jugadores.p2;
        elecciones = {};
        io.emit('estadoPartida', { lista: false });
    });
});

function evaluar(j1, j2) {
    if (j1 === j2) return 0; // Empate
    if (
        (j1 === 'piedra' && j2 === 'tijera') ||
        (j1 === 'papel' && j2 === 'piedra') ||
        (j1 === 'tijera' && j2 === 'papel')
    ) {
        return 1; // Gana Jugador 1
    }
    return 2; // Gana Jugador 2
}

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
const path = require('path');

// Esta línea asegura la ruta exacta hacia la carpeta public:
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));
