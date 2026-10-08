const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    transports: ['websocket', 'polling']
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
    socket.on('crearSala', (data) => {
        const nombre = (data && data.nombre) ? data.nombre.trim() : "Jugador 1";
        const codigo = generarCodigo();
        
        salas.set(codigo, {
            jugadores: { p1: socket.id, p2: null },
            nombres: { p1: nombre, p2: "Esperando..." },
            elecciones: {},
            scores: { p1: 0, p2: 0 },
            timer: null,
            tiempo: 15,
            maxVictorias: 2, // Primer jugador en alcanzar 2 victorias gana
            juegoTerminado: false
        });

        socket.join(codigo);
        socket.codigoSala = codigo;

        socket.emit('salaCreada', { codigo, jugador: 1, nombres: salas.get(codigo).nombres });
    });

    // Unirse a Sala
    socket.on('unirseSala', (data) => {
        const codigoIngresado = typeof data === 'object' ? data.codigo : data;
        const nombre = (typeof data === 'object' && data.nombre) ? data.nombre.trim() : "Jugador 2";

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
        sala.nombres.p2 = nombre;

        socket.join(codigo);
        socket.codigoSala = codigo;

        socket.emit('salaUnida', { codigo, jugador: 2, nombres: sala.nombres });

        // Notificar inicio de la partida enviando nombres actualizados
        io.to(codigo).emit('estadoPartida', { lista: true, nombres: sala.nombres });
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

    // Enviar y retrasmitir Emojis / Reacciones
    socket.on('enviarEmoji', (data) => {
        const codigo = socket.codigoSala;
        if (!codigo) return;

        io.to(codigo).emit('recibirEmoji', {
            jugador: data.jugador,
            emoji: data.emoji
        });
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
    if (!sala || sala.juegoTerminado) return;

    clearInterval(sala.timer);

    const j1 = sala.elecciones[1];
    const j2 = sala.elecciones[2];
    const resultado = evaluar(j1, j2);

    if (resultado === 1) sala.scores.p1++;
    if (resultado === 2) sala.scores.p2++;

    // Verificar si alguien ya ganó la partida (2 victorias)
    let ganadorJuego = null;
    if (sala.scores.p1 >= sala.maxVictorias) ganadorJuego = 1;
    if (sala.scores.p2 >= sala.maxVictorias) ganadorJuego = 2;

    io.to(codigo).emit('resultadoRonda', {
        elecciones: sala.elecciones,
        ganador: resultado,
        scores: sala.scores,
        nombres: sala.nombres,
        ganadorJuego: ganadorJuego
    });

    sala.elecciones = {};

    if (ganadorJuego) {
        sala.juegoTerminado = true;
        
        // Reiniciar la partida automáticamente tras 5 segundos
        setTimeout(() => {
            if (salas.has(codigo)) {
                const s = salas.get(codigo);
                s.scores = { p1: 0, p2: 0 };
                s.juegoTerminado = false;
                
                io.to(codigo).emit('reiniciarPartida', {
                    scores: s.scores,
                    nombres: s.nombres
                });
                
                iniciarTemporizador(codigo);
            }
        }, 5000);
    } else {
        setTimeout(() => {
            if (salas.has(codigo) && !salas.get(codigo).juegoTerminado) {
                iniciarTemporizador(codigo);
            }
        }, 3000);
    }
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
