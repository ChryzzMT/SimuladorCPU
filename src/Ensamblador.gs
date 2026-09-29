const REGISTROS_ASM = { AX: 0, BX: 1 };


function limpiarLinea(t) {
  if (t === "" || t === null || t === undefined) return "";
  return String(t).split(";")[0].trim();
}


function numeroAsm(t) {
  var v = String(t).trim().toUpperCase(), n;
  if (/^0X[0-9A-F]+$/.test(v)) n = parseInt(v.substring(2), 16);
  else if (/^[0-9][0-9A-F]*H$/.test(v)) n = parseInt(v.slice(0, -1), 16);
  else if (/^\d+$/.test(v)) n = parseInt(v, 10);
  else throw new Error("Número inválido: " + t);
  if (n > 255) throw new Error("Valor fuera de 0-255: " + t);
  return n;
}


function esRegistro(t) { return REGISTROS_ASM.hasOwnProperty(String(t).trim().toUpperCase()); }


function registroAsm(t) {
  var k = String(t).trim().toUpperCase();
  if (!REGISTROS_ASM.hasOwnProperty(k)) throw new Error("Registro inválido: " + t);
  return REGISTROS_ASM[k];
}


function memoriaAsm(t, vars) {
  t = String(t).trim();
  if (t.charAt(0) !== "[" || t.charAt(t.length - 1) !== "]") throw new Error("Se esperaba [dirección]: " + t);
  var c = t.slice(1, -1).trim().toUpperCase();
  return vars.hasOwnProperty(c) ? vars[c] : numeroAsm(c);
}


function saltoAsm(t, etiq) {
  var k = String(t).trim().toUpperCase();
  return etiq.hasOwnProperty(k) ? etiq[k] : numeroAsm(k);
}


// Determina qué instrucción de la ISA es (según mnemónico y tipo de operandos)
function analizarInstruccion(linea) {
  var m = linea.match(/^(\S+)\s*(.*)$/);
  var mn = m[1].toUpperCase();
  var args = m[2] === "" ? [] : m[2].split(",").map(function (s) { return s.trim(); });
  var nombre;


  switch (mn) {
    case "HLT": case "INC": case "DEC": case "NOT":
    case "JMP": case "JZ": case "JNZ":
    case "LOAD": case "STORE": case "AND": case "OR": case "XOR":
      nombre = mn; break;
    case "MOV": case "ADD": case "SUB": case "CMP":
      if (args.length !== 2) throw new Error("Se esperaban 2 operandos");
      nombre = mn + (esRegistro(args[1]) ? "_REG" : "_IMM");
      break;
    default:
      throw new Error("Instrucción desconocida: " + mn);
  }
  if (args.length !== ISA[nombre].size - 1) throw new Error("Cantidad incorrecta de operandos");
  return { nombre: nombre, args: args };
}


function codificar(a, vars, etiq) {
  var n = a.nombre, x = a.args, b = [ISA[n].op];


  if (n === "HLT") return b;
  if (n === "INC" || n === "DEC" || n === "NOT") { b.push(registroAsm(x[0])); return b; }
  if (n === "JMP" || n === "JZ" || n === "JNZ") { b.push(saltoAsm(x[0], etiq)); return b; }
  if (n === "LOAD") { b.push(registroAsm(x[0]), memoriaAsm(x[1], vars)); return b; }
  if (n === "STORE") { b.push(memoriaAsm(x[0], vars), registroAsm(x[1])); return b; }


  b.push(registroAsm(x[0]));
  b.push(n.indexOf("_IMM") > -1 ? numeroAsm(x[1]) : registroAsm(x[1]));
  return b;
}


// Lee la hoja Programa (B5:B = DATOS, C5:C = CÓDIGO) y devuelve la imagen de 256 bytes
function ensamblarPrograma() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HOJA_PROGRAMA);
  if (!hoja) throw new Error('No existe la hoja "' + NOMBRE_HOJA_PROGRAMA + '".');


  var n = Math.max(hoja.getLastRow() - 4, 1);
  var datosTxt = hoja.getRange(5, 2, n, 1).getValues();
  var codigoTxt = hoja.getRange(5, 3, n, 1).getValues();


  var mem = [];
  for (var i = 0; i < 256; i++) mem.push(0);


  // ---- DATOS: 00h-7Fh ----
  var vars = {}, dir = 0;
  datosTxt.forEach(function (fila) {
    var l = limpiarLinea(fila[0]);
    if (!l) return;
    var p = l.split("=");
    if (p.length !== 2) throw new Error("DATA inválido: " + l);
    var nombre = p[0].trim().toUpperCase();
    if (!/^[A-Z_][A-Z0-9_]*$/.test(nombre)) throw new Error("Nombre de variable inválido: " + nombre);
    if (vars.hasOwnProperty(nombre)) throw new Error("Variable duplicada: " + nombre);
    if (dir > RAM_CONFIG.finDatos) throw new Error("DATA excede 00h-7Fh");
    vars[nombre] = dir;
    mem[dir] = numeroAsm(p[1]);
    dir++;
  });


  // ---- CÓDIGO, pasada 1: etiquetas y tamaños ----
  var etiq = {}, lineas = [], pc = RAM_CONFIG.inicioCodigo;
  codigoTxt.forEach(function (fila) {
    var l = limpiarLinea(fila[0]);
    if (!l) return;
    var idx = l.indexOf(":");
    if (idx > -1) {
      var e = l.substring(0, idx).trim().toUpperCase();
      if (!/^[A-Z_][A-Z0-9_]*$/.test(e)) throw new Error("Etiqueta inválida: " + e);
      if (etiq.hasOwnProperty(e)) throw new Error("Etiqueta duplicada: " + e);
      etiq[e] = pc;
      l = l.substring(idx + 1).trim();
    }
    if (!l) return;
    try {
      var a = analizarInstruccion(l);
    } catch (err) {
      throw new Error(err.message + " → en: " + l);
    }
    a.linea = l;
    lineas.push(a);
    pc += ISA[a.nombre].size;
    if (pc > 0x100) throw new Error("CÓDIGO excede 80h-FFh");
  });
  if (lineas.length === 0) throw new Error("No hay instrucciones en la columna C.");


  // ---- CÓDIGO, pasada 2: bytes ----
  pc = RAM_CONFIG.inicioCodigo;
  lineas.forEach(function (a) {
    var bytes;
    try {
      bytes = codificar(a, vars, etiq);
    } catch (err) {
      throw new Error(err.message + " → en: " + a.linea);
    }
    bytes.forEach(function (byte) { mem[pc++] = byte; });
  });


  return { memoria: mem, bytesCodigo: pc - RAM_CONFIG.inicioCodigo, variables: vars, etiquetas: etiq };
}


// Programa demostrativo: multiplicación por sumas sucesivas (7 × 5) con bucle y bifurcación
function cargarProgramaDemo() {
  var hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOMBRE_HOJA_PROGRAMA);
  if (!hoja) throw new Error('No existe la hoja "' + NOMBRE_HOJA_PROGRAMA + '".');


  hoja.getRange("B5:C60").clearContent();


  var datos = [["FACTOR = 5"], ["RESULTADO = 0"], ["ESTADO = 0"]];
  var codigo = [
    ["MOV AX, 0            ; acumulador = 0"],
    ["LOAD BX, [FACTOR]    ; contador = 5"],
    ["BUCLE: ADD AX, 7     ; AX = AX + 7"],
    ["DEC BX               ; contador--"],
    ["JNZ BUCLE            ; repetir mientras ZF=0"],
    ["STORE [RESULTADO], AX"],
    ["CMP AX, 35           ; verificar 7*5"],
    ["JZ OK"],
    ["MOV BX, 255          ; error"],
    ["JMP FIN"],
    ["OK: MOV BX, 1        ; correcto"],
    ["FIN: STORE [ESTADO], BX"],
    ["HLT"]
  ];
  hoja.getRange(5, 2, datos.length, 1).setValues(datos);
  hoja.getRange(5, 3, codigo.length, 1).setValues(codigo);
  aviso("Programa demo escrito en la hoja Programa. Presiona LOAD PROGRAM.", "DEMO");
}


function diagnostico() {
  var r = ensamblarPrograma();
  console.log("Variables: " + JSON.stringify(r.variables));
  console.log("Etiquetas: " + JSON.stringify(r.etiquetas));
  console.log("Datos 00h-0Fh: " + r.memoria.slice(0, 16).join(","));
  console.log("Código 80h-9Fh: " + r.memoria.slice(128, 160).join(","));
}



