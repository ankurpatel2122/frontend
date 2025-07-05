import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

// --- TYPE DEFINITIONS ---
interface Slip {
    id: number;
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
    addSlip: (slip: Omit<Slip, 'id' | 'slipNumber' | 'status' | 'grossWeightTime'>) => void;
    setCurrentPage: SetCurrentPageType;
    nextSlipNumber: string;
}

interface AllSlipsProps {
    slips: Slip[];
    onComplete: (slip: Slip) => void;
    onPrint: (slip: Slip) => void;
}

interface TareWeightModalProps {
    slip: Slip;
    onSave: (id: number, tareWeight: number) => void;
    onCancel: () => void;
}

interface SettingsComponentProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
}

interface PrintViewProps {
    slip: Slip;
    settings: Settings;
    onCancel: () => void;
}


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

const NewSlipForm: React.FC<NewSlipFormProps> = ({ addSlip, setCurrentPage, nextSlipNumber }) => {
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [material, setMaterial] = useState('');
    const [grossWeight, setGrossWeight] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!vehicleNumber || !material || !grossWeight) {
            alert('Please fill all fields');
            return;
        }
        addSlip({
            vehicleNumber: vehicleNumber.toUpperCase(),
            material,
            grossWeight: parseFloat(grossWeight),
        });
        setCurrentPage('All Slips');
    };

    return (
        <div>
            <h2 className="page-header">Create New Slip (Gross Weight) - Slip #{nextSlipNumber}</h2>
            <div className="form-container">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="vehicleNumber">Vahan Number (Vehicle Number)</label>
                        <input id="vehicleNumber" type="text" value={vehicleNumber} onChange={e => setVehicleNumber(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="material">Material</label>
                        <input id="material" type="text" value={material} onChange={e => setMaterial(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="grossWeight">Pehla Wajan (Gross Weight in ton)</label>
                        <input id="grossWeight" type="number" step="0.001" value={grossWeight} onChange={e => setGrossWeight(e.target.value)} required />
                    </div>
                    <button type="submit" className="btn btn-primary">Generate Pending Slip</button>
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

    const handleSave = () => {
        if (!tareWeight) {
            alert('Please enter Tare Weight.');
            return;
        }
        onSave(slip.id, parseFloat(tareWeight));
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Complete Weighment for Slip #{slip.slipNumber}</h2>
                    <button onClick={onCancel} className="close-button">&times;</button>
                </div>
                <p><strong>Vehicle Number:</strong> {slip.vehicleNumber}</p>
                <p><strong>Gross Weight:</strong> {formatWeight(slip.grossWeight)}</p>
                <div className="form-group">
                    <label htmlFor="tareWeight">Dusra Wajan (Tare Weight in ton)</label>
                    <input id="tareWeight" type="number" step="0.001" value={tareWeight} onChange={e => setTareWeight(e.target.value)} required />
                </div>
                <div className="modal-actions">
                    <button className="btn btn-danger" onClick={onCancel}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave}>Save and Complete</button>
                </div>
            </div>
        </div>
    );
};

const SettingsComponent: React.FC<SettingsComponentProps> = ({ settings, setSettings }) => {
    const [formState, setFormState] = useState(settings);

    useEffect(() => {
        setFormState(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormState({ ...formState, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSettings(formState);
        alert('Settings saved!');
    };

    return (
        <div>
            <h2 className="page-header">Settings</h2>
            <div className="settings-container">
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="companyName">Company Name</label>
                        <input type="text" id="companyName" name="companyName" value={formState.companyName} onChange={handleChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="address">Address</label>
                        <input type="text" id="address" name="address" value={formState.address} onChange={handleChange} />
                    </div>
                    <button type="submit" className="btn btn-primary">Save Settings</button>
                </form>
            </div>
        </div>
    );
};


const PrintView: React.FC<PrintViewProps> = ({ slip, settings, onCancel }) => {
    const printRef = useRef(null);

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
                     <button className="btn btn-secondary" onClick={() => window.print()}>Print / Download PDF</button>
                </div>
                {/* This container is only for printing, not for display */}
                <div className="print-container" ref={printRef}>
                    <SlipCopy copyTitle="Customer Copy" />
                    <SlipCopy copyTitle="Office Copy" />
                </div>
                {/* This container is for on-screen preview */}
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
    const [slips, setSlips] = useState<Slip[]>(() => {
        const savedSlips = localStorage.getItem('weighbridgeSlips');
        return savedSlips ? JSON.parse(savedSlips) : [];
    });
    const [settings, setSettings] = useState<Settings>(() => {
        const savedSettings = localStorage.getItem('weighbridgeSettings');
        return savedSettings ? JSON.parse(savedSettings) : { companyName: 'My Weighbridge', address: '123 Main St, Anytown' };
    });
    
    const [slipToComplete, setSlipToComplete] = useState<Slip | null>(null);
    const [slipToPrint, setSlipToPrint] = useState<Slip | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        localStorage.setItem('weighbridgeSlips', JSON.stringify(slips));
    }, [slips]);

    useEffect(() => {
        localStorage.setItem('weighbridgeSettings', JSON.stringify(settings));
    }, [settings]);

    const handleSetCurrentPage = (page: string) => {
        setCurrentPage(page);
        if (window.innerWidth <= 768) {
            setSidebarOpen(false);
        }
    };

    const getNextSlipNumber = () => {
        const lastId = slips.reduce((max, slip) => Math.max(parseInt(slip.slipNumber, 10), max), 0);
        return (lastId + 1).toString().padStart(5, '0');
    };

    const addSlip = (slipData: Omit<Slip, 'id' | 'slipNumber' | 'status' | 'grossWeightTime'>) => {
        const newSlip: Slip = {
            ...slipData,
            id: Date.now(),
            slipNumber: getNextSlipNumber(),
            status: 'Pending',
            grossWeightTime: formatDate(new Date()),
        };
        setSlips(prev => [...prev, newSlip]);
    };



    const completeSlip = (id: number, tareWeight: number) => {
        setSlips(prevSlips => prevSlips.map(s => {
            if (s.id === id) {
                const netWeight = Math.abs(s.grossWeight - tareWeight);
                return {
                    ...s,
                    status: 'Complete',
                    tareWeight,
                    netWeight: netWeight,
                    tareWeightTime: formatDate(new Date()),
                };
            }
            return s;
        }));
        setSlipToComplete(null);
    };
    
    const renderPage = () => {
        if (currentPage === 'New Slip') {
            return <NewSlipForm addSlip={addSlip} setCurrentPage={handleSetCurrentPage} nextSlipNumber={getNextSlipNumber()} />;
        }
        switch (currentPage) {
            case 'Dashboard':
                return <Dashboard setCurrentPage={handleSetCurrentPage} pendingSlipsCount={slips.filter(s => s.status === 'Pending').length} />;
            case 'All Slips':
                return <AllSlips slips={slips} onComplete={setSlipToComplete} onPrint={setSlipToPrint} />;
            case 'Settings':
                return <SettingsComponent settings={settings} setSettings={setSettings} />;
            default:
                return <Dashboard setCurrentPage={handleSetCurrentPage} pendingSlipsCount={slips.filter(s => s.status === 'Pending').length} />;
        }
    };

    return (
        <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
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