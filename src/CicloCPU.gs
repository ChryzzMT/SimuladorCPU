// ==========================================
// CICLO DE INSTRUCCIÓN Y REGISTRO DE LOG
// ==========================================

let pasoGlobal = 0; // Contador de pasos cronológicos para el Log

/**
 * Registra una línea en el panel de Log y Consola de Estado de la hoja de cálculo.
 * @param {string} fase - Fase actual (FETCH, DECODE, EXECUTE, STORE)
 * @param {string} detalle - Descripción técnica de la micro-operación
 */
function registrarLog(fase, detalle) {
  pasoGlobal++;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Coordenadas basadas en tu diseño de la consola inferior (ajusta si es necesario)
  // Supongamos que el log empieza a imprimirse en la fila 28, columna F (Fila dinámica o fija)
  // Para hacerlo sencillo, buscamos la siguiente fila vacía en la tabla de logs:
  var filaInicioLog = 30; 
  var ultimaFila = sheet.getLastRow();
  var filaDestino = (ultimaFila >= filaInicioLog) ? ultimaFila + 1 : filaInicioLog;
  
  // Estructura: [Paso #] [Fase] [Detalle de Operación] [Micro Instrucción] [Estado Registros]
  sheet.getRange(filaDestino, 6).setValue("Paso " + ("0" + pasoGlobal).slice(-2)); // Columna F: Paso #
  sheet.getRange(filaDestino, 7).setValue(fase);                                   // Columna G: Fase
  sheet.getRange(filaDestino, 9).setValue(detalle);                                // Columna I: Detalle
  sheet.getRange(filaDestino, 13).setValue("PC=" + registers.PC + " AX=" + registers.AX); // Columna M: Estado
}

/**
 * FASE 1: FETCH (Búsqueda de la instrucción)
 * Carga PC en MAR, lee RAM a MDR, pasa a IR e incrementa PC.
 */
function cicloFetch() {
  // 1. La dirección en PC se carga en MAR
  registers.MAR = registers.PC;
  
  // 2. Se lee la RAM hacia MDR (convertimos MAR a formato hexadecimal de celda ej. "00h")
  let dirHex = ("0" + registers.MAR.toString(16).toUpperCase()).slice(-2) + "h";
  let datoLeido = readRAM(dirHex);
  
  // Asegurarnos de que el dato leído sea numérico
  registers.MDR = (datoLeido !== "" && !isNaN(datoLeido)) ? parseInt(datoLeido, 16) : 0;
  
  // 3. El dato pasa al IR (Instruction Register)
  registers.IR = registers.MDR;
  
  // 4. Se incrementa el Program Counter (PC)
  registers.PC = (registers.PC + 1) & 0xFF;
  
  // Actualizar la interfaz visual de registros y registrar en el log
  actualizarRegistrosUI();
  registrarLog("FETCH", "MAR=0x" + registers.MAR.toString(16) + ", MDR=0x" + registers.MDR.toString(16) + " -> IR");
}

/**
 * FASE 2: DECODE (Decodificación)
 * Interpreta el Opcode almacenado en el IR.
 */
function cicloDecode() {
  // Aquí identificaremos el tipo de instrucción según el Opcode del IR
  let opcode = registers.IR;
  registrarLog("DECODE", "Unidad de Control decodificando Opcode: 0x" + opcode.toString(16));
}

/**
 * FASE 3: EXECUTE (Ejecución)
 * La ALU efectúa la operación o calcula bifurcaciones.
 */
function cicloExecute() {
  // En las siguientes tareas vincularemos las operaciones reales de la ISA
  registrarLog("EXECUTE", "ALU procesando instrucción actual.");
}

/**
 * FASE 4: STORE / WRITE-BACK (Almacenamiento)
 * Guarda el resultado final en el registro destino o celda de memoria.
 */
function cicloStore() {
  registrarLog("STORE", "Resultado guardado en destino. Fin de ciclo de instrucción.");
}

/**
 * Ejecuta el ciclo completo de instrucción paso a paso (Controlado por el botón STEP).
 */
function ejecutarPasoCompleto() {
  try {
    cicloFetch();
    cicloDecode();
    cicloExecute();
    cicloStore();
  } catch (error) {
    SpreadsheetApp.getActiveSpreadsheet().toast("Error en ejecución: " + error.message, "Simulador CPU", 5);
    Logger.log(error);
  }
}
