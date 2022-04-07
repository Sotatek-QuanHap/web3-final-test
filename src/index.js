import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { createWeb3ReactRoot, Web3ReactProvider } from '@web3-react/core';
import { Web3Provider } from '@ethersproject/providers';

function getLibrary(provider, connector) {
    return new Web3Provider(provider);
}

const Web3ProviderNetwork = createWeb3ReactRoot('NETWORK');

ReactDOM.render(
    <React.StrictMode>
        <Web3ReactProvider getLibrary={getLibrary}>
            <Web3ProviderNetwork getLibrary={getLibrary}>
                <App />
            </Web3ProviderNetwork>
        </Web3ReactProvider>
    </React.StrictMode>,
    document.getElementById('root')
);
reportWebVitals();
