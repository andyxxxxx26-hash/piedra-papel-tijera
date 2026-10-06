window.addEventListener('DOMContentLoaded', () => {
    const socket = io();

    let miRol = 0; // 1: Jugador 1, 2: Jugador 2, 0: Espectador

    // Elementos del DOM tomados de tu HTML exacto
    const rolTexto = document.getElementById('rolTexto');
    const scoreJ1 = document.getElementById('scoreJ1');
    const scoreJ2 = document.getElementById('scoreJ2');
    const eleccionJ1 = document.getElementById('eleccionJ1');
    const eleccionJ2 = document.getElementById('eleccionJ2');
    const resultadoTexto = document.getElementById('resultadoTexto');

    // Botones con las clases de tu HTML (.piedra, .papel, .tijera)
    const btnPiedra = document.querySelector('.piedra');
    const btnPapel = document.querySelector('.papel');
    const btnTijera = document.querySelector('.tijera');
    const botones = [btnPiedra, btnPapel, btnTijera].filter(Boolean);

    function deshabilitarBotones(deshabilitar) {
        botones.forEach(b => b.disabled = deshabilitar);
    }

    // 1. Asignar rol
    socket.on('asignarRol', (data) => {
        miRol = data.jugador;
        if (miRol === 1) {
            if (rolTexto) rolTexto.textContent = "Eres el Jugador 1";
        } else if (miRol === 2) {
            if (rolTexto) rolTexto.textContent = "Eres el Jugador 2";
        } else {
            if (rolTexto) rolTexto.textContent = "La sala está llena (Espectador)";
            deshabilitarBotones(true);
        }
    });

    // 2. Estado de la partida
    socket.on('estadoPartida', (data) => {
        if (data.lista) {
            if (resultadoTexto) resultadoTexto.textContent = "¡Partida lista! Elige tu opción.";
            if (miRol !== 0) deshabilitarBotones(false);
        } else {
            if (resultadoTexto) resultadoTexto.textContent = "Esperando al otro jugador...";
            if (eleccionJ1) eleccionJ1.textContent = "Jugador 1: -";
            if (eleccionJ2) eleccionJ2.textContent = "Jugador 2: -";
            deshabilitarBotones(true);
        }
    });

    // 3. Notificar cuando el rival eligió
    socket.on('jugadorListo', (data) => {
        if (data.jugador === 1 && eleccionJ1) {
            eleccionJ1.textContent = "Jugador 1: ¡Listo!";
        } else if (data.jugador === 2 && eleccionJ2) {
            eleccionJ2.textContent = "Jugador 2: ¡Listo!";
        }
    });

    // 4. Mostrar resultado de la ronda
    socket.on('resultadoRonda', (data) => {
        const emojis = { piedra: "✊", papel: "✋", tijera: "✌️" };
        if (eleccionJ1) eleccionJ1.textContent = `Jugador 1: ${emojis[data.elecciones[1]] || '-'}`;
        if (eleccionJ2) eleccionJ2.textContent = `Jugador 2: ${emojis[data.elecciones[2]] || '-'}`;

        if (scoreJ1) scoreJ1.textContent = data.scores.p1;
        if (scoreJ2) scoreJ2.textContent = data.scores.p2;

        if (data.ganador === 0) {
            if (resultadoTexto) resultadoTexto.textContent = "¡Empate! Elijan de nuevo.";
        } else if (data.ganador === miRol) {
            if (resultadoTexto) resultadoTexto.textContent = "¡Ganaste esta ronda! 🎉";
        } else if (miRol !== 0) {
            if (resultadoTexto) resultadoTexto.textContent = "Perdiste esta ronda 😞";
        } else {
            if (resultadoTexto) resultadoTexto.textContent = `Ganó el Jugador ${data.ganador}`;
        }

        setTimeout(() => {
            if (miRol !== 0) deshabilitarBotones(false);
        }, 2000);
    });

    // 5. Escuchar clics en tus 3 botones
    if (btnPiedra) btnPiedra.addEventListener('click', () => enviarJugada('piedra'));
    if (btnPapel) btnPapel.addEventListener('click', () => enviarJugada('papel'));
    if (btnTijera) btnTijera.addEventListener('click', () => enviarJugada('tijera'));

    function enviarJugada(opcion) {
        if (miRol === 0) return;

        socket.emit('hacerJugada', {
            jugador: miRol,
            eleccion: opcion
        });

        if (miRol === 1 && eleccionJ1) eleccionJ1.textContent = "Jugador 1: ¡Listo!";
        if (miRol === 2 && eleccionJ2) eleccionJ2.textContent = "Jugador 2: ¡Listo!";

        deshabilitarBotones(true);
    }
});
