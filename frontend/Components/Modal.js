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
                message = '',
                placeholder = 'Digite aqui...',
                confirmLabel = 'Confirmar',
                cancelLabel = 'Cancelar',
                required = true,
                maxLength = 500
            } = options;

            // Remove modal anterior se existir
            const existingModal = document.getElementById('custom-modal');
            if (existingModal) {
                existingModal.remove();
            }

            // Cria overlay e estrutura do modal
            const modalHTML = `
                <div id="custom-modal" class="modal-overlay">
                    <div class="modal-container">
                        <div class="modal-header">
                            <h3 class="modal-title">${title}</h3>
                            <button class="modal-close" aria-label="Fechar">
                                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>

                        ${message ? `<div class="modal-message">${message}</div>` : ''}

                        <div class="modal-body">
                            <textarea
                                id="modal-input"
                                class="modal-textarea"
                                placeholder="${placeholder}"
                                maxlength="${maxLength}"
                                rows="4"
                            ></textarea>
                            <div class="modal-char-count">
                                <span id="modal-char-counter">0</span> / ${maxLength} caracteres
                            </div>
                        </div>

                        <div class="modal-footer">
                            <button class="btn btn-secondary" id="modal-cancel">${cancelLabel}</button>
                            <button class="btn btn-danger" id="modal-confirm">${confirmLabel}</button>
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
            const closeBtn = modal.querySelector('.modal-close');
            const charCounter = document.getElementById('modal-char-counter');

            // Foca no textarea
            setTimeout(() => input.focus(), 100);

            // Contador de caracteres
            input.addEventListener('input', () => {
                charCounter.textContent = input.value.length;
            });

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
                } else if (e.key === 'Enter' && e.ctrlKey) {
                    confirmBtn.click();
                }
            });

            // Remove erro ao digitar
            input.addEventListener('input', () => {
                input.classList.remove('input-error');
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
                <div id="custom-modal" class="modal-overlay">
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
        if (document.getElementById('modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
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
                z-index: 10000;
                animation: modalFadeIn 0.2s ease-out;
                padding: 20px;
            }

            .modal-overlay.modal-closing {
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
        `;
        document.head.appendChild(style);
    }
};

// Expõe globalmente
window.Modal = Modal;
export { Modal };
