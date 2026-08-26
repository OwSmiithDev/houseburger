import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Entrada do dono.
 *
 * A senha vive no Supabase Auth, nunca no código: uma senha escrita no fonte
 * iria junto no JavaScript entregue ao navegador e qualquer visitante poderia
 * lê-la. Não há cadastro aqui — a conta é criada uma vez no painel do Supabase.
 */
const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  // Já autenticado não precisa ver o formulário.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/admin', { replace: true });
    });
  }, [navigate]);

  const entrar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setErro('');
    setEntrando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    setEntrando(false);

    if (error) {
      // Mensagem genérica de propósito: dizer "e-mail não existe" entregaria
      // quais contas existem para quem estiver tentando adivinhar.
      setErro('E-mail ou senha incorretos.');
      return;
    }
    navigate('/admin', { replace: true });
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6">
      <form onSubmit={entrar} className="surface w-full max-w-sm p-6">
        <div className="gradient-hero mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl">
          <Lock className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
        </div>
        <h1 className="text-center text-lg font-black text-foreground">
          Administração
        </h1>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Acesso restrito à equipe da loja
        </p>

        <label htmlFor="email" className="mb-2 block text-sm font-bold text-foreground">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 h-12 w-full rounded-xl border-2 border-border bg-card px-4 text-foreground focus:border-ring focus:outline-none"
        />

        <label htmlFor="senha" className="mb-2 block text-sm font-bold text-foreground">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="h-12 w-full rounded-xl border-2 border-border bg-card px-4 text-foreground focus:border-ring focus:outline-none"
        />

        {erro && (
          <p role="alert" className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={entrando}
          className="press mt-6 h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground shadow-button disabled:opacity-70"
        >
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
};

export default Login;
