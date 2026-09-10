type PagePlaceholderProps = {
  description: string;
  title: string;
};

export function PagePlaceholder({ description, title }: PagePlaceholderProps) {
  return (
    <section aria-labelledby="page-title" className="min-h-[calc(100dvh-11rem)]">
      <div className="max-w-2xl border-l border-primary/50 pl-5">
        <h1
          id="page-title"
          className="text-2xl font-semibold tracking-tight text-foreground"
        >
          {title}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </section>
  );
}
