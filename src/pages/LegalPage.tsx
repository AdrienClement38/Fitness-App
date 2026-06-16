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
          <strong>Adrien Clément</strong>
        </p>
        <p>Contact : adrienc.tech@gmail.com</p>
      </Section>

      <Section title="Directeur de la publication">
        <p>Adrien Clément</p>
      </Section>

      <Section title="Hébergeur">
        <p>AlwaysData SARL</p>
        <p>91 rue du Faubourg Saint-Honoré, 75008 Paris, France</p>
        <p>alwaysdata.com</p>
      </Section>

      <Section title="Contenu et sources">
        <p>
          Les exercices et leurs images proviennent de <strong>free-exercise-db</strong> (données libres de droit,
          domaine public). Le savoir d'entraînement (principes, volumes, schémas de répétitions) s'appuie sur des{' '}
          <strong>ressources scientifiques et des recommandations reconnues</strong>, référencées dans l'onglet
          « Savoir ». Le reste du contenu est édité par l'éditeur ci-dessus.
        </p>
      </Section>

      <Section title="Avertissement — santé">
        <p>
          AC-KINETIK est un outil d'information et de suivi d'entraînement : <strong>il ne remplace pas l'avis d'un
          professionnel de santé</strong>. Avant de commencer un programme d'exercices, demande l'avis d'un médecin,
          en particulier en cas de problème de santé, de blessure, de grossesse, ou si tu reprends le sport. Tu
          pratiques sous ta seule responsabilité ; l'éditeur ne saurait être tenu responsable d'une blessure ou d'un
          dommage lié à l'utilisation de l'application.
        </p>
      </Section>

      <p className="mt-6 text-sm text-slate-400">
        Voir aussi la{' '}
        <Link to="/confidentialite" className="text-emerald-400 hover:underline">
          politique de confidentialité
        </Link>{' '}
        et les{' '}
        <Link to="/cgu" className="text-emerald-400 hover:underline">
          conditions d'utilisation
        </Link>
        .
      </p>
    </div>
  );
}
