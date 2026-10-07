const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Estructura de salas:
// salas[codigo] = { jugadores: { p1: socketId, p2: socketId }, elecciones: {}, scores: { p1: 0, p2: 0 }, timer: null, tiempo: 10 }
let salas = {};

io.on('connection', (socket) => {

    // Crear una nueva sala con código aleatorio de 4 letras
    socket.on('crearSala', () => {
        const codigoSala = Math.random().toString(36).substring(2, 6).toUpperCase();
        
        salas[codigoSala] = {
            jugadores: { p1: socket.id, p2: null },
            elecciones: {},
            scores: { p1: 0, p2: 0 },
            timer: null,
            tiempo: 10
        };

        socket.join(codigoSala);
        socket.codigoSala = codigoSala;

        socket.emit('salaCreada', { codigo: codigoSala, jugador: 1 });
    });

    // Unirse a una sala existente mediante código
    socket.on('unirseSala', (codigo) => {
        codigo = codigo.trim().toUpperCase();
        const sala = salas[codigo];

        if (!sala) {
            return socket.emit('errorSala', 'La sala no existe.');
        }

        if (sala.jugadores.p2) {
            return socket.emit('errorSala', 'La sala está llena.');
        }

        sala.jugadores.p2 = socket.id;
        socket.join(codigo);
        socket.codigoSala = codigo;

        socket.emit('salaUnida', { codigo: codigo, jugador: 2 });
        
        // Notificar que la partida está lista e iniciar temporizador
        io.to(codigo).emit('estadoPartida', { lista: true });
        iniciarTemporizador(codigo);
    });

    // Manejar la jugada
    socket.on('hacerJugada', (data) => {
        const codigo = socket.codigoSala;
        const sala = salas[codigo];
        if (!sala) return;

        sala.elecciones[data.jugador] = data.eleccion;

        // Si ambos eligieron
        if (sala.elecciones[1] && sala.elecciones[2]) {
            evaluarRonda(codigo);
        } else {
            socket.to(codigo).emit('jugadorListo', { jugador: data.jugador });
        }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        const codigo = socket.codigoSala;
        const sala = salas[codigo];

        if (sala) {
            clearInterval(sala.timer);
            io.to(codigo).emit('estadoPartida', { lista: false });
            delete salas[codigo];
        }
    });
});

function iniciarTemporizador(codigo) {
    const sala = salas[codigo];
    if (!sala) return;

    clearInterval(sala.timer);
    sala.tiempo = 10; // 10 segundos por ronda
    io.to(codigo).emit('actualizarTimer', { tiempo: sala.tiempo });

    sala.timer = setInterval(() => {
        sala.tiempo--;
        io.to(codigo).emit('actualizarTimer', { tiempo: sala.tiempo });

        if (sala.tiempo <= 0) {
            clearInterval(sala.timer);
            // Si el tiempo expira, asignamos "nada" a quienes no eligieron
            if (!sala.elecciones[1]) sala.elecciones[1] = 'nada';
            if (!sala.elecciones[2]) sala.elecciones[2] = 'nada';
            evaluarRonda(codigo);
        }
    }, 1000);
}

function evaluarRonda(codigo) {
    const sala = salas[codigo];
    if (!sala) return;

    clearInterval(sala.timer);

    let j1 = sala.elecciones[1];
    let j2 = sala.elecciones[2];
    let resultado = evaluar(j1, j2);

    if (resultado === 1) sala.scores.p1++;
    if (resultado === 2) sala.scores.p2++;

    io.to(codigo).emit('resultadoRonda', {
        elecciones: sala.elecciones,
        ganador: resultado,
        scores: sala.scores
    });

    // Resetear elecciones e iniciar nueva ronda en 3 segundos
    sala.elecciones = {};
    setTimeout(() => {
        if (salas[codigo]) {
            iniciarTemporizador(codigo);
        }
    }, 3000);
}

function evaluar(j1, j2) {
    if (j1 === j2) return 0;
    if (j1 === 'nada') return 2;
    if (j2 === 'nada') return 1;

    if (
        (j1 === 'piedra' && j2 === 'tijera') ||
        (j1 === 'papel' && j2 === 'piedra') ||
        (j1 === 'tijera' && j2 === 'papel')
    ) {
        return 1;
    }
    return 2;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor en puerto ${PORT}`);
});
