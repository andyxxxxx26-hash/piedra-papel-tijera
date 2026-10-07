const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(express.static(path.join(__dirname, 'public')));

// Estructura de salas en memoria
const salas = new Map();

// Generar código único de 4 caracteres en mayúsculas
function generarCodigo() {
    let codigo;
    do {
        codigo = Math.random().toString(36).substring(2, 6).toUpperCase();
    } while (salas.has(codigo));
    return codigo;
}

io.on('connection', (socket) => {

    // Crear Sala
    socket.on('crearSala', () => {
        const codigo = generarCodigo();
        
        salas.set(codigo, {
            jugadores: { p1: socket.id, p2: null },
            elecciones: {},
            scores: { p1: 0, p2: 0 },
            timer: null,
            tiempo: 15
        });

        socket.join(codigo);
        socket.codigoSala = codigo;

        socket.emit('salaCreada', { codigo, jugador: 1 });
    });

    // Unirse a Sala
    socket.on('unirseSala', (codigoIngresado) => {
        if (!codigoIngresado) return socket.emit('errorSala', 'Ingresa un código.');

        const codigo = codigoIngresado.toString().trim().toUpperCase();
        const sala = salas.get(codigo);

        if (!sala) {
            return socket.emit('errorSala', 'La sala no existe o expiró.');
        }

        if (sala.jugadores.p2) {
            return socket.emit('errorSala', 'La sala está llena.');
        }

        sala.jugadores.p2 = socket.id;
        socket.join(codigo);
        socket.codigoSala = codigo;

        socket.emit('salaUnida', { codigo, jugador: 2 });

        // Notificar inicio de la partida
        io.to(codigo).emit('estadoPartida', { lista: true });
        iniciarTemporizador(codigo);
    });

    // Registrar Jugada
    socket.on('hacerJugada', (data) => {
        const codigo = socket.codigoSala;
        if (!codigo) return;
        const sala = salas.get(codigo);
        if (!sala) return;

        sala.elecciones[data.jugador] = data.eleccion;

        if (sala.elecciones[1] && sala.elecciones[2]) {
            evaluarRonda(codigo);
        } else {
            socket.to(codigo).emit('jugadorListo', { jugador: data.jugador });
        }
    });

    // Manejar Desconexión
    socket.on('disconnect', () => {
        const codigo = socket.codigoSala;
        if (!codigo) return;
        
        const sala = salas.get(codigo);
        if (sala) {
            clearInterval(sala.timer);
            io.to(codigo).emit('estadoPartida', { lista: false });
            salas.delete(codigo);
        }
    });
});

function iniciarTemporizador(codigo) {
    const sala = salas.get(codigo);
    if (!sala) return;

    clearInterval(sala.timer);
    sala.tiempo = 15;
    io.to(codigo).emit('actualizarTimer', { tiempo: sala.tiempo });

    sala.timer = setInterval(() => {
        sala.tiempo--;
        io.to(codigo).emit('actualizarTimer', { tiempo: sala.tiempo });

        if (sala.tiempo <= 0) {
            clearInterval(sala.timer);
            if (!sala.elecciones[1]) sala.elecciones[1] = 'nada';
            if (!sala.elecciones[2]) sala.elecciones[2] = 'nada';
            evaluarRonda(codigo);
        }
    }, 1000);
}

function evaluarRonda(codigo) {
    const sala = salas.get(codigo);
    if (!sala) return;

    clearInterval(sala.timer);

    const j1 = sala.elecciones[1];
    const j2 = sala.elecciones[2];
    const resultado = evaluar(j1, j2);

    if (resultado === 1) sala.scores.p1++;
    if (resultado === 2) sala.scores.p2++;

    io.to(codigo).emit('resultadoRonda', {
        elecciones: sala.elecciones,
        ganador: resultado,
        scores: sala.scores
    });

    sala.elecciones = {};
    setTimeout(() => {
        if (salas.has(codigo)) {
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
    console.log(`Servidor activo en el puerto ${PORT}`);
});
