const ENSAMBLADOR_CONFIG = {
  hojaPrograma: "Programa",
  columnaPrograma: 1,
  filaInicio: 1,

  direccionDatosInicio: 0x00,
  direccionDatosFin: 0x7F,

  direccionCodigoInicio: 0x80,
  direccionCodigoFin: 0xFF
};

const REGISTROS_ASM = {
  AX: 0,
  BX: 1
};

const OPCODES_ASM = {
  HLT: 0,

  MOV_IMM: 1,
  MOV_MEM: 2,
  MOV_REG: 3,

  ADD_IMM: 4,
  ADD_MEM: 5,
  ADD_REG: 6,

  SUB_IMM: 7,
  SUB_MEM: 8,
  SUB_REG: 9,

  INC: 10,
  DEC: 11,

  AND: 12,
  OR: 13,
  XOR: 14,
  NOT: 15,

  JMP: 16,
  JZ: 17,

  LOAD: 18,
  STORE: 19,

  CMP_IMM: 20,
  CMP_REG: 21,

  JNZ: 22
};


/*
========================================================
  FUNCIÓN PRINCIPAL DEL ENSAMBLADOR
========================================================
*/

function ensamblarPrograma() {

  var sheetPrograma = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(ENSAMBLADOR_CONFIG.hojaPrograma);

  if (!sheetPrograma) {
    throw new Error(
      'No existe la hoja "' +
      ENSAMBLADOR_CONFIG.hojaPrograma +
      '".'
    );
  }

  var ultimaFila = sheetPrograma.getLastRow();

  if (ultimaFila === 0) {
    throw new Error(
      "La hoja Programa está vacía."
    );
  }

  var valores = sheetPrograma
    .getRange(
      ENSAMBLADOR_CONFIG.filaInicio,
      ENSAMBLADOR_CONFIG.columnaPrograma,
      ultimaFila,
      1
    )
    .getValues();

  var lineas = [];

  for (var i = 0; i < valores.length; i++) {

    var linea = String(valores[i][0] || "");

    lineas.push(linea);
  }

  /*
  ------------------------------------------------------
  1. LIMPIAR COMENTARIOS Y ESPACIOS
  ------------------------------------------------------
  */

  var lineasLimpias = [];

  for (var j = 0; j < lineas.length; j++) {

    var texto = lineas[j];

    /*
      Todo lo que esté después de ; es comentario.
    */

    texto = texto.split(";")[0].trim();

    if (texto !== "") {
      lineasLimpias.push(texto);
    }
  }

  if (lineasLimpias.length === 0) {
    throw new Error(
      "No se encontraron instrucciones."
    );
  }

  /*
  ------------------------------------------------------
  2. SEPARAR DATA Y CODE
  ------------------------------------------------------
  */

  var seccion = "";

  var datos = [];
  var instrucciones = [];

  for (var k = 0; k < lineasLimpias.length; k++) {

    var lineaActual = lineasLimpias[k];
    var mayuscula = lineaActual.toUpperCase();

    if (mayuscula === "DATA") {
      seccion = "DATA";
      continue;
    }

    if (mayuscula === "CODE") {
      seccion = "CODE";
      continue;
    }

    if (seccion === "DATA") {
      datos.push(lineaActual);
    }
    else if (seccion === "CODE") {
      instrucciones.push(lineaActual);
    }
    else {
      throw new Error(
        "Debe aparecer DATA o CODE antes de las instrucciones."
      );
    }
  }

  /*
  ------------------------------------------------------
  3. PROCESAR DATA
  ------------------------------------------------------
  */

  var tablaDatos = {};
  var direccionDatos = ENSAMBLADOR_CONFIG.direccionDatosInicio;

  for (var d = 0; d < datos.length; d++) {

    procesarDeclaracionDato(
      datos[d],
      tablaDatos,
      direccionDatos
    );

    direccionDatos++;
  }

  if (
    direccionDatos - 1 >
    ENSAMBLADOR_CONFIG.direccionDatosFin
  ) {

    throw new Error(
      "El segmento DATA supera las 128 posiciones disponibles (00h-7Fh)."
    );
  }

  /*
  ------------------------------------------------------
  4. PRIMERA PASADA:
     DETERMINAR DIRECCIONES DE ETIQUETAS
  ------------------------------------------------------
  */

  var etiquetas = {};
  var direccionCodigo =
    ENSAMBLADOR_CONFIG.direccionCodigoInicio;

  for (var p = 0; p < instrucciones.length; p++) {

    var linea = instrucciones[p];

    /*
      Puede existir:

      inicio:

      o:

      inicio: MOV AX, 5
    */

    var resultadoEtiqueta =
      extraerEtiqueta(linea);

    if (resultadoEtiqueta.etiqueta !== null) {

      var nombreEtiqueta =
        resultadoEtiqueta.etiqueta;

      if (
        etiquetas.hasOwnProperty(nombreEtiqueta)
      ) {
        throw new Error(
          "Etiqueta duplicada: " +
          nombreEtiqueta
        );
      }

      etiquetas[nombreEtiqueta] =
        direccionCodigo;

      linea =
        resultadoEtiqueta.restante;

      instrucciones[p] = linea;
    }

    if (linea.trim() === "") {
      continue;
    }

    var bytes =
      calcularTamanoInstruccion(
        linea
      );

    direccionCodigo += bytes;

    if (
      direccionCodigo >
      ENSAMBLADOR_CONFIG.direccionCodigoFin + 1
    ) {
      throw new Error(
        "El segmento CODE supera la memoria disponible (80h-FFh)."
      );
    }
  }

  /*
  ------------------------------------------------------
  5. SEGUNDA PASADA:
     GENERAR CÓDIGO MAQUINA
  ------------------------------------------------------
  */

  var codigoMaquina = [];

  direccionCodigo =
    ENSAMBLADOR_CONFIG.direccionCodigoInicio;

  for (var c = 0; c < instrucciones.length; c++) {

    var instruccion =
      instrucciones[c].trim();

    if (instruccion === "") {
      continue;
    }

    var bytesInstruccion =
      ensamblarInstruccion(
        instruccion,
        tablaDatos,
        etiquetas
      );

    for (
      var b = 0;
      b < bytesInstruccion.length;
      b++
    ) {

      codigoMaquina.push({
        direccion: direccionCodigo,
        valor: bytesInstruccion[b]
      });

      direccionCodigo++;
    }
  }

  /*
  ------------------------------------------------------
  6. CARGAR DATA EN RAM
  ------------------------------------------------------
  */

  var sheetSimulador =
    obtenerHojaSimulador();

  /*
    Limpiamos los segmentos utilizados.
  */

  for (
    var rd =
      ENSAMBLADOR_CONFIG.direccionDatosInicio;
    rd <= ENSAMBLADOR_CONFIG.direccionDatosFin;
    rd++
  ) {

    writeRAM(
      rd,
      0
    );
  }

  for (
    var rc =
      ENSAMBLADOR_CONFIG.direccionCodigoInicio;
    rc <= ENSAMBLADOR_CONFIG.direccionCodigoFin;
    rc++
  ) {

    writeRAM(
      rc,
      0
    );
  }

  /*
    Escribir variables.
  */

  for (
    var nombre in tablaDatos
  ) {

    if (
      tablaDatos.hasOwnProperty(nombre)
    ) {

      writeRAM(
        tablaDatos[nombre].direccion,
        tablaDatos[nombre].valor
      );
    }
  }

  /*
  ------------------------------------------------------
  7. CARGAR CODE EN RAM
  ------------------------------------------------------
  */

  for (
    var cm = 0;
    cm < codigoMaquina.length;
    cm++
  ) {

    writeRAM(
      codigoMaquina[cm].direccion,
      codigoMaquina[cm].valor
    );
  }

  /*
  ------------------------------------------------------
  8. INICIALIZAR PC
  ------------------------------------------------------
  */

  registers.PC =
    ENSAMBLADOR_CONFIG.direccionCodigoInicio;

  registers.MAR = 0;
  registers.MDR = 0;
  registers.IR = 0;

  actualizarRegistrosUI();

  if (typeof guardarEstadoCPU === "function") {
    guardarEstadoCPU();
  }

  /*
  ------------------------------------------------------
  9. MOSTRAR RESULTADO
  ------------------------------------------------------
  */

  mostrarResultadoEnsamblador(
    tablaDatos,
    etiquetas,
    codigoMaquina
  );

  SpreadsheetApp
    .getActiveSpreadsheet()
    .toast(
      "Programa ensamblado y cargado correctamente.",
      "ASSEMBLER",
      5
    );

  return {
    datos: tablaDatos,
    etiquetas: etiquetas,
    codigo: codigoMaquina
  };
}


/*
========================================================
  DATA
========================================================
*/

function procesarDeclaracionDato(
  linea,
  tablaDatos,
  direccion
) {

  var partes =
    linea.split("=");

  if (partes.length !== 2) {

    throw new Error(
      "Declaración DATA inválida: " +
      linea
    );
  }

  var nombre =
    partes[0].trim().toUpperCase();

  var valorTexto =
    partes[1].trim();

  if (!/^[A-Z_][A-Z0-9_]*$/i.test(nombre)) {

    throw new Error(
      "Nombre de variable inválido: " +
      nombre
    );
  }

  if (
    tablaDatos.hasOwnProperty(nombre)
  ) {

    throw new Error(
      "Variable DATA duplicada: " +
      nombre
    );
  }

  var valor =
    convertirNumeroAsm(
      valorTexto
    );

  if (
    valor < 0 ||
    valor > 255
  ) {

    throw new Error(
      "El valor de " +
      nombre +
      " debe estar entre 0 y 255."
    );
  }

  tablaDatos[nombre] = {
    direccion: direccion,
    valor: valor
  };
}


/*
========================================================
  ETIQUETAS
========================================================
*/

function extraerEtiqueta(linea) {

  var resultado = {
    etiqueta: null,
    restante: linea
  };

  var posicion =
    linea.indexOf(":");

  if (posicion === -1) {
    return resultado;
  }

  var nombre =
    linea
      .substring(0, posicion)
      .trim()
      .toUpperCase();

  if (
    !/^[A-Z_][A-Z0-9_]*$/i.test(nombre)
  ) {

    throw new Error(
      "Nombre de etiqueta inválido: " +
      nombre
    );
  }

  resultado.etiqueta = nombre;

  resultado.restante =
    linea
      .substring(posicion + 1)
      .trim();

  return resultado;
}


/*
========================================================
  TAMAÑO DE INSTRUCCIÓN
========================================================
*/

function calcularTamanoInstruccion(
  linea
) {

  var partes =
    separarInstruccion(linea);

  var op =
    partes.operacion;

  if (op === "HLT") {
    return 1;
  }

  if (
    op === "INC" ||
    op === "DEC" ||
    op === "NOT"
  ) {
    return 2;
  }

  if (
    op === "JMP" ||
    op === "JZ" ||
    op === "JNZ"
  ) {
    return 2;
  }

  if (
    op === "MOV" ||
    op === "ADD" ||
    op === "SUB" ||
    op === "AND" ||
    op === "OR" ||
    op === "XOR" ||
    op === "CMP" ||
    op === "LOAD" ||
    op === "STORE"
  ) {
    return 3;
  }

  throw new Error(
    "Instrucción desconocida: " +
    op
  );
}


/*
========================================================
  ENSAMBLAR UNA INSTRUCCIÓN
========================================================
*/

function ensamblarInstruccion(
  linea,
  tablaDatos,
  etiquetas
) {

  var partes =
    separarInstruccion(linea);

  var op =
    partes.operacion;

  var args =
    partes.argumentos;

  /*
  ------------------------------------------------------
  HLT
  ------------------------------------------------------
  */

  if (op === "HLT") {

    if (args.length !== 0) {
      errorArgumentos(linea);
    }

    return [
      OPCODES_ASM.HLT
    ];
  }


  /*
  ------------------------------------------------------
  INC
  ------------------------------------------------------
  */

  if (op === "INC") {

    verificarCantidad(
      args,
      1,
      linea
    );

    return [
      OPCODES_ASM.INC,
      obtenerRegistro(args[0], linea)
    ];
  }


  /*
  ------------------------------------------------------
  DEC
  ------------------------------------------------------
  */

  if (op === "DEC") {

    verificarCantidad(
      args,
      1,
      linea
    );

    return [
      OPCODES_ASM.DEC,
      obtenerRegistro(args[0], linea)
    ];
  }


  /*
  ------------------------------------------------------
  NOT
  ------------------------------------------------------
  */

  if (op === "NOT") {

    verificarCantidad(
      args,
      1,
      linea
    );

    return [
      OPCODES_ASM.NOT,
      obtenerRegistro(args[0], linea)
    ];
  }


  /*
  ------------------------------------------------------
  JMP / JZ / JNZ
  ------------------------------------------------------
  */

  if (
    op === "JMP" ||
    op === "JZ" ||
    op === "JNZ"
  ) {

    verificarCantidad(
      args,
      1,
      linea
    );

    var direccionSalto =
      obtenerDireccionSalto(
        args[0],
        etiquetas,
        linea
      );

    var opcodeSalto;

    if (op === "JMP") {
      opcodeSalto = OPCODES_ASM.JMP;
    }
    else if (op === "JZ") {
      opcodeSalto = OPCODES_ASM.JZ;
    }
    else {
      opcodeSalto = OPCODES_ASM.JNZ;
    }

    return [
      opcodeSalto,
      direccionSalto
    ];
  }


  /*
  ------------------------------------------------------
  MOV
  ------------------------------------------------------
  */

  if (op === "MOV") {

    verificarCantidad(
      args,
      2,
      linea
    );

    var destino =
      obtenerRegistro(
        args[0],
        linea
      );

    var fuente =
      args[1].trim();

    /*
      MOV AX, [variable]
    */

    if (esMemoria(fuente)) {

      var direccionMem =
        obtenerDireccionMemoria(
          fuente,
          tablaDatos,
          linea
        );

      return [
        OPCODES_ASM.MOV_MEM,
        destino,
        direccionMem
      ];
    }

    /*
      MOV AX, BX
    */

    if (esRegistro(fuente)) {

      var registroFuente =
        obtenerRegistro(
          fuente,
          linea
        );

      return [
        OPCODES_ASM.MOV_REG,
        destino,
        registroFuente
      ];
    }

    /*
      MOV AX, 10
    */

    var inmediato =
      convertirNumeroAsm(fuente);

    return [
      OPCODES_ASM.MOV_IMM,
      destino,
      inmediato
    ];
  }


  /*
  ------------------------------------------------------
  ADD
  ------------------------------------------------------
  */

  if (op === "ADD") {

    verificarCantidad(
      args,
      2,
      linea
    );

    return ensamblarOperacionAritmetica(
      args,
      linea,
      OPCODES_ASM.ADD_IMM,
      OPCODES_ASM.ADD_MEM,
      OPCODES_ASM.ADD_REG,
      tablaDatos
    );
  }


  /*
  ------------------------------------------------------
  SUB
  ------------------------------------------------------
  */

  if (op === "SUB") {

    verificarCantidad(
      args,
      2,
      linea
    );

    return ensamblarOperacionAritmetica(
      args,
      linea,
      OPCODES_ASM.SUB_IMM,
      OPCODES_ASM.SUB_MEM,
      OPCODES_ASM.SUB_REG,
      tablaDatos
    );
  }


  /*
  ------------------------------------------------------
  AND
  ------------------------------------------------------
  */

  if (op === "AND") {

    verificarCantidad(
      args,
      2,
      linea
    );

    return ensamblarLogicaRegistro(
      args,
      linea,
      OPCODES_ASM.AND
    );
  }


  /*
  ------------------------------------------------------
  OR
  ------------------------------------------------------
  */

  if (op === "OR") {

    verificarCantidad(
      args,
      2,
      linea
    );

    return ensamblarLogicaRegistro(
      args,
      linea,
      OPCODES_ASM.OR
    );
  }


  /*
  ------------------------------------------------------
  XOR
  ------------------------------------------------------
  */

  if (op === "XOR") {

    verificarCantidad(
      args,
      2,
      linea
    );

    return ensamblarLogicaRegistro(
      args,
      linea,
      OPCODES_ASM.XOR
    );
  }


  /*
  ------------------------------------------------------
  LOAD
  ------------------------------------------------------
  */

  if (op === "LOAD") {

    verificarCantidad(
      args,
      2,
      linea
    );

    var regLoad =
      obtenerRegistro(
        args[0],
        linea
      );

    var dirLoad =
      obtenerDireccionMemoria(
        args[1],
        tablaDatos,
        linea
      );

    return [
      OPCODES_ASM.LOAD,
      regLoad,
      dirLoad
    ];
  }


  /*
  ------------------------------------------------------
  STORE
  ------------------------------------------------------
  */

  if (op === "STORE") {

    verificarCantidad(
      args,
      2,
      linea
    );

    var dirStore =
      obtenerDireccionMemoria(
        args[0],
        tablaDatos,
        linea
      );

    var regStore =
      obtenerRegistro(
        args[1],
        linea
      );

    return [
      OPCODES_ASM.STORE,
      dirStore,
      regStore
    ];
  }


  /*
  ------------------------------------------------------
  CMP
  ------------------------------------------------------
  */

  if (op === "CMP") {

    verificarCantidad(
      args,
      2,
      linea
    );

    var regCmp =
      obtenerRegistro(
        args[0],
        linea
      );

    var segundoCmp =
      args[1].trim();

    /*
      CMP AX, BX
    */

    if (esRegistro(segundoCmp)) {

      return [
        OPCODES_ASM.CMP_REG,
        regCmp,
        obtenerRegistro(
          segundoCmp,
          linea
        )
      ];
    }

    /*
      CMP AX, 0
    */

    var valorCmp =
      convertirNumeroAsm(
        segundoCmp
      );

    return [
      OPCODES_ASM.CMP_IMM,
      regCmp,
      valorCmp
    ];
  }


  throw new Error(
    "Instrucción no reconocida: " +
    op
  );
}


/*
========================================================
  OPERACIONES ARITMÉTICAS
========================================================
*/

function ensamblarOperacionAritmetica(
  args,
  linea,
  opcodeImm,
  opcodeMem,
  opcodeReg,
  tablaDatos
) {

  var destino =
    obtenerRegistro(
      args[0],
      linea
    );

  var fuente =
    args[1].trim();

  if (esMemoria(fuente)) {

    var direccion =
      obtenerDireccionMemoria(
        fuente,
        tablaDatos,
        linea
      );

    return [
      opcodeMem,
      destino,
      direccion
    ];
  }

  if (esRegistro(fuente)) {

    return [
      opcodeReg,
      destino,
      obtenerRegistro(
        fuente,
        linea
      )
    ];
  }

  var inmediato =
    convertirNumeroAsm(
      fuente
    );

  return [
    opcodeImm,
    destino,
    inmediato
  ];
}


/*
========================================================
  OPERACIONES LÓGICAS
========================================================
*/

function ensamblarLogicaRegistro(
  args,
  linea,
  opcode
) {

  var destino =
    obtenerRegistro(
      args[0],
      linea
    );

  var fuente =
    obtenerRegistro(
      args[1],
      linea
    );

  return [
    opcode,
    destino,
    fuente
  ];
}


/*
========================================================
  PARSER
========================================================
*/

function separarInstruccion(
  linea
) {

  var texto =
    linea.trim();

  var espacio =
    texto.indexOf(" ");

  if (espacio === -1) {

    return {
      operacion:
        texto.toUpperCase(),
      argumentos: []
    };
  }

  var operacion =
    texto
      .substring(0, espacio)
      .trim()
      .toUpperCase();

  var textoArgumentos =
    texto
      .substring(espacio + 1)
      .trim();

  var argumentos =
    separarArgumentos(
      textoArgumentos
    );

  return {
    operacion: operacion,
    argumentos: argumentos
  };
}


function separarArgumentos(
  texto
) {

  var resultado = [];

  var actual = "";
  var corchetes = false;

  for (
    var i = 0;
    i < texto.length;
    i++
  ) {

    var caracter =
      texto.charAt(i);

    if (caracter === "[") {
      corchetes = true;
    }

    if (caracter === "]") {
      corchetes = false;
    }

    if (
      caracter === "," &&
      !corchetes
    ) {

      resultado.push(
        actual.trim()
      );

      actual = "";

    } else {

      actual += caracter;
    }
  }

  if (actual.trim() !== "") {

    resultado.push(
      actual.trim()
    );
  }

  return resultado;
}


/*
========================================================
  REGISTROS
========================================================
*/

function esRegistro(
  texto
) {

  if (!texto) {
    return false;
  }

  return REGISTROS_ASM
    .hasOwnProperty(
      texto.trim().toUpperCase()
    );
}


function obtenerRegistro(
  texto,
  linea
) {

  var registro =
    texto
      .trim()
      .toUpperCase();

  if (
    !REGISTROS_ASM.hasOwnProperty(
      registro
    )
  ) {

    throw new Error(
      "Registro inválido en: " +
      linea
    );
  }

  return REGISTROS_ASM[
    registro
  ];
}


/*
========================================================
  MEMORIA
========================================================
*/

function esMemoria(
  texto
) {

  var valor =
    texto.trim();

  return (
    valor.startsWith("[") &&
    valor.endsWith("]")
  );
}


function obtenerDireccionMemoria(
  texto,
  tablaDatos,
  linea
) {

  var contenido =
    texto
      .trim()
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .trim();

  var nombre =
    contenido.toUpperCase();

  /*
    [contador]
  */

  if (
    tablaDatos.hasOwnProperty(nombre)
  ) {

    return tablaDatos[nombre].direccion;
  }

  /*
    [80h]
    [0x80]
    [128]
  */

  var numero =
    convertirNumeroAsm(
      contenido
    );

  return numero;
}


/*
========================================================
  SALTOS
========================================================
*/

function obtenerDireccionSalto(
  texto,
  etiquetas,
  linea
) {

  var destino =
    texto
      .trim()
      .toUpperCase();

  /*
    JMP bucle
  */

  if (
    etiquetas.hasOwnProperty(
      destino
    )
  ) {

    return etiquetas[destino];
  }

  /*
    JMP 90h
  */

  return convertirNumeroAsm(
    destino
  );
}


/*
========================================================
  NÚMEROS
========================================================
*/

function convertirNumeroAsm(
  texto
) {

  var valor =
    String(texto)
      .trim()
      .toUpperCase();

  var numero;

  /*
    Hexadecimal 0xFF
  */

  if (
    /^0X[0-9A-F]+$/.test(valor)
  ) {

    numero =
      parseInt(
        valor.substring(2),
        16
      );
  }

  /*
    Hexadecimal FFh
  */

  else if (
    /^[0-9A-F]+H$/.test(valor)
  ) {

    numero =
      parseInt(
        valor.substring(
          0,
          valor.length - 1
        ),
        16
      );
  }

  /*
    Decimal
  */

  else if (
    /^\d+$/.test(valor)
  ) {

    numero =
      parseInt(
        valor,
        10
      );
  }

  else {

    throw new Error(
      "Número inválido: " +
      texto
    );
  }

  if (
    isNaN(numero) ||
    numero < 0 ||
    numero > 255
  ) {

    throw new Error(
      "El valor debe estar entre 0 y 255: " +
      texto
    );
  }

  return numero;
}


/*
========================================================
  VALIDACIONES
========================================================
*/

function verificarCantidad(
  argumentos,
  cantidad,
  linea
) {

  if (
    argumentos.length !== cantidad
  ) {

    throw new Error(
      "Cantidad incorrecta de argumentos: " +
      linea
    );
  }
}


function errorArgumentos(
  linea
) {

  throw new Error(
    "Argumentos inválidos: " +
    linea
  );
}


/*
========================================================
  MOSTRAR RESULTADO DEL ENSAMBLADO
========================================================
*/

function mostrarResultadoEnsamblador(
  tablaDatos,
  etiquetas,
  codigoMaquina
) {

  var sheet =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName(
        ENSAMBLADOR_CONFIG.hojaPrograma
      );

  /*
    Eliminamos información anterior
    desde la columna C.
  */

  sheet
    .getRange(
      1,
      3,
      sheet.getMaxRows(),
      5
    )
    .clearContent();

  /*
    Encabezados
  */

  sheet
    .getRange("C1:G1")
    .setValues([
      [
        "Dirección",
        "Tipo",
        "Nombre",
        "Valor",
        "Código"
      ]
    ]);

  var fila = 2;

  /*
    DATA
  */

  for (
    var nombre in tablaDatos
  ) {

    if (
      tablaDatos.hasOwnProperty(nombre)
    ) {

      var dato =
        tablaDatos[nombre];

      sheet
        .getRange(
          fila,
          3,
          1,
          5
        )
        .setValues([
          [
            numeroHex(
              dato.direccion
            ),
            "DATA",
            nombre,
            dato.valor,
            convertirByteHex(
              dato.valor
            )
          ]
        ]);

      fila++;
    }
  }

  /*
    ETIQUETAS
  */

  for (
    var etiqueta in etiquetas
  ) {

    if (
      etiquetas.hasOwnProperty(
        etiqueta
      )
    ) {

      sheet
        .getRange(
          fila,
          3,
          1,
          5
        )
        .setValues([
          [
            numeroHex(
              etiquetas[etiqueta]
            ),
            "LABEL",
            etiqueta,
            "",
            ""
          ]
        ]);

      fila++;
    }
  }

  /*
    CODE
  */

  for (
    var i = 0;
    i < codigoMaquina.length;
    i++
  ) {

    var byte =
      codigoMaquina[i];

    sheet
      .getRange(
        fila,
        3,
        1,
        5
      )
      .setValues([
        [
          numeroHex(
            byte.direccion
          ),
          "CODE",
          "",
          byte.valor,
          convertirByteHex(
            byte.valor
          )
        ]
      ]);

    fila++;
  }
}


/*
========================================================
  FORMATO
========================================================
*/

function convertirByteHex(
  valor
) {

  var resultado =
    valor.toString(16)
      .toUpperCase();

  if (
    resultado.length < 2
  ) {

    resultado =
      "0" + resultado;
  }

  return resultado + "h";
}


function numeroHex(
  valor
) {

  var resultado =
    valor.toString(16)
      .toUpperCase();

  if (
    resultado.length < 2
  ) {

    resultado =
      "0" + resultado;
  }

  return resultado + "h";
}

