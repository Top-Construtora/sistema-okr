import express from 'express';
import supabase from '../config/supabase.js';

const router = express.Router();

// Mapa de content-types por extensão
const contentTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'txt': 'text/plain'
};

// Função auxiliar para buscar e servir arquivo
async function serveFile(req, res, forceDownload = false) {
    try {
        const bucket = req.params.bucket;
        const filePath = req.params[0];

        if (!bucket || !filePath) {
            return res.status(400).json({ error: 'Bucket e path são obrigatórios' });
        }

        const { data, error } = await supabase.storage
            .from(bucket)
            .download(filePath);

        if (error) {
            console.error('Erro ao buscar arquivo:', error);
            return res.status(404).json({ error: 'Arquivo não encontrado' });
        }

        const fileName = filePath.split('/').pop();
        const extension = fileName.split('.').pop().toLowerCase();
        const contentType = contentTypes[extension] || 'application/octet-stream';

        const arrayBuffer = await data.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', buffer.length);

        if (forceDownload) {
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        } else {
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        }

        res.send(buffer);
    } catch (error) {
        console.error('Erro no proxy de evidência:', error);
        res.status(500).json({ error: 'Erro interno ao buscar arquivo' });
    }
}

// Rota para VISUALIZAR arquivo (abre no navegador)
// /api/evidence/view/:bucket/*
router.get('/view/:bucket/*', (req, res) => serveFile(req, res, false));

// Rota para BAIXAR arquivo (força download)
// /api/evidence/download/:bucket/*
router.get('/download/:bucket/*', (req, res) => serveFile(req, res, true));

export default router;
