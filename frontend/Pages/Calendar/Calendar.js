import { AuthService } from '../../services/auth.js';
import { supabaseClient } from '../../services/supabase.js';
import { Initiative } from '../../Entities/Initiative.js';
import { Reminder, REMINDER_TYPES, REMINDER_PRIORITIES } from '../../Entities/Reminder.js';
import { Modal } from '../../Components/Modal.js';
import { Cycle } from '../../Entities/Cycle.js';
import { MiniCycle } from '../../Entities/MiniCycle.js';

// Página de Calendário - Visualização de Iniciativas e Lembretes
const CalendarPage = {
    calendar: null,
    initiatives: [],
    reminders: [],
    cycles: [],
    miniCycles: [],
    currentUser: null,
    userDepartments: [],
    selectedDate: null,
    currentReminderEdit: null,

    // Filtros de iniciativas
    filters: {
        myDepartment: true,    // Iniciativas do meu departamento
        myInitiatives: true,   // Iniciativas que estou associado
        allInitiatives: false  // Todas as iniciativas
    },

    /**
     * Renderiza a página do calendário
     */
    async render() {
        const content = document.getElementById('content');
        this.currentUser = AuthService.getCurrentUser();

        if (!this.currentUser) {
            content.innerHTML = '<p>Usuário não autenticado</p>';
            return;
        }

        // Obter departamentos do usuário
        this.userDepartments = this.getUserDepartmentNames(this.currentUser);

        // Estrutura HTML
        content.innerHTML = `
            <div class="page-gio calendar-page-gio">
                <!-- Calendário Principal -->
                <div class="calendar-main-gio">
                    <!-- Filtros de Iniciativas -->
                    <div class="calendar-filters-gio">
                        <span class="filters-label-gio">Exibir iniciativas:</span>
                        <label class="filter-checkbox-gio">
                            <input type="checkbox" id="filter-my-department"
                                ${this.filters.myDepartment ? 'checked' : ''}
                                onchange="CalendarPage.toggleFilter('myDepartment')">
                            <span class="checkmark-gio"></span>
                            <span>Meu departamento</span>
                        </label>
                        <label class="filter-checkbox-gio">
                            <input type="checkbox" id="filter-my-initiatives"
                                ${this.filters.myInitiatives ? 'checked' : ''}
                                onchange="CalendarPage.toggleFilter('myInitiatives')">
                            <span class="checkmark-gio"></span>
                            <span>Minhas iniciativas</span>
                        </label>
                        <label class="filter-checkbox-gio">
                            <input type="checkbox" id="filter-all-initiatives"
                                ${this.filters.allInitiatives ? 'checked' : ''}
                                onchange="CalendarPage.toggleFilter('allInitiatives')">
                            <span class="checkmark-gio"></span>
                            <span>Todas as iniciativas</span>
                        </label>
                    </div>
                    <div id="fullcalendar"></div>
                </div>

                <!-- Painel de Lembretes -->
                <div class="reminders-panel-gio">
                    <div class="reminders-header-gio">
                        <h3>Lembretes</h3>
                        <button class="btn-gio-primary btn-sm-gio" onclick="CalendarPage.showReminderForm()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Novo
                        </button>
                    </div>

                    <div class="selected-date-info-gio" id="selected-date-info">
                        <span class="date-display-gio">Selecione uma data no calendário</span>
                    </div>

                    <div class="reminders-list-gio" id="reminders-list">
                        <!-- Lista de lembretes será renderizada aqui -->
                    </div>

                    <!-- Formulário de Lembrete (oculto por padrão) -->
                    <div class="reminder-form-container-gio" id="reminder-form-container" style="display: none;">
                        <form id="reminder-form" onsubmit="CalendarPage.saveReminder(event); return false;">
                            <div class="form-group-gio">
                                <label class="form-label-gio">Data *</label>
                                <input type="date" name="reminder_date" id="reminder-date" required class="form-control-gio" />
                            </div>

                            <div class="form-row-gio">
                                <div class="form-group-gio">
                                    <label class="form-label-gio">Tipo *</label>
                                    <select name="type" id="reminder-type" required class="form-control-gio">
                                        <option value="note">Nota</option>
                                        <option value="reminder">Lembrete</option>
                                        <option value="task">Tarefa</option>
                                    </select>
                                </div>

                                <div class="form-group-gio">
                                    <label class="form-label-gio">Prioridade</label>
                                    <select name="priority" id="reminder-priority" class="form-control-gio">
                                        <option value="normal">Normal</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                        <option value="low">Baixa</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group-gio">
                                <label class="form-label-gio">Conteúdo *</label>
                                <textarea name="content" id="reminder-content" rows="4" maxlength="500"
                                    required class="form-control-gio"
                                    placeholder="Descreva seu lembrete..."
                                    oninput="CalendarPage.updateCharCount()"></textarea>
                                <small class="char-count-gio" id="char-count">0/500</small>
                            </div>

                            <div class="form-actions-gio">
                                <button type="button" class="btn-gio-secondary" onclick="CalendarPage.cancelReminderForm()">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn-gio-primary">
                                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                    </svg>
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Adicionar estilos
        this.addStyles();

        // Buscar dados
        await this.loadData();

        // Inicializar calendário
        this.initializeCalendar();

        // Renderizar lembretes iniciais
        await this.renderAllReminders();
    },

    /**
     * Retorna apenas primeiro e segundo nome do usuário
     * Se o segundo nome for preposição (de, da, do, dos, das), retorna só o primeiro
     */
    getShortName(fullName) {
        if (!fullName) return '';
        const parts = fullName.trim().split(/\s+/);
        if (parts.length < 2) return parts[0];

        const preposicoes = ['de', 'da', 'do', 'dos', 'das', 'e'];
        if (preposicoes.includes(parts[1].toLowerCase())) {
            return parts[0];
        }
        return parts.slice(0, 2).join(' ');
    },

    /**
     * Obtém nomes dos departamentos do usuário
     */
    getUserDepartmentNames(user) {
        if (!user) return [];

        if (user.departments && Array.isArray(user.departments) && user.departments.length > 0) {
            return user.departments.map(d => d.nome).filter(Boolean);
        }

        if (user.departamento?.nome) {
            return [user.departamento.nome];
        }

        return [];
    },

    /**
     * Carrega todos os dados (initiatives, reminders, cycles e minicycles)
     */
    async loadData() {
        try {
            // Buscar dados em paralelo
            const [initiatives, reminders, cycles, miniCycles] = await Promise.all([
                this.fetchInitiatives(),
                this.fetchReminders(),
                this.fetchCycles(),
                this.fetchMiniCycles()
            ]);

            this.initiatives = initiatives;
            this.reminders = reminders;
            this.cycles = cycles;
            this.miniCycles = miniCycles;
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showToast('Erro ao carregar dados do calendário', 'error');
        }
    },

    /**
     * Busca iniciativas com contexto completo (OKR + department + responsáveis)
     */
    async fetchInitiatives() {
        try {
            // Query otimizada: busca initiatives com responsible_users em uma query
            const { data, error } = await supabaseClient
                .from('initiatives')
                .select(`
                    *,
                    responsible_users:initiative_responsible_users(
                        user_id, is_primary,
                        user:users(id, nome, email)
                    )
                `)
                .not('data_limite', 'is', null)
                .order('data_limite', { ascending: true });

            if (error) throw error;

            // Transformar para objetos Initiative
            const initiatives = (data || []).map(i => {
                // Flatten responsible_users structure
                if (i.responsible_users) {
                    i.responsible_users = i.responsible_users.map(ru => ({
                        ...ru.user,
                        is_primary: ru.is_primary
                    }));
                }

                return new Initiative(i);
            });

            return initiatives;
        } catch (error) {
            console.error('Erro ao buscar iniciativas:', error);
            return [];
        }
    },

    /**
     * Busca lembretes do departamento (RLS controla visibilidade)
     */
    async fetchReminders() {
        try {
            // RLS do Supabase retorna apenas lembretes do departamento do usuário
            return await Reminder.getAll();
        } catch (error) {
            console.error('Erro ao buscar lembretes:', error);
            return [];
        }
    },

    /**
     * Busca ciclos ativos
     */
    async fetchCycles() {
        try {
            return await Cycle.getActive();
        } catch (error) {
            console.error('Erro ao buscar ciclos:', error);
            return [];
        }
    },

    /**
     * Busca minicíclos ativos
     */
    async fetchMiniCycles() {
        try {
            return await MiniCycle.getActive();
        } catch (error) {
            console.error('Erro ao buscar minicíclos:', error);
            return [];
        }
    },

    /**
     * Inicializa o FullCalendar
     */
    initializeCalendar() {
        const calendarEl = document.getElementById('fullcalendar');

        if (!calendarEl) {
            console.error('Elemento #fullcalendar não encontrado');
            return;
        }

        // Verificar se FullCalendar está carregado
        if (typeof FullCalendar === 'undefined') {
            console.error('FullCalendar não está carregado');
            this.showToast('Erro ao carregar calendário. Recarregue a página.', 'error');
            return;
        }

        try {
            this.calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                locale: 'pt-br',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek'
                },
                buttonText: {
                    today: 'Hoje',
                    month: 'Mês',
                    week: 'Semana'
                },
                height: 'auto',
                aspectRatio: 1.8,
                selectable: true,
                selectMirror: true,
                dayMaxEvents: 3,
                moreLinkText: 'mais',
                events: this.transformToEvents(),
                eventClick: (info) => this.handleEventClick(info),
                select: (info) => this.handleDateSelect(info),
                eventDidMount: (info) => this.customizeEventElement(info),
                eventDisplay: 'block',
                displayEventTime: false,
                dayHeaderFormat: { weekday: 'short' },
                businessHours: {
                    daysOfWeek: [1, 2, 3, 4, 5],
                    startTime: '08:00',
                    endTime: '18:00',
                }
            });

            this.calendar.render();
        } catch (error) {
            console.error('Erro ao inicializar FullCalendar:', error);
            this.showToast('Erro ao inicializar calendário', 'error');
        }
    },

    /**
     * Verifica se o usuário é responsável pela iniciativa
     */
    isUserResponsibleForInitiative(initiative) {
        if (!this.currentUser) return false;
        const responsibleIds = initiative.getResponsibleUserIds ? initiative.getResponsibleUserIds() : [];
        return responsibleIds.includes(this.currentUser.id);
    },

    /**
     * Alterna um filtro e atualiza o calendário
     */
    toggleFilter(filterName) {
        this.filters[filterName] = !this.filters[filterName];

        // Se marcar "todas as iniciativas", desmarcar as outras
        if (filterName === 'allInitiatives' && this.filters.allInitiatives) {
            this.filters.myDepartment = false;
            this.filters.myInitiatives = false;
            document.getElementById('filter-my-department').checked = false;
            document.getElementById('filter-my-initiatives').checked = false;
        }

        // Se marcar uma das outras, desmarcar "todas"
        if ((filterName === 'myDepartment' || filterName === 'myInitiatives') &&
            (this.filters.myDepartment || this.filters.myInitiatives)) {
            this.filters.allInitiatives = false;
            document.getElementById('filter-all-initiatives').checked = false;
        }

        // Se nenhum filtro estiver marcado, marcar "meu departamento" por padrão
        if (!this.filters.myDepartment && !this.filters.myInitiatives && !this.filters.allInitiatives) {
            this.filters.myDepartment = true;
            document.getElementById('filter-my-department').checked = true;
        }

        // Atualizar calendário
        this.refreshCalendar();
    },

    /**
     * Atualiza os eventos do calendário
     */
    refreshCalendar() {
        if (this.calendar) {
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(this.transformToEvents());
        }
    },

    /**
     * Transforma initiatives e reminders em eventos do FullCalendar
     */
    transformToEvents() {
        const events = [];
        const isAdmin = this.currentUser.tipo === 'admin';

        // Transformar iniciativas
        this.initiatives.forEach(initiative => {
            // Usar campo department diretamente da initiative
            const deptName = initiative.department || 'Sem Departamento';
            const isUserDept = this.userDepartments.includes(deptName);
            const isUserResponsible = this.isUserResponsibleForInitiative(initiative);

            // Aplicar filtros
            let shouldShow = false;

            if (this.filters.allInitiatives) {
                // Mostrar todas
                shouldShow = true;
            } else {
                // Verificar filtros individuais
                if (this.filters.myDepartment && isUserDept) {
                    shouldShow = true;
                }
                if (this.filters.myInitiatives && isUserResponsible) {
                    shouldShow = true;
                }
            }

            if (!shouldShow) return;

            const colors = this.getDepartmentColor(deptName, isUserDept || isUserResponsible);

            const statusOverlay = this.getStatusOverlay(initiative);

            events.push({
                id: `init_${initiative.id}`,
                title: initiative.nome,
                start: initiative.data_limite,
                allDay: true,
                backgroundColor: colors.background,
                borderColor: colors.border,
                textColor: colors.text,
                extendedProps: {
                    type: 'initiative',
                    initiative: initiative,
                    department: deptName,
                    isUserDept: isUserDept,
                    statusOverlay: statusOverlay,
                    colors: colors // Guardar cores para uso posterior
                },
                classNames: [
                    'event-initiative',
                    isUserDept ? 'user-dept' : 'other-dept',
                    initiative.concluida ? 'completed' : '',
                    initiative.isOverdue() ? 'overdue' : ''
                ]
            });
        });

        // Transformar lembretes
        this.reminders.forEach(reminder => {
            const typePrefix = {
                note: '[Nota]',
                reminder: '[Lembrete]',
                task: '[Tarefa]'
            };

            const prefix = typePrefix[reminder.type] || '[Nota]';

            events.push({
                id: `reminder_${reminder.id}`,
                title: `${prefix} ${reminder.content.substring(0, 30)}${reminder.content.length > 30 ? '...' : ''}`,
                start: reminder.reminder_date,
                allDay: true,
                backgroundColor: reminder.completed ? '#d1d5db' : '#fef3c7',
                borderColor: reminder.completed ? '#9ca3af' : '#f59e0b',
                textColor: reminder.completed ? '#6b7280' : '#92400e',
                extendedProps: {
                    type: 'reminder',
                    reminder: reminder
                },
                classNames: [
                    'event-reminder',
                    reminder.completed ? 'completed' : '',
                    reminder.isOverdue() ? 'overdue' : ''
                ]
            });
        });

        // Transformar ciclos - marcar início e fim
        this.cycles.forEach(cycle => {
            // Evento de início do ciclo
            events.push({
                id: `cycle_start_${cycle.id}`,
                title: `Início: ${cycle.nome}`,
                start: cycle.data_inicio,
                allDay: true,
                backgroundColor: '#bfdbfe',
                borderColor: '#2563eb',
                textColor: '#1e3a8a',
                extendedProps: {
                    type: 'cycle-start',
                    cycle: cycle
                },
                classNames: ['event-cycle', 'cycle-start']
            });

            // Evento de fim do ciclo
            events.push({
                id: `cycle_end_${cycle.id}`,
                title: `Fim: ${cycle.nome}`,
                start: cycle.data_fim,
                allDay: true,
                backgroundColor: '#fca5a5',
                borderColor: '#dc2626',
                textColor: '#7f1d1d',
                extendedProps: {
                    type: 'cycle-end',
                    cycle: cycle
                },
                classNames: ['event-cycle', 'cycle-end']
            });
        });

        // Transformar minicíclos - marcar início e fim
        this.miniCycles.forEach(miniCycle => {
            // Evento de início do minicíclo
            events.push({
                id: `minicycle_start_${miniCycle.id}`,
                title: `Início: ${miniCycle.nome}`,
                start: miniCycle.data_inicio,
                allDay: true,
                backgroundColor: '#a7f3d0',
                borderColor: '#059669',
                textColor: '#064e3b',
                extendedProps: {
                    type: 'minicycle-start',
                    miniCycle: miniCycle
                },
                classNames: ['event-minicycle', 'minicycle-start']
            });

            // Evento de fim do minicíclo
            events.push({
                id: `minicycle_end_${miniCycle.id}`,
                title: `Fim: ${miniCycle.nome}`,
                start: miniCycle.data_fim,
                allDay: true,
                backgroundColor: '#fcd34d',
                borderColor: '#d97706',
                textColor: '#78350f',
                extendedProps: {
                    type: 'minicycle-end',
                    miniCycle: miniCycle
                },
                classNames: ['event-minicycle', 'minicycle-end']
            });
        });

        return events;
    },

    /**
     * Gera cor para iniciativa: cor primária para meu departamento, cinza para outros
     */
    getDepartmentColor(deptName, isUserDept = false) {
        if (isUserDept) {
            // Meu departamento: cor primária do sistema (Teal)
            return {
                background: '#D1FAE5',  // Verde menta claro
                border: '#14B8A6',       // Teal
                text: '#0F766E'          // Teal escuro
            };
        } else {
            // Outros departamentos: cinza neutro
            return {
                background: '#F3F4F6',  // Cinza muito claro
                border: '#9CA3AF',       // Cinza médio
                text: '#6B7280'          // Cinza escuro
            };
        }
    },

    /**
     * Retorna overlay de status (concluída/atrasada)
     */
    getStatusOverlay(initiative) {
        if (initiative.concluida) {
            return { color: 'rgba(16, 185, 129, 0.1)' };
        }
        if (initiative.isOverdue()) {
            return { color: 'rgba(239, 68, 68, 0.15)' };
        }
        return { color: 'transparent' };
    },

    /**
     * Customiza elementos do evento após renderização
     */
    customizeEventElement(info) {
        const element = info.el;
        const props = info.event.extendedProps;

        // Aplicar cores como CSS variables para iniciativas
        if (props.type === 'initiative' && props.colors) {
            element.style.setProperty('--fc-event-bg-color', props.colors.background);
            element.style.setProperty('--fc-event-border-color', props.colors.border);
            element.style.setProperty('--fc-event-text-color', props.colors.text);

            const initiative = props.initiative;

            // Verificar se está realmente atrasada
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadline = new Date(initiative.data_limite + 'T00:00:00');
            const isOverdue = deadline < today && !initiative.concluida;

            // Adicionar indicadores visuais
            if (initiative.concluida) {
                element.style.textDecoration = 'line-through';
                element.style.opacity = '0.7';
            }

            // Só adicionar borda vermelha se realmente estiver atrasada
            if (isOverdue) {
                element.style.borderLeftWidth = '5px';
                element.style.borderLeftColor = '#ef4444';
                element.style.fontWeight = '600';
            }
        }

        // Para ciclos e minicíclos, forçar as cores diretamente
        if (props.type === 'cycle-start' || props.type === 'cycle-end' ||
            props.type === 'minicycle-start' || props.type === 'minicycle-end') {
            const event = info.event;
            element.style.setProperty('--fc-event-bg-color', event.backgroundColor);
            element.style.setProperty('--fc-event-border-color', event.borderColor);
            element.style.setProperty('--fc-event-text-color', event.textColor);
        }
    },

    /**
     * Handler de click em evento
     */
    handleEventClick(info) {
        const props = info.event.extendedProps;

        if (props.type === 'initiative') {
            this.openInitiativeModal(props.initiative);
        } else if (props.type === 'reminder') {
            this.editReminder(props.reminder.id);
        } else if (props.type === 'cycle-start' || props.type === 'cycle-end') {
            this.openCycleModal(props.cycle, props.type);
        } else if (props.type === 'minicycle-start' || props.type === 'minicycle-end') {
            this.openMiniCycleModal(props.miniCycle, props.type);
        }
    },

    /**
     * Handler de seleção de data
     */
    handleDateSelect(info) {
        this.selectedDate = info.startStr;
        this.updateSelectedDateInfo(info.startStr);
        this.renderRemindersForDate(info.startStr);

        // Opcional: abrir form de novo lembrete
        // this.showReminderForm(info.startStr);
    },

    /**
     * Atualiza informação da data selecionada
     */
    updateSelectedDateInfo(dateStr) {
        const dateInfo = document.getElementById('selected-date-info');
        if (dateInfo) {
            const date = new Date(dateStr + 'T00:00:00');
            const formatted = date.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });
            dateInfo.innerHTML = `<span class="date-display">${formatted}</span>`;
        }
    },

    /**
     * Abre modal com detalhes da iniciativa
     */
    async openInitiativeModal(initiative) {
        // Usar campo department direto
        const deptName = initiative.department || 'Sem Departamento';
        const deptColors = this.getDepartmentColor(deptName, this.userDepartments.includes(deptName));
        const responsibleUsers = initiative.getResponsibleUsers ? initiative.getResponsibleUsers() : [];

        // Buscar dados do KR e OKR se não existirem (lazy load)
        let krTitle = 'Carregando...';
        let okrTitle = 'Carregando...';

        if (initiative.key_result_id) {
            const { data: krData } = await supabaseClient
                .from('key_results')
                .select('id, title, okr_id')
                .eq('id', initiative.key_result_id)
                .single();

            if (krData) {
                krTitle = krData.title;

                const { data: okrData } = await supabaseClient
                    .from('okrs')
                    .select('id, title')
                    .eq('id', krData.okr_id)
                    .single();

                if (okrData) {
                    okrTitle = okrData.title;
                }
            }
        }

        const modal = document.createElement('div');
        modal.id = 'initiative-detail-modal';
        modal.className = 'modal-overlay';
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeInitiativeModal();
            }
        };

        const modalHTML = `
            <div class="modal-container modal-large" onclick="event.stopPropagation()">
                <div class="modal-header" style="border-bottom: 3px solid ${deptColors.border};">
                    <div class="modal-title-group">
                        <h3 class="modal-title">${initiative.nome}</h3>
                        ${deptName ? `
                            <span class="dept-badge" style="background: ${deptColors.border}; color: white;">
                                ${deptName}
                            </span>
                        ` : ''}
                    </div>
                    <button class="modal-close" onclick="CalendarPage.closeInitiativeModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body">
                    ${initiative.isOverdue && initiative.isOverdue() && !initiative.concluida ? `
                        <div class="alert alert-warning">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display:inline;vertical-align:middle;margin-right:6px;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                            </svg>
                            Esta iniciativa está atrasada!
                        </div>
                    ` : ''}

                    ${initiative.concluida ? `
                        <div class="alert alert-success">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="display:inline;vertical-align:middle;margin-right:6px;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            Iniciativa concluída!
                        </div>
                    ` : ''}

                    <div class="progress-section">
                        <div class="progress-header">
                            <label class="form-label">Progresso</label>
                            <span class="progress-value-display" id="modal-progress-value">${initiative.progress || 0}%</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-bar" id="modal-progress-bar" style="width: ${initiative.progress || 0}%; background: ${deptColors.border};"></div>
                        </div>
                        <input type="range" min="0" max="100" value="${initiative.progress || 0}"
                               id="modal-progress-slider" class="progress-slider"
                               oninput="document.getElementById('modal-progress-value').textContent = this.value + '%'; document.getElementById('modal-progress-bar').style.width = this.value + '%';"
                               onchange="CalendarPage.updateInitiativeProgress('${initiative.id}', this.value)" />
                    </div>

                    <div class="details-grid">
                        ${initiative.descricao ? `
                            <div class="detail-item">
                                <strong>Descrição</strong>
                                <p>${initiative.descricao}</p>
                            </div>
                        ` : ''}

                        <div class="detail-item">
                            <strong>Data Limite</strong>
                            <p>${this.formatDate(initiative.data_limite)}</p>
                        </div>

                        ${responsibleUsers.length > 0 ? `
                            <div class="detail-item">
                                <strong>Responsáveis</strong>
                                <div class="responsible-badges">
                                    ${responsibleUsers.map(user => `
                                        <span class="responsible-user-badge ${user.is_primary ? 'primary' : ''}">
                                            ${this.getShortName(user.nome)}
                                        </span>
                                    `).join('')}
                                </div>
                            </div>
                        ` : ''}

                        <div class="detail-item">
                            <strong>Key Result</strong>
                            <p>${krTitle}</p>
                        </div>

                        <div class="detail-item">
                            <strong>OKR</strong>
                            <p>${okrTitle}</p>
                        </div>
                    </div>

                    ${initiative.comment && initiative.comment.trim() ? `
                        <div class="comment-section">
                            <strong>Comentário</strong>
                            <p>${initiative.comment}</p>
                        </div>
                    ` : ''}

                    ${initiative.evidence && Array.isArray(initiative.evidence) && initiative.evidence.length > 0 ? `
                        <div class="evidence-section">
                            <strong>Evidências</strong>
                            <ul class="evidence-list">
                                ${initiative.evidence.map((ev, idx) => `
                                    <li>
                                        ${ev.type === 'link' ? `
                                            <a href="${ev.content}" target="_blank" rel="noopener noreferrer">
                                                ${ev.name || `Evidência ${idx + 1}`}
                                            </a>
                                        ` : `
                                            <span>${ev.content}</span>
                                        `}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="CalendarPage.closeInitiativeModal()">
                        Fechar
                    </button>
                    <button class="btn btn-primary" onclick="CalendarPage.toggleInitiativeComplete('${initiative.id}')">
                        ${initiative.concluida ? `
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                            </svg>
                            Desmarcar
                        ` : `
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                            </svg>
                            Marcar Completa
                        `}
                    </button>
                </div>
            </div>
        `;

        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);

        // Focar no modal
        setTimeout(() => {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) closeBtn.focus();
        }, 100);
    },

    /**
     * Fecha modal de detalhes da iniciativa
     */
    closeInitiativeModal() {
        const modal = document.getElementById('initiative-detail-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Abre modal com detalhes do ciclo
     */
    openCycleModal(cycle, eventType) {
        const isStart = eventType === 'cycle-start';
        const title = isStart ? `Início do Ciclo: ${cycle.nome}` : `Fim do Ciclo: ${cycle.nome}`;
        const date = isStart ? cycle.data_inicio : cycle.data_fim;

        const modal = document.createElement('div');
        modal.id = 'cycle-detail-modal';
        modal.className = 'modal-overlay';
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeCycleModal();
            }
        };

        const modalHTML = `
            <div class="modal-container" onclick="event.stopPropagation()">
                <div class="modal-header" style="border-bottom: 3px solid ${isStart ? '#3b82f6' : '#ef4444'};">
                    <div class="modal-title-group">
                        <h3 class="modal-title">${title}</h3>
                    </div>
                    <button class="modal-close" onclick="CalendarPage.closeCycleModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="details-grid">
                        <div class="detail-item">
                            <strong>Data</strong>
                            <p>${this.formatDate(date)}</p>
                        </div>

                        <div class="detail-item">
                            <strong>Período Completo</strong>
                            <p>${this.formatDate(cycle.data_inicio)} até ${this.formatDate(cycle.data_fim)}</p>
                        </div>

                        ${cycle.descricao ? `
                            <div class="detail-item">
                                <strong>Descrição</strong>
                                <p>${cycle.descricao}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="CalendarPage.closeCycleModal()">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);
    },

    /**
     * Fecha modal de ciclo
     */
    closeCycleModal() {
        const modal = document.getElementById('cycle-detail-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Abre modal com detalhes do minicíclo
     */
    openMiniCycleModal(miniCycle, eventType) {
        const isStart = eventType === 'minicycle-start';
        const title = isStart ? `Início do Minicíclo: ${miniCycle.nome}` : `Fim do Minicíclo: ${miniCycle.nome}`;
        const date = isStart ? miniCycle.data_inicio : miniCycle.data_fim;

        const modal = document.createElement('div');
        modal.id = 'minicycle-detail-modal';
        modal.className = 'modal-overlay';
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeMiniCycleModal();
            }
        };

        const cycleName = miniCycle.cycle?.nome || 'Carregando...';

        const modalHTML = `
            <div class="modal-container" onclick="event.stopPropagation()">
                <div class="modal-header" style="border-bottom: 3px solid ${isStart ? '#22c55e' : '#f97316'};">
                    <div class="modal-title-group">
                        <h3 class="modal-title">${title}</h3>
                    </div>
                    <button class="modal-close" onclick="CalendarPage.closeMiniCycleModal()">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </button>
                </div>

                <div class="modal-body">
                    <div class="details-grid">
                        <div class="detail-item">
                            <strong>Data</strong>
                            <p>${this.formatDate(date)}</p>
                        </div>

                        <div class="detail-item">
                            <strong>Período Completo</strong>
                            <p>${this.formatDate(miniCycle.data_inicio)} até ${this.formatDate(miniCycle.data_fim)}</p>
                        </div>

                        <div class="detail-item">
                            <strong>Ciclo</strong>
                            <p>${cycleName}</p>
                        </div>

                        <div class="detail-item">
                            <strong>Ordem</strong>
                            <p>${miniCycle.ordem}º período</p>
                        </div>

                        ${miniCycle.descricao ? `
                            <div class="detail-item">
                                <strong>Descrição</strong>
                                <p>${miniCycle.descricao}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="CalendarPage.closeMiniCycleModal()">
                        Fechar
                    </button>
                </div>
            </div>
        `;

        modal.innerHTML = modalHTML;
        document.body.appendChild(modal);
    },

    /**
     * Fecha modal de minicíclo
     */
    closeMiniCycleModal() {
        const modal = document.getElementById('minicycle-detail-modal');
        if (modal) {
            modal.remove();
        }
    },

    /**
     * Atualiza progresso da iniciativa
     */
    async updateInitiativeProgress(initiativeId, progress) {
        try {
            const progressInt = parseInt(progress, 10);

            // Atualizar visualmente (otimista)
            const valueDisplay = document.getElementById('modal-progress-value');
            const progressBar = document.getElementById('modal-progress-bar');
            if (valueDisplay) valueDisplay.textContent = `${progressInt}%`;
            if (progressBar) progressBar.style.width = `${progressInt}%`;

            // Atualizar no banco
            const initiative = await Initiative.getById(initiativeId);
            if (initiative) {
                await initiative.updateProgress(progressInt);
                await this.refreshCalendar();
                this.showToast('Progresso atualizado com sucesso!', 'success');
            }
        } catch (error) {
            console.error('Erro ao atualizar progresso:', error);
            this.showToast('Erro ao atualizar progresso', 'error');
        }
    },

    /**
     * Toggle status de conclusão da iniciativa
     */
    async toggleInitiativeComplete(initiativeId) {
        try {
            const initiative = await Initiative.getById(initiativeId);
            if (initiative) {
                await initiative.toggleComplete();
                this.closeInitiativeModal();
                await this.refreshCalendar();
                this.showToast(
                    initiative.concluida ? 'Iniciativa marcada como concluída!' : 'Iniciativa desmarcada',
                    'success'
                );
            }
        } catch (error) {
            console.error('Erro ao alternar conclusão:', error);
            this.showToast('Erro ao atualizar iniciativa', 'error');
        }
    },

    /**
     * Atualiza o calendário (refetch dados e re-render)
     */
    async refreshCalendar() {
        await this.loadData();
        if (this.calendar) {
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(this.transformToEvents());
        }
        if (this.selectedDate) {
            this.renderRemindersForDate(this.selectedDate);
        } else {
            this.renderAllReminders();
        }
    },

    // ======= REMINDERS PANEL METHODS =======

    /**
     * Renderiza todos os lembretes do usuário
     */
    async renderAllReminders() {
        const list = document.getElementById('reminders-list');
        if (!list) return;

        if (this.reminders.length === 0) {
            list.innerHTML = `
                <div class="empty-state-gio">
                    <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                    </svg>
                    <p>Nenhum lembrete cadastrado</p>
                    <small>Clique em "Novo" para criar um lembrete</small>
                </div>
            `;
            return;
        }

        // Agrupar por data
        const grouped = this.reminders.reduce((acc, r) => {
            if (!acc[r.reminder_date]) {
                acc[r.reminder_date] = [];
            }
            acc[r.reminder_date].push(r);
            return acc;
        }, {});

        let html = '';
        Object.keys(grouped).sort().reverse().forEach(date => {
            const dateObj = new Date(date + 'T00:00:00');
            const formatted = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

            html += `<div class="reminder-date-group-gio">
                <div class="reminder-date-header-gio">${formatted}</div>`;

            grouped[date].forEach(reminder => {
                html += this.renderReminderItem(reminder);
            });

            html += `</div>`;
        });

        list.innerHTML = html;
    },

    /**
     * Renderiza lembretes para uma data específica
     */
    async renderRemindersForDate(dateStr) {
        const list = document.getElementById('reminders-list');
        if (!list) return;

        const reminders = await Reminder.getByDate(dateStr);

        if (reminders.length === 0) {
            list.innerHTML = `
                <div class="empty-state-gio">
                    <p>Nenhum lembrete para esta data</p>
                    <button class="btn-gio-primary btn-sm-gio" onclick="CalendarPage.showReminderForm('${dateStr}')">
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                        </svg>
                        Adicionar Lembrete
                    </button>
                </div>
            `;
            return;
        }

        let html = reminders.map(r => this.renderReminderItem(r)).join('');
        list.innerHTML = html;
    },

    /**
     * Verifica se o usuário pode editar o lembrete
     */
    canEditReminder(reminder) {
        const currentAuthId = this.currentUser.auth_id || this.currentUser.id;
        return reminder.user_id === currentAuthId;
    },

    /**
     * Renderiza um item de lembrete
     */
    renderReminderItem(reminder) {
        const typeIcons = {
            note: `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>`,
            reminder: `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>`,
            task: `<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
            </svg>`
        };

        const priorityColors = {
            low: '#10b981',
            normal: '#3b82f6',
            high: '#f59e0b',
            urgent: '#ef4444'
        };

        return `
            <div class="reminder-item-gio ${reminder.completed ? 'completed' : ''} ${reminder.isOverdue() ? 'overdue' : ''}"
                 data-id="${reminder.id}">
                <div class="reminder-item-header-gio">
                    <span class="reminder-type-icon-gio">${typeIcons[reminder.type]}</span>
                    <span class="reminder-type-label-gio">${reminder.getTypeLabel()}</span>
                    ${reminder.created_by_name ? `
                        <span class="reminder-author-gio">
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="vertical-align:middle;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                            ${this.getShortName(reminder.created_by_name)}
                        </span>
                    ` : ''}
                    <span class="reminder-priority-gio" style="background: ${priorityColors[reminder.priority]};">
                        ${reminder.getPriorityLabel()}
                    </span>
                </div>
                <div class="reminder-content-gio ${reminder.completed ? 'strikethrough' : ''}">
                    ${reminder.content}
                </div>
                <div class="reminder-actions-gio">
                    ${reminder.type === 'task' ? `
                        <button class="action-btn-gio ${reminder.completed ? 'toggle' : 'edit'}" onclick="CalendarPage.toggleReminderComplete('${reminder.id}')"
                                title="${reminder.completed ? 'Desmarcar' : 'Marcar como concluída'}">
                            ${reminder.completed ? `
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                                </svg>
                            ` : `
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                                </svg>
                            `}
                        </button>
                    ` : ''}
                    ${this.canEditReminder(reminder) ? `
                        <button class="action-btn-gio edit" onclick="CalendarPage.editReminder('${reminder.id}')" title="Editar">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button class="action-btn-gio delete" onclick="CalendarPage.deleteReminder('${reminder.id}')" title="Excluir">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    /**
     * Mostra formulário de lembrete
     */
    showReminderForm(dateStr = null) {
        const formContainer = document.getElementById('reminder-form-container');
        const form = document.getElementById('reminder-form');

        if (!formContainer || !form) return;

        // Resetar form
        form.reset();
        this.currentReminderEdit = null;

        // Pre-preencher data se fornecida
        if (dateStr || this.selectedDate) {
            document.getElementById('reminder-date').value = dateStr || this.selectedDate;
        }

        formContainer.style.display = 'block';
        document.getElementById('reminder-content').focus();
    },

    /**
     * Cancela formulário de lembrete
     */
    cancelReminderForm() {
        const formContainer = document.getElementById('reminder-form-container');
        const form = document.getElementById('reminder-form');

        if (formContainer) formContainer.style.display = 'none';
        if (form) form.reset();

        this.currentReminderEdit = null;
    },

    /**
     * Salva lembrete (novo ou edição)
     */
    async saveReminder(event) {
        event.preventDefault();

        const form = event.target;
        const formData = new FormData(form);

        try {
            // Debug: verificar IDs disponíveis
            console.log('🔍 Current User IDs:', {
                id: this.currentUser.id,
                auth_id: this.currentUser.auth_id,
                email: this.currentUser.email
            });

            // IMPORTANTE: Usar auth_id (do Supabase Auth) ao invés de user.id
            const userId = this.currentUser.auth_id || this.currentUser.id;

            console.log('✅ Usando user_id:', userId);

            const reminderData = {
                user_id: userId,
                content: formData.get('content').trim(),
                reminder_date: formData.get('reminder_date'),
                type: formData.get('type'),
                priority: formData.get('priority')
            };

            console.log('📤 Tentando salvar:', reminderData);

            let reminder;
            if (this.currentReminderEdit) {
                // Editar existente
                reminder = await Reminder.getById(this.currentReminderEdit);
                Object.assign(reminder, reminderData);
            } else {
                // Criar novo
                reminder = new Reminder(reminderData);
            }

            await reminder.save();

            this.cancelReminderForm();
            await this.refreshCalendar();
            this.showToast('Lembrete salvo com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao salvar lembrete:', error);
            this.showToast('Erro ao salvar lembrete: ' + error.message, 'error');
        }
    },

    /**
     * Edita um lembrete
     */
    async editReminder(id) {
        try {
            const reminder = await Reminder.getById(id);
            if (!reminder) return;

            this.currentReminderEdit = id;

            // Preencher form
            document.getElementById('reminder-date').value = reminder.reminder_date;
            document.getElementById('reminder-type').value = reminder.type;
            document.getElementById('reminder-priority').value = reminder.priority;
            document.getElementById('reminder-content').value = reminder.content;

            // Mostrar form
            document.getElementById('reminder-form-container').style.display = 'block';
            this.updateCharCount();
            document.getElementById('reminder-content').focus();
        } catch (error) {
            console.error('Erro ao editar lembrete:', error);
            this.showToast('Erro ao carregar lembrete', 'error');
        }
    },

    /**
     * Deleta um lembrete
     */
    async deleteReminder(id) {
        const confirmed = await Modal.confirm({
            title: 'Excluir Lembrete',
            message: 'Tem certeza que deseja excluir este lembrete?',
            confirmLabel: 'Excluir',
            cancelLabel: 'Cancelar',
            danger: true
        });

        if (!confirmed) return;

        try {
            await Reminder.delete(id);
            await this.refreshCalendar();
            this.showToast('Lembrete excluído com sucesso!', 'success');
        } catch (error) {
            console.error('Erro ao deletar lembrete:', error);
            this.showToast('Erro ao excluir lembrete', 'error');
        }
    },

    /**
     * Toggle complete de um lembrete (apenas tasks)
     */
    async toggleReminderComplete(id) {
        try {
            const reminder = await Reminder.getById(id);
            if (reminder) {
                await reminder.toggleComplete();
                await this.refreshCalendar();
                this.showToast(
                    reminder.completed ? 'Tarefa concluída!' : 'Tarefa reaberta',
                    'success'
                );
            }
        } catch (error) {
            console.error('Erro ao alternar conclusão:', error);
            this.showToast('Erro ao atualizar tarefa', 'error');
        }
    },

    /**
     * Atualiza contador de caracteres do textarea
     */
    updateCharCount() {
        const textarea = document.getElementById('reminder-content');
        const counter = document.getElementById('char-count');

        if (textarea && counter) {
            const length = textarea.value.length;
            counter.textContent = `${length}/500`;

            if (length > 450) {
                counter.style.color = '#ef4444';
            } else if (length > 400) {
                counter.style.color = '#f59e0b';
            } else {
                counter.style.color = '#6b7280';
            }
        }
    },

    /**
     * Toast notification
     */
    showToast(message, type = 'success') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icon = type === 'success'
            ? `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>`
            : `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>`;

        toast.innerHTML = `
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        `;

        document.body.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Formata data para exibição
     */
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    /**
     * Adiciona estilos CSS da página
     */
    addStyles() {
        if (document.getElementById('calendar-page-styles-gio')) return;

        const style = document.createElement('style');
        style.id = 'calendar-page-styles-gio';
        style.textContent = `
            /* ========== CALENDAR PAGE GIO ========== */

            .calendar-page-gio {
                display: grid;
                grid-template-columns: 1fr 380px;
                gap: 24px;
                padding: 24px;
                max-width: 1700px;
                margin: 0 auto;
            }

            /* Calendário Principal GIO */
            .calendar-main-gio {
                background: white;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
            }

            /* Ajustes do FullCalendar GIO */
            #fullcalendar {
                font-family: inherit;
            }

            .fc .fc-toolbar-title {
                font-size: 1.3rem !important;
                font-weight: 600 !important;
                color: #1e6076 !important;
            }

            .fc .fc-button-primary {
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%) !important;
                border: none !important;
                font-weight: 500 !important;
                padding: 8px 16px !important;
                border-radius: 8px !important;
                box-shadow: 0 2px 6px rgba(18, 176, 160, 0.3) !important;
                transition: all 0.2s ease !important;
            }

            .fc .fc-button-primary:hover {
                transform: translateY(-1px) !important;
                box-shadow: 0 4px 12px rgba(18, 176, 160, 0.4) !important;
            }

            .fc .fc-button-primary:not(:disabled).fc-button-active {
                background: linear-gradient(135deg, #1e6076 0%, #154555 100%) !important;
            }

            .fc .fc-button-primary:disabled {
                opacity: 0.5;
            }

            .fc .fc-col-header-cell {
                background: linear-gradient(135deg, #1e6076 0%, #154555 100%) !important;
                color: white !important;
                padding: 10px 0 !important;
            }

            .fc .fc-col-header-cell-cushion {
                color: white !important;
                font-weight: 600 !important;
                text-transform: uppercase !important;
                font-size: 11px !important;
                letter-spacing: 0.5px !important;
                padding: 8px 4px !important;
            }

            /* Fix: Dia atual na view de Semana - garante contraste */
            .fc .fc-day-today .fc-col-header-cell-cushion,
            .fc .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion,
            .fc-timegrid .fc-col-header-cell.fc-day-today .fc-col-header-cell-cushion {
                color: #1e6076 !important;
                font-weight: 700 !important;
            }

            .fc .fc-col-header-cell.fc-day-today {
                background: rgba(18, 176, 160, 0.15) !important;
            }

            .fc .fc-daygrid-day-number {
                color: #374151 !important;
                font-weight: 500 !important;
                padding: 8px !important;
            }

            .fc .fc-day-today {
                background: rgba(18, 176, 160, 0.08) !important;
            }

            .fc-daygrid-day.fc-day-today .fc-daygrid-day-top {
                display: flex;
                justify-content: flex-end;
            }

            .fc-daygrid-day.fc-day-today .fc-daygrid-day-number {
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%) !important;
                color: white !important;
                border-radius: 50% !important;
                width: 28px !important;
                height: 28px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin: 4px !important;
                padding: 0 !important;
            }

            /* Estilos dos eventos GIO */
            .fc-event {
                border-radius: 6px !important;
                padding: 4px 8px !important;
                font-size: 12px !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                border-width: 2px !important;
                border-style: solid !important;
                margin-bottom: 2px !important;
            }

            .fc-event:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                z-index: 10 !important;
            }

            .fc-event,
            .fc-event-main,
            .fc-daygrid-event,
            .fc-h-event {
                background-color: var(--fc-event-bg-color) !important;
                border-color: var(--fc-event-border-color) !important;
                color: var(--fc-event-text-color) !important;
            }

            .fc-daygrid-event-dot {
                display: none !important;
            }

            .fc-event-title {
                color: inherit !important;
                font-weight: inherit !important;
            }

            .fc-event.event-initiative.user-dept {
                border-width: 3px !important;
                font-weight: 700 !important;
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2) !important;
                font-size: 13px !important;
            }

            .fc-event.event-initiative.other-dept {
                border-width: 1px !important;
                font-weight: 400 !important;
                opacity: 0.75;
                font-size: 11px !important;
            }

            .fc-event.completed {
                opacity: 0.5 !important;
                text-decoration: line-through !important;
            }

            .fc-event.event-initiative.overdue:not(.completed) {
                border-left-width: 5px !important;
                border-left-color: #ef4444 !important;
                background-image: linear-gradient(to right, rgba(239, 68, 68, 0.1), transparent) !important;
            }

            .fc-event.event-reminder {
                border-style: dashed !important;
                font-style: italic;
            }

            .fc-event.event-cycle {
                font-weight: 700 !important;
                border-width: 3px !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
            }

            .fc-event.cycle-start {
                border-left-width: 6px !important;
                background-image: linear-gradient(to right, rgba(37, 99, 235, 0.2), transparent) !important;
            }

            .fc-event.cycle-end {
                border-right-width: 6px !important;
                background-image: linear-gradient(to left, rgba(220, 38, 38, 0.2), transparent) !important;
            }

            .fc-event.event-minicycle {
                font-weight: 600 !important;
                border-width: 2px !important;
                font-size: 11px !important;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12) !important;
            }

            .fc-event.minicycle-start {
                border-left-width: 5px !important;
                background-image: linear-gradient(to right, rgba(5, 150, 105, 0.2), transparent) !important;
            }

            .fc-event.minicycle-end {
                border-right-width: 5px !important;
                background-image: linear-gradient(to left, rgba(217, 119, 6, 0.2), transparent) !important;
            }

            /* ========== REMINDERS PANEL GIO ========== */

            .reminders-panel-gio {
                background: white;
                border-radius: 16px;
                padding: 20px;
                box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
                display: flex;
                flex-direction: column;
                max-height: calc(100vh - 150px);
                overflow: hidden;
            }

            .reminders-header-gio {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 16px;
                border-bottom: 2px solid #E5E7EB;
            }

            .reminders-header-gio h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: #1e6076;
            }

            .selected-date-info-gio {
                margin-bottom: 16px;
                padding: 14px;
                background: linear-gradient(135deg, rgba(18, 176, 160, 0.08) 0%, rgba(30, 96, 118, 0.05) 100%);
                border-radius: 10px;
                text-align: center;
                border: 1px solid rgba(18, 176, 160, 0.15);
            }

            .date-display-gio {
                font-size: 13px;
                color: #1e6076;
                font-weight: 600;
                text-transform: capitalize;
            }

            .reminders-list-gio {
                flex: 1;
                overflow-y: auto;
                margin-bottom: 16px;
            }

            .reminder-date-group-gio {
                margin-bottom: 16px;
            }

            .reminder-date-header-gio {
                font-size: 11px;
                font-weight: 700;
                color: #12b0a0;
                text-transform: uppercase;
                margin-bottom: 8px;
                padding-left: 4px;
                letter-spacing: 0.5px;
            }

            /* ========== REMINDER ITEM GIO ========== */

            .reminder-item-gio {
                background: white;
                border: 1px solid #E5E7EB;
                border-radius: 12px;
                padding: 14px;
                margin-bottom: 10px;
                transition: all 0.2s ease;
            }

            .reminder-item-gio:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                border-color: #12b0a0;
                transform: translateY(-2px);
            }

            .reminder-item-gio.completed {
                opacity: 0.6;
                background: #F9FAFB;
            }

            .reminder-item-gio.overdue {
                border-left: 4px solid #ef4444;
            }

            .reminder-item-header-gio {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 10px;
            }

            .reminder-type-icon-gio {
                display: inline-flex;
                align-items: center;
                color: #6B7280;
            }

            .reminder-type-icon-gio svg {
                width: 16px;
                height: 16px;
            }

            .reminder-type-label-gio {
                font-size: 10px;
                color: #6B7280;
                text-transform: uppercase;
                font-weight: 700;
                letter-spacing: 0.3px;
            }

            .reminder-author-gio {
                font-size: 11px;
                color: #9CA3AF;
                display: inline-flex;
                align-items: center;
                gap: 4px;
            }

            .reminder-priority-gio {
                margin-left: auto;
                padding: 3px 8px;
                border-radius: 10px;
                font-size: 9px;
                color: white;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.3px;
            }

            .reminder-content-gio {
                font-size: 13px;
                color: #1F2937;
                margin-bottom: 10px;
                line-height: 1.5;
            }

            .reminder-content-gio.strikethrough {
                text-decoration: line-through;
                color: #9CA3AF;
            }

            .reminder-actions-gio {
                display: flex;
                gap: 6px;
                justify-content: flex-end;
            }

            /* ========== REMINDER FORM GIO ========== */

            .reminder-form-container-gio {
                border-top: 2px solid #E5E7EB;
                padding-top: 16px;
            }

            .char-count-gio {
                display: block;
                text-align: right;
                font-size: 11px;
                color: #9CA3AF;
                margin-top: 4px;
            }

            .form-actions-gio {
                display: flex;
                gap: 10px;
                justify-content: flex-end;
                margin-top: 16px;
            }

            /* ========== EMPTY STATE GIO ========== */

            .empty-state-gio {
                text-align: center;
                padding: 40px 20px;
                color: #9CA3AF;
            }

            .empty-state-gio svg {
                margin-bottom: 12px;
                opacity: 0.5;
            }

            .empty-state-gio p {
                margin: 0 0 12px 0;
                font-size: 14px;
                color: #6B7280;
            }

            .empty-state-gio small {
                font-size: 12px;
                color: #9CA3AF;
            }

            /* ========== BTN SM GIO ========== */

            .btn-sm-gio {
                padding: 6px 14px !important;
                font-size: 12px !important;
            }

            /* ========== TOAST GIO ========== */

            .toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: white;
                padding: 14px 20px;
                border-radius: 12px;
                box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                opacity: 0;
                transform: translateY(20px);
                transition: all 0.3s ease;
                z-index: 10000;
            }

            .toast.show {
                opacity: 1;
                transform: translateY(0);
            }

            .toast-success {
                border-left: 4px solid #10b981;
            }

            .toast-success .toast-icon svg {
                stroke: #10b981;
            }

            .toast-error {
                border-left: 4px solid #ef4444;
            }

            .toast-error .toast-icon svg {
                stroke: #ef4444;
            }

            .toast-icon {
                display: flex;
                align-items: center;
            }

            .toast-icon svg {
                width: 20px;
                height: 20px;
            }

            .toast-message {
                font-size: 14px;
                color: #1F2937;
            }

            /* ========== MODAL GIO ========== */

            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
            }

            .modal-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
                max-width: 600px;
                width: 100%;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: modalSlideIn 0.3s ease;
            }

            @keyframes modalSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .modal-large {
                max-width: 700px;
            }

            .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                background: linear-gradient(135deg, #1e6076 0%, #154555 100%);
                color: white;
            }

            .modal-title-group {
                display: flex;
                align-items: center;
                gap: 12px;
                flex: 1;
            }

            .modal-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
                color: white;
            }

            .modal-close {
                background: rgba(255, 255, 255, 0.15);
                border: none;
                cursor: pointer;
                padding: 8px;
                border-radius: 8px;
                color: white;
                transition: all 0.2s;
            }

            .modal-close:hover {
                background: rgba(255, 255, 255, 0.25);
            }

            .modal-body {
                padding: 24px;
                overflow-y: auto;
                flex: 1;
            }

            .modal-footer {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                padding: 16px 24px;
                border-top: 1px solid #E5E7EB;
                background: #F9FAFB;
            }

            .modal-footer .btn-primary,
            .modal-footer .btn {
                background: linear-gradient(135deg, #12b0a0 0%, #0d9488 100%);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s;
            }

            .modal-footer .btn-primary:hover,
            .modal-footer .btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(18, 176, 160, 0.3);
            }

            .modal-footer .btn-secondary {
                background: white;
                color: #374151;
                border: 1px solid #E5E7EB;
            }

            .modal-footer .btn-secondary:hover {
                background: #F9FAFB;
                transform: none;
                box-shadow: none;
            }

            .dept-badge {
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                white-space: nowrap;
            }

            .progress-section {
                margin-bottom: 24px;
                padding: 18px;
                background: linear-gradient(135deg, rgba(18, 176, 160, 0.08) 0%, rgba(30, 96, 118, 0.05) 100%);
                border-radius: 12px;
                border: 1px solid rgba(18, 176, 160, 0.15);
            }

            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .progress-value-display {
                font-size: 20px;
                font-weight: 700;
                color: #12b0a0;
            }

            .progress-bar-container {
                height: 10px;
                background: #E5E7EB;
                border-radius: 5px;
                overflow: hidden;
                margin-bottom: 12px;
            }

            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #12b0a0 0%, #0d9488 100%);
                transition: width 0.3s ease;
                border-radius: 5px;
            }

            .progress-slider {
                width: 100%;
                cursor: pointer;
                accent-color: #12b0a0;
            }

            .details-grid {
                display: grid;
                gap: 16px;
                margin-bottom: 20px;
            }

            .detail-item {
                border-left: 3px solid #12b0a0;
                padding-left: 12px;
            }

            .detail-item strong {
                display: block;
                font-size: 11px;
                color: #9CA3AF;
                text-transform: uppercase;
                margin-bottom: 4px;
                letter-spacing: 0.3px;
            }

            .detail-item p {
                margin: 0;
                font-size: 14px;
                color: #1F2937;
            }

            .alert {
                padding: 14px 16px;
                border-radius: 10px;
                margin-bottom: 16px;
                font-size: 14px;
            }

            .alert-warning {
                background: rgba(245, 158, 11, 0.1);
                color: #92400e;
                border-left: 4px solid #f59e0b;
            }

            .alert-success {
                background: rgba(16, 185, 129, 0.1);
                color: #065f46;
                border-left: 4px solid #10b981;
            }

            .responsible-badges {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 8px;
            }

            .comment-section,
            .evidence-section {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #E5E7EB;
            }

            .comment-section strong,
            .evidence-section strong {
                display: block;
                font-size: 13px;
                color: #1F2937;
                margin-bottom: 8px;
            }

            .comment-section p {
                margin: 0;
                font-size: 14px;
                color: #4B5563;
                line-height: 1.6;
            }

            .evidence-list {
                margin: 8px 0;
                padding-left: 20px;
                list-style: disc;
            }

            .evidence-list li {
                margin-bottom: 8px;
                font-size: 14px;
                color: #4B5563;
            }

            .evidence-list a {
                color: #12b0a0;
                text-decoration: none;
                font-weight: 500;
            }

            .evidence-list a:hover {
                text-decoration: underline;
                color: #0d9488;
            }

            /* ========== RESPONSIVO GIO ========== */

            @media (max-width: 1024px) {
                .calendar-page-gio {
                    grid-template-columns: 1fr;
                }

                .reminders-panel-gio {
                    max-height: 500px;
                }
            }

            @media (max-width: 640px) {
                .calendar-page-gio {
                    padding: 16px;
                    gap: 16px;
                }

                .calendar-main-gio,
                .reminders-panel-gio {
                    padding: 16px;
                }

                .form-row-gio {
                    flex-direction: column;
                    gap: 0;
                }

                .modal-large {
                    max-width: 95%;
                }

                .form-actions-gio {
                    flex-direction: column;
                }

                .form-actions-gio button {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;

        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.CalendarPage = CalendarPage;

// Exporta
export { CalendarPage };
