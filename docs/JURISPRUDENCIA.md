# Jurisprudencia constitucional

Cómo LexGT indexa las sentencias de la Corte de Constitucionalidad, por qué la
fuente es la que es, y qué hacer cuando la CC publica una gaceta nueva.

---

## La decisión: la gaceta, no el portal

La fuente obvia sería el **Sistema de Consulta de Jurisprudencia** de la CC
(`consultajur.cc.gob.gt/wcJur/Portal/`). Se descartó tras medirlo el
2026-09-01, no por suposición:

| Qué se probó | Qué pasó |
|---|---|
| `GET` a `wfPrincipal.aspx` con curl | 200, pero con un redirect previo a `wfRecaptcha.aspx` |
| `POST` de búsqueda en `wfTextoLibre.aspx` | **403 `Just a moment…`** — managed challenge de Cloudflare |
| Chromium headless real (Playwright, contexto persistente) | atorado >60 s en el interstitial; nunca llegó al formulario |
| ~15 requests desde una IP doméstica | escalada a 403 en los GET y luego a un loop `wfPrincipal ↔ wfRecaptcha` |

Sumado a que es **ASP.NET WebForms** — cada búsqueda es un postback completo
con `__VIEWSTATE` / `__EVENTVALIDATION`, sin endpoint JSON — un proxy en vivo
significaría una sesión de navegador por consulta de usuario, con 10-30 s de
latencia cuando funciona, desde la IP compartida de Vercel. No es viable.

La **Gaceta Jurisprudencial** sí lo es: el PDF trimestral que la CC publica por
mandato del art. 189 de la LAEPC, servido desde el WordPress de `cc.gob.gt`
**sin challenge**, nacido digital y ya estructurado.

El `robots.txt` de cc.gob.gt declara
`Content-Signal: search=yes, use=reference, ai-train=no`. Indexar para buscar y
enlazar es exactamente eso; por eso LexGT guarda **ficha + sumario oficial** y
nunca el texto íntegro, que se enlaza al portal (`lib/cc-portal.ts`).

**No hay permalink por resolución** y no puede haberlo: los botones del listado
del portal arman su URL con la sesión viva. La cita durable de una resolución
es **expediente + fecha**, y el enlace apunta a la búsqueda por expediente.

---

## El formato de la gaceta

Un registro se ve así (gaceta 154):

```
Amparo en Única Instancia          ← encabezado de sección (tipo de proceso)
SIN LUGAR                          ← resultado
EXPEDIENTE 7843-2023 Y 7886-2023   ← expediente(s), acumulados incluidos
Sentencia 01 de octubre de 2024    ← fecha
Acciones constitucionales de …     ← sumario, en varias líneas
```

El ancla del parser es el par **`EXPEDIENTE` + línea de fecha**, que es lo
único que nunca varía. El resultado y el encabezado se leen hacia atrás desde
el ancla y pueden faltar: un parser que pierde una resolución es peor que uno
que la archiva sin veredicto.

**Tres generaciones de layout**, todas soportadas:

| Gacetas | Particularidad |
|---|---|
| 119-146 | fecha con `de` (`Sentencia de 4 de octubre de 2018`); encabezado EN MAYÚSCULAS que envuelve en dos líneas; muchas sin resultado |
| 123 | `Sentencia del 11 de enero de 2017` |
| 133, 138 | día en letras: `Sentencia de veintitrés de julio de 2019` |
| 133-143 | fecha subrayada con una fila de guiones bajos |
| 119-147 | el resultado va **debajo** de la fecha, no encima del expediente |
| 148+ | formato actual: encabezado Title Case, resultado en mayúsculas encima del expediente |

Lo que separa un encabezado de sección de un veredicto es **la caja**, no el
vocabulario: se agrupan las líneas contiguas por mayúsculas/minúsculas y el
grupo que nombra un tipo de proceso es el encabezado. Partir por vocabulario se
comía la segunda línea del encabezado de las gacetas 130-146.

---

## Cobertura actual

- **23,985 resoluciones**, gacetas 119-156 (≈ 2016 a mediados de 2025).
- **37 de 38 gacetas.** La **124 se rechaza a propósito**: su capa de texto
  trae un espacio entre cada letra (`G a c e t a d e l a C o r t e`) y los
  límites de palabra se perdieron con ella. Los expedientes y las fechas se
  podrían recuperar colapsando espacios; el sumario no, y re-segmentar prosa
  jurídica a ojo envenenaría el índice de búsqueda. Falta ese trimestre.
- **Rezago:** la gaceta más nueva publicada es la 156 (Abr-Jun 2025). El portal
  tiene material más reciente que la gaceta todavía no compila.
- Huecos menores que el reporte del parser expone en cada corrida: ~1.8% de
  expedientes huérfanos (variantes de fecha aún no vistas) y 2,135 registros
  sin `tipo_proceso` en las gacetas 143-146.

---

## Operación

Correr **siempre sin `--upload` primero** y leer el reporte:

```bash
uv run python main.py gaceta -n 157            # descarga, parsea, reporta
uv run python main.py gaceta -n 157 --upload   # y escribe a la base
```

- `-n` acepta `154`, `148-156` o `148,151,154`; sin `-n` procesa todas.
- La descarga espera 3 s entre PDF. Bajarlo es maleducado y además Cloudflare
  responde con 403 al primer indicio de automatización — por eso el cliente
  manda el juego completo de headers de navegación.
- La carga es un **upsert por UUID5(expediente + fecha)** en una transacción:
  volver a correr una gaceta es idempotente, y volver a correrla *después de
  arreglar el parser* actualiza las filas en vez de duplicarlas. Una
  resolución reimpresa en una gaceta posterior cae en la fila que ya tenía.
- Si el reporte muestra `recs=0` o muchos huérfanos, **la CC cambió el
  layout**: no cargar, arreglar `gaceta.py` y agregar el caso a
  `tests/test_gaceta.py` con el texto real.

---

## Esquema (migración 0022)

| Tabla | Quién escribe | Quién lee |
|---|---|---|
| `jurisprudencia` | solo lex-extractor, como `postgres` (salta RLS). **Sin políticas de escritura**: ni la anon key ni un autenticado pueden tocarla | `public.is_pro()` |
| `jurisprudencia_refs` | el dueño, y solo si es Pro vigente | el dueño |
| `case_jurisprudencia` | el dueño del caso, Pro vigente | el dueño del caso |

`public.jurisprudencia_facets()` llena los desplegables de la búsqueda:
PostgREST no hace `DISTINCT`, así que sin ella cada carga de página traía miles
de filas para dos listas de ~20 y ~30 valores. Es `security definer` pero
comprueba `is_pro()` adentro, así que un usuario free recibe arrays vacíos.

`jurisprudencia_refs.jurisprudencia_id` es **nullable a propósito**: un abogado
debe poder anotar un expediente que la gaceta todavía no publicó. Cuando salga,
un backfill puede enlazarlo sin perder la nota.

**Peso:** ~41 MB (18 MB de heap, 10 MB de `tsvector`, 8 MB de GIN, 5 MB de
btree) para 23,985 filas — más que todo el corpus de leyes junto. Contá ~1.7 MB
por gaceta adicional.

---

## Pendientes

1. **Pedirle el dato a la CC.** Una solicitud de acceso a la información
   pública a la Unidad de Jurisprudencia y Gaceta pidiendo un dump o un API
   resolvería el rezago y la gaceta 124 de un plumazo, y es el camino
   legítimo.
2. **Concordancias.** `gaceta.citations()` ya extrae los artículos que nombra
   un sumario. Colgar "jurisprudencia que cita este artículo" dentro del lector
   es lo que el portal de la CC no hace, y lo que justifica el Pro.
3. **Supresión de datos sensibles.** La CC atiende solicitudes de protección de
   datos sobre sus sentencias (pág. 18 de su manual). Si una resolución se
   retira o se anonimiza allá, LexGT necesita enterarse: hoy no hay
   re-sincronización ni vía de takedown propia.
4. **Gacetas 143-146 sin `tipo_proceso`** y ~430 expedientes huérfanos por
   variantes de fecha aún no cubiertas.
