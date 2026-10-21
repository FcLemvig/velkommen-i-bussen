import { z } from "zod";
import { danishToday, isValidDate } from "@/lib/dates";
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ()-]+$/, "Skriv et gyldigt telefonnummer.")
  .refine(
    (value) => value.replace(/\D/g, "").length >= 8 && value.replace(/\D/g, "").length <= 15,
    "Telefonnummeret skal have 8-15 cifre.",
  );
export const addressSchema = z
  .string()
  .trim()
  .min(3, "Skriv en fuld adresse.")
  .max(200, "Adressen må højst være 200 tegn.");
export const dateSchema = z.string().refine(isValidDate, "Vælg en gyldig dato.");
export const futureDateSchema = dateSchema.refine((value) => value >= danishToday(), "Datoen må ikke være i fortiden.");
export const timeSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Vælg et gyldigt tidspunkt.");
const checkboxSchema = z.preprocess((value) => value === "on" || value === true, z.boolean());
export const profileSchema = z.object({ phone: phoneSchema, address: addressSchema });
import { busOptions } from "@/lib/shifts";

export const loginSchema = z.object({
  email: z.string().trim().email("Skriv en gyldig email."),
  password: z.string().min(1, "Skriv din adgangskode."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Skriv en gyldig email."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Linket mangler eller er ugyldigt."),
    newPassword: z.string().min(8, "Den nye adgangskode skal være mindst 8 tegn."),
    confirmPassword: z.string().min(8, "Gentag den nye adgangskode."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "De to adgangskoder er ikke ens.",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Skriv din nuværende adgangskode."),
    newPassword: z.string().min(8, "Den nye adgangskode skal være mindst 8 tegn."),
    confirmPassword: z.string().min(8, "Gentag den nye adgangskode."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "De to nye adgangskoder er ikke ens.",
  });

export const registerSchema = z.object({
  registrationType: z.enum(["INDIVIDUAL", "FAMILY", "ORGANIZATION"]).default("INDIVIDUAL"),
  name: z.string().min(2, "Skriv dit navn."),
  email: z.string().trim().email("Skriv en gyldig email."),
  phone: phoneSchema,
  address: addressSchema,
  password: z.string().min(8, "Adgangskoden skal være mindst 8 tegn."),
});

export const rideRequestSchema = z
  .object({
    pickupAddress: addressSchema,
    destinationAddress: addressSchema,
    date: futureDateSchema,
    time: timeSchema,
    passengers: z.coerce
      .number()
      .int()
      .min(1, "Der skal være mindst 1 passager.")
      .max(6, "Der er højst plads til 6 passagerer i bussen."),
    purpose: z.string().min(2, "Skriv formålet med turen."),
    isSharedRide: z.preprocess((value) => value === "on" || value === true, z.boolean()),
    includesMinors: checkboxSchema,
    parentalConsent: checkboxSchema,
    guardianName: z.string().optional(),
    guardianPhone: z.string().optional(),
    notes: z.string().max(500, "Noten må højst være 500 tegn.").optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.includesMinors) {
      return;
    }

    if (!data.parentalConsent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parentalConsent"],
        message: "Forældresamtykke skal være bekræftet ved kørsel med børn og unge.",
      });
    }

    if (!data.guardianName || data.guardianName.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardianName"],
        message: "Skriv navn på forælder eller værge.",
      });
    }

    if (!phoneSchema.safeParse(data.guardianPhone).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["guardianPhone"],
        message: "Skriv telefonnummer på forælder eller værge.",
      });
    }
  });

export const driverSchema = z.object({
  name: z.string().min(2, "Skriv chaufførens navn."),
  email: z.string().trim().email("Skriv en gyldig email."),
  phone: z.union([phoneSchema, z.literal("")]).optional(),
  licenseNumber: z.string().optional(),
  notes: z.string().max(500, "Noter må højst være 500 tegn.").optional(),
  isActive: z.coerce.boolean().default(true),
  password: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().min(8, "Den nye adgangskode skal være mindst 8 tegn.").optional(),
  ),
});

export const organizationAdminSchema = z.object({
  name: z.string().min(2, "Skriv foreningens eller institutionens navn."),
  email: z.string().trim().email("Skriv en gyldig email."),
  phone: phoneSchema,
  address: addressSchema,
  membershipStatus: z.enum(["PENDING_PAYMENT", "ACTIVE", "PAUSED", "ENDED"]),
});

export const createDriverSchema = driverSchema.extend({
  password: z.string().min(8, "Adgangskoden skal være mindst 8 tegn."),
});

export const driverShiftSchema = z
  .object({
    date: futureDateSchema,
    bus: z.enum(busOptions, { required_error: "Vælg en bus." }),
    startTime: timeSchema,
    endTime: timeSchema,
    notes: z.string().max(300, "Noter må højst være 300 tegn.").optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    path: ["endTime"],
    message: "Sluttidspunkt skal være efter starttidspunkt.",
  });

export const organizationBookingSchema = z
  .object({
    bus: z.enum(busOptions, { required_error: "Vælg en bus." }),
    driverProfileId: z.string().min(1, "Vælg en frivillig chauffør."),
    date: futureDateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    purpose: z.string().min(2, "Skriv hvad bussen skal bruges til."),
    notes: z.string().max(500, "Noter må højst være 500 tegn.").optional(),
  })
  .refine((data) => data.endTime > data.startTime, {
    path: ["endTime"],
    message: "Sluttidspunkt skal være efter starttidspunkt.",
  });
export const eventSchema = z
  .object({
    title: z.string().min(2, "Skriv navnet på begivenheden."),
    description: z.string().min(5, "Skriv en kort beskrivelse."),
    location: z.string().min(2, "Skriv stedet."),
    date: futureDateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    pickupInfo: z.string().max(500, "Opsamlingsinfo må højst være 500 tegn.").optional(),
    capacity: z.coerce
      .number()
      .int()
      .min(1, "Der skal være mindst 1 plads.")
      .max(6, "Der er højst plads til 6 passagerer i bussen."),
    bus: z.enum(busOptions, { required_error: "Vælg en bus." }),
    driverProfileId: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().optional(),
    ),
    status: z.enum(["OPEN", "CLOSED", "CANCELLED"]).default("OPEN"),
  })
  .refine((data) => data.endTime > data.startTime, {
    path: ["endTime"],
    message: "Sluttidspunkt skal være efter starttidspunkt.",
  });

export const eventSignupSchema = z.object({
  eventId: z.string().min(1, "Begivenheden mangler."),
  pickupAddress: z.string().max(200, "Afhentningsadresse må højst være 200 tegn.").optional(),
  passengers: z.coerce
    .number()
    .int()
    .min(1, "Der skal være mindst 1 passager.")
    .max(6, "Der er højst plads til 6 passagerer i bussen."),
  notes: z.string().max(500, "Noter må højst være 500 tegn.").optional(),
});
