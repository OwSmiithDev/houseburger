import { useRef, useState } from 'react';
import { ImagePlus, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { enviarImagem } from '@/lib/admin-api';
import { cn } from '@/lib/utils';

/**
 * Imagem por upload ou por link.
 *
 * O campo aceita as duas formas porque o catálogo inicial usa fotos externas e
 * não faria sentido obrigar a rebaixá-las para o Storage só para editar o
 * preço de um item.
 */
export const CampoImagem = ({
  valor,
  onChange,
  rotulo = 'Foto',
}: {
  valor: string;
  onChange: (url: string) => void;
  rotulo?: string;
}) => {
  const input = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [modoLink, setModoLink] = useState(false);

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setEnviando(true);
    try {
      onChange(await enviarImagem(arquivo));
      toast.success('Imagem enviada');
    } catch (e) {
      toast.error('Não foi possível enviar', {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setEnviando(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <div>
      <span className="mb-1 block text-sm font-bold text-foreground">{rotulo}</span>

      <div className="flex items-center gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {valor && (
            <img src={valor} alt="" className="h-full w-full object-cover" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={enviando}
            className={cn(
              'press-sm flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-border text-sm font-bold text-foreground',
              enviando && 'opacity-60',
            )}
          >
            {enviando ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            )}
            {enviando ? 'Enviando...' : 'Enviar foto'}
          </button>

          <button
            type="button"
            onClick={() => setModoLink((v) => !v)}
            className="press-sm flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-muted-foreground"
          >
            <Link2 className="h-4 w-4" aria-hidden="true" />
            {modoLink ? 'Ocultar link' : 'Usar link'}
          </button>
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        onChange={(e) => escolher(e.target.files?.[0])}
        className="sr-only"
        aria-label={`Enviar ${rotulo.toLowerCase()}`}
      />

      {modoLink && (
        <input
          type="url"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          aria-label={`Endereço da ${rotulo.toLowerCase()}`}
          className="animate-slide-down mt-2 h-12 w-full rounded-xl border-2 border-border bg-card px-3 text-foreground focus:border-ring focus:outline-none"
        />
      )}
    </div>
  );
};
