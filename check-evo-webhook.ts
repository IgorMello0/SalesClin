import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch'; // or use dynamic import/native fetch since node has it

const prisma = new PrismaClient();

async function main() {
  console.log('=== CONSULTANDO CONFIGURAÇÃO DE WEBHOOK NA EVOLUTION API ===');

  const empresa = await prisma.empresa.findUnique({
    where: { id: 4 },
    select: {
      id: true,
      name: true,
      evolutionApiUrl: true,
      apiKey: true,
      evolutionInstance: true,
      webhookToken: true
    }
  });

  if (!empresa) {
    console.error('Empresa teste3 não encontrada no banco.');
    return;
  }

  console.log('Dados da empresa no banco:');
  console.log(JSON.stringify(empresa, null, 2));

  if (!empresa.evolutionApiUrl || !empresa.apiKey || !empresa.evolutionInstance) {
    console.error('Credenciais da Evolution API incompletas na empresa.');
    return;
  }

  const baseUrl = empresa.evolutionApiUrl.replace(/\/+$/, '');
  const instance = empresa.evolutionInstance;
  const apiKey = empresa.apiKey;

  // Lista de URLs para testar buscar o webhook configurado na Evolution
  // Evolution v1 e v2 têm endpoints diferentes para buscar webhook
  const endpoints = [
    `${baseUrl}/webhook/find/${instance}`,
    `${baseUrl}/webhook/instance/${instance}`,
    `${baseUrl}/webhook/active/${instance}`
  ];

  for (const url of endpoints) {
    try {
      console.log(`\nTentando consultar: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': apiKey
        }
      });
      
      console.log(`Resposta HTTP Status: ${response.status}`);
      const data = await response.text();
      try {
        const parsed = JSON.parse(data);
        console.log('Resposta JSON:', JSON.stringify(parsed, null, 2));
      } catch {
        console.log('Resposta Texto:', data.substring(0, 500));
      }
    } catch (e: any) {
      console.error(`Erro ao consultar ${url}:`, e.message);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
