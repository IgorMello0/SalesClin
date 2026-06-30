import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Tentar carregar .env da raiz do projeto
dotenv.config({ path: path.join(__dirname, '../../.env') })
// Tentar carregar .env do servidor
dotenv.config({ path: path.join(__dirname, '../.env') })

const prisma = new PrismaClient()

async function createAdmin() {
  try {
    // Verificar se DATABASE_URL está configurado
    if (!process.env.DATABASE_URL) {
      console.error('❌ Erro: DATABASE_URL não configurado!')
      console.log('\n📝 Para configurar:')
      console.log('   1. Crie um arquivo .env na raiz do projeto')
      console.log('   2. Adicione: DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco"')
      console.log('   3. Ou copie o arquivo .env.example e configure')
      console.log('\n💡 Exemplo:')
      console.log('   DATABASE_URL="postgresql://postgres:senha@localhost:5432/sellclin"')
      process.exit(1)
    }
    
    const email = 'admin@admin.com'
    const password = 'admin123'
    const name = 'Administrador'
    
    console.log('🔍 Verificando se usuário admin já existe...')
    
    // Verificar se já existe
    const existing = await prisma.professional.findUnique({
      where: { email }
    })
    
    if (existing) {
      console.log('✅ Usuário admin já existe!')
      console.log('\n📝 Credenciais:')
      console.log('   Email: admin@admin.com')
      console.log('   Senha: admin123')
      return
    }
    
    console.log('🔐 Criando hash da senha...')
    // Criar hash da senha
    const passwordHash = await bcrypt.hash(password, 10)
    
    console.log('👤 Criando usuário admin...')
    // Criar profissional admin
    const admin = await prisma.professional.create({
      data: {
        name,
        email,
        passwordHash,
        phone: '+55 11 99999-9999',
        specialization: 'Administrador do Sistema'
      }
    })
    
    console.log('\n✅ Usuário admin criado com sucesso!')
    console.log('\n📝 Credenciais de acesso:')
    console.log('   Email: admin@admin.com')
    console.log('   Senha: admin123')
    console.log('\n💡 Use essas credenciais para fazer login no sistema')
    
  } catch (error: any) {
    console.error('\n❌ Erro ao criar usuário admin:')
    if (error.code === 'P1001') {
      console.error('   Não foi possível conectar ao banco de dados!')
      console.error('   Verifique se:')
      console.error('   - O banco de dados está rodando')
      console.error('   - A DATABASE_URL está correta no arquivo .env')
      console.error('   - As credenciais estão corretas')
    } else if (error.code === 'P2002') {
      console.error('   Email já cadastrado!')
    } else {
      console.error('   ', error.message || error)
    }
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdmin()
