# WhatsApp Oficial: coexistencia e templates

## Ativacao controlada

A coexistencia fica desligada por padrao. Para liberar somente os perfis de teste:

```env
META_APP_ID=
META_APP_SECRET=
META_WHATSAPP_CONFIG_ID=
META_WHATSAPP_COEXISTENCE_CONFIG_ID=
META_WHATSAPP_REDIRECT_URI=https://sellclin.com/api/whatsapp/meta/callback
META_GRAPH_VERSION=v25.0
WHATSAPP_COEXISTENCE_ENABLED=true
WHATSAPP_COEXISTENCE_TEST_EMAILS=igormello403@gmail.com,crmsellclin@gmail.com
```

`META_WHATSAPP_CONFIG_ID` e `META_WHATSAPP_COEXISTENCE_CONFIG_ID` devem ser configuracoes diferentes do Facebook Login for Business. A segunda precisa estar preparada no painel da Meta para o onboarding de coexistencia.

## Validacao antes da liberacao

1. Conectar uma clinica de teste no modo Cloud API e confirmar envio e recebimento.
2. Conectar outra clinica de teste no modo coexistencia e confirmar que o WhatsApp Business continua funcionando no celular.
3. Sincronizar os templates e conferir os estados `APPROVED`, `PENDING` e `REJECTED`.
4. Encerrar artificialmente a janela de 24 horas e reabrir a conversa com um template aprovado.
5. Executar uma campanha pequena e confirmar os estados enviado, entregue, lido e falhou.
6. Reiniciar o container durante uma campanha e confirmar que os destinatarios pendentes sao retomados sem duplicidade.

## Rollback

Para ocultar a coexistencia sem afetar as conexoes Cloud API existentes:

```env
WHATSAPP_COEXISTENCE_ENABLED=false
```

Depois, reaplique a stack. As tabelas e os dados novos podem permanecer no banco; o rollback da interface nao exige apagar registros.

## Banco

O `docker-entrypoint.sh` executa `prisma db push` antes de iniciar o backend. As tabelas de conexoes, templates e eventos de webhook sao criadas automaticamente no primeiro deploy da imagem nova.
