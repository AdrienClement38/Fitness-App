import {ArrowLeft} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="mt-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-1 space-y-1 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function LegalPage() {
  const navigate = useNavigate();
  return (
    <div className="pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <h1 className="text-xl font-bold">Mentions légales</h1>

      <Section title="Éditeur">
        <p>
          <strong>AC</strong>
        </p>
        <p>
          Contact : adrienc.tech@gmail.com
        </p>
      </Section>

      <Section title="Directeur de la publication">
        <p>AC</p>
      </Section>

      <Section title="Hébergeur">
        <p>AlwaysData SARL</p>
        <p>91 rue du Faubourg Saint-Honoré, 75008 Paris, France</p>
        <p>alwaysdata.com</p>
      </Section>

      <Section title="Contenu">
        <p>
          Les données d'exercices proviennent de <strong>free-exercise-db</strong> (domaine public). Le reste du contenu
          est édité par l'éditeur ci-dessus.
        </p>
      </Section>

      <p className="mt-6 text-sm text-slate-400">
        Voir aussi la{' '}
        <Link to="/confidentialite" className="text-emerald-400 hover:underline">
          politique de confidentialité
        </Link>
        .
      </p>
    </div>
  );
}
