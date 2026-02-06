// Layout - Gerencia estrutura da interface
import { AuthService } from './services/auth.js';
import { StorageService } from './services/storage.js';
import { MiniCycle } from './Entities/MiniCycle.js';

const Layout = {
    currentPage: 'dashboard',
    sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
    isOkrMenuOpen: localStorage.getItem('okrMenuOpen') !== 'false', // Aberto por padrão

    // Renderiza o layout completo
    async render() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="sidebar-overlay" onclick="Layout.closeMobileSidebar()"></div>
            <div class="app ${this.sidebarCollapsed ? 'sidebar-collapsed' : ''}">
                ${this.renderSidebar()}
                <div class="main">
                    <div id="header-container"></div>
                    <div class="content" id="content">
                        <!-- Conteúdo dinâmico das páginas -->
                    </div>
                </div>
            </div>
        `;

        // Renderiza header de forma assíncrona
        await this.updateHeader();

        this.attachEventListeners();
        this.initRouter();
        this.navigateFromURL();
    },

    async updateHeader() {
        const headerContainer = document.getElementById('header-container');
        if (headerContainer) {
            headerContainer.innerHTML = await this.renderHeader();
        }
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
            '/meus-okrs': 'my-okrs',
            '/my-okrs': 'my-okrs',
            '/okrs': 'okrs',
            '/todos-okrs': 'okrs',
            '/calendario': 'calendar',
            '/calendar': 'calendar',
            '/ciclos': 'cycles',
            '/cycles': 'cycles',
            '/objetivos': 'objectives',
            '/objectives': 'objectives',
            '/approval': 'approval',
            '/usuarios': 'users',
            '/users': 'users',
            '/departamentos': 'departments',
            '/departments': 'departments',
            '/configuracoes': 'settings',
            '/settings': 'settings',
            '/esqueci-senha': 'forgot-password',
            '/redefinir-senha': 'reset-password'
        };
        return routes[path] || 'dashboard';
    },

    // Converte nome da página para caminho
    getPathFromPage(page) {
        const paths = {
            'dashboard': '/dashboard',
            'my-okrs': '/meus-okrs',
            'okrs': '/okrs',
            'calendar': '/calendario',
            'cycles': '/ciclos',
            'objectives': '/objetivos',
            'approval': '/approval',
            'users': '/usuarios',
            'departments': '/departamentos',
            'settings': '/configuracoes',
            'forgot-password': '/esqueci-senha',
            'reset-password': '/redefinir-senha'
        };
        return paths[page] || '/dashboard';
    },

    // Renderiza sidebar
    renderSidebar() {
        const user = AuthService.getCurrentUser();
        const isAdmin = AuthService.isAdmin();
        const canAccessApproval = AuthService.canAccessApproval();

        return `
            <div class="sidebar">
                <div class="sidebar-brand">
                    <div class="brand-logo">
                        <div class="brand-icon">
                            <img src="/gio.png" alt="Logo" style="width:100%;height:100%;object-fit:contain;">
                        </div>
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
                        <div class="nav-submenu ${this.isOkrMenuOpen ? 'open' : ''}">
                            <a class="nav-item nav-submenu-toggle" onclick="Layout.toggleOkrMenu(event)" title="OKRs">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                                </svg>
                                <span>OKRs</span>
                                <svg class="submenu-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                                </svg>
                            </a>
                            <div class="nav-submenu-items">
                                <a class="nav-item nav-subitem" data-page="my-okrs" title="Meus OKRs">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                                    </svg>
                                    <span>Meus OKRs</span>
                                </a>
                                <a class="nav-item nav-subitem" data-page="okrs" title="Todos os OKRs">
                                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                                    </svg>
                                    <span>Todos os OKRs</span>
                                </a>
                            </div>
                        </div>
                        <a class="nav-item" data-page="calendar" title="Calendário">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>Calendário</span>
                        </a>
                        <a class="nav-item" data-page="cycles" title="Ciclos">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                            </svg>
                            <span>Ciclos</span>
                        </a>
                        <a class="nav-item" data-page="objectives" title="Objetivos Estratégicos">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                            </svg>
                            <span>Objetivos</span>
                        </a>
                        ${canAccessApproval ? `
                        <a class="nav-item" data-page="approval" title="Comitê de Aprovação">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>Comitê de Aprovação</span>
                        </a>
                        ` : ''}
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
            </div>
        `;
    },

    // Renderiza header
    async renderHeader() {
        const pageTitle = this.getPageTitle(this.currentPage);
        const pageSubtitle = this.getPageSubtitle(this.currentPage);
        const user = AuthService.getCurrentUser();
        const currentMiniCycle = await MiniCycle.getCurrentActive();
        const dateInfo = this.getDateInfo();

        return `
            <div class="header">
                <div class="header-left">
                    <button class="sidebar-toggle-mobile btn-icon btn-secondary" onclick="Layout.toggleMobileSidebar()" title="Menu" style="display:none;">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
                        </svg>
                    </button>
                    <div>
                        <h1>${pageTitle}</h1>
                        ${pageSubtitle ? `<p>${pageSubtitle}</p>` : ''}
                    </div>
                </div>
                <div class="header-center">
                    <div class="header-date-info">
                        <div class="current-date">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            ${dateInfo}
                        </div>
                        ${currentMiniCycle ? `
                            <div class="minicycle-info">
                                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                                </svg>
                                <span class="minicycle-name">${currentMiniCycle.nome}</span>
                                <span class="minicycle-separator">•</span>
                                <span class="minicycle-dates">${this.formatDate(currentMiniCycle.data_inicio)} - ${this.formatDate(currentMiniCycle.data_fim)}</span>
                            </div>
                        ` : `
                            <div class="minicycle-info inactive">
                                <span>Nenhum miniciclo ativo</span>
                            </div>
                        `}
                    </div>
                </div>
                <div class="header-right">
                    <div class="user-menu">
                        <div class="user-menu-trigger" onclick="Layout.toggleUserMenu(event)">
                            <div class="user-avatar-small">${this.getInitials(user?.nome || 'U')}</div>
                            <span class="user-name">${user?.nome || 'Usuário'}</span>
                            <svg class="user-menu-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width:16px;height:16px;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                        </div>
                        <div class="user-menu-dropdown" id="user-menu-dropdown">
                            <button class="user-menu-item" onclick="Layout.openSettings(); Layout.closeUserMenu();">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                </svg>
                                Configurações
                            </button>
                            <div class="user-menu-divider"></div>
                            <button class="user-menu-item user-menu-item-danger" onclick="Layout.logout(); Layout.closeUserMenu();">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                                </svg>
                                Sair
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    getDateInfo() {
        const now = new Date();
        const diasSemana = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
        const meses = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

        const diaSemana = diasSemana[now.getDay()];
        const dia = now.getDate();
        const mes = meses[now.getMonth()];
        const ano = now.getFullYear();

        return `${diaSemana}, ${dia} de ${mes} de ${ano}`;
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
            'my-okrs': 'Meus OKRs',
            okrs: 'Todos os OKRs',
            calendar: 'Calendário de Iniciativas',
            cycles: 'Gestão de Ciclos',
            objectives: 'Objetivos Estratégicos',
            approval: 'Comitê de Aprovação',
            users: 'Gestão de Usuários',
            departments: 'Gestão de Departamentos',
            settings: 'Configurações'
        };
        return titles[page] || 'Sistema OKR';
    },

    // Pega subtítulo da página
    getPageSubtitle(page) {
        const subtitles = {
            dashboard: 'Visão geral do progresso dos objetivos',
            'my-okrs': 'OKRs do seu departamento',
            okrs: 'Visão geral de todos os OKRs da empresa',
            calendar: 'Visualize iniciativas e gerencie seus lembretes',
            cycles: "Configure ciclos e miniciclos para organizar os OKR's",
            objectives: 'Gerencie os objetivos estratégicos da empresa',
            approval: 'Aprove e acompanhe os OKRs submetidos',
            users: 'Gerencie os usuários do sistema',
            departments: 'Gerencie os departamentos da empresa',
            settings: 'Altere sua senha de acesso ao sistema'
        };
        return subtitles[page] || '';
    },

    // Anexa event listeners
    attachEventListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Ignora se for o toggle do submenu (tem handler próprio)
                if (item.classList.contains('nav-submenu-toggle')) {
                    return;
                }
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page) {
                    this.navigate(page);
                }
            });
        });
    },

    // Navega para uma página
    async navigate(page, updateURL = true) {
        // Garante que o scroll está habilitado ao navegar
        document.body.style.overflow = '';

        // Fecha sidebar mobile se estiver aberta
        this.closeMobileSidebar();

        // Extrai página base e query string
        let basePage = page;
        let queryString = '';
        if (page.includes('?')) {
            const parts = page.split('?');
            basePage = parts[0];
            queryString = '?' + parts[1];
        }

        // Bloqueia acesso a páginas administrativas para não-admins
        const isAdmin = AuthService.isAdmin();
        const canAccessApproval = AuthService.canAccessApproval();
        const adminOnlyPages = ['users', 'departments'];

        // Páginas só de admin
        if (!isAdmin && adminOnlyPages.includes(basePage)) {
            basePage = 'dashboard';
            queryString = '';
            updateURL = true;
        }

        // Comitê de Aprovação: admin e consultor podem acessar
        if (!canAccessApproval && basePage === 'approval') {
            basePage = 'dashboard';
            queryString = '';
            updateURL = true;
        }

        this.currentPage = basePage;

        // Se navegar para página de OKR, abre o submenu
        if (basePage === 'my-okrs' || basePage === 'okrs') {
            this.isOkrMenuOpen = true;
            localStorage.setItem('okrMenuOpen', 'true');
            const submenu = document.querySelector('.nav-submenu');
            if (submenu) submenu.classList.add('open');
        }

        // Atualiza URL se necessário
        if (updateURL) {
            const path = this.getPathFromPage(basePage) + queryString;
            window.history.pushState({ page: basePage }, '', path);
        }

        // Atualiza título da página
        document.title = `${this.getPageTitle(basePage)} - TOP Construtora OKR`;

        // Atualiza nav items ativos
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-page') === basePage) {
                item.classList.add('active');
            }
        });

        // Atualiza header
        await this.updateHeader();

        // Renderiza conteúdo da página
        const content = document.getElementById('content');
        if (content) {
            switch (basePage) {
                case 'dashboard':
                    DashboardPage.render();
                    break;
                case 'my-okrs':
                    MyOKRsPage.render();
                    break;
                case 'okrs':
                    OKRsPage.render();
                    break;
                case 'calendar':
                    CalendarPage.render();
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
                case 'settings':
                    SettingsPage.render();
                    break;
                case 'forgot-password':
                    ForgotPasswordPage.render();
                    break;
                case 'reset-password':
                    ResetPasswordPage.render();
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

    // Toggle do submenu OKRs
    toggleOkrMenu(event) {
        event.preventDefault();
        event.stopPropagation();

        this.isOkrMenuOpen = !this.isOkrMenuOpen;
        localStorage.setItem('okrMenuOpen', this.isOkrMenuOpen);

        const submenu = document.querySelector('.nav-submenu');
        if (submenu) {
            if (this.isOkrMenuOpen) {
                submenu.classList.add('open');
            } else {
                submenu.classList.remove('open');
            }
        }
    },

    // User Menu Functions
    toggleUserMenu(event) {
        event.stopPropagation();
        console.log('[UserMenu] Toggle clicked');

        // Detecta se está em mobile (largura <= 768px)
        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            // MOBILE: Usa portal dropdown no body
            let portalDropdown = document.getElementById('user-menu-dropdown-portal');

            if (portalDropdown) {
                // Se existe, fecha
                this.closeUserMenu();
                return;
            }

            // Cria overlay de fundo
            const overlay = document.createElement('div');
            overlay.id = 'user-menu-overlay';
            overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1500; transition: opacity 0.3s; opacity: 0;';
            overlay.onclick = () => this.closeUserMenu();
            document.body.appendChild(overlay);

            // Força reflow e anima overlay
            overlay.offsetHeight;
            setTimeout(() => {
                overlay.style.opacity = '1';
            }, 10);

            // Cria dropdown no body (fora do header)
            portalDropdown = document.createElement('div');
            portalDropdown.id = 'user-menu-dropdown-portal';
            portalDropdown.className = 'user-menu-dropdown';
            portalDropdown.innerHTML = `
                <button class="user-menu-item" onclick="Layout.openSettings(); Layout.closeUserMenu();">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Configurações
                </button>
                <div class="user-menu-divider"></div>
                <button class="user-menu-item user-menu-item-danger" onclick="Layout.logout(); Layout.closeUserMenu();">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    Sair
                </button>
            `;

            document.body.appendChild(portalDropdown);

            // Força reflow para animação
            portalDropdown.offsetHeight;

            // Adiciona classe show
            setTimeout(() => {
                portalDropdown.classList.add('show');
            }, 10);

            console.log('[UserMenu] Menu opened (mobile)');
        } else {
            // DESKTOP: Usa dropdown normal do header
            const dropdown = document.getElementById('user-menu-dropdown');
            if (!dropdown) {
                console.error('[UserMenu] Dropdown element not found!');
                return;
            }

            dropdown.classList.toggle('show');

            // Close on outside click
            if (dropdown.classList.contains('show')) {
                setTimeout(() => {
                    document.addEventListener('click', this.handleOutsideClick.bind(this), { once: true });
                }, 0);
            }

            console.log('[UserMenu] Menu opened (desktop)');
        }
    },

    handleOutsideClick(event) {
        const dropdown = document.getElementById('user-menu-dropdown');
        const portalDropdown = document.getElementById('user-menu-dropdown-portal');

        if ((dropdown && !dropdown.contains(event.target) && !event.target.closest('.user-menu-trigger')) ||
            (portalDropdown && !portalDropdown.contains(event.target) && !event.target.closest('.user-menu-trigger'))) {
            this.closeUserMenu();
        }
    },

    closeUserMenu() {
        console.log('[UserMenu] Closing menu');

        // Remove dropdown do header (se existir)
        const dropdown = document.getElementById('user-menu-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }

        // Remove portal dropdown (se existir)
        const portalDropdown = document.getElementById('user-menu-dropdown-portal');
        if (portalDropdown) {
            portalDropdown.classList.remove('show');
            setTimeout(() => {
                portalDropdown.remove();
            }, 300);
        }

        // Remove overlay
        const overlay = document.getElementById('user-menu-overlay');
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    },

    openSettings() {
        this.navigate('settings');
    },

    // Logout
    async logout() {
        const confirmed = await Modal.confirm({
            title: 'Sair do Sistema',
            message: 'Deseja realmente sair do sistema?',
            confirmLabel: 'Sair',
            cancelLabel: 'Cancelar',
            danger: true
        });

        if (confirmed) {
            await AuthService.logout();
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
    },

    // Toggle Mobile Sidebar
    toggleMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (sidebar && overlay) {
            sidebar.classList.toggle('mobile-open');
            overlay.classList.toggle('active');

            // Previne scroll do body quando sidebar está aberta
            if (sidebar.classList.contains('mobile-open')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        }
    },

    // Close Mobile Sidebar
    closeMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');

        if (sidebar && overlay) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    // Anexa event listeners (sobrescrevendo para incluir fechamento mobile)
    attachEventListeners() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Ignora se for o toggle do submenu (tem handler próprio)
                if (item.classList.contains('nav-submenu-toggle')) {
                    return;
                }
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page) {
                    this.navigate(page);
                    // Fecha sidebar mobile ao navegar
                    this.closeMobileSidebar();
                }
            });
        });
    }
};

// Globals
window.Layout = Layout;
export { Layout };
