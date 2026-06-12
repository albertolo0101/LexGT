import "server-only";
import { requirePro, type Actor } from "@/lib/authz";
import type { IndemnizacionInput, IndemnizacionResult } from "./schemas";

// Conteo 30/360 (año comercial de 360 días, mes de 30 días), la convención
// usual para prorratear prestaciones laborales en Guatemala.
function daysBetween360(start: Date, end: Date): number {
  let d1 = start.getUTCDate();
  let d2 = end.getUTCDate();
  if (d1 === 31) d1 = 30;
  if (d2 === 31 && d1 === 30) d2 = 30;

  return (
    (end.getUTCFullYear() - start.getUTCFullYear()) * 360 +
    (end.getUTCMonth() - start.getUTCMonth()) * 30 +
    (d2 - d1)
  );
}

// Art. 82 Código de Trabajo: indemnización equivalente a un mes de salario
// por cada año de servicios continuos; las fracciones se prorratean por
// meses completos y los días excedentes.
export function calculateIndemnizacion(
  actor: Actor,
  input: IndemnizacionInput
): IndemnizacionResult {
  requirePro(actor);

  const start = new Date(`${input.startDate}T00:00:00Z`);
  const end = new Date(`${input.endDate}T00:00:00Z`);
  const totalDays = Math.max(0, daysBetween360(start, end));

  const yearsOfService = Math.floor(totalDays / 360);
  const remainingAfterYears = totalDays - yearsOfService * 360;
  const monthsOfService = Math.floor(remainingAfterYears / 30);
  const daysOfService = remainingAfterYears - monthsOfService * 30;

  const amount =
    input.monthlySalary * yearsOfService +
    input.monthlySalary * (monthsOfService / 12) +
    input.monthlySalary * (daysOfService / 360);

  return {
    yearsOfService,
    monthsOfService,
    daysOfService,
    amount: Math.round(amount * 100) / 100,
  };
}
