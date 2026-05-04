/**
 * Sectores habituales del Cívitas Metropolitano (referencia orientativa).
 * Comprueba siempre el sector en tu entrada oficial / Ticketmaster.
 */
function range(a, b) {
  return Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
}

const lower = [...range(100, 116), ...range(118, 139)];
const middle = range(200, 239);
const upper = range(300, 339);
const high1 = [];
for (let n = 400; n <= 439; n++) {
  high1.push(String(n));
  if ([401, 402, 403, 404, 405, 406, 407, 408, 409, 410].includes(n)) {
    high1.push(`${n} B`);
  }
}
const high2 = [];
for (let n = 500; n <= 512; n++) {
  high2.push(String(n));
  if (n >= 501 && n <= 510) {
    high2.push(`${n} B`);
  }
}

const special = [
  "PISTA A",
  "PISTA B",
  "322 B",
  "MOVILIDAD REDUCIDA",
  "ACOMPAÑANTE MOVILIDAD REDUCIDA",
  "CLUB / VIP (varios)",
  "Otro / no listado",
];

export const SECTION_GROUPS = [
  { id: "tier-lower", label: "Grada baja (aprox. 100–139)", sections: lower },
  { id: "tier-mid", label: "Grada media (aprox. 200–239)", sections: middle },
  { id: "tier-upper", label: "Grada alta (aprox. 300–339)", sections: upper },
  { id: "tier-high1", label: "2ª alta (aprox. 400–439)", sections: high1 },
  { id: "tier-high2", label: "3ª alta (aprox. 500–512)", sections: high2 },
  { id: "special", label: "Pista y otros", sections: special },
];

export const ALL_SECTIONS = SECTION_GROUPS.flatMap((g) => g.sections);

export function normalizeSectionQuery(q) {
  return String(q || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}
