#!/usr/bin/env python3
"""
Busca en el código los anti-patrones que prohíbe el skill app-dev-standards.

Uso:
    python scan_antipatterns.py <ruta>
    python scan_antipatterns.py <ruta> --json
    python scan_antipatterns.py <ruta> --solo alta

No entiende semántica: produce falsos positivos y no reemplaza la revisión
humana. Su valor está en encontrar la segunda y la tercera ocurrencia de un
patrón — que es justo lo que se olvida buscar al corregir la primera.
"""

import argparse
import json
import re
import sys
from pathlib import Path

EXTS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte"}
SKIP_DIRS = {
    "node_modules", ".git", "dist", "build", ".next", ".vercel",
    "coverage", "vendor", ".venv", "venv", "__pycache__", ".turbo",
}

# (id, severidad, regex, mensaje, referencia)
REGLAS = [
    (
        "catch-vacio", "alta",
        re.compile(r"catch\s*\([^)]*\)\s*\{\s*\}"),
        "catch vacío: convierte un fallo en un resultado plausible",
        "errores-y-diagnostico.md §2",
    ),
    (
        "catch-solo-log", "alta",
        re.compile(r"catch\s*\([^)]*\)\s*\{\s*console\.(log|error|warn)\([^)]*\)\s*;?\s*\}"),
        "catch que solo loguea: el error se pierde y la función devuelve algo inválido",
        "errores-y-diagnostico.md §2",
    ),
    (
        "tipo-any", "media",
        re.compile(r":\s*any\b|<any>|as\s+any\b|Array<any>"),
        "tipo `any`: apaga la verificación y se propaga aguas abajo",
        "errores-y-diagnostico.md §1",
    ),
    (
        "credencial-hardcodeada", "alta",
        re.compile(
            r"""(?ix)
            (api[_-]?key|apikey|secret|service[_-]?role|password|passwd|token|bearer)
            \s*[:=]\s*
            ['"][A-Za-z0-9_\-\.]{20,}['"]
            """
        ),
        "credencial hardcodeada: debe vivir en variables de entorno",
        "SKILL.md · Higiene de proyecto",
    ),
    (
        "jwt-literal", "alta",
        re.compile(r"['\"]eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"),
        "JWT literal en el código (posible clave de Supabase)",
        "SKILL.md · Higiene de proyecto",
    ),
    (
        "onclick-inline", "media",
        re.compile(r"""\bon(click|change|input|submit|mouseover)\s*=\s*['"][^'"]*\("""),
        "handler inline en HTML: usa data attributes + event delegation",
        "arquitectura.md §4",
    ),
    (
        "innerhtml-interpolado", "alta",
        re.compile(r"innerHTML\s*(\+)?=\s*[`'\"][^`'\"]*\$\{"),
        "innerHTML con interpolación: escapa el contenido dinámico",
        "frontend-ux.md §2",
    ),
    (
        "console-log-olvidado", "baja",
        re.compile(r"^[ \t]*console\.log\(", re.MULTILINE),
        "console.log: retirar los logs de diagnóstico antes de cerrar",
        "errores-y-diagnostico.md §4",
    ),
    (
        "migracion-no-idempotente", "media",
        re.compile(r"(?i)\b(create\s+table|create\s+index|drop\s+table|drop\s+index)\s+(?!.*if\s+(not\s+)?exists)"),
        "migración no idempotente: usa IF NOT EXISTS / IF EXISTS",
        "datos-supabase.md §8",
    ),
]

# Estado local mutado y solo después un await de red -> optimistic sin rollback.
SETTER = re.compile(
    r"^\s*(set[A-Z]\w*\s*\(|state\.\w+\s*=|\w+\.setState\s*\(|store\.\w+\s*=)"
)
RED = re.compile(r"\b(await\s+)?(fetch|axios|supabase)\b")
CHEQUEO = re.compile(r"\b(res|resp|response|r)\s*\.\s*ok\b|status\s*[=!]==?\s*2\d\d|\.error\b|catch\s*\(")


FIN_BLOQUE = re.compile(r"^\s{0,2}\}|^\s*(export\s+)?(async\s+)?function\b|^\s*(const|let)\s+\w+\s*=\s*(async\s*)?\(")


def _ventana(lineas, i, largo=8):
    """Líneas siguientes a i, cortando al salir del bloque actual.

    Sin este corte, la verificación `res.ok` de la función siguiente suprime
    el hallazgo de la anterior — el falso negativo más caro del escáner.
    """
    out = []
    for ln in lineas[i + 1 : i + 1 + largo]:
        if FIN_BLOQUE.match(ln):
            break
        out.append(ln)
    return out


def buscar_optimistic(lineas):
    """Setter de estado seguido de llamada de red sin verificación posterior."""
    hits = []
    for i, ln in enumerate(lineas):
        if not SETTER.search(ln) or ln.lstrip().startswith(("//", "*")):
            continue
        ventana = _ventana(lineas, i)
        if not any(RED.search(w) for w in ventana):
            continue
        if any(CHEQUEO.search(w) for w in ventana):
            continue
        hits.append(i + 1)
    return hits


SELECT_ESTRELLA = re.compile(r"\.select\(\s*(['\"])\*\1\s*\)")
ACOTA = re.compile(r"\.(limit|range|single|maybeSingle)\s*\(")


def buscar_select_sin_limite(texto, lineas):
    """select('*') sin limit/range dentro de la misma sentencia.

    Se acota al statement (hasta el `;`) y no a un número fijo de caracteres:
    con una ventana fija, un `.limit()` de la línea siguiente enmascara el caso.
    """
    hits = []
    for m in SELECT_ESTRELLA.finditer(texto):
        fin = texto.find(";", m.end())
        stmt = texto[m.start(): fin if fin != -1 else m.end() + 200]
        if ACOTA.search(stmt):
            continue
        n = texto.count("\n", 0, m.start()) + 1
        if n <= len(lineas) and lineas[n - 1].lstrip().startswith(("//", "*")):
            continue
        hits.append(n)
    return hits


def escanear(raiz):
    hallazgos = []
    archivos = 0
    raiz = Path(raiz)
    patrones = list(EXTS) + [".sql"]
    for f in raiz.rglob("*"):
        if not f.is_file() or f.suffix not in patrones:
            continue
        if any(p in SKIP_DIRS for p in f.parts):
            continue
        try:
            texto = f.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        archivos += 1
        lineas = texto.splitlines()
        rel = str(f.relative_to(raiz))

        for rid, sev, rx, msg, ref in REGLAS:
            es_sql = rid == "migracion-no-idempotente"
            if es_sql != (f.suffix == ".sql"):
                continue
            for m in rx.finditer(texto):
                n = texto.count("\n", 0, m.start()) + 1
                linea = lineas[n - 1].strip() if n <= len(lineas) else ""
                if linea.startswith(("//", "*", "--", "#")):
                    continue
                hallazgos.append(
                    {"archivo": rel, "linea": n, "regla": rid, "severidad": sev,
                     "mensaje": msg, "referencia": ref, "codigo": linea[:110]}
                )

        if f.suffix in EXTS:
            for n in buscar_optimistic(lineas):
                hallazgos.append(
                    {"archivo": rel, "linea": n, "regla": "optimistic-sin-verificacion",
                     "severidad": "alta",
                     "mensaje": "estado actualizado antes de confirmar la respuesta del backend",
                     "referencia": "SKILL.md · invariante 1",
                     "codigo": lineas[n - 1].strip()[:110]}
                )
            for n in buscar_select_sin_limite(texto, lineas):
                hallazgos.append(
                    {"archivo": rel, "linea": n, "regla": "select-sin-limite",
                     "severidad": "media",
                     "mensaje": "select('*') sin limit/range: se trunca en silencio al crecer la tabla",
                     "referencia": "datos-supabase.md §5",
                     "codigo": lineas[n - 1].strip()[:110]}
                )

    vistos, unicos = set(), []
    for h in hallazgos:
        clave = (h["archivo"], h["linea"], h["regla"])
        if clave in vistos:
            continue
        vistos.add(clave)
        unicos.append(h)
    return unicos, archivos


def main():
    ap = argparse.ArgumentParser(description="Escanea anti-patrones de app-dev-standards")
    ap.add_argument("ruta")
    ap.add_argument("--json", action="store_true", help="salida JSON procesable")
    ap.add_argument("--solo", choices=["alta", "media", "baja"], help="severidad mínima")
    args = ap.parse_args()

    if not Path(args.ruta).exists():
        print(f"No existe la ruta: {args.ruta}", file=sys.stderr)
        return 2

    hallazgos, archivos = escanear(args.ruta)
    if args.solo:
        orden = {"alta": 3, "media": 2, "baja": 1}
        hallazgos = [h for h in hallazgos if orden[h["severidad"]] >= orden[args.solo]]

    if args.json:
        print(json.dumps({"archivos": archivos, "hallazgos": hallazgos},
                         indent=2, ensure_ascii=False))
        return 1 if any(h["severidad"] == "alta" for h in hallazgos) else 0

    print(f"\nEscaneados {archivos} archivos en {args.ruta}")
    if not hallazgos:
        print("Sin hallazgos.\n")
        return 0

    orden = {"alta": 0, "media": 1, "baja": 2}
    hallazgos.sort(key=lambda h: (orden[h["severidad"]], h["regla"], h["archivo"], h["linea"]))

    por_regla = {}
    for h in hallazgos:
        por_regla.setdefault((h["severidad"], h["regla"], h["mensaje"], h["referencia"]), []).append(h)

    sev_actual = None
    for (sev, regla, msg, ref), items in por_regla.items():
        if sev != sev_actual:
            print(f"\n{'=' * 66}\nSEVERIDAD {sev.upper()}\n{'=' * 66}")
            sev_actual = sev
        print(f"\n  {regla} — {len(items)} ocurrencia(s)")
        print(f"  {msg}")
        print(f"  → ver {ref}")
        for h in items[:8]:
            print(f"      {h['archivo']}:{h['linea']}  {h['codigo']}")
        if len(items) > 8:
            print(f"      ... y {len(items) - 8} más")

    altas = sum(1 for h in hallazgos if h["severidad"] == "alta")
    print(f"\n{'-' * 66}")
    print(f"Total: {len(hallazgos)} hallazgos ({altas} de severidad alta)")
    print("Revisa a mano: el escáner no entiende semántica y da falsos positivos.\n")
    return 1 if altas else 0


if __name__ == "__main__":
    sys.exit(main())
