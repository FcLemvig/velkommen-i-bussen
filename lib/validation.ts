import { z } from "zod";
import { busOptions } from "@/lib/shifts";

export const loginSchema = z.object({
  email: z.string().email("Skriv en gyldig email."),
  password: z.string().min(1, "Skriv din adgangskode.")
});

export const registerSchema = z.object({
  accountType: z.enum(["CITIZEN", "ORGANIZATION"]).default("CITIZEN"),
  name: z.string().min(2, "Skriv dit navn."),
  email: z.string().email("Skriv en gyldig email."),
  phone: z.string().min(8, "Skriv et telefonnummer med mindst 8 cifre."),
  address: z.string().optional(),
  password: z.string().min(8, "Adgangskoden skal være mindst 8 tegn.")
}).superRefine((data, ctx) => {
  if (data.accountType === "ORGANIZATION" && (!data.address || data.address.trim().length < 3)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["address"],
      message: "Skriv foreningens eller institutionens adresse."
    });
  }
});

export const rideRequestSchema = z.object({
  pickupAddress: z.string().min(3, "Skriv afhentningsadressen."),
  destinationAddress: z.string().min(3, "Skriv destinationsadressen."),
  date: z.string().min(1, "Vælg en dato."),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Vælg et tidspunkt."),
  passengers: z.coerce.number().int().min(1, "Der skal være mindst 1 passager.").max(8, "Kontakt os ved flere end 8 passagerer."),
  purpose: z.string().min(2, "Skriv formålet med turen."),
  includesMinors: z.coerce.boolean().default(false),
  parentalConsent: z.coerce.boolean().default(false),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  notes: z.string().max(500, "Noten må højst være 500 tegn.").optional()
}).superRefine((data, ctx) => {
  if (!data.includesMinors) {
    return;
  }

  if (!data.parentalConsent) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["parentalConsent"],
      message: "Forældresamtykke skal være bekræftet ved kørsel med børn og unge."
    });
  }

  if (!data.guardianName || data.guardianName.trim().length < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["guardianName"],
      message: "Skriv navn på forælder eller værge."
    });
  }

  if (!data.guardianPhone || data.guardianPhone.trim().length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["guardianPhone"],
      message: "Skriv telefonnummer på forælder eller værge."
    });
  }
});

export const driverSchema = z.object({
  name: z.string().min(2, "Skriv chaufførens navn."),
  email: z.string().email("Skriv en gyldig email."),
  phone: z.string().optional(),
  licenseNumber: z.string().optional(),
  notes: z.string().max(500, "Noter må højst være 500 tegn.").optional(),
  isActive: z.coerce.boolean().default(true)
});

export const createDriverSchema = driverSchema.extend({
  password: z.string().min(8, "Adgangskoden skal være mindst 8 tegn.")
});

export const driverShiftSchema = z.object({
  date: z.string().min(1, "Vælg en dato."),
  bus: z.enum(busOptions, { required_error: "Vælg en bus." }),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Vælg starttidspunkt."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Vælg sluttidspunkt."),
  notes: z.string().max(300, "Noter må højst være 300 tegn.").optional()
}).refine((data) => data.endTime > data.startTime, {
  path: ["endTime"],
  message: "Sluttidspunkt skal være efter starttidspunkt."
});

export const organizationBookingSchema = z.object({
  bus: z.enum(busOptions, { required_error: "Vælg en bus." }),
  driverProfileId: z.string().min(1, "Vælg en frivillig chauffør."),
  date: z.string().min(1, "Vælg en dato."),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Vælg starttidspunkt."),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Vælg sluttidspunkt."),
  purpose: z.string().min(2, "Skriv hvad bussen skal bruges til."),
  notes: z.string().max(500, "Noter må højst være 500 tegn.").optional()
}).refine((data) => data.endTime > data.startTime, {
  path: ["endTime"],
  message: "Sluttidspunkt skal være efter starttidspunkt."
});
