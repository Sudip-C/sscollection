import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import AuthPanel from "./AuthPanel";
import { Link } from "react-router";
import ProductGrid from "./ProductGrid";

const collections = [
  {
    number: "01",
    name: "T-shirts",
    description: "Everyday essentials. Your own style.",
  },
  {
    number: "02",
    name: "Shorts",
    description: "Easy fits for wherever the day takes you.",
  },
];

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [signOutError, setSignOutError] = useState("");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    setSignOutError("");
    const { error } = await supabase.auth.signOut();

    if (error) {
      setSignOutError(error.message);
    }
  }
  return (
    <div className="min-h-screen">
      <div className="bg-accent px-4 py-3 text-center text-xs font-bold tracking-widest uppercase">
        Your everyday fit starts here
      </div>

      <header className="border-b border-line">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-6 sm:px-10">
          <p className="text-3xl font-bold tracking-tight">
            ss.collection<span className="text-accent">.</span>
          </p>

          {authReady &&
            (user ? (
              <div className="flex items-center gap-4">
                {user.app_metadata?.role === "admin" && (
                  <Link to="/admin" className="text-sm font-bold underline">
                    Admin
                  </Link>
                )}
                <span className="hidden max-w-48 truncate text-sm sm:block">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-sm font-bold underline"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="text-sm font-bold underline"
              >
                Account
              </button>
            ))}
        </div>

        {signOutError && (
          <p role="alert" className="px-6 pb-4 text-sm text-red-700">
            {signOutError}
          </p>
        )}
      </header>
      {showAuth && !user && <AuthPanel onClose={() => setShowAuth(false)} />}
      <main className="mx-auto max-w-7xl px-6 py-16 sm:px-10 sm:py-24">
        <p className="mb-8 text-xs font-bold tracking-widest uppercase">
          Modern menswear / Everyday essentials
        </p>

        <h1 className="font-display text-7xl leading-none uppercase sm:text-8xl lg:text-9xl">
          Wear your
          <br />
          <span className="text-accent">own way.</span>
        </h1>

        <p className="mt-8 max-w-md text-lg leading-relaxed text-muted">
          Modern tees and shorts that go wherever the day takes you.
        </p>

        <section
          aria-labelledby="collection-heading"
          className="mt-20 border-t border-line pt-8"
        >
          <h2
            id="collection-heading"
            className="mb-6 text-sm font-bold tracking-widest uppercase"
          >
            The collection
          </h2>

          <div className="grid gap-6 sm:grid-cols-2">
            {collections.map((collection) => (
              <article
                key={collection.number}
                className="bg-surface p-8 sm:p-10"
              >
                <p className="text-sm font-bold text-muted">
                  {collection.number}
                </p>

                <h3 className="mt-8 font-display text-5xl uppercase">
                  {collection.name}
                </h3>

                <p className="mt-4 text-muted">{collection.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <ProductGrid />
      <footer className="border-t border-line px-6 py-6 text-center text-sm text-muted">
        ss.collection — Tees. Shorts. Your move.
      </footer>
    </div>
  );
}

export default App;
