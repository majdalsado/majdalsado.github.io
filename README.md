# My Personal Site and Blog

# Development

```bash
bundle install
bundle exec jekyll serve
```

## Pareto Writer

The local writing IDE lives in [`_writer/`](_writer/README.md). It is excluded from the public Jekyll build.

```bash
pnpm install
pnpm dev
```

Run these commands from the blog root. `pnpm dev` opens http://localhost:4317 in your browser. On macOS, you can also double-click `_writer/Writer.command`.

## Blog performance

The Jekyll build inlines the page’s CSS from `_includes/css/`. The reading fonts and responsive images are served from this site. Article images keep their original `src` for full-resolution viewing; width and height reserve space and offscreen images load lazily. AVIF candidates get a `picture` with the original format as fallback. Selected mobile cover images are embedded via `_data/mobile_covers.json` to avoid a separate first-paint request; keep those entries small and specific to the lead image. Disqus automatically loads near the end of the article and retains each post’s existing thread identifier.
