import { Route, Switch, Router as WouterRouter } from 'wouter';
import { TemplateLayout } from '@/components/custom/template-layout';
import { LogoSrcProvider } from '@/components/custom/logo-src-provider';
import DigitsPage from '@/pages/DigitsPage';
import ReportsPage from '@/pages/ReportsPage';

// logo.png is shipped in public/ by the Netlify/Deriv app builder
const LOGO_SRC = `${import.meta.env.BASE_URL ?? '/'}logo.png`;

function Router() {
  return (
    <Switch>
      <Route path="/" component={DigitsPage} />
      <Route path="/reports" component={ReportsPage} />
    </Switch>
  );
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL?.replace(/\/$/, '') ?? ''}>
      <TemplateLayout>
        <LogoSrcProvider logoSrc={LOGO_SRC}>
          <Router />
        </LogoSrcProvider>
      </TemplateLayout>
    </WouterRouter>
  );
}

export default App;
