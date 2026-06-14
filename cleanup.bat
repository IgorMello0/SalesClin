@echo off
echo =======================================================
echo SALESCLIN - Limpando arquivos mortos e temporários
echo =======================================================

del check-evo-webhook.ts 2>nul
del cleanup-db.cjs 2>nul
del db-count.ts 2>nul
del debug-db.cjs 2>nul
del debug-profs.ts 2>nul
del debug.ts 2>nul
del debug2.ts 2>nul
del disable-modules.ts 2>nul
del fix-clients.cjs 2>nul
del fix-onboarding.ts 2>nul
del test-modules.ts 2>nul
del test-prisma.ts 2>nul
del test.ts 2>nul
del vite.config.ts.timestamp-*.mjs 2>nul

del src\components\LiquidProgressBar.tsx 2>nul
del src\pages\DentalTest.tsx 2>nul

echo Arquivos locais deletados.
echo.
echo Adicionando alteracoes ao Git...
git add .
git commit -m "refactor: remove unused files, imports, and inline footers (DRY)"
echo.
echo =======================================================
echo Limpeza concluida! Execute 'git push' para enviar ao GitHub.
echo =======================================================
