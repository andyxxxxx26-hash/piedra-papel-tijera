window.addEventListener('DOMContentLoaded', () => {
    // --- CONEXIÓN COMPATIBLE CON WEB Y APLICACIÓN MÓVIL (.APK) ---
    const SERVER_URL = "https://piedra-papel-tijera-9k7e.onrender.com";

    const socket = window.location.protocol.startsWith('http') && !window.location.hostname.includes('localhost')
        ? io() 
        : io(SERVER_URL);

    let miRol = 0;
    let nombresJugadores = { p1: "Jugador 1", p2: "Jugador 2" };

    // Contenedores
    const lobbyContainer = document.getElementById('lobbyContainer');
    const juegoContainer = document.getElementById('juegoContainer');
    const btnCrear = document.getElementById('btnCrear');
    const btnUnirse = document.getElementById('btnUnirse');
    const inputNombre = document.getElementById('inputNombre');
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
            const nombre = inputNombre ? inputNombre.value.trim() : "";
            if (!nombre) {
                if (errorLobby) errorLobby.textContent = "Ingresa tu nombre antes de continuar.";
                return;
            }
            if (errorLobby) errorLobby.textContent = "Creando sala...";
            socket.emit('crearSala', { nombre });
        };
    }

    if (btnUnirse) {
        btnUnirse.onclick = () => {
            const nombre = inputNombre ? inputNombre.value.trim() : "";
            const codigo = inputCodigo ? inputCodigo.value.trim() : "";

            if (!nombre) {
                if (errorLobby) errorLobby.textContent = "Ingresa tu nombre antes de continuar.";
                return;
            }
            if (!codigo) {
                if (errorLobby) errorLobby.textContent = "Ingresa un código válido.";
                return;
            }

            if (errorLobby) errorLobby.textContent = "Uniéndose...";
            socket.emit('unirseSala', { codigo, nombre });
        };
    }

    socket.on('errorSala', (msg) => {
        if (errorLobby) errorLobby.textContent = msg;
    });

    socket.on('salaCreada', (data) => {
        if (data.nombres) nombresJugadores = data.nombres;
        iniciarEntornoJuego(data.codigo, 1, `Hola ${nombresJugadores.p1} (Esperando rival...)`);
    });

    socket.on('salaUnida', (data) => {
        if (data.nombres) nombresJugadores = data.nombres;
        iniciarEntornoJuego(data.codigo, 2, `Hola ${nombresJugadores.p2}`);
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

        actualizarNombresEnPantalla();
        asignarEventosJuego();
        deshabilitarBotones(true);
    }

    function actualizarNombresEnPantalla() {
        const labelJ1 = document.getElementById('labelJ1');
        const labelJ2 = document.getElementById('labelJ2');
        const eleccionJ1 = document.getElementById('eleccionJ1');
        const eleccionJ2 = document.getElementById('eleccionJ2');

        if (labelJ1) labelJ1.textContent = nombresJugadores.p1;
        if (labelJ2) labelJ2.textContent = nombresJugadores.p2;

        if (eleccionJ1 && !eleccionJ1.textContent.includes('¡Listo!')) {
            eleccionJ1.textContent = `${nombresJugadores.p1}: -`;
        }
        if (eleccionJ2 && !eleccionJ2.textContent.includes('¡Listo!')) {
            eleccionJ2.textContent = `${nombresJugadores.p2}: -`;
        }
    }

    // Eventos de Juego
    socket.on('estadoPartida', (data) => {
        const resultadoTexto = document.getElementById('resultadoTexto');
        if (data.nombres) nombresJugadores = data.nombres;
        actualizarNombresEnPantalla();

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

        if (data.jugador === 1 && eleccionJ1) eleccionJ1.textContent = `${nombresJugadores.p1}: ¡Listo!`;
        if (data.jugador === 2 && eleccionJ2) eleccionJ2.textContent = `${nombresJugadores.p2}: ¡Listo!`;
    });

    // Reemplaza los listeners de socket.on('resultadoRonda') y agrega socket.on('reiniciarPartida')

socket.on('resultadoRonda', (data) => {
    if (data.nombres) nombresJugadores = data.nombres;

    const eleccionJ1 = document.getElementById('eleccionJ1');
    const eleccionJ2 = document.getElementById('eleccionJ2');
    const scoreJ1 = document.getElementById('scoreJ1');
    const scoreJ2 = document.getElementById('scoreJ2');
    const resultadoTexto = document.getElementById('resultadoTexto');

    const emojis = { piedra: "✊", papel: "✋", tijera: "✌️", nada: "❌ (Tiempo agotado)" };

    if (eleccionJ1) eleccionJ1.textContent = `${nombresJugadores.p1}: ${emojis[data.elecciones[1]] || '-'}`;
    if (eleccionJ2) eleccionJ2.textContent = `${nombresJugadores.p2}: ${emojis[data.elecciones[2]] || '-'}`;

    if (scoreJ1) scoreJ1.textContent = data.scores.p1;
    if (scoreJ2) scoreJ2.textContent = data.scores.p2;

    deshabilitarBotones(true);

    // ¿Hay un ganador definitivo de las 3 rondas (2 victorias)?
    if (data.ganadorJuego) {
        const nombreGanador = data.ganadorJuego === 1 ? nombresJugadores.p1 : nombresJugadores.p2;
        
        if (data.ganadorJuego === miRol) {
            resultadoTexto.textContent = `🏆 ¡ERES EL CAMPEÓN DE LA PARTIDA! 🏆`;
        } else {
            resultadoTexto.textContent = `👑 ¡${nombreGanador} ha ganado la partida!`;
        }

        setTimeout(() => {
            if (resultadoTexto) resultadoTexto.textContent = "Reiniciando partida en 5 segundos...";
        }, 2000);

    } else {
        // Mensajes de ronda normal
        if (resultadoTexto) {
            if (data.ganador === 0) {
                resultadoTexto.textContent = "¡Empate en esta ronda!";
            } else if (data.ganador === miRol) {
                resultadoTexto.textContent = "¡Ganaste esta ronda! 🎉";
            } else {
                resultadoTexto.textContent = "Perdiste esta ronda 😞";
            }
        }

        setTimeout(() => {
            deshabilitarBotones(false);
            if (resultadoTexto) resultadoTexto.textContent = "¡Siguiente ronda! Elige tu opción.";
            if (eleccionJ1) eleccionJ1.textContent = `${nombresJugadores.p1}: -`;
            if (eleccionJ2) eleccionJ2.textContent = `${nombresJugadores.p2}: -`;
        }, 3000);
    }
});
// Evento para reiniciar los marcadores al comenzar una nueva partida completa
socket.on('reiniciarPartida', (data) => {
    const scoreJ1 = document.getElementById('scoreJ1');
    const scoreJ2 = document.getElementById('scoreJ2');
    const eleccionJ1 = document.getElementById('eleccionJ1');
    const eleccionJ2 = document.getElementById('eleccionJ2');
    const resultadoTexto = document.getElementById('resultadoTexto');

    if (scoreJ1) scoreJ1.textContent = "0";
    if (scoreJ2) scoreJ2.textContent = "0";
    if (eleccionJ1) eleccionJ1.textContent = `${nombresJugadores.p1}: -`;
    if (eleccionJ2) eleccionJ2.textContent = `${nombresJugadores.p2}: -`;

    if (resultadoTexto) resultadoTexto.textContent = "¡Nueva partida iniciada! Elige tu opción.";
    deshabilitarBotones(false);
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

        if (miRol === 1 && eleccionJ1) eleccionJ1.textContent = `${nombresJugadores.p1}: ¡Listo!`;
        if (miRol === 2 && eleccionJ2) eleccionJ2.textContent = `${nombresJugadores.p2}: ¡Listo!`;

        deshabilitarBotones(true);
    }
});
