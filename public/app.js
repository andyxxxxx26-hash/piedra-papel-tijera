window.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    let miRol = 0;

    // Contenedores
    const lobbyContainer = document.getElementById('lobbyContainer');
    const juegoContainer = document.getElementById('juegoContainer');
    const btnCrear = document.getElementById('btnCrear');
    const btnUnirse = document.getElementById('btnUnirse');
    const inputCodigo = document.getElementById('inputCodigo');
    const errorLobby = document.getElementById('errorLobby');

    // Conexión
    socket.on('connect', () => {
        if (errorLobby) errorLobby.textContent = "";
    });

    socket.on('connect_error', () => {
        if (errorLobby) errorLobby.textContent = "Conectando al servidor...";
    });

    function obtenerBotones() {
        return Array.from(document.querySelectorAll('.opciones button'));
    }

    function deshabilitarBotones(deshabilitar) {
        obtenerBotones().forEach(b => b.disabled = deshabilitar);
    }

    // Eventos de Lobby
    if (btnCrear) {
        btnCrear.onclick = () => {
            if (errorLobby) errorLobby.textContent = "Creando sala...";
            socket.emit('crearSala');
        };
    }

    if (btnUnirse) {
        btnUnirse.onclick = () => {
            const codigo = inputCodigo ? inputCodigo.value.trim() : "";
            if (codigo) {
                if (errorLobby) errorLobby.textContent = "Uniéndose...";
                socket.emit('unirseSala', codigo);
            } else if (errorLobby) {
                errorLobby.textContent = "Ingresa un código válido.";
            }
        };
    }

    socket.on('errorSala', (msg) => {
        if (errorLobby) errorLobby.textContent = msg;
    });

    socket.on('salaCreada', (data) => {
        iniciarEntornoJuego(data.codigo, 1, "Eres el Jugador 1 (Esperando rival...)");
    });

    socket.on('salaUnida', (data) => {
        iniciarEntornoJuego(data.codigo, 2, "Eres el Jugador 2");
    });

    function iniciarEntornoJuego(codigo, rol, texto) {
        miRol = rol;
        if (lobbyContainer) lobbyContainer.style.display = 'none';
        if (juegoContainer) juegoContainer.style.display = 'block';

        const codigoDisplay = document.getElementById('codigoDisplay');
        const rolTexto = document.getElementById('rolTexto');
        const timerDisplay = document.getElementById('timerDisplay');

        if (codigoDisplay) codigoDisplay.textContent = codigo;
        if (rolTexto) rolTexto.textContent = texto;
        if (timerDisplay) timerDisplay.textContent = "15";

        asignarEventosJuego();
        deshabilitarBotones(true);
    }

    // Eventos de Juego
    socket.on('estadoPartida', (data) => {
        const resultadoTexto = document.getElementById('resultadoTexto');
        if (data.lista) {
            if (resultadoTexto) resultadoTexto.textContent = "¡Partida lista! Elige tu opción.";
            deshabilitarBotones(false);
        } else {
            if (resultadoTexto) resultadoTexto.textContent = "El otro jugador se ha desconectado.";
            deshabilitarBotones(true);
        }
    });

    socket.on('actualizarTimer', (data) => {
        const timerDisplay = document.getElementById('timerDisplay');
        if (timerDisplay) timerDisplay.textContent = data.tiempo;
    });

    socket.on('jugadorListo', (data) => {
        const eleccionJ1 = document.getElementById('eleccionJ1');
        const eleccionJ2 = document.getElementById('eleccionJ2');

        if (data.jugador === 1 && eleccionJ1) eleccionJ1.textContent = "Jugador 1: ¡Listo!";
        if (data.jugador === 2 && eleccionJ2) eleccionJ2.textContent = "Jugador 2: ¡Listo!";
    });

    socket.on('resultadoRonda', (data) => {
        const eleccionJ1 = document.getElementById('eleccionJ1');
        const eleccionJ2 = document.getElementById('eleccionJ2');
        const scoreJ1 = document.getElementById('scoreJ1');
        const scoreJ2 = document.getElementById('scoreJ2');
        const resultadoTexto = document.getElementById('resultadoTexto');

        const emojis = { piedra: "✊", papel: "✋", tijera: "✌️", nada: "❌ (Tiempo agotado)" };

        if (eleccionJ1) eleccionJ1.textContent = `Jugador 1: ${emojis[data.elecciones[1]] || '-'}`;
        if (eleccionJ2) eleccionJ2.textContent = `Jugador 2: ${emojis[data.elecciones[2]] || '-'}`;

        if (scoreJ1) scoreJ1.textContent = data.scores.p1;
        if (scoreJ2) scoreJ2.textContent = data.scores.p2;

        if (resultadoTexto) {
            if (data.ganador === 0) {
                resultadoTexto.textContent = "¡Empate!";
            } else if (data.ganador === miRol) {
                resultadoTexto.textContent = "¡Ganaste esta ronda! 🎉";
            } else {
                resultadoTexto.textContent = "Perdiste esta ronda 😞";
            }
        }

        deshabilitarBotones(true);

        setTimeout(() => {
            deshabilitarBotones(false);
            if (resultadoTexto) resultadoTexto.textContent = "¡Siguiente ronda! Elige tu opción.";
            if (eleccionJ1) eleccionJ1.textContent = "Jugador 1: -";
            if (eleccionJ2) eleccionJ2.textContent = "Jugador 2: -";
        }, 3000);
    });

    function asignarEventosJuego() {
        const btnPiedra = document.querySelector('.piedra');
        const btnPapel = document.querySelector('.papel');
        const btnTijera = document.querySelector('.tijera');

        if (btnPiedra) btnPiedra.onclick = () => enviarJugada('piedra');
        if (btnPapel) btnPapel.onclick = () => enviarJugada('papel');
        if (btnTijera) btnTijera.onclick = () => enviarJugada('tijera');
    }

    function enviarJugada(opcion) {
        socket.emit('hacerJugada', { jugador: miRol, eleccion: opcion });

        const eleccionJ1 = document.getElementById('eleccionJ1');
        const eleccionJ2 = document.getElementById('eleccionJ2');

        if (miRol === 1 && eleccionJ1) eleccionJ1.textContent = "Jugador 1: ¡Listo!";
        if (miRol === 2 && eleccionJ2) eleccionJ2.textContent = "Jugador 2: ¡Listo!";

        deshabilitarBotones(true);
    }
});
