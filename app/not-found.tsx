import Link from "next/link";
export default function NotFound() { return <main><div className="container not-found"><div className="eyebrow">404 / Not found</div><h1>That page moved.</h1><p style={{color: "var(--muted)"}}>The link you followed doesn’t point anywhere we know.</p><Link href="/" className="button-dark" style={{marginTop: 25}}>Back home</Link></div></main>; }
