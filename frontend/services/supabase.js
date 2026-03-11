// =====================================================
// CONFIGURAÇÃO SUPABASE - Versão Vite
// =====================================================

import { createClient } from '@supabase/supabase-js'

// Carrega credenciais do arquivo .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://SEU_PROJETO.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUA_CHAVE_ANON_AQUI';

// Inicializa o cliente Supabase
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Validação de configuração
if (SUPABASE_URL === 'https://SEU_PROJETO.supabase.co' || !SUPABASE_URL.includes('supabase.co')) {
    console.error('❌ SUPABASE NÃO CONFIGURADO!');
    console.error('📝 Siga estes passos:');
    console.error('   1. Copie .env.example para .env');
    console.error('   2. Edite o arquivo .env');
    console.error('   3. Adicione suas credenciais do Supabase');
    console.error('   4. Reinicie o servidor (npm run dev)');
}

// =====================================================
// UTILITÁRIO: Tratamento de erros
// =====================================================

function handleSupabaseError(error, defaultMessage = 'Erro ao processar dados') {
    console.error('Supabase error:', error);

    if (error.message) {
        return error.message;
    }

    return defaultMessage;
}

// =====================================================
// UTILITÁRIO: URL pública do Supabase Storage
// =====================================================

/**
 * Gera URL pública do Supabase Storage para arquivos
 * @param {string} bucket - Nome do bucket (ex: 'evidencias')
 * @param {string} filePath - Caminho do arquivo no bucket
 * @returns {string} URL pública do Supabase Storage
 */
function getProxyUrl(bucket, filePath) {
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
}

/**
 * Converte qualquer URL de evidência para URL pública do Supabase Storage
 * Lida com URLs antigas de proxy do backend e URLs do Supabase
 * @param {string} url - URL original
 * @returns {string} URL pública do Supabase Storage
 */
function convertToProxyUrl(url) {
    if (!url) return url;

    // Se é uma URL antiga de proxy do backend, extrair bucket e path
    const proxyPattern = /\/api\/evidence\/(?:view|download)\/([^/]+)\/(.+)$/;
    const proxyMatch = url.match(proxyPattern);
    if (proxyMatch) {
        const bucket = proxyMatch[1];
        const filePath = proxyMatch[2];
        return getProxyUrl(bucket, filePath);
    }

    // Se já é URL pública do Supabase, retorna como está
    if (url.includes('supabase.co/storage/v1/object/public/')) {
        return url;
    }

    // Retorna como está para outros tipos de URL (links externos, etc)
    return url;
}

/**
 * Converte URL para URL de download do Supabase Storage
 * @param {string} url - URL original
 * @returns {string} URL de download do Supabase Storage
 */
function convertToDownloadUrl(url) {
    if (!url) return url;

    // Se é uma URL antiga de proxy do backend, extrair bucket e path
    const proxyPattern = /\/api\/evidence\/(?:view|download)\/([^/]+)\/(.+)$/;
    const proxyMatch = url.match(proxyPattern);
    if (proxyMatch) {
        const bucket = proxyMatch[1];
        const filePath = proxyMatch[2];
        return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}?download=true`;
    }

    // Se é URL pública do Supabase, adicionar parâmetro de download
    if (url.includes('supabase.co/storage/v1/object/public/')) {
        return url.includes('?') ? `${url}&download=true` : `${url}?download=true`;
    }

    return url;
}

// Exporta cliente para uso em outros arquivos
export { supabaseClient, handleSupabaseError, getProxyUrl, convertToProxyUrl, convertToDownloadUrl };
