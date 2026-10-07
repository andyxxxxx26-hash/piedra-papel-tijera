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
    const codigoDisplay = document.getElementById('codigoDisplay');
    const timerDisplay = document.getElementById('timerDisplay');

    // Elementos del juego
    const rolTexto = document.getElementById('rolTexto');
    const scoreJ1 = document.getElementById('scoreJ1');
    const scoreJ2 = document.getElementById('scoreJ2');
    const eleccionJ1 = document.getElementById('eleccionJ1');
    const eleccionJ2 = document.getElementById('eleccionJ2');
    const resultadoTexto = document.getElementById('resultadoTexto');

    const btnPiedra = document.querySelector('.piedra');
    const btnPapel = document.querySelector('.papel');
    const btnTijera = document.querySelector('.tijera');
    const botones = [btnPiedra, btnPapel, btnTijera].filter(Boolean);

    function deshabilitarBotones(deshabilitar) {
        botones.forEach(b => b.disabled = deshabilitar);
    }

    // Eventos del Lobby
    btnCrear.addEventListener('click', () => {
        socket.emit('crearSala');
    });

    btnUnirse.addEventListener('click', () => {
        const codigo = inputCodigo.value;
        if (codigo) {
            socket.emit('unirseSala', codigo);
        }
    });

    socket.on('errorSala', (msg) => {
        errorLobby.textContent = msg;
    });

    socket.on('salaCreada', (data) => {
        iniciarEntornoJuego(data.codigo, 1, "Eres el Jugador 1 (Esperando rival...)");
    });

    socket.on('salaUnida', (data) => {
        iniciarEntornoJuego(data.codigo, 2, "Eres el Jugador 2");
    });

    function iniciarEntornoJuego(codigo, rol, texto) {
        miRol = rol;
        lobbyContainer.style.display = 'none';
        juegoContainer.style.display = 'block';
        codigoDisplay.textContent = codigo;
        rolTexto.textContent = texto;
        deshabilitarBotones(true);
    }

    // Eventos del Juego
    socket.on('estadoPartida', (data) => {
        if (data.lista) {
            resultadoTexto.textContent = "¡Partida lista! Elige tu opción.";
            deshabilitarBotones(false);
        } else {
            resultadoTexto.textContent = "El otro jugador se ha desconectado.";
            deshabilitarBotones(true);
        }
    });

    socket.on('actualizarTimer', (data) => {
        timerDisplay.textContent = data.tiempo;
    });

    socket.on('jugadorListo', (data) => {
        if (data.jugador === 1) eleccionJ1.textContent = "Jugador 1: ¡Listo!";
        if (data.jugador === 2) eleccionJ2.textContent = "Jugador 2: ¡Listo!";
    });

    socket.on('resultadoRonda', (data) => {
        const emojis = { piedra: "✊", papel: "✋", tijera: "✌️", nada: "❌ (Tiempo agotado)" };
        
        eleccionJ1.textContent = `Jugador 1: ${emojis[data.elecciones[1]] || '-'}`;
        eleccionJ2.textContent = `Jugador 2: ${emojis[data.elecciones[2]] || '-'}`;

        scoreJ1.textContent = data.scores.p1;
        scoreJ2.textContent = data.scores.p2;

        if (data.ganador === 0) {
            resultadoTexto.textContent = "¡Empate!";
        } else if (data.ganador === miRol) {
            resultadoTexto.textContent = "¡Ganaste esta ronda! 🎉";
        } else {
            resultadoTexto.textContent = "Perdiste esta ronda 😞";
        }

        deshabilitarBotones(true);
        
        setTimeout(() => {
            deshabilitarBotones(false);
            resultadoTexto.textContent = "¡Siguiente ronda! Elige tu opción.";
        }, 3000);
    });

    if (btnPiedra) btnPiedra.addEventListener('click', () => enviarJugada('piedra'));
    if (btnPapel) btnPapel.addEventListener('click', () => enviarJugada('papel'));
    if (btnTijera) btnTijera.addEventListener('click', () => enviarJugada('tijera'));

    function enviarJugada(opcion) {
        socket.emit('hacerJugada', { jugador: miRol, eleccion: opcion });

        if (miRol === 1) eleccionJ1.textContent = "Jugador 1: ¡Listo!";
        if (miRol === 2) eleccionJ2.textContent = "Jugador 2: ¡Listo!";

        deshabilitarBotones(true);
    }
});
