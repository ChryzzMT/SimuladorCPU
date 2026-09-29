let registers = { PC: 0, AX: 0, BX: 0, MAR: 0, MDR: 0, IR: 0 };
let flags = { ZF: 0, CF: 0, SF: 0 };


// Control interno del ciclo (se persiste entre clics)
let ctl = { halt: false, parar: false, paso: 0, fase: 0, logRow: 0, ops: [], pend: null };


const CLAVE_ESTADO = "CPU_STATE";
const CLAVE_PAUSA = "CPU_PAUSA";


function reiniciarControl() {
  ctl.halt = false;
  ctl.parar = false;
  ctl.paso = 0;
  ctl.fase = 0;
  ctl.logRow = LOG_CONFIG.filaInicio;
  ctl.ops = [];
  ctl.pend = null;
}


function guardarEstadoCPU() {
  PropertiesService.getScriptProperties().setProperty(
    CLAVE_ESTADO,
    JSON.stringify({ r: registers, f: flags, c: ctl })
  );
}


function cargarEstadoCPU() {
  var raw = PropertiesService.getScriptProperties().getProperty(CLAVE_ESTADO);
  if (raw) {
    var s = JSON.parse(raw);
    Object.assign(registers, s.r);
    Object.assign(flags, s.f);
    Object.assign(ctl, s.c);
  } else {
    reiniciarControl();
  }
}


function setPausa(valor) {
  PropertiesService.getScriptProperties().setProperty(CLAVE_PAUSA, valor ? "1" : "0");
}


function estaPausado() {
  return PropertiesService.getScriptProperties().getProperty(CLAVE_PAUSA) === "1";
}


function actualizarRegistrosUI() {
  var sh = obtenerHojaSimulador();
  var claves = ["PC", "AX", "BX", "MAR", "MDR", "IR"];
  var dec = [], txt = [];


  claves.forEach(function (k) {
    var v = registers[k] & 0xFF;
    dec.push([v]);
    txt.push([numeroHex(v), binario8(v)]);
  });


  sh.getRange("D8:D13").setValues(dec);
  var rango = sh.getRange("E8:F13");
  rango.setNumberFormat("@");      // texto: evita perder ceros del binario
  rango.setValues(txt);


  sh.getRange(CPU_CONFIG.flags.ZF).setValue(flags.ZF);
  sh.getRange(CPU_CONFIG.flags.CF).setValue(flags.CF);
  sh.getRange(CPU_CONFIG.flags.SF).setValue(flags.SF);
}


// RESET: registros y PC a cero (la RAM se conserva)
function resetCPU() {
  registers.PC = 0; registers.AX = 0; registers.BX = 0;
  registers.MAR = 0; registers.MDR = 0; registers.IR = 0;
  flags.ZF = 0; flags.CF = 0; flags.SF = 0;
  reiniciarControl();
  actualizarRegistrosUI();
}


function obtenerEstadoRegistros() {
  return "PC=" + registers.PC + " AX=" + registers.AX + " BX=" + registers.BX +
         " MAR=" + registers.MAR + " MDR=" + registers.MDR + " IR=" + registers.IR +
         " ZF=" + flags.ZF + " CF=" + flags.CF + " SF=" + flags.SF;
}



