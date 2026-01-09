// =====================================================
// MAIN.JS - Entry Point do Sistema OKR
// Vite carrega este arquivo automaticamente
// =====================================================

// Importa CSS
import './styles.css'

// 1. Importa e expõe globals
import './globals.js'

// 2. Importa Entidades (order matters!)
import { Cycle } from './Entities/Cycle.js'
import { MiniCycle } from './Entities/MiniCycle.js'
import { Department } from './Entities/Department.js'
import { User } from './Entities/User.js'
import { OKR, OKR_STATUS } from './Entities/OKR.js'
import './Entities/KeyResult.js'
import { Initiative } from './Entities/Initiative.js'

// 2.5 Importa Components
import { Modal } from './Components/Modal.js'
import { InitiativeManager } from './Components/InitiativeManager.js'

// 3. Importa Layout
import { Layout } from './Layout.js'

// 4. Importa Pages
import { DashboardPage } from './Pages/Dashboard/Dashboard.js'
import { ObjectivesPage } from './Pages/Objectives/Objectives.js'
import { CyclesPage } from './Pages/Cycles/Cycles.js'
import { DepartmentsPage } from './Pages/Departments/Departments.js'
import { UsersPage } from './Pages/Users/Users.js'
import { OKRsPage } from './Pages/OKRs/OKRs.js'
import { ApprovalPage } from './Pages/ApprovalCommittee/ApprovalCommittee.js'
import { SettingsPage } from './Pages/Settings/Settings.js'
import ForgotPasswordPage from './Pages/PasswordRecovery/ForgotPassword.js'
import ResetPasswordPage from './Pages/PasswordRecovery/ResetPassword.js'
import PasswordRecoveryCallbackPage from './Pages/PasswordRecovery/PasswordRecoveryCallback.js'

// 5. Importa App
import { App } from './app.js'

// Expõe tudo globalmente (necessário para onclick handlers inline)
window.Cycle = Cycle;
window.MiniCycle = MiniCycle;
window.Department = Department;
window.User = User;
window.OKR = OKR;
window.OKR_STATUS = OKR_STATUS;
window.Initiative = Initiative;
window.Modal = Modal;
window.InitiativeManager = InitiativeManager;
window.Layout = Layout;
window.DashboardPage = DashboardPage;
window.ObjectivesPage = ObjectivesPage;
window.CyclesPage = CyclesPage;
window.DepartmentsPage = DepartmentsPage;
window.UsersPage = UsersPage;
window.OKRsPage = OKRsPage;
window.ApprovalPage = ApprovalPage;
window.SettingsPage = SettingsPage;
window.ForgotPasswordPage = ForgotPasswordPage;
window.ResetPasswordPage = ResetPasswordPage;
window.PasswordRecoveryCallbackPage = PasswordRecoveryCallbackPage;
window.App = App;

// Inicializa o aplicativo
App.init();
