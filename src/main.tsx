import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installApiAuth } from './lib/apiAuth';

// Les appels /api/ du navigateur portent le jeton de session (routes d'administration protégées)
installApiAuth();

createRoot(document.getElementById('root')!).render(<App />);
