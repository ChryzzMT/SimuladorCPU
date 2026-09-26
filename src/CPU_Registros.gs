// ==========================================
// BANCO DE REGISTROS Y BANDERAS DEL CPU (8 BITS)
// ==========================================

// Objeto global para almacenar los registros de propósito general y control (8 bits)
let registers = {
  PC: 0,  // Program Counter (Puntero de instrucción)
  AX: 0,  // Acumulador de propósito general[cite: 1]
  BX: 0,  // Registro auxiliar de propósito general[cite: 1]
  MAR: 0, // Memory Address Register (Registro de dirección de memoria)[cite: 1]
  MDR: 0, // Memory Buffer/Data Register (Registro de datos de memoria)[cite: 1]
  IR: 0   // Instruction Register (Registro de instrucción)[cite: 1]
};

// Objeto global para las banderas de estado (1 bit)[cite: 1]
let flags = {
  ZF: 0, // Zero Flag: Se activa (1) si el resultado es cero[cite: 1]
  CF: 0, // Carry Flag: Se activa (1) si hay desbordamiento o acarreo[cite: 1]
  SF: 0  // Sign Flag: Refleja el bit más significativo (MSB)[cite: 1]
};

/**
 * Actualiza los valores de los registros y banderas en la interfaz visual 
 * del panel izquierdo de Google Sheets según las coordenadas:
 * - Registros en D8:D13
 * - Banderas en H21, H23, H25
 */
function actualizarRegistrosUI() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Mapeo de Registros en la columna D (filas 8 a 13)
  sheet.getRange("D8").setValue(registers.PC);   // PC  -> Fila 8
  sheet.getRange("D9").setValue(registers.AX);   // AX  -> Fila 9
  sheet.getRange("D10").setValue(registers.BX);  // BX  -> Fila 10
  sheet.getRange("D11").setValue(registers.MAR); // MAR -> Fila 11
  sheet.getRange("D12").setValue(registers.MDR); // MDR -> Fila 12
  sheet.getRange("D13").setValue(registers.IR);  // IR  -> Fila 13
  
  // Actualización de las Banderas de Estado (ZF, CF, SF) en celdas específicas
  sheet.getRange("H21").setValue(flags.ZF);      // Zero Flag  -> Celda H21
  sheet.getRange("H23").setValue(flags.CF);      // Carry Flag -> Celda H23
  sheet.getRange("H25").setValue(flags.SF);      // Sign Flag  -> Celda H25
}

/**
 * Restaura todos los registros y banderas del CPU a cero (Operación de RESET)[cite: 1].
 */
function resetCPU() {
  registers.PC = 0;
  registers.IR = 0;
  registers.MAR = 0;
  registers.MDR = 0;
  registers.AX = 0;
  registers.BX = 0;
  
  flags.ZF = 0;
  flags.CF = 0;
  flags.SF = 0;
  
  // Reflejar el reseteo en la interfaz visual de la hoja
  actualizarRegistrosUI();
  
  Logger.log("CPU reiniciado: Registros (D8:D13) y Banderas (H21, H23, H25) en 0.");
}
