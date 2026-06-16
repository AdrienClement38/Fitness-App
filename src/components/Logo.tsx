/** Logo de l'app : le personnage, toujours dans un rond avec un liseret blanc.
 *  `women` → variante féminine (affichée pour les utilisatrices). */
export default function Logo({className = '', women = false}: {className?: string; women?: boolean}) {
  return (
    <img
      src={women ? '/logo-women.png' : '/logo.png'}
      alt=""
      aria-hidden="true"
      className={`rounded-full object-cover ring-2 ring-white/50 ${className}`}
    />
  );
}
