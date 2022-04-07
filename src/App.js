import './App.css';
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';

import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';
import { useWeb3React } from '@web3-react/core';
import config from './config.json';
import initWeb3 from './web3_contract_instance';
import { Multicall } from 'ethereum-multicall';
import ERC20 from './ABI/ERC20.json';
import MASTERCHEF_ABI from './ABI/MASTERCHEF_ABI.json';
import { Button, Modal, Table } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { getTransactionHistory } from './query';

import moment from 'moment';

const injected = new InjectedConnector({
    supportedChainIds: [1, 4, 5]
});

const wallerConnectConnector = new WalletConnectConnector({
    supportedChainIds: [1, 4, 5],
    rpc: config.NETWORK_URLS,
    bridge: config.WALLETCONNECT_BRIDGE_URL,
    qrcode: true
});

function App() {
    const { account, chainId, activate, library } = useWeb3React();
    const [balance, setBalance] = useState(0);
    const [tokenEarned, setTokenEarned] = useState(0);
    const [stakedToken, setStakedToken] = useState(0);
    const [totalStake, setTotalStake] = useState(0);
    const [isApprove, setApprove] = useState(false);
    const [approvedToken, setApprovedToken] = useState(0);
    const [showDopesitModal, setShowDepositModal] = useState(false);
    const [showWithDrawModal, setShowWithDrawModal] = useState(false);
    const [stakeValue, setStake] = useState(0);
    const [withdrawValue, setWithdraw] = useState(0);
    const [showModalApprove, setShowModalApprove] = useState(false);
    const [approveValue, setApproveValue] = useState(0);
    const [histories, setHistories] = useState([]);

    const connectInjectedConnector = () => {
        activate(injected);
    };
    const connectWalletConnectConnector = () => {
        activate(wallerConnectConnector);
    };

    const getTokenEarned = () => {
        return {
            reference: 'getTokenEarned',
            contractAddress: config.MASTERCHEF_CONTRACT_ADDRESS,
            abi: MASTERCHEF_ABI,
            calls: [{ reference: 'getTokenEarned', methodName: 'pendingDD2', methodParameters: [account] }]
        };
    };

    const getUserStakedToken = () => {
        return {
            reference: 'getUserStakedToken',
            contractAddress: config.MASTERCHEF_CONTRACT_ADDRESS,
            abi: MASTERCHEF_ABI,
            calls: [{ reference: 'getUserStakedToken', methodName: 'userInfo', methodParameters: [account] }]
        };
    };

    const getTotalStaked = () => {
        return {
            reference: 'getTotalStaked',
            contractAddress: config.CONTRACT_ADDRESS,
            abi: ERC20,
            calls: [{ reference: 'getTotalStaked', methodName: 'balanceOf', methodParameters: [config.MASTERCHEF_CONTRACT_ADDRESS] }]
        };
    };

    const getWETHBalance = () => {
        return {
            reference: 'getWETHBalance',
            contractAddress: config.CONTRACT_ADDRESS,
            abi: ERC20,
            calls: [{ reference: 'getWETHBalance', methodName: 'balanceOf', methodParameters: [account] }]
        };
    };

    const getStaticInfo = async () => {
        const web3 = new Web3(library.provider);

        const multicall = new Multicall({ web3Instance: web3, tryAggregate: true });

        let contractCallContext = [getWETHBalance(), getTokenEarned(), checkApprove(), getUserStakedToken(), getTotalStaked()];

        let rsMultiCall = await multicall.call(contractCallContext);

        let rsGetWETHBalance = getResult(rsMultiCall.results, 'getWETHBalance');
        let rsGetTokenEarned = getResult(rsMultiCall.results, 'getTokenEarned');
        let rsCheckApprove = getResult(rsMultiCall.results, 'checkApprove');
        let rsGetUserStakedToken = getResult(rsMultiCall.results, 'getUserStakedToken');
        let rsGetTotalStaked = getResult(rsMultiCall.results, 'getTotalStaked');
        let isApprove = convertHexWei(rsCheckApprove.hex) === 0 ? false : true;
        console.log(rsGetTokenEarned, convertHexWei(rsGetTokenEarned.hex));
        setBalance(convertHexWei(rsGetWETHBalance.hex));
        setTokenEarned(convertHexWei(rsGetTokenEarned.hex));
        setStakedToken(convertHexWei(rsGetUserStakedToken.hex));
        setTotalStake(convertHexWei(rsGetTotalStaked.hex));
        setApprove(isApprove);
        setApprovedToken(convertHexWei(rsCheckApprove.hex));

        let res = await getTransactionHistory(account, 10);
        console.log(res.data);

        if (Array.isArray(res.data.transactionHistories)) {
            setHistories(res.data.transactionHistories);
        }
    };

    const getResult = (data, action) => {
        return data[action].callsReturnContext[0].returnValues[0];
    };

    const convertHexWei = (hex) => (parseFloat(Web3.utils.fromWei(parseInt(hex, 16).toString())) % 1 !== 0 ? parseFloat(Web3.utils.fromWei(parseInt(hex, 16).toString())).toFixed(6) : parseFloat(Web3.utils.fromWei(parseInt(hex, 16).toString())));

    const checkApprove = () => {
        return {
            reference: 'checkApprove',
            contractAddress: config.CONTRACT_ADDRESS,
            abi: ERC20,
            calls: [{ reference: 'checkApprove', methodName: 'allowance', methodParameters: [account, config.MASTERCHEF_CONTRACT_ADDRESS] }]
        };
    };

    const approve = async (val) => {
        let rs = new initWeb3(library.provider, 'weth');
        let { web3, wethContract } = rs;
        await wethContract.methods.approve(config.MASTERCHEF_CONTRACT_ADDRESS, web3.utils.toWei(val.toString())).send({ from: account });
        await getStaticInfo();
        setApprove(true);
    };

    const deposit = async (val) => {
        let { web3, wethContract } = new initWeb3(library.provider, 'masterchef');
        await wethContract.methods.deposit(web3.utils.toWei(val.toString())).send({ from: account });
        console.log('Deposit success');
        await getStaticInfo();
    };

    const harvest = async () => {
        let { wethContract } = new initWeb3(library.provider, 'masterchef');
        await wethContract.methods.deposit(0).send({ from: account });
        console.log('harvest success');
        await getStaticInfo();
    };

    const withdraw = async (val) => {
        let { web3, wethContract } = new initWeb3(library.provider, 'masterchef');
        await wethContract.methods.withdraw(web3.utils.toWei(val.toString())).send({ from: account });
        console.log('withdraw done');
        await getStaticInfo();
    };

    useEffect(() => {
        if (account && chainId && library) {
            getStaticInfo();
        }
    }, [account, chainId, library]);

    const handleClose = () => {
        setShowDepositModal(false);
        setShowWithDrawModal(false);
        setShowModalApprove(false);
    };

    const openStakeModal = () => {
        setShowDepositModal(true);
    };

    const openWithDrawModal = () => {
        setShowWithDrawModal(true);
    };

    const checkStakeAction = (e) => {
        if (parseFloat(stakeValue) > parseFloat(approvedToken)) {
            alert('Stake value must be less than approved token');
        } else {
            deposit(stakeValue);
            handleClose();
        }
    };

    const checkWithDrawAction = (e) => {
        if (parseFloat(withdrawValue) > parseFloat(stakedToken)) {
            alert('withdraw value must be less than your staked');
        } else {
            withdraw(withdrawValue);
            handleClose();
        }
    };

    const checkApproveAction = (e) => {
        if (parseFloat(approveValue) > parseFloat(balance)) {
            alert('approveValue value must be less than your balance');
        } else {
            approve(approveValue);
            handleClose();
        }
    };

    return (
        <div className="App">
            <>
                <div>
                    {account ? (
                        <div>
                            <div className="account-info">
                                <div>
                                    <div className="info-row">
                                        <h1 className="text-truncate text-address">WalletAddress: {account}</h1>
                                        <h1>Balance: {balance} WETH</h1>
                                    </div>
                                    <div className="info-row">
                                        <h1>Token earned: {tokenEarned} DD2 </h1>
                                        <Button onClick={harvest}>Harvest</Button>
                                    </div>

                                    <div className="info-row">
                                        <h1>Approved: {approvedToken} WETH </h1>
                                    </div>
                                    <Button onClick={setShowModalApprove}>Approve</Button>

                                    {isApprove ? (
                                        <div>
                                            <Button onClick={openStakeModal}>Stake</Button>
                                            <Button onClick={openWithDrawModal}>WithDraw</Button>
                                        </div>
                                    ) : (
                                        <div></div>
                                    )}
                                    <h1>Your stake : {stakedToken} WETH</h1>
                                    <h1>TotalStake: {totalStake} WETH</h1>
                                </div>
                                <div>
                                    <Table striped bordered hover>
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Action</th>
                                                <th>Amount</th>
                                                <th>CreatedAt</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {histories.map((history, index) => (
                                                <tr key={++index}>
                                                    <td>{++index}</td>
                                                    <td>{history.action}</td>
                                                    <td>{parseFloat(Web3.utils.fromWei(history.amount.toString())).toFixed(6)}</td>
                                                    <td>{moment.unix(history.createdAt).format('YYYY/MM/DD HH:mmA')}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="d-grid gap-2">
                            <Button size="lg" onClick={connectInjectedConnector}>
                                Connect Metamask
                            </Button>

                            <Button size="lg" onClick={connectWalletConnectConnector}>
                                Connect WalletConnect
                            </Button>
                        </div>
                    )}
                </div>
                <Modal show={showDopesitModal} onHide={handleClose} backdrop="static" keyboard={false}>
                    <Modal.Header closeButton>
                        <Modal.Title>Stake</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div>
                            <label>
                                <input placeholder="stake value" onChange={(e) => setStake(e.target.value)} />
                            </label>
                        </div>
                        <br></br>
                        <div>
                            <label>
                                <p>Approved: {approvedToken} WETH</p>
                            </label>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <button variant="secondary" onClick={handleClose}>
                            Close
                        </button>
                        <button variant="primary" onClick={checkStakeAction}>
                            Stake
                        </button>
                    </Modal.Footer>
                </Modal>
                <Modal show={showWithDrawModal} onHide={handleClose} backdrop="static" keyboard={false}>
                    <Modal.Header closeButton>
                        <Modal.Title>WithDraw</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div>
                            <label>
                                <input onChange={(e) => setWithdraw(e.target.value)} placeholder="withdraw value" />
                            </label>
                        </div>
                        <br></br>
                        <div>
                            <label>
                                <p>Your stake: {stakedToken} WETH</p>
                            </label>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <button variant="secondary" onClick={handleClose}>
                            Close
                        </button>
                        <button variant="primary" onClick={checkWithDrawAction}>
                            WithDraw
                        </button>
                    </Modal.Footer>
                </Modal>
                <Modal show={showModalApprove} onHide={handleClose} backdrop="static" keyboard={false}>
                    <Modal.Header closeButton>
                        <Modal.Title>Approve</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <div>
                            <label>
                                <input onChange={(e) => setApproveValue(e.target.value)} placeholder="approve value" />
                            </label>
                        </div>
                        <br></br>
                        <div>
                            <label>
                                <p>Your balance: {balance} WETH</p>
                            </label>
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <button variant="secondary" onClick={handleClose}>
                            Close
                        </button>
                        <button variant="primary" onClick={checkApproveAction}>
                            Stake
                        </button>
                    </Modal.Footer>
                </Modal>
            </>
        </div>
    );
}

export default App;
