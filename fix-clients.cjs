const fs = require('fs');

const p = 'server/routes/clients.ts';
let data = fs.readFileSync(p, 'utf8');

const replacement = `    // Propostas Comerciais
    if (client.originLead?.proposals) {
      client.originLead.proposals.forEach((ficha: any) => {
        timeline.push({
          id: \`proposal-\${ficha.id}\`,
          type: 'proposal',
          title: \`Proposta Comercial\`,
          date: ficha.createdAt,
          description: \`Título: \${ficha.title} | Valor: R$ \${Number(ficha.value).toFixed(2).replace('.', ',')}\`,
          icon: 'request_quote'
        });
      });
    }`;

// use regex to be flexible about newlines
const regex = /\/\/ Fichas \(Prontuários\)[\s\S]*?icon: 'description'\r?\n\s+\}\);\r?\n\s+\}\);/m;
if (regex.test(data)) {
  data = data.replace(regex, replacement);
  fs.writeFileSync(p, data, 'utf8');
  console.log('Fixed');
} else {
  console.log('Not matched');
}
