import { AuthService } from '../../services/auth.js';
import { supabaseClient } from '../../services/supabase.js';
import { Initiative } from '../../Entities/Initiative.js';
import { Reminder, REMINDER_TYPES, REMINDER_PRIORITIES } from '../../Entities/Reminder.js';
import { Modal } from '../../Components/Modal.js';

// Página de Calendário - Visualização de Iniciativas e Lembretes
const CalendarPage = {
    calendar: null,
    initiatives: [],
    reminders: [],
    currentUser: null,
    userDepartments: [],
    selectedDate: null,
    currentReminderEdit: null,

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
            <div class="calendar-page-container">
                <!-- Calendário Principal -->
                <div class="calendar-main">
                    <div id="fullcalendar"></div>
                </div>

                <!-- Painel de Lembretes -->
                <div class="reminders-panel">
                    <div class="reminders-header">
                        <h3>Lembretes</h3>
                        <button class="btn btn-primary btn-sm" onclick="CalendarPage.showReminderForm()">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                            </svg>
                            Novo
                        </button>
                    </div>

                    <div class="selected-date-info" id="selected-date-info">
                        <span class="date-display">Selecione uma data no calendário</span>
                    </div>

                    <div class="reminders-list" id="reminders-list">
                        <!-- Lista de lembretes será renderizada aqui -->
                    </div>

                    <!-- Formulário de Lembrete (oculto por padrão) -->
                    <div class="reminder-form-container" id="reminder-form-container" style="display: none;">
                        <form id="reminder-form" onsubmit="CalendarPage.saveReminder(event); return false;">
                            <div class="form-group">
                                <label>Data *</label>
                                <input type="date" name="reminder_date" id="reminder-date" required class="form-control" />
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label>Tipo *</label>
                                    <select name="type" id="reminder-type" required class="form-control">
                                        <option value="note">Nota</option>
                                        <option value="reminder">Lembrete</option>
                                        <option value="task">Tarefa</option>
                                    </select>
                                </div>

                                <div class="form-group">
                                    <label>Prioridade</label>
                                    <select name="priority" id="reminder-priority" class="form-control">
                                        <option value="normal">Normal</option>
                                        <option value="high">Alta</option>
                                        <option value="urgent">Urgente</option>
                                        <option value="low">Baixa</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-group">
                                <label>Conteúdo *</label>
                                <textarea name="content" id="reminder-content" rows="4" maxlength="500"
                                    required class="form-control"
                                    placeholder="Descreva seu lembrete..."
                                    oninput="CalendarPage.updateCharCount()"></textarea>
                                <small class="char-count" id="char-count">0/500</small>
                            </div>

                            <div class="form-actions">
                                <button type="button" class="btn btn-secondary" onclick="CalendarPage.cancelReminderForm()">
                                    Cancelar
                                </button>
                                <button type="submit" class="btn btn-primary">
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
     */
    getShortName(fullName) {
        if (!fullName) return '';
        const parts = fullName.trim().split(/\s+/);
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
     * Carrega todos os dados (initiatives e reminders)
     */
    async loadData() {
        try {
            // Buscar iniciativas e lembretes em paralelo
            const [initiatives, reminders] = await Promise.all([
                this.fetchInitiatives(),
                this.fetchReminders()
            ]);

            this.initiatives = initiatives;
            this.reminders = reminders;
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
     * Transforma initiatives e reminders em eventos do FullCalendar
     */
    transformToEvents() {
        const events = [];
        const isAdmin = this.currentUser.tipo === 'admin';

        // Transformar iniciativas
        this.initiatives.forEach(initiative => {
            // Usar campo department diretamente da initiative
            const deptName = initiative.department || 'Sem Departamento';
            const isUserDept = isAdmin || this.userDepartments.includes(deptName);

            // Não exibir se não for do departamento do usuário (exceto admin)
            if (!isAdmin && !isUserDept) return;

            const colors = this.getDepartmentColor(deptName, isUserDept);

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

        return events;
    },

    /**
     * Paleta de cores MUITO distintas e contrastantes
     */
    getColorPalette() {
        return [
            // Azul Forte
            { background: '#DBEAFE', border: '#2563EB', text: '#1E3A8A' },
            // Verde Esmeralda
            { background: '#D1FAE5', border: '#059669', text: '#064E3B' },
            // Roxo Intenso
            { background: '#EDE9FE', border: '#7C3AED', text: '#5B21B6' },
            // Laranja Vibrante
            { background: '#FFEDD5', border: '#EA580C', text: '#9A3412' },
            // Rosa Pink
            { background: '#FCE7F3', border: '#DB2777', text: '#9F1239' },
            // Teal Profundo
            { background: '#CCFBF1', border: '#0D9488', text: '#134E4A' },
            // Índigo
            { background: '#E0E7FF', border: '#4F46E5', text: '#312E81' },
            // Amarelo Ouro
            { background: '#FEF3C7', border: '#D97706', text: '#78350F' },
            // Vermelho Coral
            { background: '#FEE2E2', border: '#DC2626', text: '#991B1B' },
            // Ciano Elétrico
            { background: '#CFFAFE', border: '#0891B2', text: '#164E63' },
            // Verde Limão
            { background: '#ECFCCB', border: '#65A30D', text: '#3F6212' },
            // Magenta
            { background: '#FAE8FF', border: '#C026D3', text: '#86198F' },
            // Azul Céu
            { background: '#E0F2FE', border: '#0284C7', text: '#075985' },
            // Verde Floresta
            { background: '#D1FAE5', border: '#047857', text: '#064E3B' },
            // Laranja Fogo
            { background: '#FED7AA', border: '#F97316', text: '#9A3412' }
        ];
    },

    /**
     * Gera cor consistente para departamento usando paleta pré-definida
     */
    getDepartmentColor(deptName, isUserDept = false) {
        const palette = this.getColorPalette();

        // Hash simples para obter índice consistente
        let hash = 0;
        for (let i = 0; i < deptName.length; i++) {
            hash = deptName.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Seleciona cor da paleta baseado no hash
        const colorIndex = Math.abs(hash) % palette.length;
        const baseColor = palette[colorIndex];

        if (isUserDept) {
            // Departamento do usuário: usa cores da paleta diretamente (vibrantes e saturadas)
            return {
                background: baseColor.background,
                border: baseColor.border,
                text: baseColor.text
            };
        } else {
            // Outros departamentos: versão bem mais clara e neutra
            return {
                background: this.lightenColor(baseColor.background, 0.7), // Muito mais claro
                border: this.lightenColor(baseColor.border, 0.6), // Mais claro
                text: this.lightenColor(baseColor.text, 0.5) // Mais claro
            };
        }
    },

    /**
     * Clareia uma cor hex (para outros departamentos)
     */
    lightenColor(hex, factor) {
        // Remove # se existir
        hex = hex.replace('#', '');

        // Converte para RGB
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Clareia em direção ao branco
        const newR = Math.round(r + (255 - r) * factor);
        const newG = Math.round(g + (255 - g) * factor);
        const newB = Math.round(b + (255 - b) * factor);

        // Converte de volta para hex
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
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

        // Aplicar cores como CSS variables
        if (props.colors) {
            element.style.setProperty('--fc-event-bg-color', props.colors.background);
            element.style.setProperty('--fc-event-border-color', props.colors.border);
            element.style.setProperty('--fc-event-text-color', props.colors.text);
        }

        if (props.type === 'initiative') {
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
                <div class="empty-state">
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

            html += `<div class="reminder-date-group">
                <div class="reminder-date-header">${formatted}</div>`;

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
                <div class="empty-state">
                    <p>Nenhum lembrete para esta data</p>
                    <button class="btn btn-sm btn-primary" onclick="CalendarPage.showReminderForm('${dateStr}')">
                        + Adicionar Lembrete
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
            <div class="reminder-item ${reminder.completed ? 'completed' : ''} ${reminder.isOverdue() ? 'overdue' : ''}"
                 data-id="${reminder.id}">
                <div class="reminder-header">
                    <span class="reminder-type-icon">${typeIcons[reminder.type]}</span>
                    <span class="reminder-type-label">${reminder.getTypeLabel()}</span>
                    ${reminder.created_by_name ? `
                        <span class="reminder-author">
                            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="vertical-align:middle;">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                            ${this.getShortName(reminder.created_by_name)}
                        </span>
                    ` : ''}
                    <span class="reminder-priority" style="background: ${priorityColors[reminder.priority]};">
                        ${reminder.getPriorityLabel()}
                    </span>
                </div>
                <div class="reminder-content ${reminder.completed ? 'strikethrough' : ''}">
                    ${reminder.content}
                </div>
                <div class="reminder-actions">
                    ${reminder.type === 'task' ? `
                        <button class="btn-icon" onclick="CalendarPage.toggleReminderComplete('${reminder.id}')"
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
                        <button class="btn-icon" onclick="CalendarPage.editReminder('${reminder.id}')" title="Editar">
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        <button class="btn-icon text-danger" onclick="CalendarPage.deleteReminder('${reminder.id}')" title="Excluir">
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
        if (document.getElementById('calendar-page-styles')) return;

        const style = document.createElement('style');
        style.id = 'calendar-page-styles';
        style.textContent = `
            /* Container Principal */
            .calendar-page-container {
                display: grid;
                grid-template-columns: 1fr 350px;
                gap: 24px;
                padding: 24px;
                max-width: 1600px;
                margin: 0 auto;
            }

            /* Calendário */
            .calendar-main {
                background: var(--bg-card, white);
                border-radius: var(--radius, 8px);
                padding: 20px;
                box-shadow: var(--shadow-md, 0 4px 6px rgba(0,0,0,0.1));
            }

            /* Ajustes do FullCalendar */
            #fullcalendar {
                font-family: inherit;
            }

            .fc .fc-button-primary {
                background-color: var(--top-blue, #1e6076) !important;
                border-color: var(--top-blue, #1e6076) !important;
            }

            .fc .fc-button-primary:hover {
                background-color: var(--top-teal, #2dd4bf) !important;
                border-color: var(--top-teal, #2dd4bf) !important;
            }

            .fc .fc-button-primary:disabled {
                opacity: 0.5;
            }

            /* Estilos dos eventos - FORÇA cores customizadas */
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

            /* CRITICAL: Força cores customizadas a sobrescrever padrões do FullCalendar */
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

            /* Eventos de iniciativa - departamento do usuário */
            .fc-event.event-initiative.user-dept {
                border-width: 3px !important;
                font-weight: 700 !important;
                box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2) !important;
                font-size: 13px !important;
            }

            /* Eventos de iniciativa - outros departamentos */
            .fc-event.event-initiative.other-dept {
                border-width: 1px !important;
                font-weight: 400 !important;
                opacity: 0.75;
                font-size: 11px !important;
            }

            /* Eventos concluídos */
            .fc-event.completed {
                opacity: 0.5 !important;
                text-decoration: line-through !important;
            }

            /* Overdue - indicador vermelho forte */
            .fc-event.event-initiative.overdue:not(.completed) {
                border-left-width: 5px !important;
                border-left-color: #ef4444 !important;
                background-image: linear-gradient(to right, rgba(239, 68, 68, 0.1), transparent) !important;
            }

            /* Eventos de lembrete */
            .fc-event.event-reminder {
                border-style: dashed !important;
                font-style: italic;
            }

            /* Painel de Lembretes */
            .reminders-panel {
                background: var(--bg-card, white);
                border-radius: var(--radius, 8px);
                padding: 20px;
                box-shadow: var(--shadow-md, 0 4px 6px rgba(0,0,0,0.1));
                display: flex;
                flex-direction: column;
                max-height: calc(100vh - 150px);
                overflow: hidden;
            }

            .reminders-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 2px solid var(--border, #e2e8f0);
            }

            .reminders-header h3 {
                margin: 0;
                font-size: 18px;
                color: var(--text-primary, #1e293b);
            }

            .selected-date-info {
                margin-bottom: 16px;
                padding: 12px;
                background: var(--bg-main, #f8fafc);
                border-radius: 6px;
                text-align: center;
            }

            .date-display {
                font-size: 13px;
                color: var(--text-secondary, #64748b);
                font-weight: 500;
                text-transform: capitalize;
            }

            .reminders-list {
                flex: 1;
                overflow-y: auto;
                margin-bottom: 16px;
            }

            .reminder-date-group {
                margin-bottom: 16px;
            }

            .reminder-date-header {
                font-size: 11px;
                font-weight: 600;
                color: var(--text-muted, #94a3b8);
                text-transform: uppercase;
                margin-bottom: 8px;
                padding-left: 4px;
            }

            .reminder-item {
                background: white;
                border: 1px solid var(--border, #e2e8f0);
                border-radius: 8px;
                padding: 12px;
                margin-bottom: 8px;
                transition: all 0.2s;
            }

            .reminder-item:hover {
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                border-color: var(--top-teal, #2dd4bf);
            }

            .reminder-item.completed {
                opacity: 0.6;
                background: #f9fafb;
            }

            .reminder-item.overdue {
                border-left: 3px solid #ef4444;
            }

            .reminder-header {
                display: flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 8px;
            }

            .reminder-type-icon {
                display: inline-flex;
                align-items: center;
            }

            .reminder-type-icon svg {
                width: 16px;
                height: 16px;
            }

            .reminder-type-label {
                font-size: 11px;
                color: var(--text-muted, #94a3b8);
                text-transform: uppercase;
                font-weight: 600;
            }

            .reminder-author {
                font-size: 11px;
                color: var(--text-muted, #94a3b8);
                display: inline-flex;
                align-items: center;
                gap: 3px;
            }

            .reminder-priority {
                margin-left: auto;
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 9px;
                color: white;
                font-weight: 600;
                text-transform: uppercase;
            }

            .reminder-content {
                font-size: 13px;
                color: var(--text-primary, #1e293b);
                margin-bottom: 8px;
                line-height: 1.5;
            }

            .reminder-content.strikethrough {
                text-decoration: line-through;
            }

            .reminder-actions {
                display: flex;
                gap: 4px;
                justify-content: flex-end;
            }

            .btn-icon {
                background: none;
                border: none;
                cursor: pointer;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 14px;
                transition: background 0.2s;
            }

            .btn-icon:hover {
                background: var(--bg-main, #f8fafc);
            }

            .text-danger:hover {
                background: #fee2e2;
            }

            /* Formulário de Lembrete */
            .reminder-form-container {
                border-top: 2px solid var(--border, #e2e8f0);
                padding-top: 16px;
            }

            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
            }

            .form-group {
                margin-bottom: 12px;
            }

            .form-group label,
            .form-label {
                display: block;
                font-size: 12px;
                font-weight: 600;
                color: var(--text-secondary, #64748b);
                margin-bottom: 4px;
            }

            .form-control {
                width: 100%;
                padding: 8px 12px;
                border: 1px solid var(--border, #e2e8f0);
                border-radius: 6px;
                font-size: 13px;
                font-family: inherit;
            }

            .form-control:focus {
                outline: none;
                border-color: var(--top-teal, #2dd4bf);
                box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.1);
            }

            textarea.form-control {
                resize: vertical;
                min-height: 80px;
            }

            .char-count {
                display: block;
                text-align: right;
                font-size: 11px;
                color: var(--text-muted, #94a3b8);
                margin-top: 4px;
            }

            .form-actions {
                display: flex;
                gap: 8px;
                justify-content: flex-end;
                margin-top: 16px;
            }

            /* Modal de Iniciativa - Estilos Base */
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                padding: 20px;
            }

            .modal-container {
                background: white;
                border-radius: 12px;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
                max-width: 600px;
                width: 100%;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }

            .modal-large {
                max-width: 700px;
            }

            .modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 20px 24px;
                border-bottom: 1px solid var(--border, #e2e8f0);
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
                font-weight: 700;
                color: var(--text-primary, #1e293b);
            }

            .modal-close {
                background: none;
                border: none;
                cursor: pointer;
                padding: 8px;
                border-radius: 6px;
                color: var(--text-muted, #94a3b8);
                transition: all 0.2s;
            }

            .modal-close:hover {
                background: var(--bg-main, #f8fafc);
                color: var(--text-primary, #1e293b);
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
                border-top: 1px solid var(--border, #e2e8f0);
                background: var(--bg-main, #f8fafc);
            }

            .dept-badge {
                padding: 4px 12px;
                border-radius: 4px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                white-space: nowrap;
            }

            .responsible-badges {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-top: 8px;
            }

            .progress-section {
                margin-bottom: 24px;
                padding: 16px;
                background: var(--bg-main, #f8fafc);
                border-radius: 8px;
            }

            .progress-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }

            .progress-value-display {
                font-size: 18px;
                font-weight: 700;
                color: var(--top-blue, #1e6076);
            }

            .progress-bar-container {
                height: 12px;
                background: #e2e8f0;
                border-radius: 6px;
                overflow: hidden;
                margin-bottom: 12px;
            }

            .progress-bar {
                height: 100%;
                transition: width 0.3s ease;
                border-radius: 6px;
            }

            .progress-slider {
                width: 100%;
                cursor: pointer;
            }

            .details-grid {
                display: grid;
                gap: 16px;
                margin-bottom: 20px;
            }

            .detail-item {
                border-left: 3px solid var(--top-teal, #2dd4bf);
                padding-left: 12px;
            }

            .detail-item strong {
                display: block;
                font-size: 12px;
                color: var(--text-muted, #94a3b8);
                text-transform: uppercase;
                margin-bottom: 4px;
            }

            .detail-item p {
                margin: 0;
                font-size: 14px;
                color: var(--text-primary, #1e293b);
            }

            .alert {
                padding: 12px 16px;
                border-radius: 6px;
                margin-bottom: 16px;
                font-size: 14px;
            }

            .alert-warning {
                background: #fef3c7;
                color: #92400e;
                border-left: 4px solid #f59e0b;
            }

            .alert-success {
                background: #d1fae5;
                color: #065f46;
                border-left: 4px solid #10b981;
            }

            .comment-section,
            .evidence-section {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid var(--border, #e2e8f0);
            }

            .comment-section strong,
            .evidence-section strong {
                display: block;
                font-size: 13px;
                color: var(--text-primary, #1e293b);
                margin-bottom: 8px;
            }

            .comment-section p {
                margin: 0;
                font-size: 14px;
                color: var(--text-secondary, #64748b);
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
                color: var(--text-secondary, #64748b);
            }

            .evidence-list a {
                color: var(--top-blue, #1e6076);
                text-decoration: none;
                font-weight: 500;
            }

            .evidence-list a:hover {
                text-decoration: underline;
                color: var(--top-teal, #2dd4bf);
            }

            /* Botões do Sistema */
            .btn {
                padding: 10px 20px;
                border: none;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .btn-primary {
                background: var(--top-teal, #2dd4bf);
                color: white;
            }

            .btn-primary:hover {
                background: var(--top-blue, #1e6076);
            }

            .btn-secondary {
                background: var(--bg-main, #f8fafc);
                color: var(--text-secondary, #64748b);
                border: 1px solid var(--border, #e2e8f0);
            }

            .btn-secondary:hover {
                background: white;
                border-color: var(--text-muted, #94a3b8);
            }

            .btn-sm {
                padding: 6px 12px;
                font-size: 12px;
            }

            /* Empty State */
            .empty-state {
                text-align: center;
                padding: 40px 20px;
                color: var(--text-muted, #94a3b8);
            }

            .empty-state p {
                margin: 0 0 12px 0;
                font-size: 14px;
            }

            .empty-state small {
                font-size: 12px;
            }

            /* Toast */
            .toast {
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
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
                color: var(--text-primary, #1e293b);
            }

            /* Responsivo */
            @media (max-width: 1024px) {
                .calendar-page-container {
                    grid-template-columns: 1fr;
                }

                .reminders-panel {
                    max-height: 500px;
                }
            }

            @media (max-width: 640px) {
                .calendar-page-container {
                    padding: 12px;
                    gap: 16px;
                }

                .calendar-main,
                .reminders-panel {
                    padding: 12px;
                }

                .form-row {
                    grid-template-columns: 1fr;
                }

                .modal-large {
                    max-width: 95%;
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
