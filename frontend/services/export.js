// Export Service - OKR System Export to PDF and Excel
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabaseClient } from './supabase.js';

const EXPORT_CONFIG = {
    PDF_MARGIN: 20,
    PDF_COLORS: {
        primaryBlue: [30, 96, 118],
        gold: [186, 166, 115],
        textMuted: [148, 163, 184],
        border: [226, 232, 240],
        bgHover: [241, 245, 249]
    }
};

export const ExportService = {
    // ==================== MAIN EXPORT FUNCTIONS ====================

    /**
     * Export OKRs to PDF with complete hierarchy
     * @param {Array} okrs - Array of OKR objects to export
     * @param {Object} user - Current logged-in user
     */
    async exportToPDF(okrs, user) {
        try {
            // 1. Fetch complete data hierarchy
            const okrsData = await this.fetchCompleteOKRData(okrs);

            // 2. Initialize jsPDF (A4, portrait)
            const doc = new jsPDF('p', 'mm', 'a4');


            // 3. Generate cover page
            const exportDate = new Date();
            this.generatePDFCoverPage(doc, okrs, user, exportDate);

            // 4. Add new page for content
            doc.addPage();
            let currentY = 20;

            // 5. Generate section for each OKR
            for (const okrData of okrsData) {
                currentY = this.generatePDFOKRSection(doc, okrData, currentY);

                // Add new page if needed
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }
            }

            // 6. Add page numbers
            this.addPDFPageNumbers(doc);

            // 7. Download
            const filename = `OKRs_Export_${exportDate.toISOString().split('T')[0]}.pdf`;
            doc.save(filename);
        } catch (error) {
            console.error('[ExportService] Error in exportToPDF:', error);
            throw error;
        }
    },

    /**
     * Export OKRs to Excel with multiple sheets
     * @param {Array} okrs - Array of OKR objects to export
     * @param {Object} user - Current logged-in user
     */
    async exportToExcel(okrs, user) {
        try {
            // 1. Fetch complete data hierarchy
            const okrsData = await this.fetchCompleteOKRData(okrs);

            // 2. Create workbook
            const wb = XLSX.utils.book_new();

            // 3. Generate sheets
            const summarySheet = this.generateExcelSummarySheet(okrsData);
            const detailedSheet = this.generateExcelDetailedSheet(okrsData);
            const initiativesSheet = this.generateExcelInitiativesSheet(okrsData);

            // 4. Add sheets to workbook
            XLSX.utils.book_append_sheet(wb, summarySheet, 'Resumo');
            XLSX.utils.book_append_sheet(wb, detailedSheet, 'OKRs Detalhados');
            XLSX.utils.book_append_sheet(wb, initiativesSheet, 'Iniciativas');

            // 5. Download
            const filename = `OKRs_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, filename);
        } catch (error) {
            console.error('[ExportService] Error in exportToExcel:', error);
            throw error;
        }
    },

    // ==================== DATA FETCHING FUNCTIONS ====================

    /**
     * Fetch complete OKR hierarchy with all related data
     * @param {Array} okrs - Base OKR array
     * @returns {Promise<Array>} - Complete OKR data with KRs and initiatives
     */
    async fetchCompleteOKRData(okrs) {
        const completeData = [];

        for (const okr of okrs) {
            // Fetch Key Results for this OKR
            const keyResults = await this.fetchKeyResultsForOKR(okr.id);

            // For each KR, fetch initiatives
            for (const kr of keyResults) {
                kr.initiatives = await this.fetchInitiativesForKR(kr.id);

                // For each initiative, fetch responsible users (multiple)
                for (const initiative of kr.initiatives) {
                    initiative.responsible_users = await this.fetchResponsibleUsersForInitiative(initiative.id);

                    // Keep backward compatibility with single responsavel
                    if (initiative.responsavel_id) {
                        initiative.responsavel = await this.fetchUserById(initiative.responsavel_id);
                    }

                    // Add helper method to get responsible users
                    initiative.getResponsibleUsers = function() {
                        if (this.responsible_users && this.responsible_users.length > 0) {
                            return this.responsible_users;
                        }
                        if (this.responsavel) {
                            return [{ ...this.responsavel, is_primary: true }];
                        }
                        return [];
                    };
                }
            }

            completeData.push({
                ...okr,
                keyResults: keyResults
            });
        }

        return completeData;
    },

    /**
     * Fetch Key Results for a specific OKR
     */
    async fetchKeyResultsForOKR(okrId) {
        try {
            const { data, error } = await supabaseClient
                .from('key_results')
                .select('*')
                .eq('okr_id', okrId)
                .order('position', { ascending: true });

            if (error) {
                console.error('[ExportService] Error fetching key results:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('[ExportService] Exception in fetchKeyResultsForOKR:', error);
            return [];
        }
    },

    /**
     * Fetch Initiatives for a specific Key Result
     */
    async fetchInitiativesForKR(keyResultId) {
        try {
            const { data, error } = await supabaseClient
                .from('initiatives')
                .select('*')
                .eq('key_result_id', keyResultId)
                .order('position', { ascending: true });

            if (error) {
                console.error('[ExportService] Error fetching initiatives:', error);
                return [];
            }

            return data || [];
        } catch (error) {
            console.error('[ExportService] Exception in fetchInitiativesForKR:', error);
            return [];
        }
    },

    /**
     * Fetch User by ID
     */
    async fetchUserById(userId) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('id, nome, email')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[ExportService] Error fetching user:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('[ExportService] Exception in fetchUserById:', error);
            return null;
        }
    },

    /**
     * Fetch Responsible Users for an Initiative (many-to-many)
     */
    async fetchResponsibleUsersForInitiative(initiativeId) {
        try {
            const { data, error } = await supabaseClient
                .from('initiative_responsible_users')
                .select(`
                    user_id,
                    is_primary,
                    user:users(id, nome, email)
                `)
                .eq('initiative_id', initiativeId);

            if (error) {
                console.error('[ExportService] Error fetching responsible users:', error);
                return [];
            }

            // Transform to flatten the structure
            return (data || []).map(ru => ({
                ...ru.user,
                is_primary: ru.is_primary
            }));
        } catch (error) {
            console.error('[ExportService] Exception in fetchResponsibleUsersForInitiative:', error);
            return [];
        }
    },

    // ==================== PDF GENERATION FUNCTIONS ====================

    /**
     * Generate PDF cover page
     */
    generatePDFCoverPage(doc, okrs, user, exportDate) {
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        // Company branding header
        doc.setFillColor(...EXPORT_CONFIG.PDF_COLORS.primaryBlue);
        doc.rect(0, 0, pageWidth, 60, 'F');

        // Add TOP logo (left side)
        try {
            // Logo dimensions - maintaining aspect ratio (1366x769 = ~1.78:1)
            const logoHeight = 30;
            const logoWidth = logoHeight * 1.78;
            const logoX = 15;
            const logoY = 15;

            doc.addImage('/top.png', 'PNG', logoX, logoY, logoWidth, logoHeight);
        } catch (error) {
            console.warn('[ExportService] Could not load TOP logo:', error);
        }

        // Title (centered)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.text('Sistema OKR', pageWidth / 2, 35, { align: 'center' });

        // Document info section
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');

        const infoY = 90;
        doc.text(`Exportado por: ${user.nome}`, 20, infoY);
        doc.text(`Email: ${user.email}`, 20, infoY + 10);
        doc.text(`Data: ${exportDate.toLocaleDateString('pt-BR')}`, 20, infoY + 20);
        doc.text(`Hora: ${exportDate.toLocaleTimeString('pt-BR')}`, 20, infoY + 30);

        // Summary statistics
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Resumo da Exportação', 20, infoY + 60);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        const stats = {
            total: okrs.length,
            pending: okrs.filter(o => o.status === 'pending').length,
            approved: okrs.filter(o => o.status === 'approved').length,
            completed: okrs.filter(o => o.status === 'completed').length,
            homologated: okrs.filter(o => o.status === 'homologated').length
        };

        const statsY = infoY + 75;
        doc.text(`Total de OKRs: ${stats.total}`, 20, statsY);
        doc.text(`Pendentes: ${stats.pending}`, 20, statsY + 10);
        doc.text(`Em Andamento: ${stats.approved}`, 20, statsY + 20);
        doc.text(`Concluídos: ${stats.completed}`, 20, statsY + 30);
        doc.text(`Homologados: ${stats.homologated}`, 20, statsY + 40);

        // Footer with timestamp
        doc.setFontSize(9);
        doc.setTextColor(...EXPORT_CONFIG.PDF_COLORS.textMuted);
        doc.text(
            `Documento gerado automaticamente em ${exportDate.toLocaleString('pt-BR')}`,
            pageWidth / 2,
            pageHeight - 20,
            { align: 'center' }
        );
    },

    /**
     * Generate PDF section for a single OKR
     */
    generatePDFOKRSection(doc, okrData, startY) {
        let currentY = startY;
        const pageWidth = doc.internal.pageSize.width;
        const margin = EXPORT_CONFIG.PDF_MARGIN;
        const contentWidth = pageWidth - (2 * margin);

        // OKR Header Box - Calculate height based on title
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        const titleLines = doc.splitTextToSize(okrData.title, contentWidth - 10);
        const titleHeight = titleLines.length * 6; // 6mm per line
        const boxHeight = Math.max(30, titleHeight + 20); // Minimum 30mm, or title + spacing

        doc.setFillColor(...EXPORT_CONFIG.PDF_COLORS.bgHover);
        doc.rect(margin, currentY, contentWidth, boxHeight, 'F');

        doc.setTextColor(...EXPORT_CONFIG.PDF_COLORS.primaryBlue);
        doc.text(titleLines, margin + 5, currentY + 8);

        // Calculate position for status/progress/department based on title height
        const infoStartY = currentY + titleHeight + 10;

        // Status badge
        const statusLabel = this.getStatusLabel(okrData.status);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Status: ${statusLabel}`, margin + 5, infoStartY);

        // Progress
        doc.text(`Progresso: ${okrData.progress}%`, margin + 60, infoStartY);

        // Department
        doc.text(`Departamento: ${okrData.department}`, margin + 5, infoStartY + 6);

        currentY += boxHeight + 5;

        // Objective text
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Objetivo: ${okrData.objective_text || 'N/A'}`, margin, currentY);
        currentY += 10;

        // Mini cycle info
        if (okrData.mini_cycle) {
            doc.text(`Mini Ciclo: ${okrData.mini_cycle.nome}`, margin, currentY);
            currentY += 8;
        }

        // Committee comment
        if (okrData.committee_comment) {
            doc.setFont('helvetica', 'italic');
            const commentLines = doc.splitTextToSize(
                `Comentário do Comitê: ${okrData.committee_comment}`,
                contentWidth
            );
            doc.text(commentLines, margin, currentY);
            currentY += commentLines.length * 5 + 5;
        }

        currentY += 5;

        // Key Results Table
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Key Results', margin, currentY);
        currentY += 8;

        if (okrData.keyResults && okrData.keyResults.length > 0) {
            const krTableData = okrData.keyResults.map((kr, idx) => [
                `KR ${idx + 1}`,
                kr.title,
                kr.metric || 'N/A',
                kr.target || 'N/A',
                `${kr.progress}%`,
                this.getStatusLabel(kr.status)
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['#', 'Título', 'Métrica', 'Meta', 'Progresso', 'Status']],
                body: krTableData,
                margin: { left: margin, right: margin },
                theme: 'grid',
                headStyles: { fillColor: EXPORT_CONFIG.PDF_COLORS.primaryBlue, textColor: 255 },
                styles: { fontSize: 9, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 60 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 25 },
                    5: { cellWidth: 25 }
                }
            });

            currentY = doc.lastAutoTable.finalY + 10;

            // Detailed info for each KR
            for (let i = 0; i < okrData.keyResults.length; i++) {
                const kr = okrData.keyResults[i];

                // Check page break
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }

                // KR Details Header
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(`KR ${i + 1}: ${kr.title}`, margin, currentY);
                currentY += 8;

                // KR Comment
                if (kr.comment) {
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'italic');
                    const commentLines = doc.splitTextToSize(`Comentário: ${kr.comment}`, contentWidth - 10);
                    doc.text(commentLines, margin + 5, currentY);
                    currentY += commentLines.length * 5 + 3;
                }

                // KR Evidence
                if (kr.evidence && kr.evidence.length > 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.text('Evidências:', margin + 5, currentY);
                    currentY += 6;

                    kr.evidence.forEach((ev, evIdx) => {
                        doc.setFont('helvetica', 'normal');
                        let evidenceText = `${evIdx + 1}. `;

                        if (ev.type === 'link') {
                            evidenceText += ev.name ? `${ev.name}: ${ev.content}` : ev.content;
                        } else {
                            evidenceText += ev.content;
                        }

                        const evidenceLines = doc.splitTextToSize(evidenceText, contentWidth - 15);
                        doc.text(evidenceLines, margin + 10, currentY);
                        currentY += evidenceLines.length * 5 + 2;
                    });

                    currentY += 3;
                }

                // Initiatives Table
                if (kr.initiatives && kr.initiatives.length > 0) {
                    // Check if there's enough space for the table header (at least 40mm)
                    if (currentY > 240) {
                        doc.addPage();
                        currentY = 20;
                    }

                    doc.setFont('helvetica', 'bold');
                    doc.text('Iniciativas:', margin + 5, currentY);
                    currentY += 6;

                    const initiativeTableData = kr.initiatives.map((init, initIdx) => {
                        // Get responsible users (support multiple)
                        const responsibleUsers = init.responsible_users || [];
                        const responsibleNames = responsibleUsers.length > 0
                            ? responsibleUsers.map(u => u.nome).join(', ')
                            : (init.responsavel ? init.responsavel.nome : 'N/A');

                        return [
                            `${initIdx + 1}`,
                            init.nome || init.title || 'N/A',
                            responsibleNames,
                            init.data_limite ? new Date(init.data_limite).toLocaleDateString('pt-BR') : 'N/A',
                            `${init.progress}%`,
                            init.concluida ? 'Sim' : 'Não'
                        ];
                    });

                    autoTable(doc, {
                        startY: currentY,
                        head: [['#', 'Nome', 'Responsável', 'Prazo', 'Progresso', 'Concluída']],
                        body: initiativeTableData,
                        margin: { left: margin + 5, right: margin },
                        theme: 'striped',
                        headStyles: { fillColor: EXPORT_CONFIG.PDF_COLORS.gold, textColor: 255 },
                        styles: { fontSize: 8, cellPadding: 2 },
                        columnStyles: {
                            0: { cellWidth: 10 },
                            1: { cellWidth: 50 },
                            2: { cellWidth: 35 },
                            3: { cellWidth: 25 },
                            4: { cellWidth: 20 },
                            5: { cellWidth: 20 }
                        }
                    });

                    currentY = doc.lastAutoTable.finalY + 5;

                    // Initiative details (comments and evidence)
                    kr.initiatives.forEach((init, initIdx) => {
                        if (init.comment || (init.evidence && init.evidence.length > 0)) {
                            if (currentY > 260) {
                                doc.addPage();
                                currentY = 20;
                            }

                            doc.setFontSize(9);
                            doc.setFont('helvetica', 'bold');
                            doc.text(`Iniciativa ${initIdx + 1}: ${init.nome || init.title}`, margin + 10, currentY);
                            currentY += 5;

                            if (init.descricao || init.description) {
                                doc.setFont('helvetica', 'normal');
                                const descLines = doc.splitTextToSize(
                                    `Descrição: ${init.descricao || init.description}`,
                                    contentWidth - 20
                                );
                                doc.text(descLines, margin + 12, currentY);
                                currentY += descLines.length * 4 + 2;
                            }

                            if (init.comment) {
                                doc.setFont('helvetica', 'italic');
                                const initCommentLines = doc.splitTextToSize(
                                    `Comentário: ${init.comment}`,
                                    contentWidth - 20
                                );
                                doc.text(initCommentLines, margin + 12, currentY);
                                currentY += initCommentLines.length * 4 + 2;
                            }

                            if (init.evidence && init.evidence.length > 0) {
                                doc.setFont('helvetica', 'normal');
                                doc.text('Evidências:', margin + 12, currentY);
                                currentY += 4;

                                init.evidence.forEach((ev, evIdx) => {
                                    let evidenceText = `${evIdx + 1}. `;

                                    if (ev.type === 'link') {
                                        evidenceText += ev.name ? `${ev.name}: ${ev.content}` : ev.content;
                                    } else {
                                        evidenceText += ev.content;
                                    }

                                    const evidenceLines = doc.splitTextToSize(evidenceText, contentWidth - 25);
                                    doc.text(evidenceLines, margin + 15, currentY);
                                    currentY += evidenceLines.length * 4 + 1;
                                });

                                currentY += 2;
                            }
                        }
                    });
                }

                currentY += 8;
            }
        } else {
            doc.setFont('helvetica', 'italic');
            doc.setTextColor(...EXPORT_CONFIG.PDF_COLORS.textMuted);
            doc.text('Nenhum Key Result cadastrado', margin, currentY);
            currentY += 10;
        }

        // Separator line
        doc.setDrawColor(...EXPORT_CONFIG.PDF_COLORS.border);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 15;

        return currentY;
    },

    /**
     * Add page numbers to all pages
     */
    addPDFPageNumbers(doc) {
        const pageCount = doc.internal.getNumberOfPages();
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            // Add page number
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(...EXPORT_CONFIG.PDF_COLORS.textMuted);
            doc.text(
                `Página ${i} de ${pageCount}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
        }
    },

    /**
     * Get human-readable status label
     */
    getStatusLabel(status) {
        const labels = {
            'pending': 'Pendente',
            'approved': 'Em Andamento',
            'adjust': 'Ajuste Solicitado',
            'completed': 'Concluído',
            'homologated': 'Homologado',
            'in_progress': 'Em Andamento'
        };
        return labels[status] || status;
    },

    // ==================== EXCEL GENERATION FUNCTIONS ====================

    /**
     * Generate Excel summary sheet (Resumo)
     */
    generateExcelSummarySheet(okrsData) {
        const data = okrsData.map(okr => ({
            'ID do OKR': okr.id,
            'Título': okr.title,
            'Objetivo Estratégico': okr.objective_text || 'N/A',
            'Departamento': okr.department,
            'Status': this.getStatusLabel(okr.status),
            'Progresso (%)': okr.progress / 100,
            'Mini Ciclo': okr.mini_cycle ? okr.mini_cycle.nome : 'N/A',
            'Data de Criação': this.formatDateForExcel(okr.created_at),
            'Data de Atualização': this.formatDateForExcel(okr.updated_at),
            'Quantidade de KRs': okr.keyResults ? okr.keyResults.length : 0,
            'Comentário do Comitê': okr.committee_comment || ''
        }));

        const ws = XLSX.utils.json_to_sheet(data);

        // Set column widths
        ws['!cols'] = [
            { wch: 10 },  // ID
            { wch: 40 },  // Título
            { wch: 30 },  // Objetivo
            { wch: 20 },  // Departamento
            { wch: 15 },  // Status
            { wch: 12 },  // Progresso
            { wch: 20 },  // Mini Ciclo
            { wch: 15 },  // Data Criação
            { wch: 15 },  // Data Atualização
            { wch: 12 },  // Qtd KRs
            { wch: 50 }   // Comentário
        ];

        // Format progress column as percentage
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: 5 });
            if (ws[cellAddress]) {
                ws[cellAddress].z = '0%';
            }
        }

        return ws;
    },

    /**
     * Generate Excel detailed sheet (OKRs Detalhados)
     */
    generateExcelDetailedSheet(okrsData) {
        const flatData = [];

        okrsData.forEach(okr => {
            if (okr.keyResults && okr.keyResults.length > 0) {
                okr.keyResults.forEach(kr => {
                    flatData.push({
                        'ID do OKR': okr.id,
                        'Título do OKR': okr.title,
                        'Status do OKR': this.getStatusLabel(okr.status),
                        'Progresso do OKR (%)': okr.progress / 100,
                        'Departamento': okr.department,
                        'Mini Ciclo': okr.mini_cycle ? okr.mini_cycle.nome : 'N/A',
                        'ID do KR': kr.id,
                        'Título do KR': kr.title,
                        'Métrica': kr.metric || 'N/A',
                        'Meta': kr.target || 'N/A',
                        'Progresso do KR (%)': kr.progress / 100,
                        'Status do KR': this.getStatusLabel(kr.status),
                        'Comentário do KR': kr.comment || '',
                        'Quantidade de Evidências': kr.evidence ? kr.evidence.length : 0,
                        'Quantidade de Iniciativas': kr.initiatives ? kr.initiatives.length : 0
                    });
                });
            } else {
                flatData.push({
                    'ID do OKR': okr.id,
                    'Título do OKR': okr.title,
                    'Status do OKR': this.getStatusLabel(okr.status),
                    'Progresso do OKR (%)': okr.progress / 100,
                    'Departamento': okr.department,
                    'Mini Ciclo': okr.mini_cycle ? okr.mini_cycle.nome : 'N/A',
                    'ID do KR': '',
                    'Título do KR': 'Sem KRs',
                    'Métrica': '',
                    'Meta': '',
                    'Progresso do KR (%)': 0,
                    'Status do KR': '',
                    'Comentário do KR': '',
                    'Quantidade de Evidências': 0,
                    'Quantidade de Iniciativas': 0
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(flatData);

        // Set column widths
        ws['!cols'] = [
            { wch: 10 },  // ID OKR
            { wch: 35 },  // Título OKR
            { wch: 15 },  // Status OKR
            { wch: 12 },  // Progresso OKR
            { wch: 20 },  // Departamento
            { wch: 20 },  // Mini Ciclo
            { wch: 10 },  // ID KR
            { wch: 35 },  // Título KR
            { wch: 15 },  // Métrica
            { wch: 15 },  // Meta
            { wch: 12 },  // Progresso KR
            { wch: 15 },  // Status KR
            { wch: 40 },  // Comentário KR
            { wch: 12 },  // Qtd Evidências
            { wch: 12 }   // Qtd Iniciativas
        ];

        // Format percentage columns
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
            const okrProgressCell = XLSX.utils.encode_cell({ r: R, c: 3 });
            if (ws[okrProgressCell]) ws[okrProgressCell].z = '0%';

            const krProgressCell = XLSX.utils.encode_cell({ r: R, c: 10 });
            if (ws[krProgressCell]) ws[krProgressCell].z = '0%';
        }

        return ws;
    },

    /**
     * Generate Excel initiatives sheet (Iniciativas)
     */
    generateExcelInitiativesSheet(okrsData) {
        const initiativesData = [];

        okrsData.forEach(okr => {
            if (okr.keyResults) {
                okr.keyResults.forEach(kr => {
                    if (kr.initiatives && kr.initiatives.length > 0) {
                        kr.initiatives.forEach(init => {
                            const dataLimite = init.data_limite ? new Date(init.data_limite) : null;
                            const isOverdue = dataLimite && !init.concluida && dataLimite < new Date();

                            initiativesData.push({
                                'ID da Iniciativa': init.id,
                                'Nome da Iniciativa': init.nome || init.title || 'N/A',
                                'Descrição': init.descricao || init.description || '',
                                'ID do KR': kr.id,
                                'Título do KR': kr.title,
                                'ID do OKR': okr.id,
                                'Título do OKR': okr.title,
                                'Responsáveis': (() => {
                                    const users = init.getResponsibleUsers ? init.getResponsibleUsers() :
                                                  (init.responsavel ? [init.responsavel] : []);
                                    return users.map(u => u.nome).join(', ') || 'N/A';
                                })(),
                                'Emails dos Responsáveis': (() => {
                                    const users = init.getResponsibleUsers ? init.getResponsibleUsers() :
                                                  (init.responsavel ? [init.responsavel] : []);
                                    return users.map(u => u.email).join(', ') || '';
                                })(),
                                'Responsável Principal': (() => {
                                    const users = init.getResponsibleUsers ? init.getResponsibleUsers() :
                                                  (init.responsavel ? [init.responsavel] : []);
                                    const primary = users.find(u => u.is_primary) || users[0];
                                    return primary ? primary.nome : 'N/A';
                                })(),
                                'Data Limite': this.formatDateForExcel(init.data_limite),
                                'Progresso (%)': init.progress / 100,
                                'Concluída': init.concluida ? 'Sim' : 'Não',
                                'Comentário': init.comment || '',
                                'Quantidade de Evidências': init.evidence ? init.evidence.length : 0,
                                'Atrasada': isOverdue ? 'Sim' : 'Não'
                            });
                        });
                    }
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(initiativesData);

        // Set column widths
        ws['!cols'] = [
            { wch: 10 },  // ID da Iniciativa
            { wch: 40 },  // Nome da Iniciativa
            { wch: 50 },  // Descrição
            { wch: 10 },  // ID do KR
            { wch: 35 },  // Título do KR
            { wch: 10 },  // ID do OKR
            { wch: 35 },  // Título do OKR
            { wch: 35 },  // Responsáveis (widened)
            { wch: 40 },  // Emails dos Responsáveis (widened)
            { wch: 25 },  // Responsável Principal (new)
            { wch: 15 },  // Data Limite
            { wch: 12 },  // Progresso (%)
            { wch: 10 },  // Concluída
            { wch: 40 },  // Comentário
            { wch: 12 },  // Quantidade de Evidências
            { wch: 10 }   // Atrasada
        ];

        // Format progress column
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r + 1; R <= range.e.r; R++) {
            const progressCell = XLSX.utils.encode_cell({ r: R, c: 11 }); // Changed from 10 to 11
            if (ws[progressCell]) ws[progressCell].z = '0%';
        }

        return ws;
    },

    /**
     * Format date for Excel
     */
    formatDateForExcel(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    }
};

// Export to window for global access if needed
window.ExportService = ExportService;
