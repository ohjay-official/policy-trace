export function Attribution() {
  return (
    <footer className="mt-auto border-t border-line pt-6 text-sm text-muted">
      <p className="mb-3">
        Policy Trace is an independent community project. It is not a Supabase product and it is not affiliated with Supabase Inc.
      </p>
      <p className="flex flex-wrap items-center gap-3">
        <span>Built on</span>
        <img
          src="/brand/supabase-logo-green-white-transparent.svg"
          alt="Supabase"
          width={116}
          height={23}
        />
      </p>
      <p className="mt-3">
        Supabase and the Supabase logo are trademarks of Supabase Inc. The logo files are used unmodified, and only to say what this lab runs on.
      </p>
    </footer>
  );
}
