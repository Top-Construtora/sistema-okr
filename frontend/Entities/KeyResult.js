// Entidade KeyResult - Resultado-Chave
class KeyResult {
    constructor(data = {}) {
        this.id = data.id || uid();
        this.title = data.title || '';
        this.metric = data.metric || '';
        this.target = data.target || '';
        this.progress = data.progress || 0;
        this.tasks = data.tasks || [];
        this.comment = data.comment ?? '';
        this.evidence = (data.evidence && Array.isArray(data.evidence)) ? data.evidence : []; // Array de { type: 'text'|'link', content: string }
    }

    // Validações
    validate() {
        const errors = [];

        if (!this.title || this.title.trim() === '') {
            errors.push('Título do Key Result é obrigatório');
        }

        if (!this.metric || this.metric.trim() === '') {
            errors.push('Métrica é obrigatória');
        }

        if (!this.target || this.target.trim() === '') {
            errors.push('Meta é obrigatória');
        }

        if (this.progress < 0 || this.progress > 100) {
            errors.push('Progresso deve estar entre 0 e 100');
        }

        return errors;
    }

    // Adiciona tarefa
    addTask(task) {
        if (!task.id) task.id = uid();
        if (!task.title) throw new Error('Título da tarefa é obrigatório');
        this.tasks.push(task);
    }

    // Remove tarefa
    removeTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
    }

    // Atualiza tarefa
    updateTask(taskId, updatedData) {
        const index = this.tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            this.tasks[index] = { ...this.tasks[index], ...updatedData };
        }
    }

    // Exporta para objeto simples
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            metric: this.metric,
            target: this.target,
            progress: this.progress,
            tasks: this.tasks,
            comment: this.comment,
            evidence: this.evidence
        };
    }

    // Cria a partir de objeto simples
    static fromJSON(data) {
        return new KeyResult(data);
    }
}
