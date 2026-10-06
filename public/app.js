// Conectar automáticamente al mismo servidor que sirve la página (mantiene HTTPS)
const socket = io();

let miRol = 0; // 1 para Jugador 1, 2 para Jugador 2, 0 para Espectador

// Elementos del DOM
const estadoTexto = document.getElementById('estado');
const subTexto = document.getElementById('subtexto');
const scoreP1 = document.getElementById('score-p1');
const scoreP2 = document.getElementById('score-p2');
const j1Eleccion = document.getElementById('j1-eleccion');
const j2Eleccion = document.getElementById('j2-eleccion');
const botones = document.querySelectorAll('.btn-opcion');

// 1. Recibir rol asignado
socket.on('asignarRol', (data) => {
    miRol = data.jugador;
    if (miRol === 1) {
        if (subTexto) subTexto.textContent = "Eres el Jugador 1";
    } else if (miRol === 2) {
        if (subTexto) subTexto.textContent = "Eres el Jugador 2";
    } else {
        if (subTexto) subTexto.textContent = "La sala está llena (Espectador)";
        deshabilitarBotones(true);
    }
});

// 2. Recibir estado de la partida
socket.on('estadoPartida', (data) => {
    if (data.lista) {
        if (estadoTexto) estadoTexto.textContent = "¡Partida lista! Elige tu opción.";
        if (miRol !== 0) deshabilitarBotones(false);
    } else {
        if (estadoTexto) estadoTexto.textContent = "Esperando al otro jugador...";
        if (j1Eleccion) j1Eleccion.textContent = "Jugador 1: -";
        if (j2Eleccion) j2Eleccion.textContent = "Jugador 2: -";
        deshabilitarBotones(true);
    }
});

// 3. Notificar cuando el otro jugador eligió
socket.on('jugadorListo', (data) => {
    if (data.jugador === 1 && j1Eleccion) {
        j1Eleccion.textContent = "Jugador 1: ¡Listo!";
    } else if (data.jugador === 2 && j2Eleccion) {
        j2Eleccion.textContent = "Jugador 2: ¡Listo!";
    }
});

// 4. Mostrar resultado de la ronda
socket.on('resultadoRonda', (data) => {
    // Mostrar jugadas hechas
    const emojis = { piedra: "✊", papel: "✋", tijera: "✌️" };
    if (j1Eleccion) j1Eleccion.textContent = `Jugador 1: ${emojis[data.elecciones[1]] || '-'}`;
    if (j2Eleccion) j2Eleccion.textContent = `Jugador 2: ${emojis[data.elecciones[2]] || '-'}`;

    // Actualizar marcadores
    if (scoreP1) scoreP1.textContent = data.scores.p1;
    if (scoreP2) scoreP2.textContent = data.scores.p2;

    // Mostrar ganador de la ronda
    if (data.ganador === 0) {
        if (estadoTexto) estadoTexto.textContent = "¡Empate! Elijan de nuevo.";
    } else if (data.ganador === miRol) {
        if (estadoTexto) estadoTexto.textContent = "¡Ganaste esta ronda! 🎉";
    } else if (miRol !== 0) {
        if (estadoTexto) estadoTexto.textContent = "Perdiste esta ronda 😞";
    } else {
        if (estadoTexto) estadoTexto.textContent = `Ganó el Jugador ${data.ganador}`;
    }

    // Permitir jugar la siguiente ronda tras 2 segundos
    setTimeout(() => {
        if (miRol !== 0) deshabilitarBotones(false);
    }, 2000);
});

// 5. Escuchar clics en las opciones (Piedra, Papel, Tijera)
botones.forEach(boton => {
    boton.addEventListener('click', (e) => {
        if (miRol === 0) return;

        // Obtener la opción desde el atributo data-opcion o por la clase/texto
        const eleccion = boton.getAttribute('data-opcion') || e.currentTarget.id;
        
        // Enviar jugada al servidor
        socket.emit('hacerJugada', {
            jugador: miRol,
            eleccion: eleccion
        });

        // Feedback visual inmediato
        if (miRol === 1 && j1Eleccion) j1Eleccion.textContent = "Jugador 1: ¡Listo!";
        if (miRol === 2 && j2Eleccion) j2Eleccion.textContent = "Jugador 2: ¡Listo!";
        
        deshabilitarBotones(true);
    });
});

function deshabilitarBotones(deshabilitar) {
    botones.forEach(b => b.disabled = deshabilitar);
}
