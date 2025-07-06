import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// --- TYPE DEFINITIONS ---
interface Slip {
    id: string; // Changed to string for DB IDs
    slipNumber: string;
    status: 'Pending' | 'Complete';
    vehicleNumber: string;
    material: string;
    grossWeight: number;
    grossWeightTime: string;
    tareWeight?: number;
    tareWeightTime?: string;
    netWeight?: number;
}

interface Settings {
    companyName: string;
    address: string;
}

interface NewSlipData {
    vehicleNumber: string;
    material: string;
    grossWeight: number;
}

type SetCurrentPageType = (page: string) => void;

interface SidebarProps {
    currentPage: string;
    setCurrentPage: SetCurrentPageType;
}

interface DashboardProps {
    setCurrentPage: SetCurrentPageType;
    pendingSlipsCount: number;
}

interface NewSlipFormProps {
    addSlip: (slipData: NewSlipData) => Promise<void>;
    setCurrentPage: SetCurrentPageType;
}

interface AllSlipsProps {
    slips: Slip[];
    onComplete: (slip: Slip) => void;
    onPrint: (slip: Slip) => void;
}

interface TareWeightModalProps {
    slip: Slip;
    onSave: (id: string, tareWeight: number) => Promise<void>;
    onCancel: () => void;
}

interface SettingsComponentProps {
    settings: Settings;
    onSaveSettings: (settings: Settings) => Promise<void>;
}

interface PrintViewProps {
    slip: Slip;
    settings: Settings;
    onCancel: () => void;
}

interface LoadingOverlayProps {
    message?: string;
}

interface ErrorNotificationProps {
    message: string;
    onClose: () => void;
}


// Add declarations for CDN libraries
declare const jspdf: any;
declare const html2canvas: any;

// --- UTILITY FUNCTIONS ---
const formatDate = (date: Date) => {
    return date.toLocaleString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

const formatWeight = (weight: number) => `${weight.toFixed(3)} ton`;


// --- UI FEEDBACK COMPONENTS ---

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = 'Loading...' }) => (
    <div className="loading-overlay">
        <div className="spinner"></div>
        <p>{message}</p>
    </div>
);

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ message, onClose }) => (
    <div className="error-notification">
        <p>{message}</p>
        <button onClick={onClose} className="close-button">&times;</button>
    </div>
);


// --- API COMMUNICATION LAYER ---
// This layer contains functions to communicate with the backend API.
// Uses API_BASE_URL from environment variable if available, otherwise defaults to '/api'.

// TypeScript support for import.meta.env (Vite)
// Use the Vite-provided type for import.meta.env
const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || '/api';

const apiService = {
    async getSlips(): Promise<Slip[]> {
        const response = await fetch(`${API_BASE_URL}/slips`);
        if (!response.ok) throw new Error('Failed to fetch slips.');
        return response.json();
    },

    async getSettings(): Promise<Settings> {
        const response = await fetch(`${API_BASE_URL}/settings`);
        if (!response.ok) throw new Error('Failed to fetch settings.');
        return response.json();
    },

    async createSlip(slipData: NewSlipData): Promise<Slip> {
        const response = await fetch(`${API_BASE_URL}/slips`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(slipData),
        });
        if (!response.ok) throw new Error('Failed to create slip.');
        return response.json();
    },

    async completeSlip(id: string, tareWeight: number): Promise<Slip> {
        const response = await fetch(`${API_BASE_URL}/slips/${id}/complete`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tareWeight }),
        });
        if (!response.ok) throw new Error('Failed to complete slip.');
        return response.json();
    },

    async saveSettings(settings: Settings): Promise<Settings> {
        const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST', // Or PUT, depending on your API design
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings),
        });
        if (!response.ok) throw new Error('Failed to save settings.');
        return response.json();
    }
};


// --- COMPONENTS ---

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
    const navItems = ['Dashboard', 'All Slips', 'Settings'];
    return (
        <aside className="sidebar no-print">
            <h1>Dharam Kanta</h1>
            <nav>
                <ul>
                    {navItems.map(item => (
                        <li key={item}
                            className={currentPage === item ? 'active' : ''}
                            onClick={() => setCurrentPage(item)}>
                            {item}
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage, pendingSlipsCount }) => (
    <div className="dashboard">
        <h2 className="page-header">Dashboard</h2>
        <div className="dashboard-card">
            <p>Welcome to the Digital Weighbridge System. Create a new slip to get started.</p>
            <button className="btn btn-primary" style={{ padding: '20px 40px', fontSize: '1.2rem' }} onClick={() => setCurrentPage('New Slip')}>
                Nayi Slip Banaye (Create New Slip)
            </button>
        </div>
         <div className="dashboard-card">
            <h3>Pending Slips</h3>
            <p style={{fontSize: '2rem', fontWeight: 'bold'}}>{pendingSlipsCount}</p>
        </div>
    </div>
);

const NewSlipForm: React.FC<NewSlipFormProps> = ({ addSlip, setCurrentPage }) => {
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [material, setMaterial] = useState('');
    const [grossWeight, setGrossWeight] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vehicleNumber || !material || !grossWeight) {
            alert('Please fill all fields');
            return;
        }
        setIsSubmitting(true);
        try {
            await addSlip({
                vehicleNumber: vehicleNumber.toUpperCase(),
                material,
                grossWeight: parseFloat(grossWeight),
            });
            setCurrentPage('All Slips');
        } catch (error) {
            // Error is handled globally in the App component
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <h2 className="page-header">Create New Slip (Gross Weight)</h2>
            <div className="form-container">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="vehicleNumber">Vahan Number (Vehicle Number)</label>
                        <input id="vehicleNumber" type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} required disabled={isSubmitting} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="material">Material</label>
                        <input id="material" type="text" value={material} onChange={e => setMaterial(e.target.value)} required disabled={isSubmitting} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="grossWeight">Pehla Wajan (Gross Weight in ton)</label>
                        <input id="grossWeight" type="number" step="0.001" value={grossWeight} onChange={e => setGrossWeight(e.target.value)} required disabled={isSubmitting} />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Generating...' : 'Generate Pending Slip'}
                    </button>
                </form>
            </div>
        </div>
    );
};


const AllSlips: React.FC<AllSlipsProps> = ({ slips, onComplete, onPrint }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const pendingSlips = slips.filter(s => s.status === 'Pending' && JSON.stringify(s).toLowerCase().includes(searchTerm.toLowerCase()));
    const completedSlips = slips.filter(s => s.status === 'Complete' && JSON.stringify(s).toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div>
            <h2 className="page-header">All Slips</h2>
            <div className="card">
                <div className="table-header">
                    <h3>Search Slips</h3>
                    <input
                        type="text"
                        placeholder="Search by Slip No, Vehicle No..."
                        className="search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="table-container">
                    <h3>Pending Slips</h3>
                    {pendingSlips.length > 0 ? (
                        <table className="slips-table">
                            <thead>
                                <tr>
                                    <th>Slip No.</th>
                                    <th>Vehicle No.</th>
                                    <th>Gross Weight</th>
                                    <th>Date/Time</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingSlips.map(slip => (
                                    <tr key={slip.id}>
                                        <td data-label="Slip No.">{slip.slipNumber}</td>
                                        <td data-label="Vehicle No.">{slip.vehicleNumber}</td>
                                        <td data-label="Gross Weight">{formatWeight(slip.grossWeight)}</td>
                                        <td data-label="Date/Time">{slip.grossWeightTime}</td>
                                        <td data-label="Actions">
                                            <button className="btn btn-secondary" onClick={() => onComplete(slip)}>
                                                Add Tare Weight
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : <p>No pending slips found.</p>}
                </div>

                <div className="table-container">
                    <h3>Completed Slips</h3>
                     {completedSlips.length > 0 ? (
                    <table className="slips-table">
                        <thead>
                            <tr>
                                <th>Slip No.</th>
                                <th>Vehicle No.</th>
                                <th>Net Weight</th>
                                <th>Date/Time</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {completedSlips.map(slip => (
                                <tr key={slip.id}>
                                    <td data-label="Slip No.">{slip.slipNumber}</td>
                                    <td data-label="Vehicle No.">{slip.vehicleNumber}</td>
                                    <td data-label="Net Weight">{slip.netWeight && formatWeight(slip.netWeight)}</td>
                                    <td data-label="Date/Time">{slip.tareWeightTime}</td>
                                    <td data-label="Actions">
                                        <button className="btn btn-primary" onClick={() => onPrint(slip)}>
                                            View / Print
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     ) : <p>No completed slips found.</p>}
                </div>
            </div>
        </div>
    );
};

const TareWeightModal: React.FC<TareWeightModalProps> = ({ slip, onSave, onCancel }) => {
    const [tareWeight, setTareWeight] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSave = async () => {
        if (!tareWeight) {
            alert('Please enter Tare Weight.');
            return;
        }
        setIsSubmitting(true);
        try {
            await onSave(slip.id, parseFloat(tareWeight));
        } catch (error) {
            // Error is handled globally
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Complete Weighment for Slip #{slip.slipNumber}</h2>
                    <button onClick={onCancel} className="close-button" disabled={isSubmitting}>&times;</button>
                </div>
                <p><strong>Vehicle Number:</strong> {slip.vehicleNumber}</p>
                <p><strong>Gross Weight:</strong> {formatWeight(slip.grossWeight)}</p>
                <div className="form-group">
                    <label htmlFor="tareWeight">Dusra Wajan (Tare Weight in ton)</label>
                    <input id="tareWeight" type="number" step="0.001" value={tareWeight} onChange={e => setTareWeight(e.target.value)} required disabled={isSubmitting} />
                </div>
                <div className="modal-actions">
                    <button className="btn btn-danger" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save and Complete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SettingsComponent: React.FC<SettingsComponentProps> = ({ settings, onSaveSettings }) => {
    const [formState, setFormState] = useState(settings);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setFormState(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormState({ ...formState, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSaveSettings(formState);
            alert('Settings saved!');
        } catch (error) {
             // Error is handled globally
             console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div>
            <h2 className="page-header">Settings</h2>
            <div className="settings-container">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="companyName">Company Name</label>
                        <input type="text" id="companyName" name="companyName" value={formState.companyName} onChange={handleChange} disabled={isSubmitting} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="address">Address</label>
                        <input type="text" id="address" name="address" value={formState.address} onChange={handleChange} disabled={isSubmitting} />
                    </div>
                    <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save Settings'}
                    </button>
                </form>
            </div>
        </div>
    );
};


const PrintView: React.FC<PrintViewProps> = ({ slip, settings, onCancel }) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = async () => {
        const { jsPDF } = jspdf;
        const elementToCapture = printRef.current;
        if (!elementToCapture) return;
    
        elementToCapture.classList.add('pdf-capture-mode');
    
        try {
            const canvas = await html2canvas(elementToCapture, {
                scale: 2,
                useCORS: true,
                windowWidth: elementToCapture.scrollWidth,
                windowHeight: elementToCapture.scrollHeight
            });
    
            const imgData = canvas.toDataURL('image/png');
    
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps= pdf.getImageProperties(imgData);
            const imgRatio = imgProps.height / imgProps.width;
            
            let imgWidth = pdfWidth - 20;
            let imgHeight = imgWidth * imgRatio;
    
            if (imgHeight > pdfHeight - 20) {
                imgHeight = pdfHeight - 20;
                imgWidth = imgHeight / imgRatio;
            }
    
            const x = (pdfWidth - imgWidth) / 2;
            const y = 10;
    
            pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
            pdf.save(`weighment-slip-${slip.slipNumber}.pdf`);
        } catch(error) {
            console.error("Error generating PDF:", error);
            alert("Could not generate PDF. Please try again.");
        } finally {
            elementToCapture.classList.remove('pdf-capture-mode');
        }
    };


    const SlipCopy = ({copyTitle}: {copyTitle: string}) => (
        <div className="slip-copy">
            <div className="print-header">
                <h2>{settings.companyName}</h2>
                <p>{settings.address}</p>
                <hr style={{margin: '10px 0'}}/>
                <h3>Weighment Slip ({copyTitle})</h3>
            </div>
            <table className="print-details-table">
                <tbody>
                    <tr><td>Slip No.</td><td>{slip.slipNumber}</td></tr>
                    <tr><td>Vehicle No.</td><td>{slip.vehicleNumber}</td></tr>
                    <tr><td>Material</td><td>{slip.material}</td></tr>
                    <tr><td>Gross Weight</td><td>{formatWeight(slip.grossWeight)}</td></tr>
                    <tr><td>Gross Weight Time</td><td>{slip.grossWeightTime}</td></tr>
                    <tr><td>Tare Weight</td><td>{slip.tareWeight ? formatWeight(slip.tareWeight) : ''}</td></tr>
                    <tr><td>Tare Weight Time</td><td>{slip.tareWeightTime}</td></tr>
                    <tr><td style={{fontWeight: 'bold'}}>Net Weight</td><td style={{fontWeight: 'bold'}}>{slip.netWeight ? formatWeight(slip.netWeight) : ''}</td></tr>
                </tbody>
            </table>
            <div className="print-footer">
                <p>_________________________</p>
                <p>Authorised Signatory</p>
            </div>
        </div>
    );

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '800px'}}>
                 <div className="modal-header no-print">
                    <h2>Print Slip #{slip.slipNumber}</h2>
                    <button onClick={onCancel} className="close-button">&times;</button>
                </div>
                <div className="print-controls no-print">
                     <button className="btn btn-secondary" onClick={handleDownloadPdf}>Download PDF</button>
                     <button className="btn btn-primary" onClick={() => window.print()}>Print</button>
                </div>
                <div className="print-container" ref={printRef}>
                    <SlipCopy copyTitle="Customer Copy" />
                    <SlipCopy copyTitle="Office Copy" />
                </div>
                <div className="no-print" style={{height: '50vh', overflowY: 'auto', border: '1px solid #ccc', padding: '10px'}}>
                     <SlipCopy copyTitle="Customer Copy" />
                     <SlipCopy copyTitle="Office Copy" />
                </div>
            </div>
        </div>
    );
};


// --- APP ---
const App = () => {
    const [currentPage, setCurrentPage] = useState('Dashboard');
    const [slips, setSlips] = useState<Slip[]>([]);
    const [settings, setSettings] = useState<Settings>({ companyName: '', address: '' });
    
    const [slipToComplete, setSlipToComplete] = useState<Slip | null>(null);
    const [slipToPrint, setSlipToPrint] = useState<Slip | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Fetch slips and settings in parallel
                const [fetchedSlips, fetchedSettings] = await Promise.all([
                    apiService.getSlips(),
                    apiService.getSettings()
                ]);
                setSlips(fetchedSlips);
                setSettings(fetchedSettings);
            } catch (err) {
                if (err instanceof Error) {
                   setError(`Failed to load application data: ${err.message}. Please try refreshing the page.`);
                } else {
                   setError('An unknown error occurred while loading data.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);


    const handleSetCurrentPage = (page: string) => {
        setCurrentPage(page);
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    };

    const addSlip = async (slipData: NewSlipData) => {
        setError(null);
        try {
            const newSlip = await apiService.createSlip(slipData);
            setSlips(prev => [...prev, newSlip]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Could not create slip: ${errorMessage}`);
            throw err; // Re-throw to be caught in form component
        }
    };

    const completeSlip = async (id: string, tareWeight: number) => {
        setError(null);
        try {
            const updatedSlip = await apiService.completeSlip(id, tareWeight);
            setSlips(prevSlips => prevSlips.map(s => (s.id === id ? updatedSlip : s)));
            setSlipToComplete(null);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Could not complete slip: ${errorMessage}`);
            throw err; // Re-throw to be caught in modal component
        }
    };
    
    const handleSaveSettings = async (newSettings: Settings) => {
        setError(null);
        try {
            const savedSettings = await apiService.saveSettings(newSettings);
            setSettings(savedSettings);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Could not save settings: ${errorMessage}`);
            throw err; // Re-throw to be caught in settings component
        }
    };

    const renderPage = () => {
        // Don't render pages until initial data is loaded, show spinner instead
        if (isLoading) return null; 

        if (currentPage === 'New Slip') {
            return <NewSlipForm addSlip={addSlip} setCurrentPage={handleSetCurrentPage} />;
        }
        switch (currentPage) {
            case 'Dashboard':
                return <Dashboard setCurrentPage={handleSetCurrentPage} pendingSlipsCount={slips.filter(s => s.status === 'Pending').length} />;
            case 'All Slips':
                return <AllSlips slips={slips} onComplete={setSlipToComplete} onPrint={setSlipToPrint} />;
            case 'Settings':
                return <SettingsComponent settings={settings} onSaveSettings={handleSaveSettings} />;
            default:
                return <Dashboard setCurrentPage={handleSetCurrentPage} pendingSlipsCount={slips.filter(s => s.status === 'Pending').length} />;
        }
    };

    return (
        <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
            {error && <ErrorNotification message={error} onClose={() => setError(null)} />}
            {isLoading && <LoadingOverlay message="Loading Data..." />}
            
            <Sidebar currentPage={currentPage} setCurrentPage={handleSetCurrentPage} />
            
            <main className="main-content no-print">
                {renderPage()}
            </main>
            
            <button className="hamburger-menu no-print" onClick={() => setSidebarOpen(!isSidebarOpen)}>
                {isSidebarOpen ? <span key="close">&times;</span> : <span key="open">&#9776;</span>}
            </button>
            {isSidebarOpen && <div className="overlay no-print" onClick={() => setSidebarOpen(false)}></div>}

            {slipToComplete && <TareWeightModal slip={slipToComplete} onSave={completeSlip} onCancel={() => setSlipToComplete(null)} />}
            {slipToPrint && <PrintView slip={slipToPrint} settings={settings} onCancel={() => setSlipToPrint(null)} />}
        </div>
    );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);