import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, XCircle, RefreshCw, Link, Database, Shield } from 'lucide-react';

const BlockchainStatus = () => {
    const [status, setStatus] = useState({
        blockchain: 'checking',
        contracts: 'checking',
        ipfs: 'checking',
        overall: 'checking'
    });
    const [details, setDetails] = useState({});
    const [loading, setLoading] = useState(false);

    const checkBlockchainStatus = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5001/api/blockchain/status');
            const data = await response.json();
            
            if (data.isInitialized) {
                setStatus({
                    blockchain: 'connected',
                    contracts: 'deployed',
                    ipfs: 'connected',
                    overall: 'operational'
                });
                setDetails({
                    network: data.network,
                    signerAddress: data.signerAddress,
                    blockNumber: data.blockNumber
                });
            } else {
                setStatus({
                    blockchain: 'error',
                    contracts: 'error',
                    ipfs: 'error',
                    overall: 'error'
                });
            }
        } catch (error) {
            setStatus({
                blockchain: 'error',
                contracts: 'error',
                ipfs: 'error',
                overall: 'error'
            });
            setDetails({ error: error.message });
        } finally {
            setLoading(false);
        }
    };

    // Check IPFS status separately
    const checkIPFSStatus = async () => {
        try {
            const response = await fetch('http://localhost:5001/api/ipfs/status');
            const data = await response.json();
            
            if (data.success && data.online) {
                setStatus(prev => ({
                    ...prev,
                    ipfs: 'connected'
                }));
                setDetails(prev => ({
                    ...prev,
                    ipfs: {
                        gateway: data.gateway,
                        nodeId: data.nodeId,
                        version: data.version,
                        apiUrl: data.apiUrl
                    }
                }));
            } else {
                setStatus(prev => ({
                    ...prev,
                    ipfs: 'not-connected'
                }));
            }
        } catch (error) {
            console.log('IPFS status check failed:', error.message);
        }
    };

    useEffect(() => {
        checkBlockchainStatus();
        checkIPFSStatus();
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'connected':
            case 'deployed':
            case 'operational':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'checking':
                return <Activity className="w-5 h-5 text-yellow-500" />;
            case 'error':
            case 'not-deployed':
            case 'not-connected':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <Activity className="w-5 h-5 text-gray-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'connected':
            case 'deployed':
            case 'operational':
                return 'text-green-600';
            case 'checking':
                return 'text-yellow-600';
            case 'error':
            case 'not-deployed':
            case 'not-connected':
                return 'text-red-600';
            default:
                return 'text-gray-600';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'connected':
                return 'Connected';
            case 'deployed':
                return 'Deployed';
            case 'operational':
                return 'Operational';
            case 'checking':
                return 'Checking...';
            case 'error':
                return 'Error';
            case 'not-deployed':
                return 'Not Deployed';
            case 'not-connected':
                return 'Not Connected';
            default:
                return 'Unknown';
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Link className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Blockchain Status</h3>
                        <p className="text-sm text-gray-600">Real-time blockchain and contract status</p>
                    </div>
                </div>
                <button
                    onClick={checkBlockchainStatus}
                    disabled={loading}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>{loading ? 'Checking...' : 'Refresh'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Blockchain Network Status */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <Link className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-gray-900">Blockchain Network</span>
                        </div>
                        {getStatusIcon(status.blockchain)}
                    </div>
                    <p className={`text-sm font-medium ${getStatusColor(status.blockchain)}`}>
                        {getStatusText(status.blockchain)}
                    </p>
                                         {details.network && (
                         <div className="text-xs text-gray-500 mt-1 space-y-1">
                             <p>Network: {details.network.name} (Chain ID: {details.network.chainId})</p>
                             {details.signerAddress && (
                                 <p>Signer: {details.signerAddress.slice(0, 6)}...{details.signerAddress.slice(-4)}</p>
                             )}
                             {details.blockNumber !== undefined && (
                                 <p>Block: {details.blockNumber}</p>
                             )}
                         </div>
                     )}
                </div>

                {/* Smart Contracts Status */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <Database className="w-4 h-4 text-purple-600" />
                            <span className="font-medium text-gray-900">Smart Contracts</span>
                        </div>
                        {getStatusIcon(status.contracts)}
                    </div>
                    <p className={`text-sm font-medium ${getStatusColor(status.contracts)}`}>
                        {getStatusText(status.contracts)}
                    </p>
                    {details.contracts && (
                        <p className="text-xs text-gray-500 mt-1">
                            {details.contracts.length} contracts deployed
                        </p>
                    )}
                </div>

                {/* IPFS Status */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-green-600" />
                            <span className="font-medium text-gray-900">IPFS Storage</span>
                        </div>
                        {getStatusIcon(status.ipfs)}
                    </div>
                    <p className={`text-sm font-medium ${getStatusColor(status.ipfs)}`}>
                        {getStatusText(status.ipfs)}
                    </p>
                    {details.ipfs && (
                        <p className="text-xs text-gray-500 mt-1">
                            Gateway: {details.ipfs.gateway}
                        </p>
                    )}
                </div>

                {/* Overall Status */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-gray-900">Overall Status</span>
                        </div>
                        {getStatusIcon(status.overall)}
                    </div>
                    <p className={`text-sm font-medium ${getStatusColor(status.overall)}`}>
                        {getStatusText(status.overall)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        Last checked: {new Date().toLocaleTimeString()}
                    </p>
                </div>
            </div>

            {/* Contract Details */}
            {details.contracts && details.contracts.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Deployed Contracts</h4>
                    <div className="space-y-2">
                        {details.contracts.map((contract, index) => (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{contract.name}</span>
                                <span className="font-mono text-xs text-gray-500">
                                    {contract.address.slice(0, 6)}...{contract.address.slice(-4)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Error Details */}
            {details.error && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                    <h4 className="font-medium text-red-900 mb-2">Connection Error</h4>
                    <p className="text-sm text-red-700">{details.error}</p>
                    <p className="text-xs text-red-600 mt-2">
                        Make sure your backend server and blockchain are running
                    </p>
                </div>
            )}

            {/* Setup Instructions */}
            {status.overall === 'error' && (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 mt-4">
                    <h4 className="font-medium text-blue-900 mb-2">Setup Instructions</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                        <p>1. Start blockchain: <code className="bg-blue-100 px-1 rounded">npm run blockchain</code></p>
                        <p>2. Start backend: <code className="bg-blue-100 px-1 rounded">npm start</code></p>
                        <p>3. Refresh this component to check status</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BlockchainStatus;
