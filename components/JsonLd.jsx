export default function JsonLd({ json }) {
  const text = typeof json === 'string' ? json : JSON.stringify(json);
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: text.replace(/</g, '\\u003c') }} />;
}
