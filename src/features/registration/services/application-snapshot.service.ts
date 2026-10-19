import "server-only";

import type { DbClient } from "@/features/audit/services/audit.service";

import type { ApplicationSnapshot, ProfessionalStatusValue } from "../domain/completeness";

/**
 * Reads everything the completeness rule needs in one pass. Used by activation and by the review queue,
 * so both judge an application by the same data.
 */
export async function loadApplicationSnapshot(client: DbClient, userId: string): Promise<ApplicationSnapshot> {
  const [user, profile, application, businessOwnership] = await Promise.all([
    client.user.findUnique({ where: { id: userId }, select: { name: true } }),
    client.alumniProfile.findUnique({
      where: { userId },
      select: {
        currentCity: true,
        currentCountry: true,
        matricYear: true,
        professionalStatuses: true,
        jobTitle: true,
        organization: true,
        institution: true,
        fieldOfStudy: true,
        expertise: true,
        desiredRoles: true,
      },
    }),
    client.alumniApplication.findUnique({ where: { userId }, select: { attestedAt: true } }),
    client.businessOwner.findFirst({
      where: { userId },
      select: {
        business: {
          select: { name: true, sector: true, city: true, description: true, productsServices: true },
        },
      },
    }),
  ]);

  const business = businessOwnership?.business;
  const hasCompleteBusiness = Boolean(
    business &&
      business.name.trim() &&
      business.sector.trim() &&
      business.city.trim() &&
      business.description.trim() &&
      business.productsServices.trim(),
  );

  return {
    fullName: user?.name ?? null,
    currentCity: profile?.currentCity ?? null,
    currentCountry: profile?.currentCountry ?? null,
    matricYear: profile?.matricYear ?? null,
    professionalStatuses: (profile?.professionalStatuses ?? []) as ProfessionalStatusValue[],
    jobTitle: profile?.jobTitle ?? null,
    organization: profile?.organization ?? null,
    institution: profile?.institution ?? null,
    fieldOfStudy: profile?.fieldOfStudy ?? null,
    expertise: profile?.expertise ?? null,
    desiredRolesCount: profile?.desiredRoles.length ?? 0,
    hasCompleteBusiness,
    attested: Boolean(application?.attestedAt),
  };
}
