// ==========================================
// UNIDAD ARITMÉTICO-LÓGICA (ALU) DE 8 BITS
// ==========================================

/**
 * Ejecuta una operación en la ALU de 8 bits, calcula el resultado
 * y actualiza automáticamente las banderas (ZF, CF, SF).
 * 
 * @param {string} operacion - Nombre de la operación ("ADD", "SUB", "INC", "DEC", "AND", "OR", "XOR", "NOT", "CMP")
 * @param {number} a - Operando A (generalmente el acumulador AX)
 * @param {number} b - Operando B (inmediato o registro secundario)
 * @return {number} Resultado de 8 bits (0 a 255)
 */
function ejecutarALU(operacion, a, b) {
  // Validación de seguridad por si el parámetro operacion llega vacío
  if (operacion === undefined || operacion === null) {
    throw new Error("Error: La operación de la ALU no fue especificada (es undefined o null).");
  }

  let resultado = 0;
  let carryTemp = 0;
  
  // Asegurar que los operandos estén dentro del rango de 8 bits
  a = a !== undefined ? a & 0xFF : 0;
  b = b !== undefined ? b & 0xFF : 0;
  
  // Convertir a string de forma segura antes de usar toUpperCase
  switch (String(operacion).toUpperCase()) {
    case "ADD":
      let suma = a + b;
      resultado = suma & 0xFF;
      carryTemp = (suma > 0xFF) ? 1 : 0; // Acarreo sin signo
      break;
      
    case "SUB":
    case "CMP": // CMP realiza una resta internamente sin alterar el destino
      let resta = a - b;
      resultado = (resta < 0) ? (256 + resta) & 0xFF : resta & 0xFF;
      carryTemp = (a < b) ? 1 : 0; // Préstamo / Acarreo en resta
      break;
      
    case "INC":
      let inc = a + 1;
      resultado = inc & 0xFF;
      carryTemp = (inc > 0xFF) ? 1 : 0;
      break;
      
    case "DEC":
      let dec = a - 1;
      resultado = (dec < 0) ? 255 : dec & 0xFF;
      carryTemp = (a === 0) ? 1 : 0;
      break;
      
    case "AND":
      resultado = (a & b) & 0xFF;
      carryTemp = 0;
      break;
      
    case "OR":
      resultado = (a | b) & 0xFF;
      carryTemp = 0;
      break;
      
    case "XOR":
      resultado = (a ^ b) & 0xFF;
      carryTemp = 0;
      break;
      
    case "NOT":
      resultado = (~a) & 0xFF;
      carryTemp = 0;
      break;
      
    default:
      throw new Error("Operación ALU desconocida: " + operacion);
  }
  
  // ==========================================
  // ACTUALIZACIÓN DE BANDERAS DE ESTADO (1 bit)
  // ==========================================
  
  // 1. Zero Flag (ZF): Se activa (1) si el resultado es exactamente cero
  flags.ZF = (resultado === 0) ? 1 : 0;
  
  // 2. Carry Flag (CF): Se activa (1) si ocurrió un desbordamiento o acarreo sin signo[cite: 1]
  flags.CF = carryTemp;
  
  // 3. Sign Flag (SF): Refleja el bit más significativo (MSB) del resultado[cite: 1]
  flags.SF = ((resultado & 0x80) !== 0) ? 1 : 0;
  
  // Reflejar cambios de banderas inmediatamente en la interfaz gráfica
  actualizarRegistrosUI();
  
  return resultado;
}
