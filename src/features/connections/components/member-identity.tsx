import type { MemberSummary } from "../services/member-summary";

interface MemberIdentityProps {
  member: MemberSummary;
  /** Heading level for the name. Use the level that fits the page outline. */
  nameAs?: "h1" | "h2" | "h3" | "p";
}

/** Name, batch and headline only. Contact details are never part of this view. */
export function MemberIdentity({ member, nameAs: NameTag = "h3" }: MemberIdentityProps) {
  return (
    <div className="min-w-0 space-y-0.5">
      <NameTag className="break-words font-semibold leading-snug text-brand-ink">{member.name}</NameTag>
      {member.batchYear ? <p className="text-sm text-brand-muted">Batch {member.batchYear}</p> : null}
      {member.headline ? <p className="break-words text-sm text-brand-muted">{member.headline}</p> : null}
    </div>
  );
}
