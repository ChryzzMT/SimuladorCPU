// ==========================================
// ESTADO PERSISTENTE DEL CPU
// GOOGLE APPS SCRIPT
// ==========================================

const PROPIEDADES_CPU = {
  PC: "CPU_PC",
  AX: "CPU_AX",
  BX: "CPU_BX",
  MAR: "CPU_MAR",
  MDR: "CPU_MDR",
  IR: "CPU_IR",

  ZF: "CPU_ZF",
  CF: "CPU_CF",
  SF: "CPU_SF",

  HALT: "CPU_HALT",
  PASO: "CPU_PASO"
};

/**
 * Guarda el estado actual del CPU.
 */
function guardarEstadoCPU() {

  const propiedades =
    PropertiesService.getScriptProperties();

  propiedades.setProperties({

    [PROPIEDADES_CPU.PC]:
      String(registers.PC),

    [PROPIEDADES_CPU.AX]:
      String(registers.AX),

    [PROPIEDADES_CPU.BX]:
      String(registers.BX),

    [PROPIEDADES_CPU.MAR]:
      String(registers.MAR),

    [PROPIEDADES_CPU.MDR]:
      String(registers.MDR),

    [PROPIEDADES_CPU.IR]:
      String(registers.IR),

    [PROPIEDADES_CPU.ZF]:
      String(flags.ZF),

    [PROPIEDADES_CPU.CF]:
      String(flags.CF),

    [PROPIEDADES_CPU.SF]:
      String(flags.SF),

    [PROPIEDADES_CPU.HALT]:
      String(cpuHalt),

    [PROPIEDADES_CPU.PASO]:
      String(pasoGlobal)
  });
}

/**
 * Carga el estado persistente.
 */
function cargarEstadoCPU() {

  const propiedades =
    PropertiesService.getScriptProperties();

  const get = (clave, defecto) => {

    const valor =
      propiedades.getProperty(clave);

    return valor === null
      ? defecto
      : valor;
  };

  registers.PC =
    Number(get(PROPIEDADES_CPU.PC, 0));

  registers.AX =
    Number(get(PROPIEDADES_CPU.AX, 0));

  registers.BX =
    Number(get(PROPIEDADES_CPU.BX, 0));

  registers.MAR =
    Number(get(PROPIEDADES_CPU.MAR, 0));

  registers.MDR =
    Number(get(PROPIEDADES_CPU.MDR, 0));

  registers.IR =
    Number(get(PROPIEDADES_CPU.IR, 0));

  flags.ZF =
    Number(get(PROPIEDADES_CPU.ZF, 0));

  flags.CF =
    Number(get(PROPIEDADES_CPU.CF, 0));

  flags.SF =
    Number(get(PROPIEDADES_CPU.SF, 0));

  cpuHalt =
    get(PROPIEDADES_CPU.HALT, "false") === "true";

  pasoGlobal =
    Number(get(PROPIEDADES_CPU.PASO, 0));
}

/**
 * Elimina el estado persistente.
 */
function limpiarEstadoCPU() {

  PropertiesService
    .getScriptProperties()
    .deleteAllProperties();
}
