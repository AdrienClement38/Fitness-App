/** Logo de l'app : le personnage, toujours dans un rond. */
export default function Logo({className = ''}: {className?: string}) {
  return <img src="/logo.png" alt="" aria-hidden="true" className={`rounded-full object-cover ${className}`} />;
}
