import { Container } from "@/components/shared/container";

export default function ConnectionsLoading() {
  return (
    <section className="space-y-8" aria-busy="true" role="status">
      <span className="sr-only">Loading connections…</span>
      <Container className="max-w-3xl space-y-10 px-0" >
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-brand-sage" />
          <div className="h-10 w-2/3 animate-pulse rounded-lg bg-brand-sage" />
        </div>
        {[0, 1].map((key) => (
          <div key={key} className="space-y-3">
            <div className="h-6 w-48 animate-pulse rounded bg-brand-sage" />
            <div className="h-28 animate-pulse rounded-2xl bg-brand-sage" />
          </div>
        ))}
      </Container>
    </section>
  );
}
