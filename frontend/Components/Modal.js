// Componente de Modal Reutilizável
const Modal = {
    /**
     * Mostra um modal de confirmação com input de texto
     * @param {Object} options - Opções do modal
     * @param {string} options.title - Título do modal
     * @param {string} options.message - Mensagem/descrição
     * @param {string} options.placeholder - Placeholder do textarea
     * @param {string} options.confirmLabel - Label do botão de confirmação (padrão: "Confirmar")
     * @param {string} options.cancelLabel - Label do botão de cancelar (padrão: "Cancelar")
     * @param {boolean} options.required - Se o input é obrigatório (padrão: true)
     * @param {number} options.maxLength - Tamanho máximo do texto (padrão: 500)
     * @returns {Promise<string|null>} - Retorna o texto digitado ou null se cancelado
     */
    prompt(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Confirmação',
                subtitle = '',
                message = '',
                placeholder = 'Digite aqui...',
                hint = '',
                confirmLabel = 'Confirmar',
                cancelLabel = 'Cancelar',
                required = true,
                maxLength = 500,
                variant = 'danger', // 'danger' | 'primary' | 'warning'
                icon = 'warning' // 'warning' | 'edit' | 'check' | 'info' | null
            } = options;

            // Remove modal anterior se existir
            const existingModal = document.getElementById('custom-modal');
            if (existingModal) {
                existingModal.remove();
            }

            const icons = {
                warning: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>',
                edit: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>',
                check: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
                info: '<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
            };
            const iconHtml = icon && icons[icon] ? `<div class="modal-prompt-icon variant-${variant}">${icons[icon]}</div>` : '';

            // Cria overlay e estrutura do modal
            const modalHTML = `
                <div id="custom-modal" class="custom-modal-overlay">
                    <div class="modal-container modal-prompt">
                        <button class="modal-close" aria-label="Fechar" id="modal-close-x">
                            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                        <div class="modal-prompt-head">
                            ${iconHtml}
                            <div class="modal-prompt-titles">
                                <h3 class="modal-prompt-title">${title}</h3>
                                ${subtitle ? `<p class="modal-prompt-subtitle">${subtitle}</p>` : ''}
                            </div>
                        </div>
                        ${message ? `<div class="modal-prompt-message">${message}</div>` : ''}
                        <div class="modal-prompt-body">
                            <textarea
                                id="modal-input"
                                class="modal-prompt-textarea"
                                placeholder="${placeholder}"
                                maxlength="${maxLength}"
                                rows="4"
                            ></textarea>
                            <div class="modal-prompt-meta">
                                ${hint ? `<span class="modal-prompt-hint">${hint}</span>` : '<span></span>'}
                                <span class="modal-prompt-charcount" id="modal-charcount">0/${maxLength}</span>
                            </div>
                        </div>
                        <div class="modal-prompt-footer">
                            <button class="btn btn-secondary" id="modal-cancel">${cancelLabel}</button>
                            <button class="btn modal-prompt-confirm variant-${variant}" id="modal-confirm" ${required ? 'disabled' : ''}>
                                ${confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Adiciona estilos se ainda não existirem
            this.addStyles();

            // Elementos
            const modal = document.getElementById('custom-modal');
            const input = document.getElementById('modal-input');
            const confirmBtn = document.getElementById('modal-confirm');
            const cancelBtn = document.getElementById('modal-cancel');
            const closeBtn = document.getElementById('modal-close-x');
            const charCounter = document.getElementById('modal-charcount');

            // Foca no textarea
            setTimeout(() => input.focus(), 100);

            // Contador de caracteres + habilita botão
            const updateState = () => {
                const len = input.value.length;
                charCounter.textContent = `${len}/${maxLength}`;
                charCounter.classList.toggle('warning', len > maxLength * 0.9);
                if (required) {
                    confirmBtn.disabled = input.value.trim().length === 0;
                }
                input.classList.remove('input-error');
            };
            input.addEventListener('input', updateState);

            // Função para fechar modal
            const closeModal = (value = null) => {
                modal.classList.add('modal-closing');
                setTimeout(() => {
                    modal.remove();
                    resolve(value);
                }, 200);
            };

            // Confirmar
            confirmBtn.addEventListener('click', () => {
                const value = input.value.trim();
                if (required && !value) {
                    input.classList.add('input-error');
                    input.focus();
                    return;
                }
                closeModal(value);
            });

            // Cancelar
            cancelBtn.addEventListener('click', () => closeModal(null));
            closeBtn.addEventListener('click', () => closeModal(null));

            // Fechar ao clicar no overlay
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(null);
                }
            });

            // Atalhos de teclado
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeModal(null);
                } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    confirmBtn.click();
                }
            });
        });
    },

    /**
     * Mostra um modal de confirmação simples (sem input)
     */
    confirm(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Confirmação',
                message = 'Deseja continuar?',
                confirmLabel = 'Confirmar',
                cancelLabel = 'Cancelar',
                danger = false
            } = options;

            const existingModal = document.getElementById('custom-modal');
            if (existingModal) {
                existingModal.remove();
            }

            const modalHTML = `
                <div id="custom-modal" class="custom-modal-overlay">
                    <div class="modal-container">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button class="modal-close" aria-label="Fechar">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        <div class="modal-message">${message}</div>

                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="modal-cancel">${cancelLabel}</button>
                            <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="modal-confirm">${confirmLabel}</button>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
            this.addStyles();

            const modal = document.getElementById('custom-modal');
            const confirmBtn = document.getElementById('modal-confirm');
            const cancelBtn = document.getElementById('modal-cancel');
            const closeBtn = modal.querySelector('.modal-close');

            confirmBtn.focus();

            const closeModal = (value = false) => {
                modal.classList.add('modal-closing');
                setTimeout(() => {
                    modal.remove();
                    resolve(value);
                }, 200);
            };

            confirmBtn.addEventListener('click', () => closeModal(true));
            cancelBtn.addEventListener('click', () => closeModal(false));
            closeBtn.addEventListener('click', () => closeModal(false));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(false);
            });
            modal.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeModal(false);
            });
        });
    },

    addStyles() {
        if (document.getElementById('modal-styles-v2')) return;
        // Remove versão antiga se existir
        const old = document.getElementById('modal-styles');
        if (old) old.remove();

        const style = document.createElement('style');
        style.id = 'modal-styles-v2';
        style.textContent = `
            .custom-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: modalFadeIn 0.2s ease-out;
                padding: 20px;
            }

            .custom-modal-overlay.modal-closing {
                animation: modalFadeOut 0.2s ease-in;
            }

            @keyframes modalFadeIn {
                from {
                    opacity: 0;
                }
                to {
                    opacity: 1;
                }
            }

            @keyframes modalFadeOut {
                from {
                    opacity: 1;
                }
                to {
                    opacity: 0;
                }
            }

            @keyframes modalSlideIn {
                from {
                    transform: translateY(-20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .modal-container {
                background: white;
                border-radius: var(--radius-lg);
                box-shadow: var(--shadow-lg);
                max-width: 500px;
                width: 100%;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: modalSlideIn 0.2s ease-out;
            }

            .modal-header {
                padding: 20px 24px;
                border-bottom: 1px solid var(--border);
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
            }

            .modal-title {
                font-size: 18px;
                font-weight: 700;
                color: var(--text-primary);
                margin: 0;
            }

            .modal-close {
                background: none;
                border: none;
                padding: 4px;
                cursor: pointer;
                color: var(--text-muted);
                transition: all 0.2s;
                border-radius: var(--radius);
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .modal-close:hover {
                background: var(--bg-main);
                color: var(--text-primary);
            }

            .modal-message {
                padding: 16px 24px;
                color: var(--text-secondary);
                font-size: 14px;
                line-height: 1.6;
            }

            .modal-body {
                padding: 20px 24px;
                flex: 1;
                overflow-y: auto;
            }

            .modal-textarea {
                width: 100%;
                padding: 12px;
                border: 1px solid var(--border);
                border-radius: var(--radius);
                font-family: inherit;
                font-size: 14px;
                resize: vertical;
                transition: all 0.2s;
                min-height: 100px;
            }

            .modal-textarea:focus {
                outline: none;
                border-color: var(--top-teal);
                box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
            }

            .modal-textarea.input-error {
                border-color: var(--danger);
                animation: shake 0.3s;
            }

            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }

            .modal-char-count {
                margin-top: 8px;
                font-size: 12px;
                color: var(--text-muted);
                text-align: right;
            }

            .modal-footer {
                padding: 16px 24px;
                border-top: 1px solid var(--border);
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }

            .modal-footer .btn {
                min-width: 100px;
            }

            @media (max-width: 640px) {
                .modal-container {
                    max-width: 100%;
                    margin: 0;
                }

                .modal-footer {
                    flex-direction: column-reverse;
                }

                .modal-footer .btn {
                    width: 100%;
                }
            }

            /* ============== MODAL.PROMPT v2 ============== */
            .modal-container.modal-prompt {
                position: relative;
                background: #fff;
                border-radius: 14px;
                max-width: 520px;
                padding: 0;
                box-shadow: 0 24px 64px rgba(0,0,0,0.2);
                overflow: visible;
            }
            .modal-prompt .modal-close {
                position: absolute;
                top: 14px;
                right: 14px;
                width: 28px;
                height: 28px;
                background: rgba(0,0,0,0.04);
                border: none;
                border-radius: 6px;
                cursor: pointer;
                color: #6b7280;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.15s;
                z-index: 1;
            }
            .modal-prompt .modal-close:hover {
                background: rgba(0,0,0,0.08);
                color: #1f2937;
            }
            .modal-prompt-head {
                display: flex;
                gap: 14px;
                padding: 24px 24px 0;
                align-items: flex-start;
            }
            .modal-prompt-icon {
                width: 40px;
                height: 40px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .modal-prompt-icon.variant-danger {
                background: #fef2f2;
                color: #dc2626;
            }
            .modal-prompt-icon.variant-warning {
                background: #fffbeb;
                color: #d97706;
            }
            .modal-prompt-icon.variant-primary {
                background: #ecfdf5;
                color: #0f766e;
            }
            .modal-prompt-titles { flex: 1; min-width: 0; }
            .modal-prompt-title {
                margin: 0;
                font-size: 18px;
                font-weight: 700;
                color: #111827;
                text-transform: none;
                line-height: 1.3;
            }
            .modal-prompt-subtitle {
                margin: 4px 0 0;
                font-size: 13px;
                color: #6b7280;
                line-height: 1.4;
            }
            .modal-prompt-message {
                padding: 14px 24px 0;
                font-size: 14px;
                color: #4b5563;
                line-height: 1.5;
            }
            .modal-prompt-body {
                padding: 16px 24px 0;
            }
            .modal-prompt-textarea {
                width: 100%;
                padding: 12px 14px;
                border: 1.5px solid #e5e7eb;
                border-radius: 10px;
                font-family: inherit;
                font-size: 14px;
                line-height: 1.5;
                color: #1f2937;
                resize: vertical;
                min-height: 110px;
                transition: border-color 0.15s, box-shadow 0.15s;
                background: #fff;
            }
            .modal-prompt-textarea::placeholder {
                color: #9ca3af;
            }
            .modal-prompt-textarea:focus {
                outline: none;
                border-color: #0f766e;
                box-shadow: 0 0 0 3px rgba(15,118,110,0.12);
            }
            .modal-prompt-textarea.input-error {
                border-color: #dc2626;
                box-shadow: 0 0 0 3px rgba(220,38,38,0.1);
                animation: shake 0.3s;
            }
            .modal-prompt-meta {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-top: 8px;
                font-size: 12px;
            }
            .modal-prompt-hint {
                color: #6b7280;
                font-style: italic;
            }
            .modal-prompt-charcount {
                color: #9ca3af;
                font-variant-numeric: tabular-nums;
            }
            .modal-prompt-charcount.warning {
                color: #dc2626;
                font-weight: 600;
            }
            .modal-prompt-footer {
                display: flex;
                justify-content: flex-end;
                gap: 10px;
                padding: 18px 24px 24px;
                margin-top: 18px;
            }
            .modal-prompt-footer .btn {
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.15s;
                border: 1.5px solid transparent;
                min-width: 110px;
            }
            .modal-prompt-footer .btn-secondary {
                background: #fff;
                color: #374151;
                border-color: #d1d5db;
            }
            .modal-prompt-footer .btn-secondary:hover {
                background: #f9fafb;
                border-color: #9ca3af;
            }
            .modal-prompt-confirm.variant-danger {
                background: #dc2626;
                color: #fff;
            }
            .modal-prompt-confirm.variant-danger:hover:not(:disabled) {
                background: #b91c1c;
                box-shadow: 0 4px 12px rgba(220,38,38,0.3);
            }
            .modal-prompt-confirm.variant-warning {
                background: #d97706;
                color: #fff;
            }
            .modal-prompt-confirm.variant-warning:hover:not(:disabled) {
                background: #b45309;
                box-shadow: 0 4px 12px rgba(217,119,6,0.3);
            }
            .modal-prompt-confirm.variant-primary {
                background: #0f766e;
                color: #fff;
            }
            .modal-prompt-confirm.variant-primary:hover:not(:disabled) {
                background: #115e59;
                box-shadow: 0 4px 12px rgba(15,118,110,0.3);
            }
            .modal-prompt-confirm:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            @media (max-width: 640px) {
                .modal-prompt-footer {
                    flex-direction: column-reverse;
                }
                .modal-prompt-footer .btn {
                    width: 100%;
                }
            }
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.Modal = Modal;
export { Modal };
