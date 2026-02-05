import express from 'express';
import jwt from 'jsonwebtoken';
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

// POST /api/auth/sso-login
// Autenticação via SSO (Single Sign-On) do GIO
router.post('/sso-login', async (req, res) => {
    try {
        const { token } = req.body;

        // Validação
        if (!token) {
            return res.status(400).json({
                success: false,
                error: 'Token SSO é obrigatório'
            });
        }

        // Verificar se SSO_SECRET está configurado
        if (!process.env.SSO_SECRET) {
            console.error('SSO_SECRET não configurado no .env');
            return res.status(500).json({
                success: false,
                error: 'SSO não configurado corretamente'
            });
        }

        // Decodificar e validar o token JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.SSO_SECRET);
        } catch (jwtError) {
            console.error('Erro ao validar token SSO:', jwtError.message);
            return res.status(401).json({
                success: false,
                error: 'Token SSO inválido ou expirado'
            });
        }

        // Validar campos obrigatórios no token
        if (!decoded.email) {
            return res.status(400).json({
                success: false,
                error: 'Token SSO inválido: email não encontrado'
            });
        }

        // Buscar usuário no banco de dados
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', decoded.email)
            .eq('ativo', true)
            .single();

        if (userError || !user) {
            console.error('Usuário não encontrado ou inativo:', decoded.email);
            return res.status(404).json({
                success: false,
                error: 'Usuário não encontrado ou inativo no sistema OKR'
            });
        }

        // Retornar dados de autenticação validados
        // O frontend vai criar a sessão localmente com esses dados
        return res.json({
            success: true,
            message: 'Autenticação SSO realizada com sucesso',
            user: {
                id: user.id,
                nome: user.nome,
                email: user.email,
                tipo: user.tipo,
                departamento_id: user.departamento_id,
                primeiro_acesso: user.primeiro_acesso,
                auth_id: user.auth_id,
                ativo: user.ativo
            }
        });

    } catch (error) {
        console.error('Erro no SSO login:', error);
        return res.status(500).json({
            success: false,
            error: 'Erro ao processar autenticação SSO'
        });
    }
});

export default router;
