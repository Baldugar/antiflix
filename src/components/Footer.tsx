export default function Footer() {
  return (
    <footer className="border-t border-border py-8 px-6 mt-auto text-center">
      <img
        src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
        alt="TMDB"
        className="max-w-[120px] mx-auto"
      />
      <p className="mt-3 text-muted text-xs">
        This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
      <a
        href="https://www.themoviedb.org"
        target="_blank"
        rel="noopener noreferrer"
        className="text-accent text-xs hover:underline"
      >
        www.themoviedb.org
      </a>
      <p className="mt-2 text-muted/50 text-xs">antiflix v0.1.0</p>
    </footer>
  );
}
