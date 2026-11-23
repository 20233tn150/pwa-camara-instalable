
/* 
   FRAGMENTO B: Captura del evento de instalación (beforeinstallprompt)
*/
let eventoInstalacionDiferido = null;

window.addEventListener('beforeinstallprompt', (event) => {
  // Evita que el mini-banner automático aparezca antes de tiempo
  event.preventDefault();
  eventoInstalacionDiferido = event;

  // Muestra tu botón personalizado de instalación en la UI
  const btnInstalar = document.getElementById('btn-instalar');
  btnInstalar.hidden = false;
  actualizarMensajeInstalacion('Este dispositivo permite instalar la app.');
});

// Desafío de Ensamblado 1.2: click en #btn-instalar -> prompt() -> .userChoice.then()
document.getElementById('btn-instalar').addEventListener('click', () => {
  if (!eventoInstalacionDiferido) return;

  eventoInstalacionDiferido.prompt();

  eventoInstalacionDiferido.userChoice
    .then((resultado) => {
      if (resultado.outcome === 'accepted') {
        actualizarMensajeInstalacion('Instalación aceptada por el usuario.');
      } else {
        actualizarMensajeInstalacion('Instalación cancelada por el usuario.');
      }
      // Se oculta el botón en ambos casos: el evento ya no se puede disparar dos veces
      document.getElementById('btn-instalar').hidden = true;
      eventoInstalacionDiferido = null;
    })
    .catch((error) => {
      actualizarMensajeInstalacion(`Error al instalar: ${error.message}`);
    });
});

// La app ya quedó instalada en la pantalla de inicio
window.addEventListener('appinstalled', () => {
  document.getElementById('btn-instalar').hidden = true;
  actualizarMensajeInstalacion('App instalada en la pantalla de inicio.');
});

function actualizarMensajeInstalacion(texto) {
  document.getElementById('mensaje-instalacion').textContent = texto;
}


/* 
   FRAGMENTO C: Liberación de hardware entre cambios de cámara
 */
let streamActual = null;
let modoCamaraActual = 'environment'; // 'environment' = trasera | 'user' = frontal

function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach((track) => {
      track.stop(); // libera el sensor físico del teléfono
    });
    streamActual = null;
  }
}

function actualizarMensajeEstado(texto) {
  document.getElementById('mensaje-estado').textContent = `Estado: ${texto}`;
}


/* 
   FRAGMENTO D: Encendido de cámara con promesas y diagnóstico de errores
*/
function iniciarCamara(modo) {
  detenerCamaraActiva();

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      const visorVideo = document.getElementById('visor-camara');
      visorVideo.srcObject = stream;
      document.getElementById('visor-vacio').hidden = true;
      actualizarMensajeEstado(`Cámara activa (${modo === 'environment' ? 'Trasera' : 'Frontal'})`);
    })
    .catch((error) => {
      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado('Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.');
      } else if (error.name === 'NotFoundError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.');
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`);
      }
    });
}


/* 
   FRAGMENTO E: Flujo de consentimiento previo (Pre-Permiso UX)
 */
// Paso 1: El usuario pulsa "Solicitar Acceso a Cámara" -> Mostramos aviso explicativo
document.getElementById('btn-preparar-camara').addEventListener('click', () => {
  const descripcion = document.getElementById('camara-desc');
  descripcion.textContent = (modoCamaraActual === 'environment')
    ? 'trasera (environment)'
    : 'frontal (user)';
  document.getElementById('aviso-permiso').hidden = false;
});

// Paso 2: El usuario lee el motivo y pulsa "Aceptar y Encender Cámara"
document.getElementById('btn-confirmar-permiso').addEventListener('click', () => {
  document.getElementById('aviso-permiso').hidden = true;
  iniciarCamara(modoCamaraActual);
});

// Paso extra: cancelar SIN disparar el diálogo nativo (nunca se pierde el permiso)
document.getElementById('btn-cancelar-permiso').addEventListener('click', () => {
  document.getElementById('aviso-permiso').hidden = true;
  actualizarMensajeEstado('Solicitud cancelada. No se abrió ningún diálogo de permiso.');
});


/* 
   Desafío de Ensamblado 2.3 y 2.4: alternar lentes y apagado
*/
// 3) Botón de cambio de cámara: invierte el valor de modoCamaraActual
document.getElementById('btn-alternar-camara').addEventListener('click', () => {
  modoCamaraActual = (modoCamaraActual === 'environment') ? 'user' : 'environment';

  if (streamActual) {
    // Si la cámara ya estaba encendida, reiniciamos el flujo con el nuevo lente
    iniciarCamara(modoCamaraActual);
  } else {
    actualizarMensajeEstado(`Lente seleccionado: ${modoCamaraActual === 'environment' ? 'Trasera' : 'Frontal'}. Enciende la cámara para verlo.`);
  }
});

// 4) Botón de apagado: detiene pistas, limpia srcObject y actualiza el mensaje
document.getElementById('btn-apagar-camara').addEventListener('click', () => {
  detenerCamaraActiva();
  const visorVideo = document.getElementById('visor-camara');
  visorVideo.srcObject = null;
  document.getElementById('visor-vacio').hidden = false;
  actualizarMensajeEstado('cámara apagada (sensor liberado)');
});


/* 
   Service Worker: registro (estrategia Cache First)
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((registro) => {
        console.log('Service Worker registrado con scope:', registro.scope);
      })
      .catch((error) => {
        console.error('Error al registrar el Service Worker:', error);
      });
  });
}

/* Limpieza al salir: nunca dejar el sensor encendido en segundo plano */
window.addEventListener('pagehide', detenerCamaraActiva);
