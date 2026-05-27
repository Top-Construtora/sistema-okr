// Supabase Edge Function: notify-kr-adjustment
// Envia email para todos os colaboradores ativos do departamento do OKR
// quando o comitê solicita ajustes em KRs específicos (ou no OKR inteiro).
//
// Secrets necessários:
//   - RESEND_API_KEY  (https://resend.com)
//   - FROM_EMAIL      (ex: "Comitê OKR <noreply@seudominio.com>")
//   - APP_URL         (opcional: URL do frontend para deep-link)
//
// Variáveis fornecidas automaticamente pelo Supabase em runtime:
//   - SUPABASE_URL
//   - SUPABASE_SERVICE_ROLE_KEY
//
// Deploy:
//   supabase functions deploy notify-kr-adjustment
//   supabase secrets set RESEND_API_KEY=re_xxx FROM_EMAIL="Comitê OKR <noreply@dominio.com>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const RESEND_API = 'https://api.resend.com/emails';

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
        const resendKey = Deno.env.get('RESEND_API_KEY');
        const fromEmail = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';
        const appUrl = Deno.env.get('APP_URL') || '';

        if (!supabaseUrl || !serviceKey) {
            return new Response(JSON.stringify({ error: 'Supabase env not set' }), { status: 500, headers: cors });
        }
        if (!resendKey) {
            return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500, headers: cors });
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

        // 3) Resolve usuários ativos do departamento do OKR
        // department é uma string (nome) - resolvemos para id via departments.nome
        const { data: dept } = await sb
            .from('departments')
            .select('id, nome')
            .eq('nome', okr.department)
            .maybeSingle();

        if (!dept) {
            return new Response(JSON.stringify({ skipped: true, reason: `department '${okr.department}' not found` }), { headers: cors });
        }

        const { data: junction } = await sb
            .from('user_departments')
            .select('user_id')
            .eq('department_id', dept.id);

        const userIds = (junction || []).map(j => j.user_id);
        if (userIds.length === 0) {
            return new Response(JSON.stringify({ skipped: true, reason: 'no users in department' }), { headers: cors });
        }

        const { data: users } = await sb
            .from('users')
            .select('id, nome, email, ativo')
            .in('id', userIds)
            .eq('ativo', true);

        const recipients = (users || []).filter(u => u.email && String(u.email).includes('@'));
        if (recipients.length === 0) {
            return new Response(JSON.stringify({ skipped: true, reason: 'no recipients with email' }), { headers: cors });
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

        // 5) Envia via Resend (uma chamada por destinatário para evitar vazamento de emails)
        const subject = `Ajustes solicitados no OKR: ${okr.title}`;
        const results: Array<{ to: string; ok: boolean; error?: string }> = [];

        for (const r of recipients) {
            try {
                const res = await fetch(RESEND_API, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${resendKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        from: fromEmail,
                        to: r.email,
                        subject,
                        html
                    })
                });
                if (res.ok) {
                    results.push({ to: r.email, ok: true });
                } else {
                    const txt = await res.text();
                    results.push({ to: r.email, ok: false, error: `${res.status}: ${txt}` });
                }
            } catch (e) {
                results.push({ to: r.email, ok: false, error: String(e) });
            }
        }

        const sent = results.filter(r => r.ok).length;
        return new Response(
            JSON.stringify({
                ok: true,
                department: okr.department,
                recipients: recipients.length,
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
