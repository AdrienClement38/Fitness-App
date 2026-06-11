import {ArrowLeft} from 'lucide-react';
import {useNavigate} from 'react-router-dom';

const TODO = ({children}: {children: string}) => <span className="text-amber-400">[{children}]</span>;

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section className="mt-5">
      <h2 className="font-semibold">{title}</h2>
      <div className="mt-1 space-y-2 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="pb-8">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      <h1 className="text-xl font-bold">Politique de confidentialité</h1>
      <p className="mt-1 text-sm text-slate-400">
        Comment tes données sont collectées, utilisées et protégées, et tes droits.
      </p>

      <Section title="Responsable du traitement">
        <p>
          <TODO>À compléter : nom / raison sociale et email de contact du responsable</TODO>.
        </p>
      </Section>

      <Section title="Données collectées">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Email</strong> — pour créer et identifier ton compte.
          </li>
          <li>
            <strong>Mot de passe</strong> — stocké <strong>haché</strong> (scrypt), jamais en clair ; personne ne peut le lire.
          </li>
          <li>
            <strong>Données d'entraînement</strong> (séances, programmes persos, favoris, statistiques) — stockées
            <strong> localement sur ton appareil</strong>, et, si tu es connecté, sur le serveur pour la
            <strong> synchronisation</strong> entre tes appareils.
          </li>
        </ul>
      </Section>

      <Section title="Finalités et base légale">
        <p>
          Ces données servent uniquement à <strong>fournir le service</strong> (compte, suivi d'entraînement,
          synchronisation). La base légale est l'exécution du service que tu demandes.
        </p>
      </Section>

      <Section title="Hébergement">
        <p>
          Les données sont hébergées sur les serveurs d'<strong>AlwaysData</strong>, en <strong>France</strong> (Union
          européenne). Elles ne sont ni revendues, ni partagées à des tiers.
        </p>
      </Section>

      <Section title="Durée de conservation">
        <p>
          Tes données sont conservées tant que ton compte existe. La <strong>suppression de ton compte</strong> efface
          ton email et tes données d'entraînement côté serveur.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          L'application utilise un <strong>unique cookie de session</strong>, strictement nécessaire à
          l'authentification. <strong>Aucun pisteur, aucune publicité, aucun outil d'analyse</strong> — donc pas de
          bandeau de consentement.
        </p>
      </Section>

      <Section title="Tes droits (RGPD)">
        <p>Tu disposes d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Rectification : modifie ton mot de passe depuis « Mon compte ».</li>
          <li>Effacement : bouton « Supprimer mon compte » dans « Mon compte ».</li>
          <li>
            Autres demandes : <TODO>À compléter : email de contact</TODO>.
          </li>
        </ul>
      </Section>

      <p className="mt-6 text-xs text-slate-500">
        Dernière mise à jour : <TODO>date</TODO>. Modèle à faire relire avant l'ouverture au public.
      </p>
    </div>
  );
}
