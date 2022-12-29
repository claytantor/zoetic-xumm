import React, {useEffect, useState } from "react"
import { Xumm } from "xumm";
import {xummConfig} from "./env";

import { w3cwebsocket as W3CWebSocket } from "websocket";

import imgLogo from "./assets/img/logo.jpeg";

import "./index.css";
import './App.css';

const make = async () => {
    const xumm = await new Xumm(xummConfig.AppId)

    console.log("====== XUMM runtime", xumm.runtime);

    if (xumm.runtime.xapp) {
        console.log("XAPP");
        xumm.user.account.then(account => document.getElementById('account').innerText = account)
        xumm.xapp.on('destination', data => {
          console.log('A-xapp-destination@', data.destination?.name, data.destination?.address, data?.reason)
        })
        xumm.on('destination', data => {
          console.log('B-xapp-destination@', data.destination?.name, data.destination?.address, data?.reason)
        })
    }

    if (xumm.runtime.browser && !xumm.runtime.xapp) {
        console.log("WEBAPP");
        xumm.on("error", (error) => {
          console.log("error", error)
        })
        xumm.on("success", async () => {
          console.log('success', await xumm.user.account)
        })
        xumm.on("retrieved", async () => {
          console.log("Retrieved: from localStorage or mobile browser redirect", await xumm.user.account)
        })
      }

      return xumm;

};

const xumm = make();


const HashedInfoViewer = ({hashedInfo, title="Hashed Data"}) => {

  let renderAttributes = (hashedInfo) => {

      if (hashedInfo) {
          const keys = Object.keys(hashedInfo);
          if (keys.length === 0) {
              return <div className="flex">No account data</div>;
          } else {
              return keys.map((key, index) => (
                  <div className="w-32 md:w-64 flex flex-col md:h-32 text-yellow-200
                   bg-slate-800 m-1 rounded p-1 break-words" key={index}>
                      <div className="text-xs font-bold text-purple-300">{key}</div> 
                      {hashedInfo[key] && 
                      <div className="text-xs font-mono font-bold break-words">{JSON.stringify(hashedInfo[key])}</div>}
                  </div>
              ));
          }
      }

  };

  return (
      <>
          {hashedInfo && 
           <div className="flex flex-col"> 
             
              <div className="flex flex-row text-heading text-2xl">{title}</div>
              <div className="flex flex-wrap w-full bg-slate-700 p-1">{renderAttributes(hashedInfo)}</div>               
          </div>}
      </>
  );
};


const PaymentForm = ({xumm, fromAccount}) => {

  const [formState, setFormState] = useState({'destination': ''});
  const [payload, setPayload] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [runtime, setRuntime] = useState(null);

  /** state for the tx listening */
  const [websocketMessage, setWebsocketMessage] = useState(null);
  const [paymentPayload, setPaymentPayload] = useState(null);
  const [wsclient, setWsclient] = useState();
  const [txStatus, setTxStatus] = useState(0);
  const [txStatusMessage, setTxStatusMessage] = useState(null);
  
  
  /**
   * detect if this is a mobile device
   */
  useEffect(() => {
    if (/Mobi/.test(navigator.userAgent)) {
      setIsMobile(true);
    }

    // get the runtime so we can launch tx listening
    // for xapp
    xumm.then(xummSDK => {
      setRuntime(xummSDK.runtime);
    });

  }, []);

  const handleInputChange = event => {
    const target = event.target
    let value = target.value
    const name = target.name
    console.log(name, value);

    setFormState((formState) => ({
      ...formState,
      [name]: value
    }));  
  };  


  /**
   * create a payment payload
   * @param {*} account 
   * @param {*} destination 
   * @returns 
   */
  const paymentPayloadRequest = (account, destination) => {
    return {
          Account: account,
          TransactionType: "Payment",
          Flags: 0,
          SigningPubKey: "",
          Amount: "1000000",
          Destination:  destination
      }
  };

  /**
   * this is the function that will be called when the 
   * user clicks the pay button, it tells the xumm sdk
   * to create a payload, the app then needs to listen
   * for the payload status
   */
  const payAccount = () => {
    console.log("payAccount");
    setTxStatusMessage("Creating payload");
    xumm.then(xummSDK => {
      xummSDK.payload?.create({
        txjson: paymentPayloadRequest(fromAccount, formState.destination)})
      .then(r => {
        console.log('payload', r);
        setPayload(r);
        handleTxPayload(r);
        setTxStatusMessage("Handling the TX Sign request to the Wallet.");
      });
    });
  };


  /**
   * 
   * if this is a browser we want to show the QR code
   * if this is browser and mobile we want present a button to open the xumm app
   * if this is a xapp we want to send the payload to the xapp for signing
   * 
   * we need a websocket to listen for the payload status
   * 
   * this component will display the attributes 
   * of the websocet message
   * 
   * @param {{
        "uuid": "e7f7aa4f-1f4b-4714-8b57-22ca7562ab3e",
        "next": {
          "always": "https://xumm.app/sign/e7f7aa4f-1f4b-4714-8b57-22ca7562ab3e",
          "no_push_msg_received": "https://xumm.app/sign/e7f7aa4f-1f4b-4714-8b57-22ca7562ab3e/qr"
        },
        "refs": {
          "qr_png": "https://xumm.app/sign/e7f7aa4f-1f4b-4714-8b57-22ca7562ab3e_q.png",
          "qr_matrix": "https://xumm.app/sign/e7f7aa4f-1f4b-4714-8b57-22ca7562ab3e_q.json",
          "qr_uri_quality_opts": ["m", "q", "h"],
          "websocket_status": "wss://xumm.app/sign/e7f7aa4f-1f4b-4714-8b57-22ca7562ab3e"
        },
        "pushed": true
      }} txResponse 
   */
  const handleTxPayload = (txResponse) => {
    console.log("handleTxPayload", txResponse);
    setPaymentPayload(txResponse);

    const client = new W3CWebSocket(txResponse.refs.websocket_status);
    setWsclient(client);

    client.onopen = () => {
      console.log('WebSocket Client Connected');
    };

    client.onclose = () => {
      console.log('WebSocket Client Closed');
    };

    client.onmessage = (message) => {
      const dataFromServer = JSON.parse(message.data);
      setWebsocketMessage(dataFromServer);
      console.log('got message', dataFromServer);

      let keys = Object.keys(dataFromServer);
      if (
        keys.includes('payload_uuidv4') && 
        keys.includes('signed') && 
        dataFromServer.signed === true
      ){
        setTxStatus(1);
        setTxStatusMessage(`Payment signed.`);
        wsclient.close();

        // wait 5 seconds and then clear the message
        setTimeout(function () {
          setWebsocketMessage(null);
          setTxStatusMessage(null);
          setTxStatus(1);
        }, 5000);
      };      
      
    }

    if (runtime.xapp) {
      xumm.xapp.openSignRequest({ uuid: txResponse.uuid });  
    } 
  };


  return (
      <div className="flex flex-row items-center justify-center">

        {txStatusMessage && <></>}
        {websocketMessage && <>Got websocketMessage</>}
        
        
        <form className="w-full mb-3 md:w-fit">
          <div className="flex flex-col md:flex-row items-center border-b border-blue-500 
            py-2 w-full justify-center md:justify-between">
            <input 
              name="destination"
              value={formState.destination}
              onChange={handleInputChange}
              className="m-1 rounded border-2 border-slate-500 w-3/4 text-lg text-center appearance-none bg-slate-800 text-blue-300 mr-3 py-1 px-2 leading-tight focus:outline-none" type="text" placeholder="Enter account to pay 1 XRP" aria-label="XRP Account"/>
            <button onClick={()=>payAccount()} className="flex-shrink-0 bg-blue-500 hover:bg-blue-700 border-blue-500 hover:border-blue-700 text-sm border-4 text-white py-1 px-2 rounded" type="button">
              Create Payment TX
            </button>
          </div>
        </form>
      </div>
  );
};

export function App() {

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [runtime, setRuntime] = useState(null);
    const [xummSDK, setXummSDK] = useState(null);
    const [identity, setIdentity] = useState(null);
    const [clientType, setClientType] = useState(null);

    useEffect(() => {
        console.log("App.js useEffect");
        xumm.then(xummSDK => {
          console.log("loginXumm xummSDK", xummSDK.runtime);
          if(!xummSDK.runtime) return;
          const xruntime ={...xummSDK.runtime}
          setRuntime(xruntime); 
          setXummSDK(xummSDK); 

          /**
           * IMPORTANT: dont worry about calling this when the api
           * is not available, it just try to call what you need and it will be available after authorization. The promise will be resolved if the api is not available.
           */
          xummSDK.environment.bearer?.then(r => {
            // if you use a backend such as axios, you can set the bearer token here for the default header
            // ie. Axios.defaults.headers.common['Authorization'] = `Bearer ${r}`;
            console.log('bearer', r);

            setIsAuthorized(true);

          }).catch((err) => {
            console.log("error with bearer", err);
          });

          /***
           * its important to determine if the user is using the xumm app or the webapp
           */
          if (xruntime.xapp) {
            console.log("XAPP in App");  
            setClientType("XAPP");               
            xummSDK.environment.ott?.then(r => console.log('ott App', r))
          }

          if (xruntime.browser && !xruntime.xapp) {
            console.log("WEBAPP in App");
            setClientType("WEBAPP");
            xummSDK.environment.openid?.then(r => {
              console.log('openid App', r);
              setIdentity(r);
            })
          }

        });

    }, []);




    const loginXumm = () => {
        xummSDK.authorize().then((res) => { 
          console.log("authorized", res);   
          // xumm.environment.jwt?.then(r => console.log('jwt', r));
          // res = {jwt: 'eiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfa…4sN9Dxfq-fCtvEjqkpxWjYjafpWZCV47S65kM-jHvH467UmJ3', sdk: XummSdkJwt, me: {…}}
          // you can use the jwt set a bearer 
          // token for your backend and the identity
          if (res.me) {
            setIdentity(res.me);
          }     
          setIsAuthorized(true);
        }).catch ((err) => {
            console.log("error with auth", err);
        });
    };

    const logoutXumm = () => {
        console.log("logout");
        xummSDK.logout().then((res) => {
          console.log("logout promise result", res);
          setIsAuthorized(false);
          setIdentity(null);
          setRuntime(null);
        }).catch ((err) => {
          console.log("error with logout", err);
        });
    };

    return (<>
      <div className='bg-pink-900 flex flex-col text-white justify-start p-1 md:flex-row md:justify-between w-full'>
        <div className='m-1 mt-2 flex flex-row items-center justify-start'>
          <img src={imgLogo} alt="logo" className='w-8 h-8 rounded-full mt-1'/> 
          <span className='ml-2 text-4xl'>zoetic</span></div>
        <div className='text-lg flex flex-col justify-end md:justify-start md:flex-row'>
          <div className='m-1 p-1 hover:underline hover:cursor-pointer'>Xumm-Universal-SDK</div>
          {isAuthorized ? 
            <div className='m-1'>
              <div onClick={()=>logoutXumm()} className='button-common bg-pink-800 hover:bg-pink-400 hover:underline hover:cursor-pointer rounded p-3 m-1 flex flex-row items-center'>

                {identity?.picture ? <img className="w-8 h-8 m-1" src={identity.picture} alt="icon"/> : ""}
                Logout {clientType}</div>
            </div> : 
            <div onClick={()=>loginXumm()} className='button-common bg-pink-800 hover:bg-pink-400 hover:underline hover:cursor-pointer rounded p-3 m-1'>
              Login with xumm</div>}
        </div>
      </div>

      <div className='bg-slate-900 flex flex-row justify-center'>
        <div className='p-2 flex flex-col justify-center'>
          <div className='w-full text-pink-400 text-center text-6xl'>zoetic</div>
          <div className='text-center'>An complete application example for making a xApp using ReactJS, Tailwinds CSS, and the Xumm "Universal" SDK</div>

          {identity?.sub && <div className='md:text-2xl text-center text-blue-400 font-mono'>{identity.sub}</div>}

          <div id='logo' className='p-1 m-1 w-full flex justify-center'>
            {isAuthorized ? 
            <></>: 
            <img src={imgLogo} alt="logo" className='w-64 h-64 rounded-full'/>}
          </div>

          {isAuthorized && <PaymentForm xumm={xumm}/>} 

          {identity && <>
            <div className='code mb-4 w-fit'>
              <div className='text-xs break-words w-full'>
              <HashedInfoViewer hashedInfo={identity} title="Identity"/></div>
            </div>       
          </>}
          {/* {runtime && <div>runtime found</div>} */}
          {runtime && <>
            <div className='code mb-4 w-fit'>
              <div className='text-xs break-words w-full'>
                {runtime?.browser && <HashedInfoViewer hashedInfo={runtime.browser} title="Runtime"/>}
              </div>
            </div>       
          </>} 

        </div>
      </div>
      
    </>)
};


export default App;
