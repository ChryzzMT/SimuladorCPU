const NOMBRE_FASES = ["FETCH", "DECODE", "EXECUTE", "STORE"];


// ---------- utilidades ----------
function regCelda(nombre) {
  return obtenerHojaSimulador().getRange(CPU_CONFIG.registros[nombre]);
}


function resaltar(rangos, color) {
  var originales = rangos.map(function (r) { return r.getBackground(); });
  rangos.forEach(function (r) { r.setBackground(color); });
  SpreadsheetApp.flush();
  Utilities.sleep(retardoMs());
  rangos.forEach(function (r, i) { r.setBackground(originales[i]); });
  SpreadsheetApp.flush();
}


function registrarLog(fase, detalle, micro) {
  var sh = obtenerHojaSimulador();
  var f = ctl.logRow;
  sh.getRange(f, LOG_CONFIG.paso).setValue(ctl.paso);
  sh.getRange(f, LOG_CONFIG.fase).setValue(fase);
  sh.getRange(f, LOG_CONFIG.detalle).setValue(detalle);
  sh.getRange(f, LOG_CONFIG.micro).setValue(micro);
  sh.getRange(f, LOG_CONFIG.estado).setValue(obtenerEstadoRegistros());
  ctl.logRow++;
}


function leerReg(n) {
  if (n === 0) return registers.AX;
  if (n === 1) return registers.BX;
  throw new Error("Registro inválido: " + n);
}


function escribirReg(n, v) {
  v = Number(v) & 0xFF;
  if (n === 0) registers.AX = v;
  else if (n === 1) registers.BX = v;
  else throw new Error("Registro inválido: " + n);
  actualizarRegistrosUI();
}


function nombreReg(n) { return n === 0 ? "AX" : (n === 1 ? "BX" : "R" + n); }


// ---------- FETCH ----------
function faseFetch() {
  registers.MAR = registers.PC;
  actualizarRegistrosUI();
  resaltar([regCelda("PC"), regCelda("MAR")], COLORES.FETCH);
  registrarLog("FETCH", "MAR ← PC (" + numeroHex(registers.MAR) + ")", "MAR ← PC");


  registers.MDR = readRAM(registers.MAR);
  actualizarRegistrosUI();
  resaltar([celdaRAM(registers.MAR), regCelda("MDR")], COLORES.FETCH);
  registrarLog("FETCH", "MDR ← M[" + numeroHex(registers.MAR) + "] = " + registers.MDR, "MDR ← M[MAR]");


  registers.IR = registers.MDR;
  actualizarRegistrosUI();
  resaltar([regCelda("MDR"), regCelda("IR")], COLORES.FETCH);
  registrarLog("FETCH", "IR ← MDR (" + registers.IR + ")", "IR ← MDR");


  registers.PC = (registers.PC + 1) & 0xFF;
  actualizarRegistrosUI();
  resaltar([regCelda("PC")], COLORES.FETCH);
  registrarLog("FETCH", "PC ← PC + 1 (" + registers.PC + ")", "PC ← PC + 1");
}


// ---------- DECODE ----------
function leerOperando(k) {
  registers.MAR = registers.PC;
  registers.MDR = readRAM(registers.MAR);
  registers.PC = (registers.PC + 1) & 0xFF;
  actualizarRegistrosUI();
  resaltar([celdaRAM(registers.MAR), regCelda("MAR"), regCelda("MDR"), regCelda("PC")], COLORES.DECODE);
  registrarLog("DECODE",
    "Operando " + k + ": MAR=" + numeroHex(registers.MAR) + ", MDR=" + registers.MDR + ", PC++",
    "MAR ← PC; MDR ← M[MAR]; PC ← PC+1");
  return registers.MDR;
}


function faseDecode() {
  var info = infoOpcode(registers.IR);
  if (!info) throw new Error("Opcode desconocido: " + registers.IR + " en M[" + numeroHex(registers.PC - 1) + "]");


  resaltar([regCelda("IR")], COLORES.DECODE);
  registrarLog("DECODE", "IR=" + registers.IR + " → " + info.nombre + " (" + info.desc + ")", "UC decodifica IR");


  ctl.ops = [];
  for (var i = 1; i < info.size; i++) ctl.ops.push(leerOperando(i));
}


// ---------- EXECUTE ----------
function faseExecute() {
  var info = infoOpcode(registers.IR);
  var n = info.nombre, o = ctl.ops, v;
  ctl.pend = null;


  switch (n) {
    case "HLT":
      ctl.parar = true;
      registrarLog("EXECUTE", "HLT: se detendrá el reloj", "halt ← 1");
      break;


    case "MOV_IMM":
      ctl.pend = { t: "REG", d: o[0], v: o[1] };
      registrarLog("EXECUTE", "Dato inmediato " + o[1] + " listo para " + nombreReg(o[0]), "res ← imm");
      break;


    case "MOV_REG":
      v = leerReg(o[1]);
      ctl.pend = { t: "REG", d: o[0], v: v };
      registrarLog("EXECUTE", "Valor de " + nombreReg(o[1]) + " (" + v + ") listo", "res ← " + nombreReg(o[1]));
      break;


    case "LOAD":
      registers.MAR = o[1];
      registers.MDR = readRAM(o[1]);
      actualizarRegistrosUI();
      resaltar([celdaRAM(o[1]), regCelda("MAR"), regCelda("MDR")], COLORES.EXECUTE);
      ctl.pend = { t: "REG", d: o[0], v: registers.MDR };
      registrarLog("EXECUTE", "MAR=" + numeroHex(o[1]) + ", MDR ← M[MAR] = " + registers.MDR, "MDR ← M[MAR]");
      break;


    case "STORE":
      registers.MAR = o[0];
      registers.MDR = leerReg(o[1]);
      actualizarRegistrosUI();
      resaltar([regCelda("MAR"), regCelda("MDR")], COLORES.EXECUTE);
      ctl.pend = { t: "MEM", d: o[0], v: registers.MDR };
      registrarLog("EXECUTE", "MAR=" + numeroHex(o[0]) + ", MDR=" + registers.MDR + " (" + nombreReg(o[1]) + ")", "MAR ← dir; MDR ← reg");
      break;


    case "INC":
    case "DEC":
    case "NOT":
      v = ejecutarALU(n, leerReg(o[0]), 0);
      ctl.pend = { t: "REG", d: o[0], v: v };
      registrarLog("EXECUTE", "ALU " + n + " " + nombreReg(o[0]) + " = " + v + " | ZF=" + flags.ZF + " CF=" + flags.CF + " SF=" + flags.SF, "ALU(" + n + ")");
      break;


    case "JMP":
      registers.PC = o[0];
      actualizarRegistrosUI();
      resaltar([regCelda("PC")], COLORES.EXECUTE);
      registrarLog("EXECUTE", "JMP → PC=" + numeroHex(o[0]), "PC ← dir");
      break;


    case "JZ":
    case "JNZ":
      var salta = (n === "JZ") ? flags.ZF === 1 : flags.ZF === 0;
      if (salta) {
        registers.PC = o[0];
        actualizarRegistrosUI();
        resaltar([regCelda("PC")], COLORES.EXECUTE);
      }
      registrarLog("EXECUTE", n + (salta ? " TOMADO → PC=" + numeroHex(o[0]) : " no tomado") + " (ZF=" + flags.ZF + ")", salta ? "PC ← dir" : "PC sin cambio");
      break;


    default: // ADD, SUB, AND, OR, XOR, CMP
      var op = n.split("_")[0];
      var b = (n.indexOf("_IMM") > -1) ? o[1] : leerReg(o[1]);
      var a = leerReg(o[0]);
      v = ejecutarALU(op, a, b);
      if (op !== "CMP") ctl.pend = { t: "REG", d: o[0], v: v };
      registrarLog("EXECUTE",
        "ALU " + op + " " + a + ", " + b + " = " + v + " | ZF=" + flags.ZF + " CF=" + flags.CF + " SF=" + flags.SF,
        op === "CMP" ? "ALU(CMP) solo flags" : "ALU(" + op + ")");
  }
}


// ---------- STORE ----------
function faseStore() {
  var p = ctl.pend;


  if (p && p.t === "REG") {
    escribirReg(p.d, p.v);
    resaltar([regCelda(p.d === 0 ? "AX" : "BX")], COLORES.STORE);
    registrarLog("STORE", nombreReg(p.d) + " ← " + p.v, "Reg[" + nombreReg(p.d) + "] ← resultado");
  } else if (p && p.t === "MEM") {
    registers.MAR = p.d;
    registers.MDR = p.v;
    actualizarRegistrosUI();
    writeRAM(registers.MAR, registers.MDR);
    resaltar([regCelda("MDR"), regCelda("MAR"), celdaRAM(registers.MAR)], COLORES.STORE);
    registrarLog("STORE", "M[" + numeroHex(p.d) + "] ← " + p.v, "RAM[MAR] ← MDR");
  } else {
    registrarLog("STORE", "Sin escritura (solo flags / salto / HLT)", "—");
  }


  ctl.pend = null;
  if (ctl.parar) {
    ctl.halt = true;
    registrarLog("STORE", "CPU detenida", "HALT");
  }
}


// ---------- AVANZAR UNA FASE ----------
function avanzarFase() {
  if (ctl.halt) return null;
  var f = ctl.fase;


  ctl.paso++;                       // el paso avanza en CADA fase
  if (f === 0) faseFetch();
  else if (f === 1) faseDecode();
  else if (f === 2) faseExecute();
  else faseStore();


  ctl.fase = (f + 1) % 4;
  guardarEstadoCPU();
  return NOMBRE_FASES[f];
}



