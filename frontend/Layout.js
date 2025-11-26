// Layout - Gerencia estrutura da interface
import { AuthService } from './services/auth.js';
import { StorageService } from './services/storage.js';

const Layout = {
    currentPage: 'dashboard',
    sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',

    // Renderiza o layout completo
    render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="app ${this.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
                ${this.renderSidebar()}
                <div class="main">
                    ${this.renderHeader()}
                    <div class="content" id="content">
                        <!-- Conteúdo dinâmico das páginas -->
                    </div>
                </div>
            </div>
        `;

        this.attachEventListeners();
        this.initRouter();
        this.navigateFromURL();
    },

    // Inicializa o sistema de rotas
    initRouter() {
        // Escuta eventos de navegação do navegador (botões voltar/avançar)
        window.addEventListener('popstate', () => {
            this.navigateFromURL();
        });
    },

    // Navega com base na URL atual
    navigateFromURL() {
        const path = window.location.pathname;
        const page = this.getPageFromPath(path);
        this.navigate(page, false); // false = não atualizar URL (já está correta)
    },

    // Converte caminho para nome da página
    getPageFromPath(path) {
        const routes = {
            '/': 'dashboard',
            '/dashboard': 'dashboard',
            '/okrs': 'okrs',
            '/ciclos': 'cycles',
            '/cycles': 'cycles',
            '/objetivos': 'objectives',
            '/objectives': 'objectives',
            '/approval': 'approval',
            '/usuarios': 'users',
            '/users': 'users',
            '/departamentos': 'departments',
            '/departments': 'departments'
        };
        return routes[path] || 'dashboard';
    },

    // Converte nome da página para caminho
    getPathFromPage(page) {
        const paths = {
            'dashboard': '/dashboard',
            'okrs': '/okrs',
            'cycles': '/ciclos',
            'objectives': '/objetivos',
            'approval': '/approval',
            'users': '/usuarios',
            'departments': '/departamentos'
        };
        return paths[page] || '/dashboard';
    },

    // Renderiza sidebar
    renderSidebar() {
        const user = AuthService.getCurrentUser();
        const isAdmin = AuthService.isAdmin();

        return `
            <div class="sidebar">
                <div class="sidebar-brand">
                    <div class="brand-logo">
                        <div class="brand-icon">TOP</div>
                        <div class="brand-text">
                            <h1>TOP Construtora</h1>
                            <span>Sistema OKR</span>
                        </div>
                    </div>
                </div>

                <nav class="sidebar-nav">
                    <div class="nav-section">
                        <div class="nav-section-title">Menu Principal</div>
                        <a class="nav-item" data-page="dashboard" title="Dashboard">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                            </svg>
                            <span>Dashboard</span>
                        </a>
                        <a class="nav-item" data-page="okrs" title="OKRs">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                            </svg>
                            <span>OKRs</span>
                        </a>
                        <a class="nav-item" data-page="cycles" title="Ciclos">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            <span>Ciclos</span>
                        </a>
                        <a class="nav-item" data-page="objectives" title="Objetivos Estratégicos">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
                            </svg>
                            <span>Objetivos</span>
                        </a>
                        <a class="nav-item" data-page="approval" title="Comitê de Aprovação">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>Comitê de Aprovação</span>
                        </a>
                    </div>

                    ${isAdmin ? `
                    <div class="nav-section">
                        <div class="nav-section-title">Administração</div>
                        <a class="nav-item" data-page="users" title="Usuários">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
                            </svg>
                            <span>Usuários</span>
                        </a>
                        <a class="nav-item" data-page="departments" title="Departamentos">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                            </svg>
                            <span>Departamentos</span>
                        </a>
                    </div>
                    ` : ''}
                </nav>

                <div class="sidebar-toggle-container">
                    <button class="sidebar-toggle" onclick="Layout.toggleSidebar()" title="${this.sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${this.sidebarCollapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'}"/>
                        </svg>
                        <span class="toggle-text">${this.sidebarCollapsed ? 'Expandir' : 'Recolher'}</span>
                    </button>
                </div>

                <div class="sidebar-footer">
                    <div class="user-card">
                        <div class="user-avatar">${this.getInitials(user?.nome || 'U')}</div>
                        <div class="user-info">
                            <h4>${user?.nome || 'Usuário'}</h4>
                            <span>${user?.tipo === 'admin' ? 'Administrador' : 'Colaborador'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Renderiza header
    renderHeader() {
        const pageTitle = this.getPageTitle(this.currentPage);
        const pageSubtitle = this.getPageSubtitle(this.currentPage);
        const user = AuthService.getCurrentUser();

        return `
            <div class="header">
                <div class="header-left">
                    <button class="btn-icon sidebar-toggle-mobile" onclick="Layout.toggleSidebar()" title="Menu">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>
                    <div>
                        <h1>${pageTitle}</h1>
                        ${pageSubtitle ? `<p>${pageSubtitle}</p>` : ''}
                    </div>
                </div>
                <div class="header-right">
                    <div class="user-menu">
                        <div class="user-avatar-small">${this.getInitials(user?.nome || 'U')}</div>
                        <span class="user-name">${user?.nome || 'Usuário'}</span>
                        <button class="btn btn-secondary btn-sm" onclick="Layout.logout()" title="Sair">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                            </svg>
                            Sair
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Pega iniciais do nome
    getInitials(name) {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
    },

    // Pega título da página
    getPageTitle(page) {
        const titles = {
            dashboard: 'Dashboard',
            okrs: 'Gestão de OKRs',
            cycles: 'Gestão de Ciclos',
            objectives: 'Objetivos Estratégicos',
            approval: 'Comitê de Aprovação',
            users: 'Gestão de Usuários',
            departments: 'Gestão de Departamentos'
        };
        return titles[page] || 'Sistema OKR';
    },

    // Pega subtítulo da página
    getPageSubtitle(page) {
        const subtitles = {
            dashboard: 'Visão geral do progresso dos objetivos',
            okrs: 'Gerencie os OKRs da empresa',
            cycles: 'Configure ciclos e miniciclos para organizar os OKRs',
            objectives: 'Gerencie os objetivos estratégicos da empresa',
            approval: 'Aprove e acompanhe os OKRs submetidos',
            users: 'Gerencie os usuários do sistema',
            departments: 'Gerencie os departamentos da empresa'
        };
        return subtitles[page] || '';
    },

    // Anexa event listeners
    attachEventListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                this.navigate(page);
            });
        });
    },

    // Navega para uma página
    navigate(page, updateURL = true) {
        this.currentPage = page;

        // Atualiza URL se necessário
        if (updateURL) {
            const path = this.getPathFromPage(page);
            window.history.pushState({ page }, '', path);
        }

        // Atualiza título da página
        document.title = `${this.getPageTitle(page)} - TOP Construtora OKR`;

        // Atualiza nav items ativos
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === page) {
                item.classList.add('active');
            }
        });

        // Atualiza header
        const header = document.querySelector('.header');
        if (header) {
            header.outerHTML = this.renderHeader();
        }

        // Renderiza conteúdo da página
        const content = document.getElementById('content');
        if (content) {
            switch (page) {
                case 'dashboard':
                    DashboardPage.render();
                    break;
                case 'okrs':
                    OKRsPage.render();
                    break;
                case 'cycles':
                    CyclesPage.render();
                    break;
                case 'objectives':
                    ObjectivesPage.render();
                    break;
                case 'approval':
                    ApprovalPage.render();
                    break;
                case 'users':
                    UsersPage.render();
                    break;
                case 'departments':
                    DepartmentsPage.render();
                    break;
                default:
                    content.innerHTML = '<p>Página não encontrada</p>';
            }
        }
    },

    // Toggle da sidebar
    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        localStorage.setItem('sidebarCollapsed', this.sidebarCollapsed);

        const app = document.querySelector('.app');
        if (this.sidebarCollapsed) {
            app.classList.add('sidebar-collapsed');
        } else {
            app.classList.remove('sidebar-collapsed');
        }

        // Recriar o botão com ícone e texto atualizados
        const container = document.querySelector('.sidebar-toggle-container');
        if (container) {
            container.innerHTML = `
                <button class="sidebar-toggle" onclick="Layout.toggleSidebar()" title="${this.sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${this.sidebarCollapsed ? 'M13 5l7 7-7 7M5 5l7 7-7 7' : 'M11 19l-7-7 7-7m8 14l-7-7 7-7'}"/>
                    </svg>
                    <span class="toggle-text">${this.sidebarCollapsed ? 'Expandir' : 'Recolher'}</span>
                </button>
            `;
        }
    },

    // Logout
    logout() {
        if (confirm('Deseja realmente sair?')) {
            AuthService.logout();
            window.location.reload();
        }
    },

    // Exportar dados
    exportData() {
        try {
            const data = StorageService.exportData();
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `okr-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            DepartmentsPage.showToast('Dados exportados com sucesso!', 'success');
        } catch (error) {
            DepartmentsPage.showToast('Erro ao exportar dados', 'error');
        }
    },

    // Limpar dados
    clearData() {
        if (confirm('⚠️ ATENÇÃO: Isso irá remover TODOS os dados do sistema (departamentos, usuários, OKRs).\n\nDeseja realmente continuar?')) {
            if (confirm('Confirme novamente: Todos os dados serão perdidos permanentemente!')) {
                StorageService.clearAllData();
                DepartmentsPage.showToast('Todos os dados foram removidos!', 'success');
                setTimeout(() => window.location.reload(), 1500);
            }
        }
    }
};

// Globals
window.Layout = Layout;
export { Layout };
