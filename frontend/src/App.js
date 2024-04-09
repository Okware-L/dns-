import React, { useEffect, useState } from "react";
import "./styles/App.css";
//import twitterLogo from "./assets/twitter-logo.svg";
import { ethers } from "ethers";
import contractAbi from "./utils/contractABI.json";
import polygonLogo from "./assets/polygonlogo.png";
import ethLogo from "./assets/ethlogo.png";
import { networks } from "./utils/networks";

// app consants
//const TWITTER_HANDLE = "_buildspace";
//const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;
const tld = ".ke";
const CONTRACT_ADDRESS = "0xe78369dd8C0Eee61C97447a310c77aAde4b9c470";

const App = () => {
  //state variables
  const [network, setNetwork] = useState("");
  const [editing, setEditing] = useState(false);
  const [currentAccount, setCurrentAccount] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState("");
  const [record, setRecord] = useState("");
  const [mints, setMints] = useState([]);

  // Implement your connectWallet method here
  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Get MetaMask -> https://metamask.io/");
        return;
      }

      // request access to account.
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      //  prints out public address once we authorize Metamask.
      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  };

  //update your checkIfWalletIsConnected function to handle the network

  const checkIfWalletIsConnected = async () => {
    const { ethereum } = window;

    if (!ethereum) {
      console.log("Make sure you have metamask!");
      return;
    } else {
      console.log("We have the ethereum object", ethereum);
    }

    const accounts = await ethereum.request({ method: "eth_accounts" });

    if (accounts.length !== 0) {
      const account = accounts[0];
      console.log("Found an authorized account:", account);
      setCurrentAccount(account);
    } else {
      console.log("No authorized account found");
    }

    //check users network chain iD
    const chainId = await ethereum.request({ method: "eth_chainId" });
    setNetwork(networks[chainId]);

    ethereum.on("chainChanged", handleChainChanged);

    //reload the page when they change networkks
    function handleChainChanged(_chainId) {
      window.location.reload();
    }
  };

  const switchNetwork = async () => {
    if (window.ethereum) {
      try {
        //try to switch to mumbai testnet
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x13881" }], // check networks gor hexadecimal network ids
        });
      } catch (error) {
        //this error code means that the chain we want has not been addded to metamask
        //in this case we ask the user to add to it their metamask
        if (error.code === 4902) {
          try {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: "0x13881",
                  chainName: "Polygon Mumbai Testnet",
                  rpcUrls: [
                    "https://polygon-mumbai.g.alchemy.com/v2/uwkozWct944vIJsJs5MZ0rJrlfNwKPc0",
                  ],
                  nativeCurrency: {
                    name: "Mumbai Matic",
                    symbol: "MATIC",
                    decimals: 18,
                  },
                  blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
                },
              ],
            });
          } catch (error) {
            console.log(error);
          }
        }
        console.log(error);
      }
    } else {
      //if window.ethereum is not found then metamask is not installed
      alert(
        "Metamask not installed. Please install it to use app:  https://metamask.io/download.html"
      );
    }
  };

  const mintDomain = async () => {
    // dont run if domain is empty
    if (!domain) {
      return;
    }
    //Alert user if domain is too short
    if (domain.length < 3) {
      alert("Domain must be at lest 3 characters long");
      return;
    }
    //calculate price based on length of domain
    // 3 chars = 0.5 matic, 4 chars = 0.3, 5 or more 0.1 matic
    const price =
      domain.length === 3 ? "0.5" : domain.length === 4 ? "0.3" : "0.1";
    console.log("Minting domain", domain, "with price", price);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        console.log("opening wallet to pay gas . ..");
        let tx = await contract.register(domain, {
          value: ethers.utils.parseEther(price),
        });
        //wait for transaction to be mined
        const receipt = await tx.wait();

        //check if transaction was successfully completed
        if (receipt.status === 1) {
          console.log(
            "Domain minted!https://mumbai.polygonscan.com/tx/ " + tx.hash
          );
        }

        //set the record for the domain
        tx = await contract.setRecord(domain, record);
        await tx.wait();

        console.log(
          "Record set!  https://mumbai.polygonscan.com/tx/" + tx.hash
        );

        //call fetchMints after 2 seconds
        setTimeout(() => {
          fetchMints();
        }, 2000);

        setRecord("");
        setDomain("");
      } else {
        alert("Transaction failed, try again");
      }
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMints = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        const names = await contract.getAllNames();

        //for each name , get the record and address
        const mintRecords = await Promise.all(
          names.map(async (name) => {
            const mintRecord = await contract.records(name);
            const owner = await contract.domains(name);
            return {
              id: names.indexOf(name),
              name: name,
              record: mintRecord,
              owner: owner,
            };
          })
        );

        console.log("MINTS FETCHED ", mintRecords);
        setMints(mintRecords);
      }
    } catch (error) {
      console.log(error);
    }
  };

  //this runs anytime current account /network is changed
  useEffect(() => {
    if (network === "polygon Mumbai Testnet") {
      fetchMints();
    }
  }, [currentAccount, network]);

  const updateDomain = async () => {
    if (!record || !domain) {
      return;
    }
    setLoading(true);
    console.log("Updating domain", domain, "with record", record);
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          contractAbi.abi,
          signer
        );

        let tx = await contract.setRecord(domain, record);
        await tx.wait();
        console.log("Record set https://mumbai.polygonscan.com/tx/" + tx.hash);

        fetchMints();
        setRecord("");
        setDomain("");
      }
    } catch (error) {
      console.log(error);
    }
    setLoading(false);
  };

  // Render Methods
  const renderNotConnectedContainer = () => (
    <div className="connect-wallet-container">
      <img
        src="https://media.giphy.com/media/VT3zPktC9eO52kuuw4/giphy.gif"
        alt="Ninja donut gif"
      />
      {/* Call the connectWallet function we just wrote when the button is clicked */}
      <button
        onClick={connectWallet}
        className="cta-button connect-wallet-button"
      >
        Connect Wallet
      </button>
    </div>
  );

  const renderInputForm = () => {
    //connect to correct network
    if (network !== "Polygon Mumbai Testnet") {
      return (
        <div className="connect-wallet-container">
          <p>please connect to the Polygon Mumbai Testnet</p>
          <button className="cta-button mint-button" onClick={switchNetwork}>
            Click here to switch Networks
          </button>
        </div>
      );
    }
    return (
      <div className="form-container">
        <div className="first-row">
          <input
            type="text"
            value={domain}
            placeholder="domain"
            onChange={(e) => setDomain(e.target.value)}
          />
          <p className="tld"> {tld} </p>
        </div>

        <input
          type="text"
          value={record}
          placeholder="write anything"
          onChange={(e) => setRecord(e.target.value)}
        />

        {/* If the editing variable is true, return the "Set record" and "Cancel" button */}
        {editing ? (
          <div className="button-container">
            {/* This will call the updateDomain function we just made */}
            <button
              className="cta-button mint-button"
              disabled={loading}
              onClick={updateDomain}
            >
              Set record
            </button>
            {/* This will let us get out of editing mode by setting editing to false */}
            <button
              className="cta-button mint-button"
              onClick={() => {
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          // If editing is not true, the mint button will be returned instead
          <button
            className="cta-button mint-button"
            disabled={loading}
            onClick={mintDomain}
          >
            Mint
          </button>
        )}
      </div>
    );
  };

  const renderMints = () => {
    if (currentAccount && mints.length > 0) {
      return (
        <div className="mint-container">
          <p className="subtitle"> Recently minted domains!</p>
          <div className="mint-list">
            {mints.map((mint, index) => {
              return (
                <div className="mint-item" key={index}>
                  <div className="mint-row">
                    <a
                      className="link"
                      href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <p className="underlined">
                        {" "}
                        {mint.name}
                        {tld}{" "}
                      </p>
                    </a>
                    {/* If mint.owner is currentAccount, add an "edit" button*/}
                    {mint.owner.toLowerCase() ===
                    currentAccount.toLowerCase() ? (
                      <button
                        className="edit-button"
                        onClick={() => editRecord(mint.name)}
                      >
                        <img
                          className="edit-icon"
                          src="https://img.icons8.com/metro/26/000000/pencil.png"
                          alt="Edit button"
                        />
                      </button>
                    ) : null}
                  </div>
                  <p> {mint.record} </p>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
  };

  //this takes us into edit mode and shows us the different edit buttons
  const editRecord = (name) => {
    console.log("Editing record for", name);
    setEditing(true);
    setDomain(name);
  };

  useEffect(() => {
    checkIfWalletIsConnected();
  }, []);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <header>
            <div className="left">
              <p className="title">😄Ok ke Name Service</p>
              <p className="subtitle">Your decentralized identity!</p>
            </div>
            {/**display a logo andwallet connection status */}
            <div className="right">
              <img
                alt="Network logo"
                className="logo"
                src={network.includes("Polygon") ? polygonLogo : ethLogo}
              />
              {currentAccount ? (
                <p>
                  {" "}
                  Wallet: {currentAccount.slice(0, 6)}...
                  {currentAccount.slice(-4)}{" "}
                </p>
              ) : (
                <p> Not connected </p>
              )}
            </div>
          </header>
        </div>

        {/* Hide the connect button if currentAccount isn't empty*/}
        {!currentAccount && renderNotConnectedContainer()}
        {/** Render the input form if its connected */}
        {currentAccount && renderInputForm()}
        {mints && renderMints()}
      </div>
    </div>
  );
};

export default App;
