import Web3 from 'web3';
import ERC20 from './ABI/ERC20.json';
import MASTERCHEF_ABI from './ABI/MASTERCHEF_ABI.json';
import config from './config.json';
function initWeb3(provider, contract) {
    const web3 = new Web3(provider);
    let abi = '';
    let contract_address = '';

    switch (contract) {
        case 'weth':
            abi = ERC20;
            contract_address = config.CONTRACT_ADDRESS;
            break;
        case 'masterchef':
            abi = MASTERCHEF_ABI;
            contract_address = config.MASTERCHEF_CONTRACT_ADDRESS;
            break;
        default:
            break;
    }
    const wethContract = new web3.eth.Contract(abi, contract_address);

    return {
        web3,
        wethContract
    };
}

export default initWeb3;
