import {ArrowLeft} from 'lucide-react';
import {Link, useNavigate} from 'react-router-dom';

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="mt-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-1 space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  const navigate = useNavigate();
  return (
    <div className="pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <h1 className="text-xl font-bold">Conditions d'utilisation</h1>
      <p className="mt-1 text-sm text-slate-400">En créant un compte et en utilisant AC-KINETIK, tu acceptes ce qui suit.</p>

      <Section title="Objet">
        <p>
          AC-KINETIK est une application personnelle et gratuite de musculation : bibliothèque d'exercices, programmes,
          suivi de séances et savoir d'entraînement. Elle est proposée « en l'état », sans but commercial.
        </p>
      </Section>

      <Section title="Compte">
        <p>
          L'accès nécessite un compte (email + mot de passe). Tu es responsable de la confidentialité de ton mot de
          passe et de l'activité sur ton compte. Un seul compte par personne ; tu fournis un email valide.
        </p>
      </Section>

      <Section title="Usage acceptable">
        <p>
          Tu utilises l'application pour ton usage personnel. Sont interdits : toute tentative de nuire au service
          (intrusion, surcharge, contournement de la sécurité), l'usage des données d'un autre utilisateur, et toute
          utilisation contraire à la loi.
        </p>
      </Section>

      <Section title="Santé et responsabilité">
        <p>
          AC-KINETIK est un outil d'information : <strong>il ne remplace pas l'avis d'un professionnel de santé</strong>.
          Tu t'entraînes sous ta seule responsabilité — demande l'avis d'un médecin avant de commencer. L'éditeur ne
          peut être tenu responsable d'une blessure, d'un dommage, d'une perte de données ou d'une indisponibilité du
          service. Voir l'avertissement complet dans les{' '}
          <Link to="/mentions-legales" className="text-emerald-400 hover:underline">
            mentions légales
          </Link>
          .
        </p>
      </Section>

      <Section title="Propriété intellectuelle">
        <p>
          Les exercices et images proviennent de <strong>free-exercise-db</strong> (domaine public). Le reste du
          contenu reste la propriété de l'éditeur. Tes données d'entraînement t'appartiennent ; tu peux les exporter
          ou les supprimer à tout moment depuis « Mon compte ».
        </p>
      </Section>

      <Section title="Données personnelles">
        <p>
          Le traitement de tes données est décrit dans la{' '}
          <Link to="/confidentialite" className="text-emerald-400 hover:underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </Section>

      <Section title="Disponibilité et résiliation">
        <p>
          Le service est fourni sans garantie de disponibilité et peut évoluer ou s'arrêter. Tu peux supprimer ton
          compte (et tes données côté serveur) à tout moment depuis « Mon compte ». L'éditeur peut suspendre un compte
          en cas d'usage abusif.
        </p>
      </Section>

      <Section title="Droit applicable">
        <p>Les présentes conditions sont soumises au droit français.</p>
      </Section>

      <p className="mt-6 text-xs text-slate-500">Dernière mise à jour : 13 juin 2026.</p>
    </div>
  );
}
