import {useEffect, useRef, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import {authApi} from '../lib/api';
import {refreshUser} from '../lib/auth';
import {Loading} from '../components/ui';

/** Page ouverte depuis le lien de l'email : valide le jeton puis affiche le résultat. */
export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return; // jeton single-use : ne pas rejouer (StrictMode)
    done.current = true;
    if (!token) {
      setStatus('error');
      setMessage('Lien invalide (jeton manquant).');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => {
        setStatus('ok');
        return refreshUser(); // met à jour le bandeau si l'utilisateur est connecté
      })
      .catch((e) => {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : 'Lien invalide ou expiré.');
      });
  }, [token]);

  if (status === 'loading') return <Loading />;

  return (
    <div className="mx-auto mt-10 max-w-md text-center">
      <h1 className="text-xl font-bold">{status === 'ok' ? 'Adresse confirmée' : 'Confirmation impossible'}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {status === 'ok'
          ? 'Merci — ton adresse email est validée, ton compte est pleinement actif.'
          : `${message} Connecte-toi pour recevoir un nouveau lien depuis le bandeau.`}
      </p>
      <Link
        to="/"
        className="mt-5 inline-block rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400"
      >
        Aller à l'accueil
      </Link>
    </div>
  );
}
