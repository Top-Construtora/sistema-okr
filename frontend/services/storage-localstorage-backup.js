// Storage Service - Gerencia persistência de dados no LocalStorage
const StorageService = {
    STORAGE_KEY: 'top_okr_system',

    // Inicializa o storage com dados padrão
    init() {
        const existing = this.getData();
        if (!existing) {
            const defaultData = {
                users: [],
                departments: [],
                okrs: [],
                objectives: [
                    { id: 1, text: "Executar R$ 120M em obras residenciais", category: "Execução" },
                    { id: 2, text: "Executar R$ 40M em obras comerciais", category: "Execução" },
                    { id: 3, text: "Participar de 3 lançamentos (VGV R$ 350M / Equity R$ 70M)", category: "Crescimento" },
                    { id: 4, text: "Melhoria contínua: Gestão financeira e cultura", category: "Melhoria" },
                    { id: 5, text: "Melhoria contínua: Satisfação do cliente e cultura", category: "Melhoria" },
                    { id: 6, text: "Melhoria contínua: Estruturação de dados/inovação e cultura", category: "Melhoria" },
                    { id: 7, text: "Obras no prazo/qualidade e custo < 5% da previsão", category: "Execução" },
                    { id: 8, text: "Estudos para entrada no segmento econômico", category: "Crescimento" }
                ],
                currentUser: null,
                settings: {
                    theme: 'light'
                }
            };
            this.saveData(defaultData);
        }
    },

    // Recupera todos os dados
    getData() {
        const data = localStorage.getItem(this.STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    },

    // Salva todos os dados
    saveData(data) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    },

    // CRUD Genérico
    getAll(entity) {
        const data = this.getData();
        return data ? data[entity] || [] : [];
    },

    getById(entity, id) {
        const items = this.getAll(entity);
        return items.find(item => item.id === id);
    },

    create(entity, item) {
        const data = this.getData();
        if (!data[entity]) data[entity] = [];
        data[entity].push(item);
        this.saveData(data);
        return item;
    },

    update(entity, id, updatedItem) {
        const data = this.getData();
        const index = data[entity].findIndex(item => item.id === id);
        if (index !== -1) {
            data[entity][index] = { ...data[entity][index], ...updatedItem };
            this.saveData(data);
            return data[entity][index];
        }
        return null;
    },

    delete(entity, id) {
        const data = this.getData();
        const index = data[entity].findIndex(item => item.id === id);
        if (index !== -1) {
            data[entity].splice(index, 1);
            this.saveData(data);
            return true;
        }
        return false;
    },

    // Métodos específicos
    getCurrentUser() {
        const data = this.getData();
        return data ? data.currentUser : null;
    },

    setCurrentUser(user) {
        const data = this.getData();
        data.currentUser = user;
        this.saveData(data);
    },

    getObjectives() {
        const data = this.getData();
        return data ? data.objectives : [];
    },

    // Popula com dados de exemplo
    populateExample() {
        // Limpa dados existentes (exceto objectives e settings)
        const data = this.getData();
        data.users = [];
        data.departments = [];
        data.okrs = [];
        data.currentUser = null;

        // Cria departamentos de exemplo
        const depts = [
            'Projetos',
            'Financeiro',
            'SGQ',
            'Planejamento e Controle',
            'Suprimentos',
            'Gente e Gestão',
            'Obras Residenciais'
        ];

        const departmentIds = {};
        depts.forEach(nome => {
            const dept = new Department({ nome });
            dept.save();
            departmentIds[nome] = dept.id;
        });

        // Cria usuários de exemplo
        const exampleUsers = [
            { nome: 'João Silva', email: 'joao.silva@topconstrutora.com.br', senha: '123456', departamento: 'Projetos', tipo: 'colaborador' },
            { nome: 'Maria Santos', email: 'maria.santos@topconstrutora.com.br', senha: '123456', departamento: 'Financeiro', tipo: 'admin' },
            { nome: 'Pedro Oliveira', email: 'pedro.oliveira@topconstrutora.com.br', senha: '123456', departamento: 'SGQ', tipo: 'colaborador' },
            { nome: 'Ana Costa', email: 'ana.costa@topconstrutora.com.br', senha: '123456', departamento: 'Planejamento e Controle', tipo: 'colaborador' },
            { nome: 'Carlos Ferreira', email: 'carlos.ferreira@topconstrutora.com.br', senha: '123456', departamento: 'Suprimentos', tipo: 'colaborador' },
            { nome: 'Juliana Lima', email: 'juliana.lima@topconstrutora.com.br', senha: '123456', departamento: 'Gente e Gestão', tipo: 'admin' }
        ];

        exampleUsers.forEach(userData => {
            const user = new User({
                nome: userData.nome,
                email: userData.email,
                senha: userData.senha,
                departamentoId: departmentIds[userData.departamento],
                tipo: userData.tipo
            });
            user.save();
        });

        // Criar alguns OKRs de exemplo
        const exampleOKRs = [
            {
                title: 'Reduzir tempo de aprovação de projetos em 50%',
                objectiveId: 1,
                department: 'Projetos',
                status: 'approved',
                keyResults: [
                    {
                        id: uid(),
                        title: 'Diminuir tempo médio de 15 para 7 dias',
                        metric: 'Dias',
                        target: '7',
                        progress: 65,
                        tasks: []
                    },
                    {
                        id: uid(),
                        title: 'Digitalizar 100% dos processos',
                        metric: '%',
                        target: '100',
                        progress: 80,
                        tasks: []
                    }
                ]
            },
            {
                title: 'Implementar sistema de gestão financeira integrada',
                objectiveId: 4,
                department: 'Financeiro',
                status: 'pending',
                keyResults: [
                    {
                        id: uid(),
                        title: 'Integrar 3 sistemas financeiros',
                        metric: 'Sistemas',
                        target: '3',
                        progress: 0,
                        tasks: []
                    },
                    {
                        id: uid(),
                        title: 'Reduzir tempo de fechamento em 50%',
                        metric: '%',
                        target: '50',
                        progress: 0,
                        tasks: []
                    }
                ]
            },
            {
                title: 'Elevar índice de satisfação do cliente',
                objectiveId: 5,
                department: 'SGQ',
                status: 'adjust',
                keyResults: [
                    {
                        id: uid(),
                        title: 'Aumentar NPS de 65 para 80',
                        metric: 'NPS',
                        target: '80',
                        progress: 40,
                        tasks: []
                    }
                ]
            },
            {
                title: 'Otimizar processo de compras',
                objectiveId: 4,
                department: 'Suprimentos',
                status: 'approved',
                keyResults: [
                    {
                        id: uid(),
                        title: 'Reduzir tempo de cotação em 30%',
                        metric: '%',
                        target: '30',
                        progress: 50,
                        tasks: []
                    },
                    {
                        id: uid(),
                        title: 'Cadastrar 20 novos fornecedores',
                        metric: 'Fornecedores',
                        target: '20',
                        progress: 45,
                        tasks: []
                    }
                ]
            },
            {
                title: 'Aumentar eficiência do planejamento',
                objectiveId: 7,
                department: 'Planejamento e Controle',
                status: 'completed',
                keyResults: [
                    {
                        id: uid(),
                        title: 'Atingir 95% de acurácia nas previsões',
                        metric: '%',
                        target: '95',
                        progress: 100,
                        tasks: []
                    }
                ]
            },
            {
                title: 'Implantar programa de desenvolvimento',
                objectiveId: 4,
                department: 'Gente e Gestão',
                status: 'homologated',
                keyResults: [
                    {
                        id: uid(),
                        title: 'Treinar 100% dos colaboradores',
                        metric: '%',
                        target: '100',
                        progress: 100,
                        tasks: []
                    },
                    {
                        id: uid(),
                        title: 'Aumentar índice de satisfação interna',
                        metric: '%',
                        target: '85',
                        progress: 100,
                        tasks: []
                    }
                ]
            }
        ];

        exampleOKRs.forEach(okrData => {
            const okr = new OKR(okrData);
            okr.save();
        });

        console.log('✅ Dados de exemplo criados com sucesso!');
        console.log(`   📊 ${depts.length} departamentos`);
        console.log(`   👥 ${exampleUsers.length} usuários`);
        console.log(`   🎯 ${exampleOKRs.length} OKRs`);
        return true;
    },

    // Limpa todos os dados
    clearAllData() {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('🗑️ Todos os dados foram removidos');
        return true;
    },

    // Exporta dados como JSON
    exportData() {
        const data = this.getData();
        return JSON.stringify(data, null, 2);
    }
};

// Utilitário para gerar IDs únicos
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
