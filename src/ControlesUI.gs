const MAX_FASES_RUN = 4000;

function limpiarLog() {
  var sh = obtenerHojaSimulador();
  var ult = sh.getLastRow();
  if (ult < LOG_CONFIG.filaInicio) return;
  var n = ult - LOG_CONFIG.filaInicio + 1;
  [LOG_CONFIG.paso, LOG_CONFIG.fase, LOG_CONFIG.detalle, LOG_CONFIG.micro, LOG_CONFIG.estado]
    .forEach(function (c) { sh.getRange(LOG_CONFIG.filaInicio, c, n, 1).clearContent(); });
}

function limpiarALU() {
  var sh = obtenerHojaSimulador();
  [ALU_CONFIG.operando1, ALU_CONFIG.operando2, ALU_CONFIG.operacion, ALU_CONFIG.resultado]
    .forEach(function (a) { sh.getRange(a).clearContent(); });
}
function btnLoadProgram() {
  try {
    var r = ensamblarPrograma();
    escribirImagenRAM(r.memoria);
    resetCPU();
    registers.PC = RAM_CONFIG.inicioCodigo;
    actualizarRegistrosUI();
    limpiarLog();
    limpiarALU();
    setPausa(false);
    guardarEstadoCPU();
    aviso("Programa cargado: " + r.bytesCodigo + " bytes.\nDatos 00h-7Fh | Código 80h-FFh | PC=80h", "LOAD PROGRAM");
  } catch (e) {
    avisoError(e.message, "LOAD PROGRAM - ERROR");
  }
}

function btnStep() {
  try {
    cargarEstadoCPU();
    if (ctl.halt) { aviso("CPU detenida (HLT). Usa LOAD PROGRAM.", "HALT"); return; }
    var fase = avanzarFase();
    aviso("Paso " + ctl.paso + ": " + fase + (ctl.halt ? " — CPU detenida" : ""), "STEP");
  } catch (e) {
    avisoError(e.message, "STEP - ERROR");
  }
}

function btnRun() {
  try {
    cargarEstadoCPU();
    if (ctl.halt) { aviso("CPU detenida (HLT). Usa LOAD PROGRAM.", "HALT"); return; }
    setPausa(false);

    var t0 = Date.now(), n = 0;
    // Apps Script corta a los 6 min: paramos a los 5 y se continúa con RUN
    while (!ctl.halt && !estaPausado() && n < MAX_FASES_RUN && (Date.now() - t0) < 300000) {
      avanzarFase();
      n++;
    }

    if (ctl.halt) aviso("Programa terminado (HLT). Pasos: " + ctl.paso, "RUN");
    else if (estaPausado()) aviso("Pausado. Continúa con RUN o STEP.", "PAUSE");
    else aviso("Tiempo límite de Apps Script. Presiona RUN para continuar.", "RUN");
  } catch (e) {
    setPausa(true);
    avisoError(e.message, "RUN - ERROR");
  }
}
function btnPause() {
  setPausa(true);
  aviso("Pausa solicitada.", "PAUSE");
}

function btnReset() {
  try {
    setPausa(true);
    resetCPU();
    limpiarLog();
    limpiarALU();
    guardarEstadoCPU();
    aviso("Registros y PC en 0. RAM conservada. Usa LOAD PROGRAM para reiniciar en 80h.", "RESET");
  } catch (e) {
    avisoError(e.message, "RESET - ERROR");
  }
}
