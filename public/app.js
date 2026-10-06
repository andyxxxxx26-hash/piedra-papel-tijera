const socket = io();

let miJugadorNum = 0;
let yaEligio = false;

const rolTexto = document.getElementById('rolTexto');
const resultadoTexto = document.getElementById('resultadoTexto');
const instruccion = document.getElementById('instruccion');

const eleccionJ1 = document.getElementById('eleccionJ1');
const eleccionJ2 = document.getElementById('eleccionJ2');

const scoreJ1 = document.getElementById('scoreJ1');
const scoreJ2 = document.getElementById('scoreJ2');

const btnPiedra = document.getElementById('btnPiedra');
const btnPapel = document.getElementById('btnPapel');
const btnTijera = document.getElementById('btnTijera');
const botones = [btnPiedra, btnPapel, btnTijera];

// Asignar número de jugador
socket.on('asignarRol', (data) => {
    miJugadorNum = data.jugador;
    if (miJugadorNum === 0) {
        rolTexto.textContent = "La sala está llena (Espectador)";
    } else {
        rolTexto.textContent = `Eres el Jugador ${miJugadorNum}`;
    }
});

// Estado de la conexión de ambos jugadores
socket.on('estadoPartida', (data) => {
    if (data.lista && miJugadorNum !== 0) {
        resultadoTexto.textContent = "¡Partida lista! Elige tu opción.";
        habilitarBotones(true);
    } else {
        resultadoTexto.textContent = "Esperando al otro jugador...";
        habilitarBotones(false);
    }
});

// Registrar la elección al hacer clic
function enviarEleccion(opcion) {
    if (yaEligio || miJugadorNum === 0) return;
    yaEligio = true;
    habilitarBotones(false);
    instruccion.textContent = "Opción enviada. Esperando al rival...";
    socket.emit('hacerJugada', { jugador: miJugadorNum, eleccion: opcion });
}

// Avisar si el rival ya eligió
socket.on('jugadorListo', (data) => {
    if (data.jugador !== miJugadorNum) {
        resultadoTexto.textContent = "El rival ya eligió. ¡Haz tu jugada!";
    }
});

// Mostrar los resultados de la ronda
socket.on('resultadoRonda', (data) => {
    eleccionJ1.textContent = `Jugador 1: ${capitalizar(data.elecciones[1])}`;
    eleccionJ2.textContent = `Jugador 2: ${capitalizar(data.elecciones[2])}`;

    scoreJ1.textContent = data.scores.p1;
    scoreJ2.textContent = data.scores.p2;

    if (data.ganador === 0) {
        resultadoTexto.textContent = "🤝 ¡Empate!";
    } else if (data.ganador === miJugadorNum) {
        resultadoTexto.textContent = "🏆 ¡Ganaste la ronda!";
    } else {
        resultadoTexto.textContent = "❌ ¡Perdiste la ronda!";
    }

    // Preparar para la siguiente ronda automáticamente tras 3 segundos
    setTimeout(() => {
        yaEligio = false;
        eleccionJ1.textContent = "Jugador 1: -";
        eleccionJ2.textContent = "Jugador 2: -";
        resultadoTexto.textContent = "Nueva ronda. ¡Elige!";
        instruccion.textContent = "Elige una opción:";
        habilitarBotones(true);
    }, 3000);
});

function habilitarBotones(estado) {
    botones.forEach(btn => btn.disabled = !estado);
}

function capitalizar(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

btnPiedra.addEventListener('click', () => enviarEleccion('piedra'));
btnPapel.addEventListener('click', () => enviarEleccion('papel'));
btnTijera.addEventListener('click', () => enviarEleccion('tijera'));
