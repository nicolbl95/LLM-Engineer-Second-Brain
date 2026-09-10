/** GitHub Pages sets this flag at build time; local development stays editable. */
export const isPublicReadOnly = import.meta.env.VITE_PUBLIC_READ_ONLY === "true";
