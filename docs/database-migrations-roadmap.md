# Roadmap de migracoes do banco

Este documento registra o plano futuro para substituir o uso operacional de
`prisma db push` por migracoes versionadas. Nenhuma mudanca de producao deve ser
feita apenas por este documento.

## Objetivo

- manter o historico de cada alteracao de schema no Git;
- executar somente migracoes pendentes durante o deploy;
- impedir alteracoes destrutivas silenciosas;
- permitir auditoria e rollback planejado por versao.

## Fases

### 1. Criar a linha de base

1. Gerar um backup completo do PostgreSQL de producao.
2. Comparar `prisma/schema.prisma` com o schema real.
3. Criar uma migracao baseline equivalente ao banco atual.
4. Marcar a baseline como aplicada sem recriar tabelas existentes.
5. Validar a baseline em uma copia restaurada do banco.

### 2. Padronizar novas alteracoes

- desenvolvimento cria migracoes com Prisma 6.18.0;
- toda migracao passa por revisao, especialmente comandos `DROP` e alteracoes de
  nulabilidade;
- dados de bootstrap continuam em scripts idempotentes, separados do schema;
- `prisma db push --accept-data-loss` deixa de fazer parte do fluxo de producao.

### 3. Atualizar o deploy

O deploy deve executar, nesta ordem:

1. backup ou ponto de restauracao;
2. `prisma migrate deploy` usando a versao fixada no projeto;
3. bootstrap idempotente;
4. atualizacao do servico;
5. health check e verificacao das migracoes aplicadas.

### 4. Contingencia

Cada migracao com transformacao de dados deve ter um procedimento documentado de
restauracao. Rollback de aplicacao nao deve tentar desfazer automaticamente uma
migracao destrutiva; nesses casos, a recuperacao vem do backup validado.

## Regras

- nunca instalar a versao mais recente do Prisma via `npx --yes prisma` em
  producao;
- usar a versao do `package-lock.json` (atualmente Prisma 6.18.0);
- nunca aplicar `--accept-data-loss` sem backup, revisao e aprovacao explicita;
- testar cada migracao em uma copia do banco antes da VPS de producao.
