import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from './pages/MainPage';
import EventListPage from './pages/EventListPage';
import MusicListPage from './pages/MusicListPage';
import ValidatePinPage from './pages/ValidatePinPage';
import CompanyPage from './pages/CompanyPage';
import LanguageSwitcher from './components/LanguageSwitcher';

function App() {
    return (
        <BrowserRouter>
            <LanguageSwitcher />
            <div className="disco-bg" />
            <Routes>
                <Route path="/" element={<MainPage />} />
                <Route path="/events" element={<EventListPage />} />
                <Route path="/music" element={<MusicListPage />} />
                <Route path="/music/:eventToken" element={<MusicListPage />} />
                <Route path="/validate-pin" element={<ValidatePinPage />} />
                <Route path="/company" element={<CompanyPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
