function ejecutarALU(op, a, b) {
  var sh = obtenerHojaSimulador();
  a = Number(a) & 0xFF;
  b = Number(b) & 0xFF;
  var unaria = (op === "INC" || op === "DEC" || op === "NOT");


  sh.getRange(ALU_CONFIG.operando1).setValue(a);
  sh.getRange(ALU_CONFIG.operando2).setValue(unaria ? "" : b);
  sh.getRange(ALU_CONFIG.operacion).setValue(op);
  SpreadsheetApp.flush();
  resaltar([
    sh.getRange(ALU_CONFIG.operando1),
    sh.getRange(ALU_CONFIG.operando2),
    sh.getRange(ALU_CONFIG.operacion)
  ], COLORES.EXECUTE);


  var r = 0, carry = 0;
  switch (op) {
    case "ADD": r = a + b; carry = r > 255 ? 1 : 0; break;
    case "SUB":
    case "CMP": r = a - b; carry = a < b ? 1 : 0; break;   // CF=1 = préstamo
    case "INC": r = a + 1; carry = a === 255 ? 1 : 0; break;
    case "DEC": r = a - 1; carry = a === 0 ? 1 : 0; break;
    case "AND": r = a & b; break;
    case "OR":  r = a | b; break;
    case "XOR": r = a ^ b; break;
    case "NOT": r = ~a; break;
    default: throw new Error("Operación ALU desconocida: " + op);
  }
  r = r & 0xFF;


  flags.ZF = r === 0 ? 1 : 0;
  flags.CF = carry;
  flags.SF = (r & 0x80) ? 1 : 0;
  actualizarRegistrosUI();


  sh.getRange(ALU_CONFIG.resultado).setValue(r);
  SpreadsheetApp.flush();
  resaltar([sh.getRange(ALU_CONFIG.resultado)], COLORES.EXECUTE);
  return r;
}



