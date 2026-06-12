import { z } from "zod";

export const IndemnizacionInput = z.object({
  monthlySalary: z.number().positive(),
  startDate: z.string().date(),
  endDate: z.string().date(),
});
export type IndemnizacionInput = z.infer<typeof IndemnizacionInput>;

export const IndemnizacionResult = z.object({
  yearsOfService: z.number().int(),
  monthsOfService: z.number().int(),
  daysOfService: z.number().int(),
  amount: z.number(),
});
export type IndemnizacionResult = z.infer<typeof IndemnizacionResult>;
