import Form from "next/form";

export function SearchForm({
  defaultQuery = "",
  autoFocus = false,
}: {
  defaultQuery?: string;
  autoFocus?: boolean;
}) {
  return (
    <Form action="/search" className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={defaultQuery}
        autoFocus={autoFocus}
        placeholder="Name, @handle, or channel URL"
        className="min-w-0 flex-1 border border-line bg-paper px-3 py-1.5 text-sm outline-none placeholder:text-mute focus:border-ink"
      />
      <button
        type="submit"
        className="border border-ink bg-ink px-3 py-1.5 text-sm text-paper hover:bg-paper hover:text-ink"
      >
        Search
      </button>
    </Form>
  );
}
