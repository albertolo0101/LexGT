# Contenido — checklist de leyes (121 ítems)

Leyenda: ✅ en DB | ⏳ pendiente

**Progreso: 13/121 ítems del checklist en DB — 16 leyes cargadas.**
_(El ítem #1 son 3 leyes separadas. Además está cargada la Ley General de
Electricidad, fuera del checklist.)_

## Cómo entra el contenido

El repo hermano `lex-extractor` (`PDFtoSQLapp/pdf-sql-LEX/lex-extractor`) es
el **plano de control editorial**: procesa PDFs/Word/texto, estructura la ley
y genera SQL idempotente (`ON CONFLICT DO NOTHING`) que se aplica a Supabase.
LexGT es el lector — aquí no se editan leyes a mano.

Tres caminos, y solo tres:

| Situación | Camino |
|---|---|
| Ley nueva | `insert.sql` del extractor |
| La ley cambió de verdad | Reforma: `createReformDraft` → aprobar en `/admin/reformas/[id]` → nueva versión del artículo |
| La extracción salió mal (typo, texto malo) | `correctParagraphText` (admin) — corrige en sitio y re-ancla las anotaciones |

Un `UPDATE` crudo a `articles`/`paragraphs` rompe tres cosas a la vez: la
cadena de versiones, la notificación de reforma que ven los usuarios, y el
anclaje de las anotaciones (`text_checksum` deja de coincidir → highlights
huérfanos).

## Calidad de los datos cargados

`public.validate_law('<slug>')` es el gate: 10 checks por ley (secciones,
posiciones, artículos con párrafos, numeración única, search vectors). Hoy 4
de 16 leyes pasan limpio; el resto arrastra huecos de extracción cuyos bugs
ya están corregidos en el extractor pero cuya recarga por ley todavía no
existe. Detalle y siguiente paso en [ROADMAP.md](ROADMAP.md) §Datos.

---

## Base principal (14)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 1 | Constitución Política + Ley de Orden Público + Ley de Emisión del Pensamiento | ✅ | ✅ |
| 2 | Ley de Amparo, Exhibición Personal y de Constitucionalidad | ✅ | ✅ |
| 3 | Ley Electoral y de Partidos Políticos | ✅ | ✅ |
| 4 | Ley del Organismo Judicial | ✅ | ✅ |
| 5 | Ley del Organismo Legislativo | ✅ | ✅ |
| 6 | Ley del Organismo Ejecutivo | ⏳ | ⏳ |
| 7 | Código Civil | ✅ | ✅ |
| 8 | Código Procesal Civil y Mercantil + Leyes Anexas | ✅ | ✅ |
| 9 | Código de Comercio + Leyes Anexas | ✅ | ✅ |
| 10 | Código de Notariado + Leyes Anexas | ⏳ | ⏳ |
| 11 | Ley de lo Contencioso Administrativo + Leyes Anexas | ✅ | ✅ |
| 12 | Código Penal + Leyes Anexas | ✅ | ✅ |
| 13 | Código Procesal Penal + Leyes Anexas | ⏳ | ⏳ |
| 14 | Código de Trabajo + Leyes Anexas | ✅ | ✅ |

## Leyes Civiles (20)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 15 | Ley de Adopciones | ⏳ | ⏳ |
| 16 | Procedimiento Relativo al Hallazgo de Bienes Mostrencos | ⏳ | ⏳ |
| 17 | Ley General de Caza | ⏳ | ⏳ |
| 18 | Ley de Garantías Mobiliarias | ✅ | ✅ |
| 19 | Ley de Inquilinato | ⏳ | ⏳ |
| 20 | Ley de Nacionalidad | ⏳ | ⏳ |
| 21 | Ley Reguladora de las Áreas de Reservas Territoriales del Estado (OCRET) | ⏳ | ⏳ |
| 22 | Ley de Organizaciones No Gubernamentales para el Desarrollo (ONG's) | ⏳ | ⏳ |
| 23 | Ley General de Pesca y Acuicultura | ⏳ | ⏳ |
| 24 | Ley de la Protección para las Personas de la Tercera Edad | ⏳ | ⏳ |
| 25 | Ley de Titulación Supletoria | ⏳ | ⏳ |
| 26 | Ley de Tribunales de Familia | ⏳ | ⏳ |
| 27 | Ley de Vivienda | ⏳ | ⏳ |
| 28 | Ley del Registro Nacional de las Personas (RENAP) | ⏳ | ⏳ |
| 29 | Ley General de Cooperativas | ⏳ | ⏳ |
| 30 | Ley del Programa de Aporte Económico del Adulto Mayor | ⏳ | ⏳ |
| 31 | Código de Migración + Ley de Migración (Ley Parcial) | ⏳ | ⏳ |
| 32 | Ley de Dignificación y Promoción Integral de la Mujer | ⏳ | ⏳ |
| 33 | Código de Derecho Internacional Privado | ⏳ | ⏳ |
| 34 | Ley de Aviación Civil | ⏳ | ⏳ |

## Leyes Mercantiles (20)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 35 | Ley de Propiedad Industrial | ⏳ | ⏳ |
| 36 | Ley de Actividad Aseguradora | ⏳ | ⏳ |
| 37 | Ley de Almacenes Generales de Depósito | ⏳ | ⏳ |
| 38 | Ley de Bancos y Grupos Financieros | ⏳ | ⏳ |
| 39 | Ley del Mercado de Valores y Mercancías | ⏳ | ⏳ |
| 40 | Ley de Protección al Consumidor y Usuario | ⏳ | ⏳ |
| 41 | Ley de Sociedades Financieras Privadas | ⏳ | ⏳ |
| 42 | Ley de Tarjetas de Crédito | ⏳ | ⏳ |
| 43 | Ley de Derecho de Autor y Derechos Conexos | ⏳ | ⏳ |
| 44 | Ley de Libre Negociación de Divisas | ⏳ | ⏳ |
| 45 | Ley Monetaria | ⏳ | ⏳ |
| 46 | Convenio de París para la Protección de la Propiedad Industrial | ⏳ | ⏳ |
| 47 | Convenio de Roma | ⏳ | ⏳ |
| 48 | Ley de Fortalecimiento al Emprendimiento | ⏳ | ⏳ |
| 49 | Ley de los Contratos de Factoraje y de Descuento | ⏳ | ⏳ |
| 50 | Clasificación Internacional de Niza | ⏳ | ⏳ |
| 51 | Ley para el Reconocimiento de Comunicaciones y Firmas Electrónicas | ⏳ | ⏳ |
| 52 | Ley de Leasing | ⏳ | ⏳ |
| 53 | Libro III del Comercio Marítimo — Parte vigente del Código de Comercio Anterior | ⏳ | ⏳ |
| 54 | Ley de Insolvencia | ⏳ | ⏳ |

## Leyes Notariales (6)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 55 | Código de Ética Profesional | ⏳ | ⏳ |
| 56 | Ley de Colegiación Profesional Obligatoria | ⏳ | ⏳ |
| 57 | Ley sobre el Impuesto de Herencias, Legados y Donaciones | ⏳ | ⏳ |
| 58 | Ley del Impuesto Único sobre Inmuebles (IUSI) | ⏳ | ⏳ |
| 59 | Ley del Impuesto al Valor Agregado (IVA) | ⏳ | ⏳ |
| 60 | Ley del Registro de Información Catastral (RIC) | ⏳ | ⏳ |

## Leyes Administrativas (35)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 61 | Código Municipal (Decreto 12-2002) | ⏳ | ⏳ |
| 62 | Código Tributario | ⏳ | ⏳ |
| 63 | Ley de Acceso a la Información Pública | ⏳ | ⏳ |
| 64 | Ley de Comisiones de Postulación | ⏳ | ⏳ |
| 65 | Ley de Contrataciones del Estado | ⏳ | ⏳ |
| 66 | Ley de Expropiación | ⏳ | ⏳ |
| 67 | Ley de los Consejos de Desarrollo Urbano y Rural (Decreto 11-2002) | ⏳ | ⏳ |
| 68 | Ley de Probidad y Responsabilidades de Funcionarios y Empleados Públicos | ⏳ | ⏳ |
| 69 | Ley en Materia de Antejuicio | ⏳ | ⏳ |
| 70 | Ley General de Descentralización | ⏳ | ⏳ |
| 71 | Ley Orgánica de la USAC | ⏳ | ⏳ |
| 72 | Ley Orgánica del Banco de Guatemala | ⏳ | ⏳ |
| 73 | Ley Orgánica de la Contraloría General de Cuentas | ⏳ | ⏳ |
| 74 | Ley de Supervisión Financiera | ⏳ | ⏳ |
| 75 | Ley Orgánica del Presupuesto | ⏳ | ⏳ |
| 76 | Ley del Tribunal de Cuentas | ⏳ | ⏳ |
| 77 | Ley del Impuesto de Solidaridad (ISO) | ⏳ | ⏳ |
| 78 | Ley de Actualización Tributaria (ISR) | ⏳ | ⏳ |
| 79 | Ley Orgánica de la SAT | ✅ | ✅ |
| 80 | Disposiciones Legales para el Fortalecimiento de la Administración Tributaria | ⏳ | ⏳ |
| 81 | Ley Orgánica del IGSS | ⏳ | ⏳ |
| 82 | Ley de la Carrera Judicial | ⏳ | ⏳ |
| 83 | Ley Nacional de Aduanas | ⏳ | ⏳ |
| 84 | Ley Orgánica de la Procuraduría General de la Nación | ⏳ | ⏳ |
| 85 | Ley de Fomento y Desarrollo de la Actividad Exportadora y de Maquila | ⏳ | ⏳ |
| 86 | Ley del Tribunal de Conflictos de Jurisdicción (Decreto 64-76) | ⏳ | ⏳ |
| 87 | Ley de Zonas Francas | ⏳ | ⏳ |
| 88 | Disposiciones para el Fortalecimiento del Sistema Tributario y el Combate a la Defraudación y al Contrabando | ⏳ | ⏳ |
| 89 | Ley del Impuesto sobre la Distribución de Bebidas Alcohólicas Destiladas, Cervezas y otras Bebidas Fermentadas | ⏳ | ⏳ |
| 90 | Ley del Impuesto Específico a la Distribución de Cemento | ⏳ | ⏳ |
| 91 | Ley del Impuesto a la Distribución de Petróleo Crudo y Combustibles Derivados del Petróleo | ⏳ | ⏳ |
| 92 | Ley del Impuesto Específico sobre la Distribución de Bebidas Gaseosas, Isotónicas, Jugos, Néctares, Yogures, etc. | ⏳ | ⏳ |
| 93 | Ley de Simplificación de Requisitos y Trámites Administrativos | ⏳ | ⏳ |
| 94 | Ley de Simplificación, Actualización e Incorporación Tributaria | ⏳ | ⏳ |
| 95 | Ley de Universidades Privadas | ⏳ | ⏳ |

## Leyes Penales (19)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 96 | Ley contra el Femicidio y otras formas de Violencia contra la Mujer | ⏳ | ⏳ |
| 97 | Ley contra el Lavado de Dinero u otros Activos | ⏳ | ⏳ |
| 98 | Ley contra la Defraudación y Contrabando Aduanero | ⏳ | ⏳ |
| 99 | Ley contra la Delincuencia Organizada | ⏳ | ⏳ |
| 100 | Ley contra la Narcoactividad | ⏳ | ⏳ |
| 101 | Ley para Prevenir, Sancionar y Erradicar la Violencia Intrafamiliar | ⏳ | ⏳ |
| 102 | Ley contra la Violencia Sexual, Explotación y Trata de Personas | ⏳ | ⏳ |
| 103 | Ley de Armas y Municiones | ⏳ | ⏳ |
| 104 | Ley de Extinción de Dominio | ⏳ | ⏳ |
| 105 | Ley del Régimen Penitenciario | ⏳ | ⏳ |
| 106 | Ley del Servicio Público de Defensa Penal | ⏳ | ⏳ |
| 107 | Ley para la Protección de Sujetos Procesales | ⏳ | ⏳ |
| 108 | Ley Orgánica del INACIF | ⏳ | ⏳ |
| 109 | Ley Orgánica del Ministerio Público (MP) | ⏳ | ⏳ |
| 110 | Ley de Protección Integral de la Niñez y Adolescencia (PINA) | ⏳ | ⏳ |
| 111 | Ley para Prevenir y Reprimir el Financiamiento del Terrorismo (Decreto 58-2005) | ⏳ | ⏳ |
| 112 | Ley Reguladora del Procedimiento de Extradición | ⏳ | ⏳ |
| 113 | Ley de Implementación del Control Telemático en el Proceso Penal | ⏳ | ⏳ |
| 114 | Convención de Viena sobre el Derecho de los Tratados | ⏳ | ⏳ |

## Leyes Laborales (7)

| # | Ley | En DB | SQL listo |
|---|---|---|---|
| 115 | Ley de Servicio Civil | ⏳ | ⏳ |
| 116 | Ley de Servicio Municipal | ⏳ | ⏳ |
| 117 | Convenios Fundamentales de la OIT | ⏳ | ⏳ |
| 118 | Ley de Clases Pasivas Civiles del Estado | ⏳ | ⏳ |
| 119 | Ley de Servicio Civil del Organismo Judicial | ⏳ | ⏳ |
| 120 | Ley de Servicio Civil del Organismo Legislativo | ⏳ | ⏳ |
| 121 | Ley de Sindicalización y Regulación de la Huelga de los Trabajadores del Estado | ⏳ | ⏳ |
