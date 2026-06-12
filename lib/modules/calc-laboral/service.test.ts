import { describe, it, expect } from "vitest";
import type { Actor } from "@/lib/authz";
import { AuthzError } from "@/lib/authz";
import { calculateIndemnizacion } from "./service";

const freeActor: Actor = { userId: "free-user", tier: "free", isAdmin: false };
const proActor: Actor = { userId: "pro-user", tier: "pro", isAdmin: false };

describe("calculateIndemnizacion", () => {
  it("rejects free users", () => {
    expect(() =>
      calculateIndemnizacion(freeActor, {
        monthlySalary: 4000,
        startDate: "2020-01-01",
        endDate: "2021-01-01",
      })
    ).toThrow(AuthzError);
  });

  it("computes exactly one year of service as one month of salary", () => {
    const result = calculateIndemnizacion(proActor, {
      monthlySalary: 4000,
      startDate: "2020-01-01",
      endDate: "2021-01-01",
    });

    expect(result).toEqual({
      yearsOfService: 1,
      monthsOfService: 0,
      daysOfService: 0,
      amount: 4000,
    });
  });

  it("prorates years, months and days using a 30/360 calendar", () => {
    const result = calculateIndemnizacion(proActor, {
      monthlySalary: 4000,
      startDate: "2020-01-01",
      endDate: "2023-07-15",
    });

    expect(result.yearsOfService).toBe(3);
    expect(result.monthsOfService).toBe(6);
    expect(result.daysOfService).toBe(14);
    // 3 * 4000 + 4000 * (6/12) + 4000 * (14/360)
    expect(result.amount).toBeCloseTo(14155.56, 2);
  });

  it("returns zero for end date on or before start date", () => {
    const result = calculateIndemnizacion(proActor, {
      monthlySalary: 4000,
      startDate: "2024-01-01",
      endDate: "2024-01-01",
    });

    expect(result).toEqual({
      yearsOfService: 0,
      monthsOfService: 0,
      daysOfService: 0,
      amount: 0,
    });
  });
});
