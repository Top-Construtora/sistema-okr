# Sistema OKR - TOP Construtora

![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-f7df1e?logo=javascript&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.0-646cff?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-4.x-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-4169e1?logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth_&_DB-3ecf8e?logo=supabase&logoColor=white)
![License](https://img.shields.io/badge/Licenca-Privado-red)

Sistema web para gestao de OKRs (Objectives and Key Results) com ciclos, mini-ciclos, iniciativas, comite de aprovacao em Kanban, ranking de departamentos e calendario integrado. Frontend em Vanilla JS com Vite e backend Express, ambos consumindo Supabase.

---

## Funcionalidades

### Gestao de OKRs
- **Criacao e edicao** de OKRs vinculados a objetivos estrategicos
- **Key Results** com metricas, metas, progresso (0-100%) e evidencias
- **Iniciativas** (sub-tarefas) por Key Result com responsaveis multiplos
- **Progresso automatico** calculado a partir dos Key Results
- **Filtros** por status, departamento e mini-ciclo

### Comite de Aprovacao
- **Quadro Kanban** com 5 colunas de workflow:
  - Pendente → Ajuste → Aprovado → Concluido → Homologado
- **Arrastar e soltar** para movimentar OKRs entre etapas
- **Comentarios do comite** em cada transicao

### Ciclos e Mini-ciclos
- **Ciclos** anuais ou semestrais com datas de inicio e fim
- **Mini-ciclos** (trimestres) vinculados ao ciclo ativo
- **Geracao automatica** de mini-ciclos ao criar um ciclo
- **Ativacao/desativacao** de ciclos

### Objetivos Estrategicos
- Categorias: **Execucao**, **Crescimento** e **Melhoria**
- Vinculacao de OKRs a objetivos da empresa
- Gestao completa (CRUD) com ativacao/desativacao

### Dashboard
- **Ranking de OKRs** por progresso com historico de posicao
- **Visao geral** dos objetivos estrategicos
- **Proximas atividades** e prazos
- **Metricas** por departamento

### Calendario
- **Calendario interativo** com iniciativas e lembretes
- **Filtros** por departamento e usuario
- **Lembretes/notas/tarefas** com prioridades (baixa, normal, alta, urgente)
- **Deteccao** de tarefas atrasadas

### Meus OKRs
- Visao filtrada dos OKRs do departamento do usuario
- Acesso rapido para edicao e acompanhamento

### Gestao de Usuarios e Departamentos
- **3 papeis**: Admin, Colaborador, Consultor
- **Multi-departamento**: usuarios vinculados a varios departamentos
- **Primeiro acesso** com troca obrigatoria de senha
- **Recuperacao de senha** via e-mail (Supabase Auth)

---

## Arquitetura

```
sistema-okr/
├── frontend/          # Vite + Vanilla JS (ES Modules) + Supabase Client
├── backend/           # Express.js + Supabase Admin Client
└── package.json
```

---

## Pre-requisitos

- [Node.js](https://nodejs.org/) >= 16.x
- [npm](https://www.npmjs.com/)
- Conta no [Supabase](https://supabase.com/) com projeto PostgreSQL

## Instalacao

```bash
# Instalar dependencias do frontend
cd frontend && npm install

# Instalar dependencias do backend
cd backend && npm install

# Configurar banco de dados (executar no Supabase SQL Editor na ordem):
# 1. backend/database/01_schema.sql
# 2. backend/database/02_security_rls.sql
# 3. backend/database/03_functions_triggers.sql
# 4. backend/database/04_seed_data.sql
```

## Executando

Dois terminais simultaneos:

```bash
# Terminal 1 - Backend (http://localhost:3001)
cd backend && npm run dev

# Terminal 2 - Frontend (http://localhost:3000)
cd frontend && npm run dev
```

> O frontend pode operar diretamente com o Supabase para a maioria das funcionalidades. O backend e necessario para operacoes administrativas (criacao de usuarios, reset de senha).

## Build & Deploy

```bash
# Build do frontend (gera dist/ estatico)
cd frontend && npm run build

# Preview do build
cd frontend && npm run preview

# Backend em producao
cd backend && npm start
```

---

## Frontend

### Estrutura

```
frontend/
├── index.html                 # Entry point
├── main.js                    # Vite entry (importa app.js)
├── app.js                     # Inicializacao e tela de login
├── Layout.js                  # Navegacao, sidebar e roteamento SPA
├── globals.js                 # Funcoes globais para onclick handlers
├── Entities/                  # Modelos de dados com metodos CRUD
│   ├── OKR.js                # OKR com calculo de progresso
│   ├── KeyResult.js          # Key Results
│   ├── Initiative.js         # Iniciativas com responsaveis multiplos
│   ├── User.js               # Usuarios (Supabase Auth)
│   ├── Department.js         # Departamentos
│   ├── Cycle.js              # Ciclos anuais/semestrais
│   ├── MiniCycle.js          # Mini-ciclos (trimestres)
│   ├── Reminder.js           # Lembretes do calendario
│   └── SystemSetting.js      # Configuracoes do sistema
├── Pages/                     # Paginas da aplicacao
│   ├── Dashboard/            # Dashboard com ranking e metricas
│   ├── OKRs/                 # Gestao de OKRs + Meus OKRs
│   ├── ApprovalCommittee/    # Kanban de aprovacao
│   ├── Cycles/               # Gestao de ciclos e mini-ciclos
│   ├── Calendar/             # Calendario interativo
│   ├── Objectives/           # Objetivos estrategicos
│   ├── Users/                # Gestao de usuarios (Admin)
│   ├── Departments/          # Gestao de departamentos (Admin)
│   ├── Settings/             # Configuracoes do usuario
│   └── PasswordRecovery/     # Recuperacao de senha
├── Components/                # Componentes reutilizaveis
│   ├── dashboard/            # MetricCard, ProgressRing, DepartmentProgress
│   └── okrs/                 # OKRCard, OKRForm, OkRDetail
└── services/                  # Servicos
    ├── supabase.js           # Configuracao do Supabase Client
    ├── storage.js            # Camada de persistencia
    └── auth.js               # Autenticacao (Supabase Auth)
```

### Rotas (SPA com History API)

| Rota | Pagina |
|---|---|
| `/` ou `/dashboard` | Dashboard |
| `/okrs` | Gestao de OKRs |
| `/meus-okrs` | Meus OKRs (por departamento) |
| `/approval` | Comite de Aprovacao (Kanban) |
| `/ciclos` | Ciclos e Mini-ciclos |
| `/calendario` | Calendario |
| `/objetivos` | Objetivos Estrategicos |
| `/usuarios` | Gestao de Usuarios (Admin) |
| `/departamentos` | Gestao de Departamentos (Admin) |
| `/configuracoes` | Configuracoes |

### Variaveis de Ambiente (frontend)

Crie `frontend/.env`:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

---

## Backend

### Estrutura

```
backend/
├── server.js                  # Express app (porta 3001)
├── config/                    # Configuracoes (Supabase)
├── routes/                    # Rotas da API
│   ├── auth.routes.js        # Reset de senha
│   ├── user.routes.js        # CRUD de usuarios (Admin)
│   ├── department.routes.js  # Departamentos
│   ├── okr.routes.js         # OKRs
│   ├── objective.routes.js   # Objetivos
│   ├── stats.routes.js       # Estatisticas
│   └── evidence.routes.js    # Visualizacao/download de evidencias
└── database/                  # Scripts SQL
    ├── 01_schema.sql         # Schema completo
    ├── 02_security_rls.sql   # Row Level Security
    ├── 03_functions_triggers.sql  # Funcoes e triggers
    └── 04_seed_data.sql      # Dados iniciais
```

### Endpoints da API

#### Autenticacao (`/api/auth`)
| Metodo | Rota | Descricao |
|---|---|---|
| POST | `/password-reset` | Solicitar reset de senha por e-mail |

#### Usuarios (`/api/users`)
| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/` | Listar usuarios |
| POST | `/` | Criar usuario (via Supabase Auth Admin) |

#### Evidencias (`/api/evidence`)
| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/view/:bucket/*` | Visualizar arquivo |
| GET | `/download/:bucket/*` | Download de arquivo |

#### Outros
| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/health` | Health check |

> A maioria das operacoes de CRUD (OKRs, departamentos, ciclos, etc.) e feita diretamente pelo frontend via Supabase Client, sem passar pelo backend.

### Variaveis de Ambiente (backend)

Crie `backend/.env`:

```env
PORT=3001
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-anon-key
```

---

## Banco de Dados

### Tabelas principais

| Grupo | Tabelas |
|---|---|
| **Usuarios** | `users` (admin, colaborador, consultor), `user_departments` |
| **Organizacao** | `departments` |
| **Ciclos** | `cycles`, `mini_cycles` |
| **OKRs** | `objectives`, `okrs`, `key_results` |
| **Iniciativas** | `initiatives`, `initiative_responsible_users` |
| **Calendario** | `reminders` |
| **Sistema** | `system_settings` |

### Entidades principais

| Entidade | Campos chave |
|---|---|
| **User** | id, auth_id, nome, email, tipo (admin/colaborador/consultor), departamento_id, ativo, primeiro_acesso |
| **Department** | id, nome, ativo |
| **Cycle** | id, nome, descricao, data_inicio, data_fim, ativo |
| **MiniCycle** | id, cycle_id, nome, ordem, data_inicio, data_fim, ativo |
| **Objective** | id, text, category (Execucao/Crescimento/Melhoria), ativo |
| **OKR** | id, title, objective_id, mini_cycle_id, department, status, progress, committee_comment |
| **KeyResult** | id, okr_id, title, metric, target, progress, tasks (JSONB), evidence (JSONB) |
| **Initiative** | id, key_result_id, nome, responsavel_id, data_limite, progress, concluida, evidence (JSONB) |
| **Reminder** | id, user_id, content, reminder_date, type (note/reminder/task), priority, completed |

### Workflow de Status dos OKRs

```
Pendente → Ajuste → Aprovado → Concluido → Homologado
```

| Status | Descricao |
|---|---|
| `pending` | Aguardando revisao do comite |
| `adjust` | Ajustes solicitados |
| `approved` | Em andamento |
| `completed` | Concluido pelo colaborador |
| `homologated` | Homologado pelo comite (etapa final) |

### Niveis de Acesso

| Papel | Acesso |
|---|---|
| **Admin** | Acesso total: usuarios, departamentos, ciclos, objetivos, todos os OKRs, comite, configuracoes |
| **Colaborador** | OKRs do seu departamento, calendario, dashboard, configuracoes pessoais |
| **Consultor** | Visualizacao de OKRs e dashboard (somente leitura) |

---

## Seguranca

- **Supabase Auth** para autenticacao (senhas criptografadas)
- **Row Level Security (RLS)** no PostgreSQL para controle de acesso
- **Helmet** e **CORS** no backend Express
- **JWT** gerenciado automaticamente pelo Supabase
- **Primeiro acesso** com troca obrigatoria de senha
- **Recuperacao de senha** via e-mail

## Deploy

| Componente | Plataforma |
|---|---|
| Frontend | Vercel (build estatico via `npm run build`) |
| Backend | Render (Node.js) |
| Banco de dados | Supabase (PostgreSQL gerenciado) |
| Autenticacao | Supabase Auth |
| Storage | Supabase Storage (evidencias) |

---

Desenvolvido para **TOP Construtora**
