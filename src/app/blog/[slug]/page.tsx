import Link from "next/link";
import PagingArticleEmbeds from "@/components/paging/article-embeds";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/site-header";
import {
  formatArticleDate,
  formatReadingTime,
  getAllArticles,
  getArticleBySlug,
} from "@/lib/articles";

type Params = { slug: string };

export async function generateStaticParams(): Promise<Params[]> {
  // Resolve development previews on demand, including unpublished drafts.
  if (process.env.NODE_ENV !== "production") return [];
  const articles = await getAllArticles();
  return articles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) return { title: "Not found" };
  return {
    /* Root layout title.template adds " — rafan.dev"; do not repeat here */
    title: article.title,
    description: article.description ?? article.subtitle,
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 pb-24 pt-6 sm:px-8">
        <SiteHeader />

        <article className="mx-auto mt-10 w-full max-w-3xl">
          <Link
            href="/blog"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/55 transition hover:text-foreground"
          >
            ← back to blog
          </Link>

          <header className="mt-8 border-b border-foreground/10 pb-8">
            <h1 className="font-(family-name:--font-space-mono) text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {article.title}
            </h1>
            <p className="mt-3 text-base leading-snug text-foreground/70 sm:text-lg">
              {article.subtitle}
            </p>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.18em] text-foreground/50">
              {formatArticleDate(article.date)} ·{" "}
              {formatReadingTime(article.readingTime)}
            </p>
          </header>

          <div
            className="prose-article mt-10"
            dangerouslySetInnerHTML={{ __html: article.html }}
          />
          {article.html.includes('data-paging') && <PagingArticleEmbeds />}
        </article>
      </div>
    </main>
  );
}
