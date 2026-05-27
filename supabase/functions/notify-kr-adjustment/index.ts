// Supabase Edge Function: notify-kr-adjustment
// Envia email via Gmail SMTP para os responsáveis (ou departamento como fallback)
// quando o comitê solicita ajustes em KRs específicos (ou no OKR inteiro).
//
// Secrets necessários:
//   - GMAIL_USER          (ex: topconstrutora.inovacoes@gmail.com)
//   - GMAIL_APP_PASSWORD  (App Password de 16 chars - https://myaccount.google.com/apppasswords)
//   - FROM_NAME           (opcional, padrão: "Comitê OKR")
//   - APP_URL             (opcional: URL do frontend para deep-link)
//   - EMAIL_BLOCKLIST     (opcional: emails separados por vírgula que NUNCA recebem notificações)
//
// Variáveis fornecidas automaticamente pelo Supabase em runtime:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import nodemailer from 'npm:nodemailer@6.9.16';

interface RequestBody {
    okr_id: string;
    /** opcional - lista de KR ids alterados (para destacar no email). */
    kr_ids?: string[];
}

function escapeHtml(s: string): string {
    return String(s).replace(/[&<>"']/g, (c) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]!));
}

Deno.serve(async (req) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            }
        });
    }

    const cors = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    try {
        const body = (await req.json()) as RequestBody;
        if (!body.okr_id) {
            return new Response(JSON.stringify({ error: 'okr_id required' }), { status: 400, headers: cors });
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const gmailUser = Deno.env.get('GMAIL_USER');
        const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD');
        const fromName = Deno.env.get('FROM_NAME') || 'Comitê OKR';
        const appUrl = Deno.env.get('APP_URL') || '';
        const blocklist = new Set(
            (Deno.env.get('EMAIL_BLOCKLIST') || '')
                .split(',')
                .map(e => e.trim().toLowerCase())
                .filter(Boolean)
        );

        if (!supabaseUrl || !serviceKey) {
            return new Response(JSON.stringify({ error: 'Supabase env not set' }), { status: 500, headers: cors });
        }
        if (!gmailUser || !gmailPass) {
            return new Response(JSON.stringify({ error: 'GMAIL_USER ou GMAIL_APP_PASSWORD não configurado' }), { status: 500, headers: cors });
        }

        const sb = createClient(supabaseUrl, serviceKey);

        // 1) Carrega OKR
        const { data: okr, error: okrErr } = await sb
            .from('okrs')
            .select('id, title, status, department, committee_comment')
            .eq('id', body.okr_id)
            .single();

        if (okrErr || !okr) {
            return new Response(JSON.stringify({ error: 'OKR not found', detail: okrErr?.message }), { status: 404, headers: cors });
        }

        // 2) Carrega KRs com committee_comment
        let krsQuery = sb
            .from('key_results')
            .select('id, title, committee_comment, position')
            .eq('okr_id', okr.id)
            .order('position', { ascending: true });
        if (body.kr_ids && body.kr_ids.length > 0) {
            krsQuery = krsQuery.in('id', body.kr_ids);
        }
        const { data: allKrs } = await krsQuery;
        const krsWithComment = (allKrs || []).filter(k => k.committee_comment && String(k.committee_comment).trim() !== '');

        const hasOkrComment = okr.committee_comment && String(okr.committee_comment).trim() !== '';
        if (krsWithComment.length === 0 && !hasOkrComment) {
            return new Response(JSON.stringify({ skipped: true, reason: 'no adjustment to notify' }), { headers: cors });
        }

        // 3) Resolve destinatários: primeiro tenta okr_responsible_users (responsáveis explícitos),
        // se vazio cai para todos os usuários ativos do departamento do OKR.
        let recipients: Array<{ id: string; nome: string; email: string }> = [];
        let recipientSource = 'responsible_users';

        const { data: okrResp } = await sb
            .from('okr_responsible_users')
            .select('user_id')
            .eq('okr_id', okr.id);
        const responsibleIds = (okrResp || []).map((r: { user_id: string }) => r.user_id);

        if (responsibleIds.length > 0) {
            const { data: users } = await sb
                .from('users')
                .select('id, nome, email, ativo')
                .in('id', responsibleIds)
                .eq('ativo', true);
            recipients = (users || [])
                .filter((u: any) => u.email && String(u.email).includes('@'))
                .map((u: any) => ({ id: u.id, nome: u.nome, email: u.email }));
        }

        // Fallback: departamento
        if (recipients.length === 0) {
            recipientSource = 'department';
            const { data: dept } = await sb
                .from('departments')
                .select('id, nome')
                .eq('nome', okr.department)
                .maybeSingle();

            if (!dept) {
                return new Response(JSON.stringify({ skipped: true, reason: `department '${okr.department}' not found and no responsible_users set` }), { headers: cors });
            }

            const { data: junction } = await sb
                .from('user_departments')
                .select('user_id')
                .eq('department_id', dept.id);

            const userIds = (junction || []).map((j: { user_id: string }) => j.user_id);
            if (userIds.length === 0) {
                return new Response(JSON.stringify({ skipped: true, reason: 'no users in department and no responsible_users set' }), { headers: cors });
            }

            const { data: users } = await sb
                .from('users')
                .select('id, nome, email, ativo')
                .in('id', userIds)
                .eq('ativo', true);

            recipients = (users || [])
                .filter((u: any) => u.email && String(u.email).includes('@'))
                .map((u: any) => ({ id: u.id, nome: u.nome, email: u.email }));
        }

        // Aplica blocklist (diretores e similares que nunca devem receber)
        const blocked: string[] = [];
        recipients = recipients.filter(r => {
            const isBlocked = blocklist.has((r.email || '').toLowerCase());
            if (isBlocked) blocked.push(r.email);
            return !isBlocked;
        });

        if (recipients.length === 0) {
            return new Response(JSON.stringify({
                skipped: true,
                reason: 'no recipients with email after blocklist',
                blocked
            }), { headers: cors });
        }

        // 4) Monta HTML do email
        const krBlocks = krsWithComment.length > 0
            ? krsWithComment.map((kr, idx) => `
                <div style="margin:14px 0;padding:12px 14px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:6px;">
                    <div style="font-weight:600;font-size:14px;color:#7f1d1d;margin-bottom:4px;">
                        KR${(kr.position ?? idx) + 1}: ${escapeHtml(kr.title || '')}
                    </div>
                    <div style="font-size:13px;color:#991b1b;white-space:pre-wrap;">${escapeHtml(kr.committee_comment)}</div>
                </div>
            `).join('')
            : '';
        const krDetailsSection = krsWithComment.length > 0 ? `
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;">
            <p style="margin:0 0 4px;font-weight:600;font-size:14px;">Detalhes por KR (${krsWithComment.length}):</p>
            ${krBlocks}
        ` : '';

        const okrLink = appUrl ? `${appUrl}/okrs` : '';
        const linkBlock = okrLink ? `
            <p style="margin:20px 0 0;">
                <a href="${okrLink}" style="display:inline-block;padding:10px 18px;background:#12b0a0;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600;">
                    Abrir OKR no sistema
                </a>
            </p>
        ` : '';

        const html = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;color:#1f2937;">
            <div style="background:#0f766e;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
                <h1 style="margin:0;font-size:20px;font-weight:700;">Ajustes solicitados no OKR</h1>
                <p style="margin:6px 0 0;opacity:0.9;font-size:13px;">Comitê de Aprovação · Departamento: ${escapeHtml(okr.department || '')}</p>
            </div>
            <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:22px 24px;background:#fff;">
                <p style="margin:0 0 8px;font-size:14px;">
                    O OKR <strong>${escapeHtml(okr.title || '')}</strong> recebeu solicitação de ajuste(s) do comitê.
                </p>
                ${okr.committee_comment ? `<div style="margin:0 0 16px;padding:12px 14px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:6px;color:#92400e;font-size:13px;white-space:pre-wrap;">${escapeHtml(okr.committee_comment)}</div>` : ''}
                ${krDetailsSection}
                ${linkBlock}
            </div>
            <p style="margin:14px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
                Sistema OKR · TOP Construtora · Este email foi enviado automaticamente, não responda.
            </p>
        </div>
        `;

        // 5) Envia via Gmail SMTP (uma mensagem por destinatário pra não vazar lista)
        const subject = `Ajustes solicitados no OKR: ${okr.title}`;
        const results: Array<{ to: string; ok: boolean; error?: string }> = [];

        // Plain text alternativo (gerado manualmente, sem whitespace bagunçado)
        const krLines = krsWithComment.map((kr, idx) =>
            `KR${(kr.position ?? idx) + 1}: ${kr.title || ''}\n  → ${kr.committee_comment || ''}`
        ).join('\n\n');
        const plain = [
            `Ajustes solicitados no OKR`,
            `Departamento: ${okr.department || ''}`,
            ``,
            `OKR: ${okr.title || ''}`,
            okr.committee_comment ? `\nComentário do comitê:\n${okr.committee_comment}` : '',
            krsWithComment.length > 0 ? `\nDetalhes por KR (${krsWithComment.length}):\n${krLines}` : '',
            appUrl ? `\nAbrir no sistema: ${appUrl}/okrs` : '',
            ``,
            `--`,
            `Sistema OKR · TOP Construtora`,
            `Este email foi enviado automaticamente, não responda.`
        ].filter(Boolean).join('\n');

        const transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: gmailUser,
                pass: gmailPass
            }
        });

        for (const r of recipients) {
            try {
                await transporter.sendMail({
                    from: `"${fromName}" <${gmailUser}>`,
                    to: r.email,
                    subject,
                    text: plain,
                    html
                });
                results.push({ to: r.email, ok: true });
            } catch (e: any) {
                results.push({ to: r.email, ok: false, error: String(e?.message || e) });
            }
        }
        try { transporter.close(); } catch (_) { /* ignore */ }

        const sent = results.filter(r => r.ok).length;
        return new Response(
            JSON.stringify({
                ok: true,
                department: okr.department,
                recipient_source: recipientSource,
                recipients: recipients.length,
                blocked,
                sent,
                failed: results.length - sent,
                kr_count: krsWithComment.length,
                results
            }),
            { headers: cors }
        );

    } catch (err) {
        return new Response(
            JSON.stringify({ error: 'unhandled', detail: String(err) }),
            { status: 500, headers: cors }
        );
    }
});
