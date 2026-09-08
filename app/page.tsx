import Link from "next/link";
import { SearchForm } from "./search-form";

const EXAMPLES = [
  { q: "Graham Stephan", label: "Graham Stephan" },
  { q: "@MeetKevin", label: "@MeetKevin" },
  { q: "The Compound", label: "The Compound" },
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-xl font-medium tracking-tight">
          Find a finance YouTuber
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-mute">
          Search for a channel, pick one from the list, browse recent videos,
          then transcribe a video into actionable trade calls.
        </p>
        <div className="mt-5">
          <SearchForm autoFocus />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {EXAMPLES.map((ex) => (
            <Link
              key={ex.q}
              href={`/search?q=${encodeURIComponent(ex.q)}`}
              className="text-mute underline-offset-4 hover:text-ink hover:underline"
            >
              {ex.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-2 text-sm text-mute">
        <h2 className="font-medium text-ink">How it works</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Search by name, @handle, or channel URL</li>
          <li>Pick a channel from the results</li>
          <li>Open a recent video</li>
          <li>Transcribe and extract trade calls</li>
        </ol>
      </section>
    </div>
  );
}
