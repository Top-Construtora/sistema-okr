import express from 'express';
import supabase, { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

// Rota de teste
router.get('/', async (req, res) => {
    res.json({ message: 'auth routes' });
});

// POST /api/auth/password-reset
// Solicita reset de senha via email
router.post('/password-reset', async (req, res) => {
    try {
        const { email } = req.body;

        // Validação
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email é obrigatório'
            });
        }

        // Validar formato do email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Email inválido'
            });
        }

        // Verificar se o usuário existe (sem revelar se existe ou não)
        const { data: user } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .single();

        // URL de redirecionamento baseada no ambiente
        const redirectUrl = `${process.env.FRONTEND_URL}/redefinir-senha`;

        // Se o usuário existir, enviar email de reset
        if (user) {
            const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
                redirectTo: redirectUrl
            });

            if (error) {
                console.error('Erro ao enviar email de reset:', error.message);
                // Não revelar erro específico ao cliente
            }
        }

        // SEMPRE retornar sucesso (segurança: não revelar se email existe)
        return res.json({
            success: true,
            message: 'Se o email estiver cadastrado, você receberá um link de recuperação em breve.'
        });

    } catch (error) {
        console.error('Erro no password-reset:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao processar solicitação'
        });
    }
});

// POST /api/auth/confirm-reset
// Confirma reset de senha com token e nova senha
router.post('/confirm-reset', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        // Validação
        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Token e nova senha são obrigatórios'
            });
        }

        // Validar senha (mínimo de segurança)
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'A senha deve ter no mínimo 6 caracteres'
            });
        }

        // Verificar o token e obter o usuário
        const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token);

        if (verifyError || !user) {
            return res.status(401).json({
                success: false,
                error: 'Token inválido ou expirado'
            });
        }

        // Atualizar a senha do usuário
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            { password: newPassword }
        );

        if (updateError) {
            console.error('Erro ao atualizar senha:', updateError);
            return res.status(500).json({
                success: false,
                error: 'Erro ao atualizar senha'
            });
        }

        // Opcional: Atualizar flag primeiro_acesso se necessário
        await supabase
            .from('users')
            .update({ primeiro_acesso: false })
            .eq('auth_id', user.id);

        return res.json({
            success: true,
            message: 'Senha redefinida com sucesso!'
        });

    } catch (error) {
        console.error('Erro no confirm-reset:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao processar redefinição de senha'
        });
    }
});

export default router;
