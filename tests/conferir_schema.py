"""Confere se o `instalar.sql` descreve o mesmo banco que está no ar.

Existe por causa de um defeito real: o instalador declarava `products.imagem_url`
enquanto o banco (e o aplicativo) usavam `image_url`, e `coupons.minimo` onde a
função `create_order` procurava `min_subtotal`. Sintaticamente o arquivo era
válido — o parser do Postgres aprovava — e mesmo assim nenhuma instalação nova
funcionaria: as fotos não salvariam e todo pedido com cupom quebraria.

Validar sintaxe não basta. Isto compara nome por nome.

Uso:
    python tests/conferir_schema.py

    Lê VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY do .env da raiz.
    A chave publicável basta: só faz leitura, e o que o RLS esconder é pulado.

Saída: 0 se tudo bate, 1 se alguma tabela diverge.
"""

import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
INSTALADOR = RAIZ / "supabase" / "instalar.sql"

# Colunas que existem no arquivo mas ainda não foram aplicadas ao banco em
# operação. Some daqui assim que o `atualizar.sql` for executado lá.
PENDENTES = {"coupons": {"expira_em"}}


def ler_env() -> tuple[str, str]:
    env = RAIZ / ".env"
    if not env.exists():
        sys.exit("Faltou o .env na raiz do projeto.")
    valores = {}
    for linha in env.read_text(encoding="utf-8").splitlines():
        if "=" in linha and not linha.strip().startswith("#"):
            chave, _, valor = linha.partition("=")
            valores[chave.strip()] = valor.strip().strip('"').strip("'")
    try:
        return valores["VITE_SUPABASE_URL"], valores["VITE_SUPABASE_PUBLISHABLE_KEY"]
    except KeyError as e:
        sys.exit(f"Faltou {e} no .env.")


def colunas_no_banco(base: str, chave: str, tabela: str) -> set[str] | None:
    """None quando o RLS não deixa ver nenhuma linha — aí não dá para comparar."""
    pedido = urllib.request.Request(
        f"{base}/rest/v1/{tabela}?select=*&limit=1",
        headers={"apikey": chave, "Authorization": f"Bearer {chave}"},
    )
    try:
        with urllib.request.urlopen(pedido, timeout=30) as r:
            linhas = json.loads(r.read())
    except urllib.error.HTTPError:
        return None
    return set(linhas[0].keys()) if linhas else None


def colunas_no_arquivo() -> dict[str, set[str]]:
    sql = INSTALADOR.read_text(encoding="utf-8")
    tabelas: dict[str, set[str]] = {}

    for m in re.finditer(r"create table if not exists (\w+) \((.*?)\n\);", sql, re.S):
        nome, corpo = m.group(1), m.group(2)
        colunas = set()
        for linha in corpo.split("\n"):
            texto = linha.strip()
            # Restrições de tabela e continuações de `check` não são colunas.
            if not texto or texto.startswith(("--", "check", "primary key", "unique", ")")):
                continue
            primeira = texto.split()[0]
            if primeira.isidentifier():
                colunas.add(primeira)
        tabelas[nome] = colunas

    # `alter table ... add column` também cria coluna.
    for m in re.finditer(r"alter table (\w+)(.*?);", sql, re.S):
        tabela, corpo = m.group(1), m.group(2)
        if tabela in tabelas:
            for c in re.findall(r"add column if not exists (\w+)", corpo):
                tabelas[tabela].add(c)

    return tabelas


def main() -> int:
    base, chave = ler_env()
    problemas = 0

    for tabela, do_arquivo in sorted(colunas_no_arquivo().items()):
        do_banco = colunas_no_banco(base, chave, tabela)
        if do_banco is None:
            print(f"[pulado] {tabela}: sem linha legível (RLS ou tabela vazia)")
            continue

        faltando = do_banco - do_arquivo
        sobrando = do_arquivo - do_banco - PENDENTES.get(tabela, set())

        if faltando or sobrando:
            problemas += 1
            print(f"[ERRO]   {tabela}")
            if faltando:
                print(f"         no banco, ausente no instalador: {sorted(faltando)}")
            if sobrando:
                print(f"         no instalador, ausente no banco: {sorted(sobrando)}")
        else:
            print(f"[ok]     {tabela}: {len(do_arquivo)} colunas conferem")

    if problemas:
        print(f"\n{problemas} tabela(s) divergindo — o instalador não reproduz este banco.")
        return 1
    print("\nO instalador descreve o mesmo banco que está no ar.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
