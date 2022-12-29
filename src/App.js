import logo from './logo.svg';
import './App.css';

import React, {useEffect, useState } from "react"
import { Xumm } from "xumm";
import {xummConfig} from "./env";

import imgLogo from "./assets/img/logo.jpeg";

import "./index.css";


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

export function App() {

    const [isAuthorized, setIsAuthorized] = useState(false);
    const [runtime, setRuntime] = useState(null);
    const [xummSDK, setXummSDK] = useState(null);

    useEffect(() => {
        console.log("App.js useEffect");
        xumm.then(xummSDK => {
          console.log("loginXumm xummSDK", xummSDK.runtime);
          if(!xummSDK.runtime) return;
          setRuntime(xummSDK.runtime); 
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

        });

    }, []);


    const loginXumm = () => {
        // console.log("loginXumm", xumm);
        xummSDK.authorize().then((res) => { 
          console.log("authorized", res);   
          xumm.environment.jwt?.then(r => console.log('jwt', r));
          setIsAuthorized(true);
        }).catch ((err) => {
            console.log("error with auth", err);
        });

    }

    return (<>
      <div className='bg-pink-900 flex flex-col text-white justify-start p-2 md:flex-row md:justify-between'>
        <div className='text-3xl'>zoetic</div>
        <div className='text-lg flex flex-col justify-end md:justify-start p-1 md:flex-row'>
          <div className='m-1 p-1 hover:underline hover:cursor-pointer'>Xumm-Universal-SDK</div>
          {isAuthorized ? 
            <div className='m-1'>
              <div onClick={()=>{}} className='button-common bg-pink-800 hover:bg-pink-400 hover:underline hover:cursor-pointer rounded p-3 m-1'>
                Logout</div>
            </div> : 
            <div onClick={()=>loginXumm()} className='button-common bg-pink-800 hover:bg-pink-400 hover:underline hover:cursor-pointer rounded p-3 m-1'>
              Login with xumm</div>}
        </div>

      </div>

      <div className='bg-slate-900 flex flex-row justify-center'>
        <div className='p-5 m-5 flex flex-col justify-center'>
          <div className='w-full text-pink-400 text-center text-6xl'>zoetic</div>
          <div className='text-center'>An end to en application example for making a xApp using ReactJS, Tailwinds CSS, and the Xumm "Universal" SDK</div>
          <div id='logo' className='p-5 m-5 w-full flex justify-center'>
            {isAuthorized ? <img src={imgLogo} alt="logo" className='w-64 h-64 animate-spin rounded-full'/>
            : <img src={imgLogo} alt="logo" className='w-64 h-64 rounded-full'/>}
          </div>
          {runtime ? 
          <div className='break-words code'>
            <div className='text-3xl'>Runtime</div>
            <pre className='text-xs'>{JSON.stringify(runtime, null, 2)}</pre>
          </div>:
          <div className='text-3xl'>No Runtime</div>}
        </div>
      </div>
    </>)
};


export default App;
