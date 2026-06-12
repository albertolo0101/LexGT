# calc-laboral

Pro-only labor-law calculators. Pure computation, no DB tables, no UI yet —
proves the module pattern from `docs/MODULES.md` with the cheapest possible
case.

## `calculateIndemnizacion`

Implements Código de Trabajo Art. 82: indemnización por despido injustificado
equivalente a un mes de salario por cada año de servicios continuos, con las
fracciones de año prorrateadas por meses completos y los días excedentes.
Uses a 30/360 day-count (30-day months, 360-day years), the usual convention
for prorating Guatemalan labor benefits.

Inputs: `monthlySalary`, `startDate`, `endDate` (`YYYY-MM-DD`).

This does **not** account for: justified-cause exceptions (Art. 77, where no
indemnización applies), aguinaldo/bono14 proration, or salary averaging when
pay varies (commissions, overtime). Those are out of scope for this skeleton.

## Route

`POST /api/v1/calc-laboral` — Pro-gated via `requirePro`. Body matches
`IndemnizacionInput` (see `schemas.ts`).
