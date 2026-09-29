// Formato de instrucción: [opcode, operando1, operando2]
const ISA = {
  HLT:     { op: 0,  size: 1, desc: "Detiene el reloj" },
  MOV_IMM: { op: 1,  size: 3, desc: "MOV reg, imm" },
  MOV_REG: { op: 2,  size: 3, desc: "MOV reg, reg" },
  LOAD:    { op: 3,  size: 3, desc: "LOAD reg, [dir]" },
  STORE:   { op: 4,  size: 3, desc: "STORE [dir], reg" },
  ADD_IMM: { op: 5,  size: 3, desc: "ADD reg, imm" },
  ADD_REG: { op: 6,  size: 3, desc: "ADD reg, reg" },
  SUB_IMM: { op: 7,  size: 3, desc: "SUB reg, imm" },
  SUB_REG: { op: 8,  size: 3, desc: "SUB reg, reg" },
  INC:     { op: 9,  size: 2, desc: "INC reg" },
  DEC:     { op: 10, size: 2, desc: "DEC reg" },
  AND:     { op: 11, size: 3, desc: "AND reg, reg" },
  OR:      { op: 12, size: 3, desc: "OR reg, reg" },
  XOR:     { op: 13, size: 3, desc: "XOR reg, reg" },
  NOT:     { op: 14, size: 2, desc: "NOT reg" },
  CMP_IMM: { op: 15, size: 3, desc: "CMP reg, imm" },
  CMP_REG: { op: 16, size: 3, desc: "CMP reg, reg" },
  JMP:     { op: 17, size: 2, desc: "JMP dir" },
  JZ:      { op: 18, size: 2, desc: "Salta si ZF=1" },
  JNZ:     { op: 19, size: 2, desc: "Salta si ZF=0" }
};


function infoOpcode(op) {
  for (var n in ISA) {
    if (ISA[n].op === op) return { nombre: n, size: ISA[n].size, desc: ISA[n].desc };
  }
  return null;
}


function numeroHex(v) {
  var h = (Number(v) & 0xFF).toString(16).toUpperCase();
  return (h.length < 2 ? "0" + h : h) + "h";
}


function binario8(v) {
  var b = (Number(v) & 0xFF).toString(2);
  while (b.length < 8) b = "0" + b;
  return b;
}

