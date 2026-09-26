/**
 * Inicializa o limpia el banco de memoria RAM de 16x16 (desde 00h hasta FFh).
 */
function inicializarMemoriaRAM() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Configuración de la posición visual de la matriz RAM en la hoja
  var filaInicio = 8;   // Fila donde comienza "00h" (Fila 8)
  var colInicio = 12;   // Columna L (índice 12), donde empieza la columna '0'
  
  // Recorrer las 16 filas (00h, 10h, 20h, ... F0h)
  for (var i = 0; i < 16; i++) {
    // Recorrer las 16 columnas (0 al F)
    for (var j = 0; j < 16; j++) {
      var filaReal = filaInicio + i;
      var colReal = colInicio + j;
      
      var celda = sheet.getRange(filaReal, colReal);
      // Opcional: inicializar celdas vacías con "00" o dejar por defecto
      if (celda.getValue() === "") {
        celda.setValue("00");
      }
    }
  }
}

/**
 * Escribe un valor en una posición específica de la memoria RAM y actualiza la hoja visualmente.
 * @param {string|number} direccionHex - Dirección en hexadecimal (ej. "00h", "0Fh", "FFh").
 * @param {string|number} valor - Valor a almacenar.
 */
function writeRAM(direccionHex, valor) {
  if (direccionHex === undefined || direccionHex === null) {
    throw new Error("Error: La dirección de memoria proporcionada es undefined o null.");
  }
  
  var dirStr = String(direccionHex);
  var dirLimpia = dirStr.replace(/h/gi, "").trim();
  var dirInt = parseInt(dirLimpia, 16);
  
  if (isNaN(dirInt) || dirInt < 0 || dirInt > 255) {
    throw new Error("Dirección de memoria fuera de rango (debe ser entre 00h y FFh).");
  }

  // Actualizar la representación visual en la hoja
  actualizarCeldaRAMVisual(dirInt, valor);
}

/**
 * Actualiza la celda visual correspondiente en la matriz 16x16 de la hoja de cálculo.
 * @param {number} dirInt - Dirección numérica entera (0 a 255).
 * @param {string|number} valor - Valor a mostrar en la celda.
 */
function actualizarCeldaRAMVisual(dirInt, valor) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Calcular la fila y columna dentro de la matriz 16x16
  var filaMatriz = Math.floor(dirInt / 16); // De 0 a 15
  var colMatriz = dirInt % 16;             // De 0 a 15
  
  // Coordenadas corregidas de inicio de la tabla en tu hoja de cálculo
  var filaInicio = 8;   // Fila de la celda "00h" (Fila 8 a 23)
  var colInicio = 12;   // Columna L (índice 12, abarca de L a AA)
  
  var filaReal = filaInicio + filaMatriz;
  var colReal = colInicio + colMatriz;
  
  // Validación de seguridad estricta para evitar el error de rango muy pequeño (< 1)
  if (filaReal < 1 || colReal < 1) {
    throw new Error("Error: The starting row or column of the range is too small (filaReal: " + filaReal + ", colReal: " + colReal + ").");
  }
  
  // Escribir el valor en la celda correspondiente
  sheet.getRange(filaReal, colReal).setValue(valor);
}

/**
 * Lee un valor desde una posición específica de la memoria RAM visual.
 * @param {string|number} direccionHex - Dirección en hexadecimal (ej. "5Ah").
 * @return {string} El valor contenido en esa posición de memoria.
 */
function readRAM(direccionHex) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  var dirStr = String(direccionHex);
  var dirLimpia = dirStr.replace(/h/gi, "").trim();
  var dirInt = parseInt(dirLimpia, 16);
  
  if (isNaN(dirInt) || dirInt < 0 || dirInt > 255) {
    throw new Error("Dirección de memoria fuera de rango para lectura.");
  }
  
  var filaMatriz = Math.floor(dirInt / 16);
  var colMatriz = dirInt % 16;
  
  var filaInicio = 8;
  var colInicio = 12;
  
  var filaReal = filaInicio + filaMatriz;
  var colReal = colInicio + colMatriz;
  
  if (filaReal < 1 || colReal < 1) {
    throw new Error("Error: The starting row of the range is too small.");
  }
  
  return sheet.getRange(filaReal, colReal).getValue();
}
