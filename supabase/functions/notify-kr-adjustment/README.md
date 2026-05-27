# Edge Function: notify-kr-adjustment

Envia email (via Resend) para todos os colaboradores ativos do departamento do OKR quando o comitê solicita ajustes em KRs específicos.

## Pré-requisitos

1. **Conta no Resend** — https://resend.com (free tier: 100 emails/dia, 3000/mês)
2. **Domínio verificado no Resend** (ou use `onboarding@resend.dev` pra testar)
3. **Supabase CLI** instalado (https://supabase.com/docs/guides/cli)

## Setup

### 1. Login e link no projeto

```bash
supabase login
supabase link --project-ref <SEU_PROJECT_REF>
```

### 2. Configure os secrets

```bash
# Obrigatórios
supabase secrets set RESEND_API_KEY=re_xxxxxxxxx
supabase secrets set FROM_EMAIL="Comitê OKR <noreply@seudominio.com>"

# Opcional (gera botão "Abrir OKR" no email)
supabase secrets set APP_URL=https://okr.seudominio.com
```

> **Domínio não verificado?** Use `FROM_EMAIL=onboarding@resend.dev` temporariamente — emails só vão chegar no email da conta Resend.

### 3. Deploy

```bash
supabase functions deploy notify-kr-adjustment
```

### 4. Teste manual

```bash
curl -i --location --request POST \
  'https://<PROJECT_REF>.supabase.co/functions/v1/notify-kr-adjustment' \
  --header 'Authorization: Bearer <SUPABASE_ANON_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{"okr_id":"<uuid-de-um-okr>"}'
```

Resposta esperada (sucesso):
```json
{
  "ok": true,
  "department": "Comercial",
  "recipients": 3,
  "sent": 3,
  "failed": 0,
  "kr_count": 2
}
```

## Como é chamada pelo frontend

Disparada automaticamente em `OKR.requestKRAdjustments` após persistir os ajustes:

```js
await supabaseClient.functions.invoke('notify-kr-adjustment', {
    body: { okr_id: this.id, kr_ids: adjustments.map(a => a.kr_id) }
});
```

Falhas no envio NÃO bloqueiam a solicitação — são logadas no console e a operação prossegue.

## Quem recebe

- OKR tem `department` (string nome) → busca `departments.id` pelo nome
- Junção `user_departments` → IDs de usuários
- Filtro: `users.ativo = true` AND `users.email` válido
- Um email é enviado **por destinatário** (cada um vê só o próprio email no campo `to`)

## Estrutura do email

- Header verde com nome do departamento
- Título do OKR + comentário geral (se houver)
- Card vermelho por KR ajustado: `KR{posição}: título` + comentário do comitê
- Botão "Abrir OKR no sistema" (se `APP_URL` setado)

## Troubleshooting

- **`RESEND_API_KEY not set`** → rodou `supabase secrets set`?
- **`department 'X' not found`** → o departamento no OKR não existe na tabela `departments`. Verifique nome exato.
- **`no recipients with email`** → todos os usuários do departamento estão inativos ou sem email válido.
- **Emails caem no spam** → domínio não verificado no Resend. Verifique SPF/DKIM.
