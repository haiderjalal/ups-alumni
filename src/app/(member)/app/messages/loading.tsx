import { Container } from "@/components/shared/container";

export default function MessagesLoading() {
  return (
    <section className="space-y-8" aria-busy="true" role="status">
      <span className="sr-only">Loading messages…</span>
      <Container className="max-w-3xl space-y-8 px-0">
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-brand-sage" />
          <div className="h-10 w-1/2 animate-pulse rounded-lg bg-brand-sage" />
        </div>
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-brand-sage" />
          <div className="h-20 animate-pulse rounded-2xl bg-brand-sage" />
        </div>
      </Container>
    </section>
  );
}
