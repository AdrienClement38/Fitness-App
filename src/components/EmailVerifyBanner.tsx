import {useState} from 'react';
import {resendVerification, useAuth} from '../lib/auth';

/** Bandeau « confirme ton email » : visible uniquement si connecté ET non vérifié. */
export default function EmailVerifyBanner() {
  const {user} = useAuth();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // emailVerified peut être undefined (cache pré-migration) -> pas de bandeau ; on
  // ne l'affiche que quand c'est explicitement false.
  if (!user || user.emailVerified !== false) return null;

  const resend = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await resendVerification();
      setMsg('Lien de confirmation renvoyé — vérifie ta boîte mail (et les spams).');
    } catch {
      setMsg("Échec de l'envoi, réessaie plus tard.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-amber-500/15 px-4 py-2 text-center text-xs text-amber-300">
      {msg ?? (
        <>
          Confirme ton adresse email pour sécuriser ton compte — l'email est souvent dans les <strong>spams</strong>, marque-le « non spam ».{' '}
          <button onClick={resend} disabled={busy} className="font-semibold underline disabled:opacity-50">
            {busy ? 'Envoi…' : 'Renvoyer le lien'}
          </button>
        </>
      )}
    </div>
  );
}
