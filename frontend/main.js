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
import { Reminder, REMINDER_TYPES, REMINDER_PRIORITIES } from './Entities/Reminder.js'
import { CompanyPolicy } from './Entities/CompanyPolicy.js'
import { StrategicObjective } from './Entities/StrategicObjective.js'
import { StrategicSubMetric, CATEGORY_METRIC_CONFIG } from './Entities/StrategicSubMetric.js'
import { StrategicTimelineEntry } from './Entities/StrategicTimelineEntry.js'
import { ProblemTree } from './Entities/ProblemTree.js'
import { SwotItem } from './Entities/SwotItem.js'
import { SwotCrossing } from './Entities/SwotCrossing.js'

// 2.5 Importa Components
import { Modal } from './Components/Modal.js'
import { InitiativeManager } from './Components/InitiativeManager.js'
import { SkeletonLoader } from './Components/SkeletonLoader.js'

// 3. Importa Layout
import { Layout } from './Layout.js'

// 4. Importa Pages
import { HomePage } from './Pages/Home/Home.js'
import { DashboardPage } from './Pages/Dashboard/Dashboard.js'
import { ObjectivesPage } from './Pages/Objectives/Objectives.js'
import { StrategicObjectivesPage } from './Pages/StrategicObjectives/StrategicObjectives.js'
import { StrategicObjectiveDetailPage } from './Pages/StrategicObjectives/StrategicObjectiveDetail.js'
import { CalendarPage } from './Pages/Calendar/Calendar.js'
import { CyclesPage } from './Pages/Cycles/Cycles.js'
import { DepartmentsPage } from './Pages/Departments/Departments.js'
import { UsersPage } from './Pages/Users/Users.js'
import { MyOKRsPage } from './Pages/OKRs/MyOKRs.js'
import { OKRsPage } from './Pages/OKRs/OKRs.js'
import { ApprovalPage } from './Pages/ApprovalCommittee/ApprovalCommittee.js'
import { CompanyPolicyPage } from './Pages/CompanyPolicy/CompanyPolicy.js'
import { KPIsPage } from './Pages/KPIs/KPIs.js'
import { SettingsPage } from './Pages/Settings/Settings.js'
import ForgotPasswordPage from './Pages/PasswordRecovery/ForgotPassword.js'
import ResetPasswordPage from './Pages/PasswordRecovery/ResetPassword.js'
import PasswordRecoveryCallbackPage from './Pages/PasswordRecovery/PasswordRecoveryCallback.js'
import { ProblemTreePage } from './Pages/StrategicPlanning/ProblemTree.js'
import { SwotMatrixPage } from './Pages/StrategicPlanning/SwotMatrix.js'
import { ImpactDefinitionPage } from './Pages/StrategicPlanning/ImpactDefinition.js'
import { ScenarioAnalysisPage } from './Pages/StrategicPlanning/ScenarioAnalysis.js'

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
window.Reminder = Reminder;
window.REMINDER_TYPES = REMINDER_TYPES;
window.REMINDER_PRIORITIES = REMINDER_PRIORITIES;
window.Modal = Modal;
window.InitiativeManager = InitiativeManager;
window.Layout = Layout;
window.HomePage = HomePage;
window.DashboardPage = DashboardPage;
window.ObjectivesPage = ObjectivesPage;
window.CompanyPolicy = CompanyPolicy;
window.StrategicObjective = StrategicObjective;
window.StrategicSubMetric = StrategicSubMetric;
window.CATEGORY_METRIC_CONFIG = CATEGORY_METRIC_CONFIG;
window.StrategicTimelineEntry = StrategicTimelineEntry;
window.StrategicObjectivesPage = StrategicObjectivesPage;
window.StrategicObjectiveDetailPage = StrategicObjectiveDetailPage;
window.CalendarPage = CalendarPage;
window.CyclesPage = CyclesPage;
window.DepartmentsPage = DepartmentsPage;
window.UsersPage = UsersPage;
window.MyOKRsPage = MyOKRsPage;
window.OKRsPage = OKRsPage;
window.ApprovalPage = ApprovalPage;
window.CompanyPolicyPage = CompanyPolicyPage;
window.KPIsPage = KPIsPage;
window.SettingsPage = SettingsPage;
window.ForgotPasswordPage = ForgotPasswordPage;
window.ResetPasswordPage = ResetPasswordPage;
window.PasswordRecoveryCallbackPage = PasswordRecoveryCallbackPage;
window.ProblemTree = ProblemTree;
window.SwotItem = SwotItem;
window.SwotCrossing = SwotCrossing;
window.ProblemTreePage = ProblemTreePage;
window.SwotMatrixPage = SwotMatrixPage;
window.ImpactDefinitionPage = ImpactDefinitionPage;
window.ScenarioAnalysisPage = ScenarioAnalysisPage;
window.SkeletonLoader = SkeletonLoader;
window.App = App;

// Inicializa o aplicativo
App.init();
