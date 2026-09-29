const NOMBRE_HOJA = "Simulador";
const NOMBRE_HOJA_PROGRAMA = "Programa";


const RAM_CONFIG = {
  filaInicio: 8,       // L8
  colInicio: 12,       // L
  finDatos: 0x7F,      // filas 8-15  -> DATOS  (00h-7Fh)
  inicioCodigo: 0x80   // filas 16-23 -> CODIGO (80h-FFh)
};


const CPU_CONFIG = {
  registros: { PC: "D8", AX: "D9", BX: "D10", MAR: "D11", MDR: "D12", IR: "D13" },
  flags: { ZF: "H21", CF: "H23", SF: "H25" }
};


const ALU_CONFIG = {
  operando1: "C19",
  operando2: "E19",
  operacion: "D23",
  resultado: "D25"
};


const LOG_CONFIG = {
  filaInicio: 31,
  paso: 11,      // K
  fase: 12,      // L
  detalle: 14,   // N
  micro: 17,     // Q
  estado: 20     // T
};


const RETARDO_CELDA = "D5";


const COLORES = {
  FETCH: "#cfe2f3",
  DECODE: "#fff2cc",
  EXECUTE: "#d9ead3",
  STORE: "#f4cccc"
};


function obtenerHojaSimulador() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HOJA);
  if (!sheet) throw new Error('No existe una hoja llamada "' + NOMBRE_HOJA + '".');
  return sheet;
}


function retardoMs() {
  var v = obtenerHojaSimulador().getRange(RETARDO_CELDA).getValue();
  if (v === "" || isNaN(Number(v))) return 300;
  return Math.min(Math.max(Number(v), 0), 3000);
}


function aviso(mensaje, titulo) {
  SpreadsheetApp.getActiveSpreadsheet().toast(mensaje, titulo || "CPU", 4);
}
function avisoError(mensaje, titulo) {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.alert(titulo || "ERROR", mensaje, ui.ButtonSet.OK);
  } catch (e) {
    aviso(mensaje, titulo);
  }
}
