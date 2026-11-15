import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page-head">
      <h1>Page not found</h1>
      <p>That scenario or share is not in this lab.</p>
      <p>
        <Link href="/" className="btn">
          Back to the start
        </Link>
      </p>
    </div>
  );
}
