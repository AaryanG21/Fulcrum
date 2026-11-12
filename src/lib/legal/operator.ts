export const OPERATOR = {
  name: "Aaryan G",

  legalForm: "an individual, not a registered company",

  contactEmail: "aaryan@fulcrumsecurity.in",

  grievanceEmail: "aaryan@fulcrumsecurity.in",

  siteUrl: "https://fulcrumsecurity.in",

  emailProvider: "a mail server run by the operator, not a third party",

  lastUpdated: "2026-11-07",

  auditRetentionDays: 180,
} as const;

export const JURISDICTION = {
  country: "India",
  law: "Digital Personal Data Protection Act, 2023",
  lawShort: "DPDP Act",
  minimumAge: 18,
} as const;

export const isConfigured: boolean = !Object.values(OPERATOR).some(
  (value) => typeof value === "string" && value.includes("PLACEHOLDER"),
);
