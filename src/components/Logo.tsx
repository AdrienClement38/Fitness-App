/** Logo de l'app : le personnage, toujours dans un rond avec un liseret blanc. */
export default function Logo({className = ''}: {className?: string}) {
  return <img src="/logo.png" alt="" aria-hidden="true" className={`rounded-full object-cover ring-2 ring-white/50 ${className}`} />;
}
