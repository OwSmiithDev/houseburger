import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Campo numérico do painel.
 *
 * Existe por causa de dois incômodos que apareciam em todas as telas de
 * cadastro, e que vinham de tratar o valor como número o tempo todo:
 *
 * 1. **O zero não saía.** Com `value={0}`, clicar no começo e digitar `5`
 *    produzia `50`. O campo estava certo do ponto de vista do React — só que
 *    ninguém quer somar um dígito a um zero que nunca escolheu digitar.
 * 2. **Não dava para esvaziar.** `Number('')` é `0`, então apagar tudo fazia o
 *    zero voltar na hora e o cursor brigar com ele.
 *
 * A solução é guardar o texto enquanto se edita e converter só ao sair. O
 * campo pode ficar vazio no meio da digitação, e o valor numérico só muda
 * quando há um número de verdade. Focar seleciona tudo, então digitar
 * substitui em vez de acrescentar.
 */
export const CampoNumero = ({
  value,
  onChange,
  className,
  id,
  min,
  max,
  step,
  required,
  placeholder,
  'aria-label': ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
  id?: string;
  // Aceitos como vierem (`min="0"` ou `min={0}`): o HTML trata os dois igual,
  // e exigir um formato só obrigaria a reescrever dezenas de campos.
  min?: number | string;
  max?: number | string;
  step?: number | string;
  required?: boolean;
  placeholder?: string;
  'aria-label'?: string;
}) => {
  const [texto, setTexto] = useState(() => String(value));
  const editando = useRef(false);

  // Enquanto o campo está em edição o texto manda; fora dela, quem manda é o
  // valor de cima — senão um "salvar" que arredonda não se refletiria na tela.
  useEffect(() => {
    if (!editando.current) setTexto(String(value));
  }, [value]);

  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      required={required}
      placeholder={placeholder}
      aria-label={ariaLabel}
      value={texto}
      onFocus={(e) => {
        editando.current = true;
        // Digitar substitui o conteúdo em vez de somar dígitos ao que havia.
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const bruto = e.target.value;
        setTexto(bruto);
        // Só propaga quando há número; texto vazio ou "-" ainda está a meio
        // caminho de virar um.
        const n = Number(bruto);
        if (bruto !== '' && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        editando.current = false;
        // Campo deixado vazio volta ao valor de cima, para não gravar NaN.
        setTexto(String(value));
      }}
      className={className && cn(className)}
    />
  );
};
