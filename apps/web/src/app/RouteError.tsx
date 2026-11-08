import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

/** Shown instead of a blank screen if a page crashes. Details go to the console for developers. */
export function RouteError() {
  const error = useRouteError();
  console.error(error);
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="grid min-h-screen place-items-center bg-zinc-50 px-6 font-sans dark:bg-zinc-950">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">{notFound ? 'Page not found' : 'Something went wrong'}</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{notFound ? 'The page you opened does not exist.' : 'This page hit an unexpected problem. Reload, or go back to the start.'}</p>
        <div className="mt-5 flex justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="rounded-control border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-700">Reload</button>
          <Link to="/" className="rounded-control bg-brand-700 px-3 py-1.5 text-sm font-medium text-white">Go to the start</Link>
        </div>
        <p className="mt-6 text-xs text-zinc-500">In an emergency, call 911.</p>
      </div>
    </div>
  );
}
