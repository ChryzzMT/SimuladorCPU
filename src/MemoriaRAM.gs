function aDireccion(d) {
  var n = (typeof d === "string") ? parseInt(d.trim().replace(/h$/i, ""), 16) : Number(d);
  if (isNaN(n) || n < 0 || n > 255) throw new Error("Dirección inválida (00h-FFh): " + d);
  return n;
}


function celdaRAM(dir) {
  dir = aDireccion(dir);
  return obtenerHojaSimulador().getRange(
    RAM_CONFIG.filaInicio + (dir >> 4),
    RAM_CONFIG.colInicio + (dir & 15)
  );
}


function readRAM(dir) {
  var v = Number(celdaRAM(dir).getValue());
  return isNaN(v) ? 0 : v & 0xFF;
}


function writeRAM(dir, valor) {
  valor = Number(valor);
  if (isNaN(valor) || valor < 0 || valor > 255) throw new Error("Valor de RAM fuera de 0-255: " + valor);
  celdaRAM(dir).setValue(valor);
}


// Escribe los 256 bytes de una sola vez (más rápido que celda por celda)
function escribirImagenRAM(mem) {
  var matriz = [];
  for (var f = 0; f < 16; f++) matriz.push(mem.slice(f * 16, f * 16 + 16));
  obtenerHojaSimulador()
    .getRange(RAM_CONFIG.filaInicio, RAM_CONFIG.colInicio, 16, 16)
    .setValues(matriz);
}


// Inspector: al seleccionar una celda de la RAM muestra Dec / Hex / Bin
function onSelectionChange(e) {
  try {
    var r = e.range;
    if (r.getSheet().getName() !== NOMBRE_HOJA) return;
    if (r.getNumRows() !== 1 || r.getNumColumns() !== 1) return;
    var f = r.getRow() - RAM_CONFIG.filaInicio;
    var c = r.getColumn() - RAM_CONFIG.colInicio;
    if (f < 0 || f > 15 || c < 0 || c > 15) return;
    var dir = f * 16 + c;
    var v = Number(r.getValue()) & 0xFF;
    e.source.toast(
      "Dec " + v + " | Hex " + numeroHex(v) + " | Bin " + binario8(v) +
      " | " + (dir <= RAM_CONFIG.finDatos ? "DATOS" : "CÓDIGO"),
      "M[" + numeroHex(dir) + "]", 4
    );
  } catch (x) {}
}
function escribirImagenRAM(mem) {
  var matriz = [];
  for (var f = 0; f < 16; f++) matriz.push(mem.slice(f * 16, f * 16 + 16));


  var rango = obtenerHojaSimulador()
    .getRange(RAM_CONFIG.filaInicio, RAM_CONFIG.colInicio, 16, 16);
  rango.setNumberFormat("0");
  rango.setValues(matriz);
  SpreadsheetApp.flush();


  // Verificación: leer de vuelta y comparar
  var leido = rango.getValues();
  for (var i = 0; i < 256; i++) {
    if (Number(leido[i >> 4][i & 15]) !== mem[i]) {
      throw new Error("La RAM no se escribió correctamente en " + numeroHex(i));
    }
  }
}



